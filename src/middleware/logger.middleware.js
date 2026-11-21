/**
 * Unit 2 & Lab 1: Custom Request Logging Middleware
 * Demonstrates custom middleware design in Express: logs method, URL, status, and duration.
 */

function requestLogger(req, res, next) {
  const start = Date.now();
  res.on("finish", () => {
    const duration = Date.now() - start;
    if (process.env.NODE_ENV !== "test") {
      console.log(`[HTTP] ${req.method} ${req.originalUrl || req.url} ${res.statusCode} - ${duration}ms`);
    }
  });
  next();
}

module.exports = requestLogger;
