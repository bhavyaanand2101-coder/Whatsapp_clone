const express = require("express");
const router = express.Router();
const notificationController = require("../controllers/notification.controller");
const { requireAuth } = require("../middleware/auth.middleware");

router.get("/", requireAuth, notificationController.getNotifications);
router.put("/read-all", requireAuth, notificationController.markAllAsRead);
router.put("/:id/read", requireAuth, notificationController.markAsRead);

module.exports = router;
