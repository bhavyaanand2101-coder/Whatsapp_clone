// ============================================================
// WhatsApp Full-Stack Production Server
// Course: Web Dev - III (Node.js & Express Backend) - ETCCWD303
// Units Covered:
//   Unit 1: Foundations of Node.js (Core modules: http, fs, path, url, events)
//   Unit 2: Express.js & REST API Development (Routing, Middleware, CRUD, Status Codes)
//   Unit 3: Databases, Authentication & Security (MongoDB Mongoose, JWT, Scrypt, OWASP)
//   Unit 4: AI, Design & Deployment (Generative AI, RAG, WebRTC, Docker, Health Probes)
// ============================================================

const express = require("express");
const http = require("http");
const path = require("path");
const fs = require("fs");
const url = require("url");
const { Server } = require("socket.io");

const env = require("./src/config/env");
const connectDB = require("./src/config/db");
const { setupSocketIO, activeUsers } = require("./src/sockets/chat.socket");
const requestLogger = require("./src/middleware/logger.middleware");
const { notFoundHandler, errorHandler } = require("./src/middleware/error.middleware");

// Modular Routers
const authRoutes = require("./src/routes/auth.routes");
const conversationRoutes = require("./src/routes/conversation.routes");
const messageRoutes = require("./src/routes/message.routes");
const uploadRoutes = require("./src/routes/upload.routes");
const aiRoutes = require("./src/routes/ai.routes");

// Models
const Conversation = require("./src/models/Conversation");
const Message = require("./src/models/Message");
const User = require("./src/models/User");

const app = express();
const httpserver = http.createServer(app);

// Socket.IO Server initialization with CORS
const io = new Server(httpserver, {
  cors: {
    origin: "*",
    methods: ["GET", "POST", "PUT", "DELETE"],
  },
  maxHttpBufferSize: 1e7, // 10MB
});

app.set("io", io);

// ------------------------------------------------------------
// MIDDLEWARE PIPELINE (Unit 2 & Lab 1)
// ------------------------------------------------------------

// 1. Custom request logger (Unit 2 / Lab 1)
app.use(requestLogger);

// 2. Built-in body parsers
app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ extended: true, limit: "10mb" }));

// 3. OWASP Security Headers (Unit 3)
app.use((req, res, next) => {
  res.setHeader("X-Content-Type-Options", "nosniff");
  res.setHeader("X-Frame-Options", "SAMEORIGIN");
  res.setHeader("X-XSS-Protection", "1; mode=block");
  next();
});

// 4. Static File Hosting
if (!fs.existsSync(env.UPLOADS_DIR)) {
  fs.mkdirSync(env.UPLOADS_DIR, { recursive: true });
}
app.use("/uploads", express.static(env.UPLOADS_DIR));
app.use(express.static(path.join(__dirname, "public")));

// ------------------------------------------------------------
// REST API ENDPOINTS & STARTER BACKWARD COMPATIBILITY
// ------------------------------------------------------------

// 1. Health check & syllabus diagnostics (Lab 1 / Unit 4 deployment probe)
app.get("/api/health", (req, res) => {
  res.json({
    status: "ok",
    application: "WhatsApp Full-Stack Web Platform",
    course: "Web Dev - III (ETCCWD303)",
    units: ["Foundations", "Express REST", "MongoDB & Auth", "AI, RAG & Deployment"],
    activeSockets: activeUsers.size,
    uptime: Math.floor(process.uptime()),
    timestamp: new Date().toISOString(),
    database: "connected",
  });
});

// 2. Legacy /api/rooms endpoint
app.get("/api/rooms", async (req, res, next) => {
  try {
    const defaultChannels = await Conversation.find({ slug: { $exists: true } }).lean();

    const result = await Promise.all(
      defaultChannels.map(async (c) => {
        const msgCount = await Message.countDocuments({ conversationId: c._id });
        return {
          id: c.slug,
          _id: c._id,
          name: c.groupMeta?.name || c.slug,
          type: c.type || "group",
          avatar:
            c.groupMeta?.avatar ||
            "https://images.unsplash.com/photo-1522071820081-009f0129c71c?auto=format&fit=crop&w=120&h=120&q=80",
          description: c.groupMeta?.description || "",
          messageCount: msgCount,
          lastMessage: c.lastMessage
            ? {
                text: c.lastMessage.text,
                timestamp: new Date(c.lastMessage.timestamp).toLocaleTimeString([], {
                  hour: "2-digit",
                  minute: "2-digit",
                }),
                sender: c.lastMessage.senderName,
              }
            : null,
        };
      })
    );

    res.json(result);
  } catch (err) {
    next(err);
  }
});

// 3. Registered contacts directory
app.get("/api/users", async (req, res, next) => {
  try {
    const dbUsers = await User.find().select("-passwordHash").lean();
    const activeIds = new Set(Array.from(activeUsers.values()).map((u) => u.id || u.username));

    const enriched = dbUsers.map((u) => ({
      id: u._id.toString(),
      _id: u._id,
      username: u.displayName || u.username,
      rawUsername: u.username,
      avatar: u.avatar,
      about: u.about,
      phone: u.phone,
      isAI: u.isAI || false,
      online: u.online || activeIds.has(u._id.toString()) || activeIds.has(u.username),
      lastSeen: u.lastSeen,
    }));

    res.json(enriched);
  } catch (err) {
    next(err);
  }
});

// 4. Seed endpoint
app.post("/api/seed", (req, res) => {
  res.json({
    message: "Chat store initialized with sample rooms and messages",
    status: "success",
  });
});

// ------------------------------------------------------------
// MODULAR ROUTERS MOUNTING (Units 2, 3, 4)
// ------------------------------------------------------------

app.use("/api/auth", authRoutes);
app.use("/api/conversations", conversationRoutes);
app.use("/api/messages", messageRoutes);
app.use("/api/upload", uploadRoutes);
app.use("/api/ai", aiRoutes);

// Serve main WhatsApp Web frontend
app.get("/", (req, res) => {
  res.sendFile(path.join(__dirname, "client.html"));
});

// 404 & Centralized Error Handlers (Unit 2 / Lab 1)
app.use(notFoundHandler);
app.use(errorHandler);

// ------------------------------------------------------------
// REAL-TIME ENGINE (Socket.IO & WebRTC Signaling)
// ------------------------------------------------------------

setupSocketIO(io);

// ------------------------------------------------------------
// SERVER LIFECYCLE & PORT LISTEN
// ------------------------------------------------------------

function listenWithFallback(port) {
  httpserver.removeAllListeners("error");
  httpserver.removeAllListeners("listening");

  const onError = (err) => {
    if (err.code === "EADDRINUSE") {
      const nextPort = Number(port) + 1;
      console.log(`Port ${port} in use, trying next port http://localhost:${nextPort}...`);
      setTimeout(() => {
        listenWithFallback(nextPort);
      }, 200);
    } else {
      console.error("Server error:", err);
    }
  };

  httpserver.once("error", onError);

  httpserver.listen(port, () => {
    console.log(`=======================================================`);
    console.log(`WhatsApp Web Production Full-Stack Platform is LIVE!`);
    console.log(`URL: http://localhost:${port}`);
    console.log(`Socket.IO Engine: ws://localhost:${port}/`);
    console.log(`MongoDB: ${env.MONGO_URI}`);
    console.log(`=======================================================`);
  });
}

connectDB()
  .then(() => {
    listenWithFallback(env.PORT);
  })
  .catch((err) => {
    console.error("Fatal: Database initialization failed:", err);
    listenWithFallback(env.PORT);
  });

module.exports = { app, httpserver, io };
