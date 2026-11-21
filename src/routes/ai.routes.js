const express = require("express");
const router = express.Router();
const aiController = require("../controllers/ai.controller");
const { optionalAuth } = require("../middleware/auth.middleware");

// RAG AI Query endpoint
router.post("/query", optionalAuth, aiController.queryAI);

// RAG Conversation Summarization endpoint
router.get("/summarize/:conversationId", optionalAuth, aiController.summarizeConversation);

// Quick suggestions endpoint
router.get("/suggestions", optionalAuth, aiController.getSmartReplies);

module.exports = router;
