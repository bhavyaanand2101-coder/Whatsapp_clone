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
    const { username, email, password, displayName, avatar, phone, pno, mobile, about } = req.body;
    const finalPhone = phone || pno || mobile || "+91 98000 00000";
    const finalEmail = email ? email.toLowerCase().trim() : (username ? `${username.toLowerCase().trim()}@whatsapp.local` : null);

    if (!username || !finalEmail || !password) {
      return apiError(res, "Username, email/phone, and password are required.", 400);
    }

    if (password.length < 6) {
      return apiError(res, "Password must be at least 6 characters long.", 400);
    }

    // Check existing username or email
    const existing = await User.findOne({
      $or: [{ username: username.toLowerCase().trim() }, { email: finalEmail }],
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
      email: finalEmail,
      passwordHash,
      displayName: displayName ? displayName.trim() : username.trim(),
      avatar: avatar || `https://api.dicebear.com/7.x/bottts/svg?seed=${username}`,
      phone: finalPhone,
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
    const { identifier, username, email, phone, pno, mobile, password } = req.body;
    const loginTarget = (identifier || username || email || phone || pno || mobile || "").toString().trim();

    if (!loginTarget || !password) {
      return apiError(res, "Identifier (phone, email, or username) and password are required.", 400);
    }

    const cleanPhoneDigits = loginTarget.replace(/[\s\-\(\)\+]/g, "");
    const searchConditions = [
      { username: loginTarget.toLowerCase() },
      { email: loginTarget.toLowerCase() },
      { phone: loginTarget },
    ];

    if (cleanPhoneDigits.length >= 6) {
      searchConditions.push({ phone: cleanPhoneDigits });
      searchConditions.push({ phone: `+91 ${cleanPhoneDigits}` });
      // Match phone numbers with flexible spaces/dashes (e.g. 8799999999 matches +91 87999 99999)
      const digitRegexPattern = cleanPhoneDigits.split("").join("[\\s\\-\\(\\)]*");
      searchConditions.push({ phone: new RegExp(digitRegexPattern, "i") });
    }

    const user = await User.findOne({ $or: searchConditions });

    if (!user) {
      return apiError(res, "Invalid credentials. Please verify your phone number, email, or username and password.", 401);
    }

    const isValid = verifyPassword(password, user.passwordHash);
    if (!isValid) {
      return apiError(res, "Invalid credentials. Please verify your phone number, email, or username and password.", 401);
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

/**
 * Request password reset token
 */
async function forgotPassword(req, res, next) {
  try {
    const { identifier, email } = req.body;
    const target = (identifier || email || "").toLowerCase().trim();

    if (!target) {
      return apiError(res, "Username or email is required.", 400);
    }

    const user = await User.findOne({
      $or: [{ username: target }, { email: target }],
    });

    if (!user) {
      // Return 200/404 based on response strategy; for security / test clarity:
      return apiError(res, "User not found with provided identifier.", 404);
    }

    const rawResetToken = generateRandomToken();
    user.passwordResetToken = hashToken(rawResetToken);
    user.passwordResetExpires = new Date(Date.now() + 3600 * 1000); // 1 hour
    await user.save();

    return apiSuccess(
      res,
      {
        resetToken: rawResetToken,
        expiresIn: 3600,
      },
      "Password reset token generated successfully. Valid for 1 hour."
    );
  } catch (err) {
    next(err);
  }
}

/**
 * Reset password using valid reset token
 */
async function resetPassword(req, res, next) {
  try {
    const { resetToken, newPassword } = req.body;

    if (!resetToken || !newPassword) {
      return apiError(res, "Reset token and new password are required.", 400);
    }

    if (newPassword.length < 6) {
      return apiError(res, "Password must be at least 6 characters long.", 400);
    }

    const tokenHash = hashToken(resetToken);
    const user = await User.findOne({
      passwordResetToken: tokenHash,
      passwordResetExpires: { $gt: new Date() },
    });

    if (!user) {
      return apiError(res, "Invalid or expired password reset token.", 400);
    }

    // Set new password
    user.passwordHash = hashPassword(newPassword);
    user.passwordResetToken = null;
    user.passwordResetExpires = null;
    await user.save();

    // Revoke all existing sessions for security
    await Session.deleteMany({ userId: user._id });

    return apiSuccess(res, null, "Password has been successfully reset. Please log in with your new password.");
  } catch (err) {
    next(err);
  }
}

/**
 * Change password for authenticated user
 */
async function changePassword(req, res, next) {
  try {
    const { currentPassword, newPassword } = req.body;

    if (!currentPassword || !newPassword) {
      return apiError(res, "Current password and new password are required.", 400);
    }

    if (newPassword.length < 6) {
      return apiError(res, "New password must be at least 6 characters long.", 400);
    }

    const user = await User.findById(req.user._id);
    const isValid = verifyPassword(currentPassword, user.passwordHash);
    if (!isValid) {
      return apiError(res, "Current password is incorrect.", 401);
    }

    user.passwordHash = hashPassword(newPassword);
    await user.save();

    // Revoke all sessions except perhaps fresh login
    await Session.deleteMany({ userId: user._id });

    return apiSuccess(res, null, "Password changed successfully. Please log in again.");
  } catch (err) {
    next(err);
  }
}

/**
 * Logout from all devices
 */
async function logoutAll(req, res, next) {
  try {
    await Session.deleteMany({ userId: req.user._id });
    await User.findByIdAndUpdate(req.user._id, { online: false, lastSeen: new Date() });
    return apiSuccess(res, null, "Logged out from all devices");
  } catch (err) {
    next(err);
  }
}

/**
 * Deactivate user account
 */
async function deactivateAccount(req, res, next) {
  try {
    await User.findByIdAndUpdate(req.user._id, {
      online: false,
      lastSeen: new Date(),
    });
    await Session.deleteMany({ userId: req.user._id });
    return apiSuccess(res, null, "Account deactivated successfully");
  } catch (err) {
    next(err);
  }
}

/**
 * Delete user account permanently
 */
async function deleteAccount(req, res, next) {
  try {
    await Session.deleteMany({ userId: req.user._id });
    await User.findByIdAndDelete(req.user._id);
    return apiSuccess(res, null, "Account deleted permanently");
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
  forgotPassword,
  resetPassword,
  changePassword,
  logoutAll,
  deactivateAccount,
  deleteAccount,
};
