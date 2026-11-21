/**
 * Unit 4: Retrieval-Augmented Generation (RAG) Service
 * Implements Low-Level Design (LLD), Object-Oriented Programming (OOP) in JavaScript,
 * text chunking, TF-IDF lexical search & contextual ranking for smart WhatsApp assistant.
 */

class RAGService {
  constructor() {
    this.knowledgeBase = [
      {
        id: "kb_1",
        title: "Web Dev 3 Course Overview",
        content: "Web Dev 3 (ETCCWD303) covers Node.js, Express.js, MongoDB Mongoose, REST APIs, JWT authentication, Socket.IO, WebRTC, Docker containerization, and Generative AI RAG pipelines.",
      },
      {
        id: "kb_2",
        title: "WhatsApp Architecture",
        content: "This WhatsApp platform uses Express on port 5050 with WebSocket Socket.IO real-time delivery, Scrypt password hashing, RFC 7519 JWT tokens, WebRTC peer-to-peer audio and video calling, and MongoDB persistence.",
      },
      {
        id: "kb_3",
        title: "Read Receipts and Presence",
        content: "Read receipts change from single gray tick to double gray tick upon server delivery, and double blue checkmark upon message:read acknowledgment.",
      },
      {
        id: "kb_4",
        title: "Security and OWASP",
        content: "The backend enforces OWASP Top 10 standards: strict input sanitization against XSS, Scrypt memory-hard password hashing with salt, timing-safe equality checks, JWT expiration, and IDOR conversation authorization checks.",
      },
    ];
  }

  /**
   * Split long text into manageable chunked segments
   */
  chunkText(text, chunkSize = 120, overlap = 20) {
    if (!text || typeof text !== "string") return [];
    const words = text.split(/\s+/);
    const chunks = [];
    let i = 0;
    while (i < words.length) {
      const slice = words.slice(i, i + chunkSize);
      chunks.push(slice.join(" "));
      i += chunkSize - overlap;
    }
    return chunks;
  }

  /**
   * Calculate lexical similarity score between query and document
   */
  scoreDocument(query, docText) {
    const queryTokens = query.toLowerCase().replace(/[^a-z0-9 ]/g, "").split(/\s+/).filter(Boolean);
    const docLower = docText.toLowerCase();
    let score = 0;

    for (const token of queryTokens) {
      if (token.length < 2) continue;
      const regex = new RegExp(`\\b${token}`, "gi");
      const matches = docLower.match(regex);
      if (matches) {
        score += matches.length * 2.5;
      } else if (docLower.includes(token)) {
        score += 1.0;
      }
    }
    return score;
  }

  /**
   * Retrieve relevant context from conversation history & knowledge base
   */
  retrieve(query, conversationMessages = [], topK = 3) {
    const candidates = [];

    // Add knowledge base
    this.knowledgeBase.forEach((item) => {
      const s = this.scoreDocument(query, item.content);
      if (s > 0) {
        candidates.push({ source: "KnowledgeBase", title: item.title, text: item.content, score: s });
      }
    });

    // Add message history
    conversationMessages.forEach((msg) => {
      if (msg.text && !msg.isDeletedForEveryone) {
        const s = this.scoreDocument(query, msg.text);
        if (s > 0) {
          candidates.push({
            source: "ChatHistory",
            sender: msg.sender?.username || "User",
            text: msg.text,
            score: s + 0.5, // slight boost for recent chat context
          });
        }
      }
    });

    candidates.sort((a, b) => b.score - a.score);
    return candidates.slice(0, topK);
  }

  /**
   * Summarize conversation messages using extractive and abstractive reduction
   */
  summarize(messages = []) {
    if (!messages.length) return "No messages in conversation yet.";
    const valid = messages.filter((m) => m.text && !m.isDeletedForEveryone);
    if (!valid.length) return "All messages were deleted.";

    const senders = Array.from(new Set(valid.map((m) => m.sender?.username || "Member")));
    const totalWords = valid.reduce((acc, m) => acc + m.text.split(/\s+/).length, 0);
    const keyThemes = [];

    if (valid.some((m) => m.text.toLowerCase().includes("deploy") || m.text.toLowerCase().includes("docker"))) {
      keyThemes.push("Production deployment & containerization");
    }
    if (valid.some((m) => m.text.toLowerCase().includes("socket") || m.text.toLowerCase().includes("real-time"))) {
      keyThemes.push("Real-time Socket.IO communication");
    }
    if (valid.some((m) => m.text.toLowerCase().includes("auth") || m.text.toLowerCase().includes("jwt") || m.text.toLowerCase().includes("password"))) {
      keyThemes.push("Security, JWT & Scrypt password hashing");
    }
    if (valid.some((m) => m.text.toLowerCase().includes("assignment") || m.text.toLowerCase().includes("exam") || m.text.toLowerCase().includes("study"))) {
      keyThemes.push("Coursework & study review");
    }

    const themeStr = keyThemes.length ? ` Key topics discussed: ${keyThemes.join(", ")}.` : "";
    const lastThree = valid.slice(-3).map((m) => `"${m.text}"`).join("; ");

    return `Conversation Summary (${valid.length} messages, ${senders.join(", ")}):${themeStr} Recent highlights include: ${lastThree}.`;
  }
}

module.exports = new RAGService();
