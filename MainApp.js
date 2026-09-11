// importing necessary modules
const path = require("path");
const express = require("express");

// creating an express app
const app = express();

// read the player IP from X-Forwarded-For when running behind a proxy
app.set("trust proxy", require(path.join(__dirname, "Config.js")).TRUST_PROXY);

// setting the middleware
app.use(require(path.join(__dirname, "middleware", "RequestLogger.js")));

// setting the routes
app.use(require(path.join(__dirname, "routes", "IndexRoute.js")));

// setting the routes (proxy)
app.use(require(path.join(__dirname, "routes", "CacheProxy.js")));

// exporting the app
module.exports = app;