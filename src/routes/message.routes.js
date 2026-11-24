const express = require("express");
const router = express.Router();
const messageController = require("../controllers/message.controller");
const { optionalAuth } = require("../middleware/auth.middleware");

router.get("/search", optionalAuth, messageController.searchMessages);
router.get("/:roomId", optionalAuth, messageController.getMessages);
router.post("/", optionalAuth, messageController.sendMessage);
router.put("/:id", optionalAuth, messageController.editMessage);
router.patch("/:id", optionalAuth, messageController.editMessage);
router.delete("/:id", optionalAuth, messageController.deleteMessage);
router.post("/:id/react", optionalAuth, messageController.reactToMessage);
router.post("/:id/forward", optionalAuth, messageController.forwardMessage);

module.exports = router;
