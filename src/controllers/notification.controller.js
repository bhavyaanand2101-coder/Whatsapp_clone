const Notification = require("../models/Notification");
const { apiSuccess, apiError } = require("../utils/response");

/**
 * Get in-app notifications for authenticated user
 */
async function getNotifications(req, res, next) {
  try {
    const limit = Math.min(parseInt(req.query.limit, 10) || 30, 100);
    const notifications = await Notification.find({ recipient: req.user._id })
      .populate("sender", "username displayName avatar")
      .populate("conversationId", "type slug groupMeta")
      .sort({ createdAt: -1 })
      .limit(limit)
      .lean();

    const unreadCount = await Notification.countDocuments({
      recipient: req.user._id,
      isRead: false,
    });

    return apiSuccess(res, {
      notifications,
      unreadCount,
    });
  } catch (err) {
    next(err);
  }
}

/**
 * Mark notification as read
 */
async function markAsRead(req, res, next) {
  try {
    const { id } = req.params;
    const notification = await Notification.findOneAndUpdate(
      { _id: id, recipient: req.user._id },
      { isRead: true },
      { new: true }
    );

    if (!notification) {
      return apiError(res, "Notification not found", 404);
    }

    return apiSuccess(res, notification, "Notification marked as read");
  } catch (err) {
    next(err);
  }
}

/**
 * Mark all notifications as read
 */
async function markAllAsRead(req, res, next) {
  try {
    await Notification.updateMany(
      { recipient: req.user._id, isRead: false },
      { isRead: true }
    );
    return apiSuccess(res, null, "All notifications marked as read");
  } catch (err) {
    next(err);
  }
}

module.exports = {
  getNotifications,
  markAsRead,
  markAllAsRead,
};
