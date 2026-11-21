const User = require("../models/User");
const Session = require("../models/Session");
const {
  hashPassword,
  verifyPassword,
  signToken,
  generateRandomToken,
  hashToken,
} = require("../utils/cryptoAuth");
const { sanitizeUser } = require("../utils/sanitize");
const { apiSuccess, apiError } = require("../utils/response");
const env = require("../config/env");

/**
 * Register a new user
 */
async function register(req, res, next) {
  try {
    const { username, email, password, displayName, avatar, phone, about } = req.body;

    if (!username || !email || !password) {
      return apiError(res, "Username, email, and password are required.", 400);
    }

    if (password.length < 6) {
      return apiError(res, "Password must be at least 6 characters long.", 400);
    }

    // Check existing username or email
    const existing = await User.findOne({
      $or: [{ username: username.toLowerCase().trim() }, { email: email.toLowerCase().trim() }],
    });

    if (existing) {
      if (existing.username === username.toLowerCase().trim()) {
        return apiError(res, "Username is already taken.", 409);
      }
      return apiError(res, "Email is already registered.", 409);
    }

    const passwordHash = hashPassword(password);
    const user = await User.create({
      username: username.toLowerCase().trim(),
      email: email.toLowerCase().trim(),
      passwordHash,
      displayName: displayName ? displayName.trim() : username.trim(),
      avatar: avatar || `https://api.dicebear.com/7.x/bottts/svg?seed=${username}`,
      phone: phone || "+91 98000 00000",
      about: about || "Hey there! I am using WhatsApp.",
      online: true,
    });

    // Create session and issue tokens
    const rawRefreshToken = generateRandomToken();
    const refreshTokenHash = hashToken(rawRefreshToken);
    const expiresAt = new Date(Date.now() + env.JWT_REFRESH_EXPIRES_IN * 1000);

    await Session.create({
      userId: user._id,
      refreshTokenHash,
      userAgent: req.headers["user-agent"] || "Unknown",
      ip: req.ip || req.connection.remoteAddress || "127.0.0.1",
      expiresAt,
    });

    const accessToken = signToken({
      userId: user._id.toString(),
      username: user.username,
      email: user.email,
    });

    return apiSuccess(
      res,
      {
        user: sanitizeUser(user),
        tokens: {
          accessToken,
          refreshToken: rawRefreshToken,
          expiresIn: env.JWT_ACCESS_EXPIRES_IN,
        },
      },
      "User registered successfully",
      201
    );
  } catch (err) {
    next(err);
  }
}

/**
 * Log in an existing user
 */
async function login(req, res, next) {
  try {
    const { identifier, username, email, password } = req.body;
    const loginTarget = identifier || username || email;

    if (!loginTarget || !password) {
      return apiError(res, "Identifier (email or username) and password are required.", 400);
    }

    const user = await User.findOne({
      $or: [
        { username: loginTarget.toLowerCase().trim() },
        { email: loginTarget.toLowerCase().trim() },
      ],
    });

    if (!user) {
      return apiError(res, "Invalid username/email or password.", 401);
    }

    const isValid = verifyPassword(password, user.passwordHash);
    if (!isValid) {
      return apiError(res, "Invalid username/email or password.", 401);
    }

    // Update status to online
    user.online = true;
    user.lastSeen = new Date();
    await user.save();

    // Create refresh session
    const rawRefreshToken = generateRandomToken();
    const refreshTokenHash = hashToken(rawRefreshToken);
    const expiresAt = new Date(Date.now() + env.JWT_REFRESH_EXPIRES_IN * 1000);

    await Session.create({
      userId: user._id,
      refreshTokenHash,
      userAgent: req.headers["user-agent"] || "Unknown",
      ip: req.ip || req.connection.remoteAddress || "127.0.0.1",
      expiresAt,
    });

    const accessToken = signToken({
      userId: user._id.toString(),
      username: user.username,
      email: user.email,
    });

    return apiSuccess(
      res,
      {
        user: sanitizeUser(user),
        tokens: {
          accessToken,
          refreshToken: rawRefreshToken,
          expiresIn: env.JWT_ACCESS_EXPIRES_IN,
        },
      },
      "Logged in successfully"
    );
  } catch (err) {
    next(err);
  }
}

/**
 * Refresh access token using secure refresh token
 */
async function refresh(req, res, next) {
  try {
    const { refreshToken } = req.body;
    if (!refreshToken) {
      return apiError(res, "Refresh token is required.", 400);
    }

    const rHash = hashToken(refreshToken);
    const session = await Session.findOne({ refreshTokenHash: rHash });

    if (!session || new Date() > session.expiresAt) {
      return apiError(res, "Invalid or expired refresh token. Please sign in again.", 401);
    }

    const user = await User.findById(session.userId);
    if (!user) {
      return apiError(res, "User not found", 401);
    }

    // Rotate refresh token
    const newRefreshToken = generateRandomToken();
    session.refreshTokenHash = hashToken(newRefreshToken);
    session.expiresAt = new Date(Date.now() + env.JWT_REFRESH_EXPIRES_IN * 1000);
    await session.save();

    const accessToken = signToken({
      userId: user._id.toString(),
      username: user.username,
      email: user.email,
    });

    return apiSuccess(
      res,
      {
        tokens: {
          accessToken,
          refreshToken: newRefreshToken,
          expiresIn: env.JWT_ACCESS_EXPIRES_IN,
        },
      },
      "Token refreshed successfully"
    );
  } catch (err) {
    next(err);
  }
}

/**
 * Log out user by revoking session
 */
async function logout(req, res, next) {
  try {
    const { refreshToken } = req.body;
    if (refreshToken) {
      const rHash = hashToken(refreshToken);
      await Session.deleteOne({ refreshTokenHash: rHash });
    }

    if (req.user) {
      await User.updateOne({ _id: req.user._id }, { online: false, lastSeen: new Date() });
    }

    return apiSuccess(res, null, "Logged out successfully");
  } catch (err) {
    next(err);
  }
}

/**
 * Get current authenticated user profile
 */
async function getMe(req, res) {
  return apiSuccess(res, sanitizeUser(req.user));
}

/**
 * Update authenticated user profile
 */
async function updateProfile(req, res, next) {
  try {
    const { displayName, about, avatar, phone } = req.body;
    const updates = {};

    if (displayName) updates.displayName = displayName.trim();
    if (about) updates.about = about.trim();
    if (avatar) updates.avatar = avatar;
    if (phone) updates.phone = phone.trim();

    const updatedUser = await User.findByIdAndUpdate(req.user._id, updates, {
      new: true,
      runValidators: true,
    }).select("-passwordHash");

    return apiSuccess(res, sanitizeUser(updatedUser), "Profile updated successfully");
  } catch (err) {
    next(err);
  }
}

/**
 * Block a user
 */
async function blockUser(req, res, next) {
  try {
    const { targetUserId } = req.params;
    if (targetUserId === req.user._id.toString()) {
      return apiError(res, "You cannot block yourself.", 400);
    }

    await User.findByIdAndUpdate(req.user._id, {
      $addToSet: { blockedUsers: targetUserId },
    });

    return apiSuccess(res, null, "User blocked successfully");
  } catch (err) {
    next(err);
  }
}

/**
 * Unblock a user
 */
async function unblockUser(req, res, next) {
  try {
    const { targetUserId } = req.params;
    await User.findByIdAndUpdate(req.user._id, {
      $pull: { blockedUsers: targetUserId },
    });

    return apiSuccess(res, null, "User unblocked successfully");
  } catch (err) {
    next(err);
  }
}

/**
 * List or search users in contacts
 */
async function listUsers(req, res, next) {
  try {
    const { search } = req.query;
    const filter = {};

    if (search && search.trim()) {
      const regex = new RegExp(search.trim(), "i");
      filter.$or = [{ username: regex }, { displayName: regex }, { phone: regex }];
    }

    const users = await User.find(filter)
      .select("-passwordHash")
      .limit(50)
      .sort({ online: -1, displayName: 1 });

    return apiSuccess(res, users);
  } catch (err) {
    next(err);
  }
}

module.exports = {
  register,
  login,
  refresh,
  logout,
  getMe,
  updateProfile,
  blockUser,
  unblockUser,
  listUsers,
};
