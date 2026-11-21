const { apiError } = require("../utils/response");

/**
 * 404 Not Found Middleware (Unit 2 / Lab 1)
 */
function notFoundHandler(req, res, next) {
  return apiError(res, `Cannot ${req.method} ${req.originalUrl || req.url}`, 404);
}

/**
 * Global Centralized Error Handling Middleware (Unit 2 / Lab 1)
 */
function errorHandler(err, req, res, next) {
  if (process.env.NODE_ENV !== "test") {
    console.error(`[Error] ${req.method} ${req.url}:`, err.message);
  }

  // Multer file upload errors
  if (err.name === "MulterError") {
    if (err.code === "LIMIT_FILE_SIZE") {
      return apiError(res, "Uploaded file exceeds maximum limit of 25MB.", 400);
    }
    return apiError(res, `Upload error: ${err.message}`, 400);
  }

  // Mongoose duplicate key error (code 11000)
  if (err.code === 11000) {
    const field = Object.keys(err.keyValue || {})[0] || "field";
    return apiError(res, `An account with that ${field} already exists.`, 409);
  }

  // Mongoose validation error
  if (err.name === "ValidationError") {
    const messages = Object.values(err.errors).map((e) => e.message);
    return apiError(res, messages.join(". "), 400);
  }

  // JWT / Auth errors
  if (err.message && (err.message.includes("Token") || err.message.includes("signature"))) {
    return apiError(res, err.message, 401);
  }

  // Default internal server error (never leak internal trace)
  const message = process.env.NODE_ENV === "production" ? "Internal server error" : err.message;
  return apiError(res, message, err.statusCode || 500);
}

module.exports = {
  notFoundHandler,
  errorHandler,
};
