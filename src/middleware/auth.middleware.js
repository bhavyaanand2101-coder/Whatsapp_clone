const { verifyToken } = require("../utils/cryptoAuth");
const User = require("../models/User");
const { apiError } = require("../utils/response");

/**
 * Strict authentication middleware: Requires a valid JWT
 */
async function requireAuth(req, res, next) {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return apiError(res, "Authentication required. Please provide a valid Bearer token.", 401);
    }

    const token = authHeader.split(" ")[1];
    const decoded = verifyToken(token);

    if (!decoded || !decoded.userId) {
      return apiError(res, "Invalid authentication token", 401);
    }

    const user = await User.findById(decoded.userId).select("-passwordHash");
    if (!user) {
      return apiError(res, "User associated with this token no longer exists", 401);
    }

    req.user = user;
    next();
  } catch (err) {
    return apiError(res, err.message || "Invalid or expired token", 401);
  }
}

/**
 * Optional authentication: Attaches user if valid token exists,
 * allows unauthenticated access for legacy/guest requests.
 */
async function optionalAuth(req, res, next) {
  try {
    const authHeader = req.headers.authorization;
    if (authHeader && authHeader.startsWith("Bearer ")) {
      const token = authHeader.split(" ")[1];
      const decoded = verifyToken(token);
      if (decoded && decoded.userId) {
        const user = await User.findById(decoded.userId).select("-passwordHash");
        if (user) {
          req.user = user;
        }
      }
    }
  } catch (_) {
    // Ignore invalid optional tokens
  }
  next();
}

/**
 * Role-Based Access Control Middleware (Unit 3)
 */
function requireRole(role) {
  return (req, res, next) => {
    if (!req.user) {
      return apiError(res, "Authentication required", 401);
    }
    if (role === "admin" && !req.user.isAdmin) {
      return apiError(res, "Access forbidden: Administrator privileges required", 403);
    }
    next();
  };
}

module.exports = {
  requireAuth,
  optionalAuth,
  requireRole,
};
