// importing necessary modules
const path = require("path");
const router = require("express").Router();
const fetch = require("node-fetch");
const http = require("http");
const https = require("https");
const config = require(path.join(__dirname, "..", "Config.js"));

// Simple in-memory cache (a Map keeps insertion order, so the first key is the oldest)
const responseCache = new Map();
let cacheSize = 0;

// Cache expiration time and max size
const CACHE_EXPIRATION = config.CACHE_TTL_MINUTES * 60 * 1000;
const CACHE_MAX_BYTES = config.CACHE_MAX_MB * 1024 * 1024;

// Agent reused for every request to the target server.
// Certificate check is skipped because GTPS servers usually use a self-signed certificate,
// and parallel connections are capped so the server's per-IP socket limit is not hit.
const agent = config.ORIGIN_PROTOCOL === "http"
    ? new http.Agent({ keepAlive: true, maxSockets: 32 })
    : new https.Agent({ keepAlive: true, maxSockets: 32, rejectUnauthorized: false });

// Response headers that are not copied to the client.
// content-encoding is dropped because node-fetch already decompresses the body.
const SKIPPED_HEADERS = ["content-length", "transfer-encoding", "content-encoding", "connection", "keep-alive"];

if (config.ALLOWED_IPS.length === 0) {
    console.warn("ALLOWED_IPS is empty, any IP can be proxied. Set it in Config.js.");
}
if (!config.CDN_KEY) {
    console.warn("CDN_KEY is empty, your server will see the proxy IP instead of the player IP.");
}

// Function to remove a cache entry
const removeFromCache = (key) => {
    const entry = responseCache.get(key);
    if (entry) {
        cacheSize -= entry.body.length;
        responseCache.delete(key);
    }
};

// Function to add a cache entry, removing the oldest entries when the cache is full
const addToCache = (key, entry) => {
    removeFromCache(key);
    if (entry.body.length > CACHE_MAX_BYTES) {
        return;
    }
    for (const oldestKey of responseCache.keys()) {
        if (cacheSize + entry.body.length <= CACHE_MAX_BYTES) {
            break;
        }
        removeFromCache(oldestKey);
    }
    responseCache.set(key, entry);
    cacheSize += entry.body.length;
};

// Function to clean expired cache entries
const cleanExpiredCache = () => {
    const now = Date.now();
    for (const [key, entry] of responseCache.entries()) {
        if (now > entry.expiry) {
            removeFromCache(key);
        }
    }
};

// Run cache cleanup every 5 minutes
setInterval(cleanExpiredCache, 5 * 60 * 1000);

// Function to send a stored response to the client
const sendResponse = (res, { status, headers, body }) => {
    res.status(status);
    for (const [key, value] of Object.entries(headers)) {
        res.setHeader(key, value);
    }
    res.send(body);
};

// setting the route
router.get("/:ip/cache/*", async (req, res, next) => {
    const ip = req.params.ip;
    const originalUrl = req.originalUrl;

    // check if ip is an ip
    if (!ip.match(/^\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}$/)) {
        return next();
    }

    // file path without the server ip, e.g. /cache/game/a.rttex (also shown by RequestLogger)
    const filePath = originalUrl.slice(originalUrl.indexOf("/", 1));
    res.locals.downloadPath = filePath;

    // only proxy the allowed servers
    if (config.ALLOWED_IPS.length > 0 && !config.ALLOWED_IPS.includes(ip)) {
        console.log(`Blocked IP not in ALLOWED_IPS: ${ip}`);
        return res.status(403).send("Forbidden");
    }

    if (config.BLACKLIST.some(item => originalUrl.includes(item))) {
        console.log(`Blocked blacklisted URL: ${originalUrl}`);
        return res.status(404).send("Access Denied");
    }

    // Create cache key from request URL and method
    const cacheKey = `${req.method}:${originalUrl}`;

    // Send the cached response if it is still valid
    const cachedResponse = responseCache.get(cacheKey);
    if (cachedResponse && Date.now() < cachedResponse.expiry) {
        res.locals.fromCache = true;
        return sendResponse(res, cachedResponse);
    }

    try {
        // e.g. /1.2.3.4/cache/game/a.rttex -> https://1.2.3.4/cache/game/a.rttex
        const port = config.ORIGIN_PORT ? `:${config.ORIGIN_PORT}` : "";
        const targetUrl = `${config.ORIGIN_PROTOCOL}://${ip}${port}${filePath}`;

        const headers = { ...req.headers, host: config.ORIGIN_HOST };
        delete headers["content-length"];
        delete headers["transfer-encoding"];
        delete headers["connection"];
        // let node-fetch pick an encoding it can decompress
        delete headers["accept-encoding"];

        // only the proxy may send these, never the player
        delete headers["x-cdn-key"];
        delete headers["x-player-ip"];
        if (config.CDN_KEY) {
            headers["x-cdn-key"] = config.CDN_KEY;
            headers["x-player-ip"] = (req.ip || "").replace(/^::ffff:/, "");
        }

        const response = await fetch(targetUrl, {
            method: req.method,
            headers: headers,
            agent: agent,
            timeout: 60000,
        });

        // Prepare response headers
        const responseHeaders = {};
        for (const [key, value] of response.headers) {
            if (!SKIPPED_HEADERS.includes(key)) {
                responseHeaders[key] = value;
            }
        }

        // Get response body as buffer for caching
        const result = {
            status: response.status,
            headers: responseHeaders,
            body: await response.buffer(),
            expiry: Date.now() + CACHE_EXPIRATION
        };

        // Store successful responses in cache (when enabled)
        if (response.status === 200 && CACHE_MAX_BYTES > 0) {
            addToCache(cacheKey, result);
        }

        sendResponse(res, result);
    } catch (error) {
        console.error(`Error fetching ${originalUrl}:`, error.message);
        res.status(502).send("Bad Gateway");
    }
});

// exporting the router
module.exports = router;
