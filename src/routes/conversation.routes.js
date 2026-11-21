const express = require("express");
const router = express.Router();
const convController = require("../controllers/conversation.controller");
const { requireAuth, optionalAuth } = require("../middleware/auth.middleware");

router.get("/", optionalAuth, convController.getConversations);
router.get("/:id", optionalAuth, convController.getConversationById);

router.post("/direct", requireAuth, convController.createDirectChat);
router.post("/groups", requireAuth, convController.createGroupChat);
router.put("/groups/:id", requireAuth, convController.updateGroup);
router.post("/groups/:id/members", requireAuth, convController.addGroupMembers);
router.post("/groups/:id/participants", requireAuth, convController.addGroupMembers);
router.post("/:id/participants", requireAuth, convController.addGroupMembers);
router.delete("/groups/:id/members/:targetUserId", requireAuth, convController.removeGroupMember);
router.post("/groups/:id/leave", requireAuth, convController.leaveGroup);
router.post("/:id/pin", requireAuth, convController.pinConversation);
router.post("/:id/mute", requireAuth, convController.muteConversation);

module.exports = router;
