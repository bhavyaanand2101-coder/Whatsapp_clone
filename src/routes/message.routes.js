const express = require("express");
const router = express.Router();
const messageController = require("../controllers/message.controller");
const { optionalAuth } = require("../middleware/auth.middleware");

router.get("/search", optionalAuth, messageController.searchMessages);
router.get("/:roomId", optionalAuth, messageController.getMessages);
router.post("/", optionalAuth, messageController.sendMessage);
router.delete("/:id", optionalAuth, messageController.deleteMessage);
router.post("/:id/react", optionalAuth, messageController.reactToMessage);

module.exports = router;
