// main function
const RequestLogger = async (req, res, next) => {
    // log when the response is sent, so the status code is known
    res.on("finish", () => {
        const date = new Date();
        const timestamp = date.toLocaleString('en-GB', {
            day: '2-digit',
            month: '2-digit',
            year: 'numeric',
            hour: '2-digit',
            minute: '2-digit',
            second: '2-digit',
            hour12: false
        });
        const ip = (req.ip || "").replace(/^::ffff:/, "");
        const { downloadPath, fromCache } = res.locals;

        if (downloadPath) {
            console.log(`[${timestamp}] ${ip} download ${downloadPath} (${res.statusCode}${fromCache ? ", cached" : ""})`);
        } else {
            console.log(`[${timestamp}] ${ip} ${req.method} ${req.originalUrl} (${res.statusCode})`);
        }
    });

    // passing the request to the next handler
    next();
};

// exporting the middleware
module.exports = RequestLogger;
