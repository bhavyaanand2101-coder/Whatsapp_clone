const aiService = require("../services/ai.service");
const ragService = require("../services/rag.service");
const Message = require("../models/Message");
const Conversation = require("../models/Conversation");
const { apiSuccess, apiError } = require("../utils/response");

/**
 * Handle AI Assistant query with Retrieval-Augmented Generation (RAG)
 */
async function queryAI(req, res, next) {
  try {
    const { prompt, conversationId } = req.body;
    if (!prompt || !prompt.trim()) {
      return apiError(res, "Prompt query is required", 400);
    }

    let chatHistory = [];
    if (conversationId) {
      chatHistory = await Message.find({ conversationId }).sort({ createdAt: -1 }).limit(30).lean();
      chatHistory.reverse();
    }

    const answer = await aiService.generateResponse(prompt, chatHistory);

    return apiSuccess(res, {
      botName: aiService.botName,
      query: prompt,
      response: answer,
    });
  } catch (err) {
    next(err);
  }
}

/**
 * Summarize conversation messages using RAG
 */
async function summarizeConversation(req, res, next) {
  try {
    const { conversationId } = req.params;
    let conv = null;

    if (conversationId.match(/^[0-9a-fA-F]{24}$/)) {
      conv = await Conversation.findById(conversationId);
    } else {
      conv = await Conversation.findOne({ slug: conversationId });
    }

    if (!conv) {
      return apiError(res, "Conversation not found", 404);
    }

    const messages = await Message.find({ conversationId: conv._id })
      .sort({ createdAt: -1 })
      .limit(60)
      .lean();
    messages.reverse();

    const summary = ragService.summarize(messages);

    return apiSuccess(res, {
      conversationId: conv._id,
      summary,
    });
  } catch (err) {
    next(err);
  }
}

/**
 * Get AI-powered quick reply suggestions
 */
async function getSmartReplies(req, res, next) {
  try {
    const { messageText } = req.query;
    const suggestions = aiService.getQuickSuggestions(messageText || "");
    return apiSuccess(res, suggestions);
  } catch (err) {
    next(err);
  }
}

module.exports = {
  queryAI,
  summarizeConversation,
  getSmartReplies,
};
