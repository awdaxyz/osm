// importing app
const path = require('path');
const app = require(path.join(__dirname, 'MainApp.js'));
const config = require(path.join(__dirname, 'Config.js'));
const https = require('https');
const fs = require('fs');

// Start HTTPS server only when certificate files are set in Config.js
if (config.SSL_KEY && config.SSL_CERT) {
    const httpsOptions = {
        key: fs.readFileSync(path.resolve(__dirname, config.SSL_KEY)),
        cert: fs.readFileSync(path.resolve(__dirname, config.SSL_CERT)),
        ca: config.SSL_CA ? fs.readFileSync(path.resolve(__dirname, config.SSL_CA)) : undefined,
        // Add these timeout settings
        requestTimeout: 120000, // 2 minutes
        keepAliveTimeout: 60000 // 1 minute
    };

    https.createServer(httpsOptions, app).listen(config.HTTPS_PORT, () => {
        console.log(`HTTPS server started on port ${config.HTTPS_PORT}`);
    })
    .on('tlsClientError', (err, socket) => {
        console.error("HTTPS TLS Client Error:", err);
        socket.end('HTTP/1.1 400 Bad Request\r\n\r\n');
    })
    .on('clientError', (err, socket) => {
        console.error("HTTPS Client Error:", err);
        socket.end('HTTP/1.1 400 Bad Request\r\n\r\n');
    })
    .on('error', (err) => {
        console.error("HTTPS Server Error:", err);
    });
} else {
    console.log("SSL_KEY / SSL_CERT not set, HTTPS server disabled");
}

// Start HTTP server
app.listen(config.PORT, () => {
    console.log(`HTTP server started on port ${config.PORT}`);
});
