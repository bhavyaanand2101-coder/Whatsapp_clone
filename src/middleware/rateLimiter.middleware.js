const rateLimit = require("express-rate-limit");
const { apiError } = require("../utils/response");

// Rate limiter for authentication endpoints (prevent brute-force attacks)
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 30, // 30 attempts per 15 minutes per IP
  standardHeaders: true,
  legacyHeaders: false,
  handler: (req, res) => {
    return apiError(res, "Too many authentication attempts. Please try again after 15 minutes.", 429);
  },
});

// General API rate limiter for standard endpoints
const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 300, // 300 requests per 15 mins per IP
  standardHeaders: true,
  legacyHeaders: false,
  handler: (req, res) => {
    return apiError(res, "Too many requests. Please slow down.", 429);
  },
});

module.exports = {
  authLimiter,
  apiLimiter,
};
