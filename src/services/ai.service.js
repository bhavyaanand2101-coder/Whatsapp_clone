/**
 * Unit 4: Generative AI Assistant & Intelligent Auto-Reply Service
 * Provides Meta AI / WhatsApp Assistant responses, smart query answering with RAG context,
 * and contextual auto-reply suggestions.
 */

const ragService = require("./rag.service");

class AIService {
  constructor() {
    this.botName = "Meta AI";
    this.avatar = "https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?auto=format&fit=crop&w=120&h=120&q=80";
  }

  /**
   * Process prompt with RAG retrieval and formulate assistant response
   */
  async generateResponse(query, conversationMessages = []) {
    const cleanQuery = query.replace(/^@meta\s*ai\s*/i, "").trim();

    // Check for summarization request
    if (/summar(y|ize)|recap|brief/i.test(cleanQuery)) {
      return ragService.summarize(conversationMessages);
    }

    // Retrieve context using RAG
    const contexts = ragService.retrieve(cleanQuery, conversationMessages);
    let contextStr = "";
    if (contexts.length > 0) {
      contextStr = contexts.map((c) => `- ${c.text} (from ${c.source})`).join("\n");
    }

    // Domain intelligence logic
    if (/who are you|what are you/i.test(cleanQuery)) {
      return `Hello! I am ${this.botName}, your WhatsApp AI assistant. I can answer questions about your chats, summarize conversations, explain code architectures, and provide real-time assistance.`;
    }

    if (/course|web dev 3|etccwd303|syllabus/i.test(cleanQuery)) {
      return `Web Dev 3 (ETCCWD303) is an advanced backend engineering course covering Node.js event-driven architecture, Express REST APIs, Mongoose MongoDB schemas, JWT authentication, Socket.IO real-time channels, WebRTC, Docker, and Generative AI RAG pipelines.`;
    }

    if (/socket|real-time|webrtc|call/i.test(cleanQuery)) {
      return `This WhatsApp application uses Socket.IO for duplex communication (events: 'message:send', 'typing:start', 'message:read') and WebRTC with STUN peer-to-peer signaling for low-latency audio/video calling.`;
    }

    if (/security|auth|jwt|password/i.test(cleanQuery)) {
      return `Security is implemented using OWASP Top 10 standards: Scrypt memory-hard password hashing with salt, timing-safe equality verification, RFC 7519 HMAC-SHA256 JWT access tokens, and MongoDB TTL refresh sessions.`;
    }

    if (contextStr) {
      return `Based on our conversation context:\n${contextStr}\n\nLet me know if you would like me to elaborate or take action on this!`;
    }

    return `I received your message: "${cleanQuery}". How can I help you coordinate or develop features for your WhatsApp workspace today?`;
  }

  /**
   * Generate quick reply suggestions for incoming messages
   */
  getQuickSuggestions(lastMessageText) {
    if (!lastMessageText) return ["Hello!", "Sounds good!", "Will review soon."];
    const lower = lastMessageText.toLowerCase();

    if (lower.includes("how are you") || lower.includes("hey") || lower.includes("hello")) {
      return ["Doing well, thank you!", "Hey there! Ready to code.", "Good! Working on WhatsApp."];
    }
    if (lower.includes("test") || lower.includes("deploy") || lower.includes("release")) {
      return ["All tests are green! ✓", "Running verification now.", "Ready for production deploy."];
    }
    if (lower.includes("call") || lower.includes("meet")) {
      return ["Starting voice call now.", "Can you do video call?", "Give me 5 minutes."];
    }

    return ["Understood!", "Great work! 👍", "Let's discuss."];
  }
}

module.exports = new AIService();
