// Proxy configuration.
// Each value can be edited here directly, or overridden with an environment variable
// of the same name (on Vercel: Project Settings -> Environment Variables).

// turns "a, b ,c" into ["a", "b", "c"]
const toList = (value) => value.split(",").map(item => item.trim()).filter(Boolean);

module.exports = {
    // IPs of the servers that may be proxied, comma separated (e.g. "1.2.3.4,5.6.7.8").
    // Leave empty to allow any IP (not recommended: anyone can use your proxy).
    ALLOWED_IPS: toList(process.env.ALLOWED_IPS || "45.142.115.57","127.0.0.1"),

    // How the proxy contacts your server: "https" or "http".
    // Leave the port empty to use the default one (443 for https, 80 for http).
    ORIGIN_PROTOCOL: (process.env.ORIGIN_PROTOCOL || "https").toLowerCase(),
    ORIGIN_PORT: process.env.ORIGIN_PORT || "",

    // Host header sent to your server
    ORIGIN_HOST: process.env.ORIGIN_HOST || "www.growtopia1.com",

    // Secret sent to your server (X-CDN-Key header) together with the player IP (X-Player-IP).
    // Must match cdn.key in the server's Security.js. On Vercel, set it as an
    // environment variable instead of writing it here.
    CDN_KEY: process.env.CDN_KEY || "",

    // Files that are never served, comma separated (e.g. "alucard.xml,sonic_ic.xml")
    BLACKLIST: toList(process.env.BLACKLIST || ""),

    // How long a file stays cached, and the max memory used by the cache.
    // 0 MB = cache off: every download reaches your server, so it can log it.
    CACHE_TTL_MINUTES: Number(process.env.CACHE_TTL_MINUTES || 60),
    CACHE_MAX_MB: Number(process.env.CACHE_MAX_MB || 0),

    // How many proxies sit in front of this app, used to find the player IP for the logs:
    // 0 = players connect directly, 1 = behind Vercel, Cloudflare or nginx (automatic on Vercel)
    TRUST_PROXY: Number(process.env.TRUST_PROXY || (process.env.VERCEL ? 1 : 0)),

    // Ports used by Server.js (ignored on Vercel)
    PORT: Number(process.env.PORT || 88),
    HTTPS_PORT: Number(process.env.HTTPS_PORT || 444),

    // SSL certificate files used by Server.js. Leave empty to run HTTP only.
    SSL_KEY: process.env.SSL_KEY || "",
    SSL_CERT: process.env.SSL_CERT || "",
    SSL_CA: process.env.SSL_CA || "",
};
