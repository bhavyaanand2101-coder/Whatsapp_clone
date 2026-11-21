const User = require("../models/User");
const Conversation = require("../models/Conversation");
const Message = require("../models/Message");
const { verifyToken } = require("../utils/cryptoAuth");
const { sanitizeText } = require("../utils/sanitize");
const aiService = require("../services/ai.service");

const activeUsers = new Map();

function setupSocketIO(io) {
  let activeSocketCount = 0;

  // Socket middleware: optional JWT authentication
  io.use(async (socket, next) => {
    try {
      const token = socket.handshake.auth?.token || socket.handshake.headers?.authorization?.replace("Bearer ", "");
      if (token) {
        try {
          const decoded = verifyToken(token);
          if (decoded && decoded.userId) {
            const user = await User.findById(decoded.userId).select("-passwordHash");
            if (user) {
              socket.user = user;
            }
          }
        } catch (_) {}
      }
      next();
    } catch (err) {
      next();
    }
  });

  io.on("connection", async (socket) => {
    activeSocketCount++;
    if (process.env.NODE_ENV !== "test") {
      console.log(`[Socket.IO] Client connected (${socket.id}). Total: ${activeSocketCount}`);
    }

    // ---- Starter Code Compatibility (Preserved) ----
    socket.emit("gyankibaat", "welcome to socket.io server");
    socket.broadcast.emit("join", "New User Joined");
    io.emit("announcement", "Today is last time we study web dev -3");

    socket.on("kuchbhi", (msg) => {
      console.log(`[kuchbhi received]: ${msg}`);
    });

    // ---- WhatsApp Protocol Events ----

    // 1. User join / registration
    socket.on("user:join", async (userData = {}) => {
      try {
        let userProfile = null;

        if (socket.user) {
          userProfile = {
            socketId: socket.id,
            id: socket.user._id.toString(),
            _id: socket.user._id,
            username: socket.user.displayName || socket.user.username,
            avatar: socket.user.avatar,
            phone: socket.user.phone,
            about: socket.user.about,
            online: true,
            currentRoom: "general",
          };
          await User.findByIdAndUpdate(socket.user._id, { online: true });
        } else {
          userProfile = {
            socketId: socket.id,
            id: userData.id || userData._id || `user_${socket.id.substring(0, 6)}`,
            username: sanitizeText(userData.username || `User-${socket.id.substring(0, 4)}`),
            avatar: userData.avatar || `https://api.dicebear.com/7.x/bottts/svg?seed=${socket.id}`,
            phone: userData.phone || "+91 98000 00000",
            about: userData.about || "Hey there! I am using WhatsApp.",
            online: true,
            currentRoom: "general",
          };
        }

        activeUsers.set(socket.id, userProfile);
        socket.join("general");
        socket.join(userProfile.id);

        const rooms = await Conversation.find({ slug: { $exists: true } }).lean();
        const genConv = await Conversation.findOne({ slug: "general" });
        let history = [];
        if (genConv) {
          history = await Message.find({ conversationId: genConv._id })
            .sort({ createdAt: -1 })
            .limit(50)
            .lean();
          history.reverse();
        }

        socket.emit("user:joined", {
          profile: userProfile,
          rooms: rooms.map((r) => ({
            id: r.slug,
            name: r.groupMeta?.name || r.slug,
            avatar: r.groupMeta?.avatar,
            description: r.groupMeta?.description,
            type: r.type,
          })),
          history: history.map((m) => ({
            id: m._id.toString(),
            _id: m._id,
            roomId: "general",
            sender: m.sender,
            text: m.isDeletedForEveryone ? "This message was deleted" : m.text,
            mediaType: m.mediaType,
            mediaUrl: m.mediaUrl,
            status: m.status,
            reactions: m.reactions || [],
            timestamp: new Date(m.createdAt).toLocaleTimeString([], {
              hour: "2-digit",
              minute: "2-digit",
            }),
          })),
        });

        io.emit("users:update", Array.from(activeUsers.values()));
        io.emit("announcement", `${userProfile.username} joined WhatsApp`);
      } catch (err) {
        console.error("[Socket.IO] Error in user:join:", err);
      }
    });

    // 2. Room switching
    socket.on("room:join", async ({ roomId = "general" }) => {
      try {
        const user = activeUsers.get(socket.id);
        if (!user) return;

        socket.leave(user.currentRoom);
        socket.join(roomId);
        user.currentRoom = roomId;

        let conv = null;
        if (roomId.match(/^[0-9a-fA-F]{24}$/)) {
          conv = await Conversation.findById(roomId);
        } else {
          conv = await Conversation.findOne({ slug: roomId });
        }

        let history = [];
        if (conv) {
          history = await Message.find({
            conversationId: conv._id,
            deletedFor: { $ne: user._id },
          })
            .sort({ createdAt: -1 })
            .limit(50)
            .lean();
          history.reverse();
        }

        socket.emit("room:history", {
          roomId,
          messages: history.map((m) => ({
            id: m._id.toString(),
            _id: m._id,
            roomId,
            sender: m.sender,
            text: m.isDeletedForEveryone ? "This message was deleted" : m.text,
            mediaType: m.mediaType,
            mediaUrl: m.mediaUrl,
            replyTo: m.replyTo,
            status: m.status,
            reactions: m.reactions || [],
            timestamp: new Date(m.createdAt).toLocaleTimeString([], {
              hour: "2-digit",
              minute: "2-digit",
            }),
          })),
        });

        socket.to(roomId).emit("room:user_joined", {
          username: user.username,
          roomId,
        });
      } catch (err) {
        console.error("[Socket.IO] Error in room:join:", err);
      }
    });

    // 3. Real-time message sending
    socket.on("message:send", async (data = {}) => {
      try {
        const user = activeUsers.get(socket.id);
        const roomId = data.roomId || (user ? user.currentRoom : "general");
        const rawText = data.text || "";

        if (!rawText.trim() && !data.mediaUrl) return;

        let conv = null;
        if (roomId.match(/^[0-9a-fA-F]{24}$/)) {
          conv = await Conversation.findById(roomId);
        } else {
          conv = await Conversation.findOne({ slug: roomId });
        }

        if (!conv) {
          conv = await Conversation.create({
            type: "group",
            slug: roomId,
            groupMeta: {
              name: roomId.charAt(0).toUpperCase() + roomId.slice(1),
              avatar: "https://images.unsplash.com/photo-1522071820081-009f0129c71c?auto=format&fit=crop&w=120&h=120&q=80",
            },
          });
        }

        const senderData = {
          id: user ? user.id : socket.id,
          userId: user && user._id ? user._id : null,
          username: user ? user.username : "Guest",
          avatar: user ? user.avatar : "https://api.dicebear.com/7.x/bottts/svg?seed=guest",
        };

        const cleanText = sanitizeText(rawText);

        const newMsg = await Message.create({
          conversationId: conv._id,
          roomId,
          sender: senderData,
          text: cleanText,
          mediaType: data.mediaType || "text",
          mediaUrl: data.mediaUrl || null,
          mediaName: data.mediaName || null,
          mediaSize: data.mediaSize || null,
          replyTo: data.replyTo || null,
          status: "delivered",
        });

        await Conversation.updateOne(
          { _id: conv._id },
          {
            lastMessage: {
              text: cleanText || `[${data.mediaType || "Media"}]`,
              senderId: user?._id || null,
              senderName: senderData.username,
              timestamp: new Date(),
              mediaType: data.mediaType || "text",
              status: "delivered",
            },
          }
        );

        const broadcastMsg = {
          id: newMsg._id.toString(),
          _id: newMsg._id,
          conversationId: conv._id,
          roomId,
          sender: senderData,
          text: cleanText,
          mediaType: data.mediaType || "text",
          mediaUrl: data.mediaUrl || null,
          mediaName: data.mediaName || null,
          replyTo: data.replyTo || null,
          timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
          status: "delivered",
          reactions: [],
        };

        io.to(roomId).emit("message:receive", broadcastMsg);

        socket.to(roomId).emit("typing:stop", {
          userId: user ? user.id : socket.id,
          username: user ? user.username : "Guest",
          roomId,
        });

        // Unit 4: AI & RAG Bot Trigger (@Meta AI or meta-ai channel)
        const isAITarget = roomId === "meta-ai" || /(^|\s)@(meta\s*ai|ai)(\s|$)/i.test(cleanText);
        if (isAITarget) {
          setTimeout(async () => {
            try {
              io.to(roomId).emit("typing:start", {
                userId: "bot_meta_ai",
                username: "Meta AI",
                roomId,
              });

              const recentMsgs = await Message.find({ conversationId: conv._id })
                .sort({ createdAt: -1 })
                .limit(20)
                .lean();
              recentMsgs.reverse();

              const aiAnswer = await aiService.generateResponse(cleanText, recentMsgs);

              const aiMsg = await Message.create({
                conversationId: conv._id,
                roomId,
                sender: {
                  id: "bot_meta_ai",
                  username: "Meta AI",
                  avatar: "https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?auto=format&fit=crop&w=120&h=120&q=80",
                  isAI: true,
                },
                text: aiAnswer,
                status: "read",
              });

              io.to(roomId).emit("typing:stop", {
                userId: "bot_meta_ai",
                username: "Meta AI",
                roomId,
              });

              io.to(roomId).emit("message:receive", {
                id: aiMsg._id.toString(),
                _id: aiMsg._id,
                conversationId: conv._id,
                roomId,
                sender: aiMsg.sender,
                text: aiMsg.text,
                mediaType: "text",
                timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
                status: "read",
                reactions: [],
              });
            } catch (aiErr) {
              console.error("[Socket.IO] AI Bot Error:", aiErr);
            }
          }, 600);
        }
      } catch (err) {
        console.error("[Socket.IO] Error in message:send:", err);
      }
    });

    // 4. Typing indicators
    socket.on("typing:start", ({ roomId }) => {
      const user = activeUsers.get(socket.id);
      if (!user) return;
      const target = roomId || user.currentRoom;
      socket.to(target).emit("typing:start", {
        userId: user.id,
        username: user.username,
        roomId: target,
      });
    });

    socket.on("typing:stop", ({ roomId }) => {
      const user = activeUsers.get(socket.id);
      if (!user) return;
      const target = roomId || user.currentRoom;
      socket.to(target).emit("typing:stop", {
        userId: user.id,
        username: user.username,
        roomId: target,
      });
    });

    // 5. Read receipt acknowledgment (Double blue checkmarks ✓✓)
    socket.on("message:read", async ({ messageId, roomId }) => {
      try {
        if (!messageId) return;

        if (messageId.match(/^[0-9a-fA-F]{24}$/)) {
          await Message.findByIdAndUpdate(messageId, { status: "read" });
        }

        io.to(roomId).emit("message:status_updated", { messageId, status: "read" });
      } catch (err) {
        console.error("[Socket.IO] Error in message:read:", err);
      }
    });

    // 6. Emoji reactions
    socket.on("message:react", async ({ messageId, roomId, emoji }) => {
      try {
        const user = activeUsers.get(socket.id);
        if (!messageId || !emoji) return;

        if (messageId.match(/^[0-9a-fA-F]{24}$/)) {
          const msg = await Message.findById(messageId);
          if (msg) {
            const userId = user?._id || null;
            const exIdx = msg.reactions.findIndex(
              (r) => r.emoji === emoji && r.userId?.toString() === userId?.toString()
            );

            if (exIdx > -1) {
              msg.reactions.splice(exIdx, 1);
            } else {
              msg.reactions.push({
                emoji,
                userId,
                username: user?.username || "Guest",
                createdAt: new Date(),
              });
            }
            await msg.save();

            io.to(roomId).emit("message:reacted", {
              messageId,
              reactions: msg.reactions,
            });
          }
        }
      } catch (err) {
        console.error("[Socket.IO] Error in message:react:", err);
      }
    });

    // 7. WebRTC Audio/Video Call Signaling
    socket.on("call:initiate", (data) => {
      const user = activeUsers.get(socket.id);
      socket.to(data.roomId).emit("call:incoming", {
        caller: user || { username: "Someone" },
        isVideo: data.isVideo,
        offer: data.offer,
        roomId: data.roomId,
      });
    });

    socket.on("call:answer", (data) => {
      socket.to(data.roomId).emit("call:answered", {
        answer: data.answer,
        roomId: data.roomId,
      });
    });

    socket.on("call:ice_candidate", (data) => {
      socket.to(data.roomId).emit("call:ice_candidate", {
        candidate: data.candidate,
        roomId: data.roomId,
      });
    });

    socket.on("call:end", (data) => {
      socket.to(data.roomId).emit("call:ended", {
        roomId: data.roomId,
      });
    });

    // 8. Disconnect lifecycle
    socket.on("disconnect", async () => {
      activeSocketCount = Math.max(0, activeSocketCount - 1);
      const user = activeUsers.get(socket.id);

      if (user) {
        if (user._id) {
          await User.findByIdAndUpdate(user._id, {
            online: false,
            lastSeen: new Date(),
          });
        }
        activeUsers.delete(socket.id);
        io.emit("users:update", Array.from(activeUsers.values()));
        if (process.env.NODE_ENV !== "test") {
          console.log(`[Socket.IO] ${user.username} disconnected. Remaining: ${activeSocketCount}`);
        }
      }
    });
  });

  return { activeUsers };
}

module.exports = { setupSocketIO, activeUsers };
