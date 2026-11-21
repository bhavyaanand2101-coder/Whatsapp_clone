const Message = require("../models/Message");
const Conversation = require("../models/Conversation");
const { sanitizeText } = require("../utils/sanitize");
const { apiSuccess, apiError } = require("../utils/response");

/**
 * Get paginated message history for a conversation or room slug
 */
async function getMessages(req, res, next) {
  try {
    const { conversationId, roomId } = req.params;
    const targetId = conversationId || roomId;
    const limit = Math.min(parseInt(req.query.limit, 10) || 50, 200);
    const before = req.query.before ? new Date(req.query.before) : null;

    let conv = null;
    if (targetId.match(/^[0-9a-fA-F]{24}$/)) {
      conv = await Conversation.findById(targetId);
    } else {
      conv = await Conversation.findOne({ slug: targetId });
    }

    const query = {};
    if (conv) {
      query.conversationId = conv._id;
    } else {
      query.roomId = targetId;
    }

    if (before) {
      query.createdAt = { $lt: before };
    }

    if (req.user) {
      query.deletedFor = { $ne: req.user._id };
    }

    const messages = await Message.find(query)
      .sort({ createdAt: -1 })
      .limit(limit)
      .lean();

    messages.reverse();

    const sanitized = messages.map((m) => {
      const isSender =
        req.user &&
        ((m.sender?.userId && m.sender.userId.toString() === req.user._id.toString()) ||
          m.sender?.id === req.user._id.toString() ||
          m.sender?.id === req.user.username);

      return {
        id: m._id.toString(),
        _id: m._id,
        conversationId: m.conversationId,
        roomId: m.roomId,
        sender: m.sender,
        text: m.isDeletedForEveryone ? "This message was deleted" : m.text,
        mediaType: m.mediaType,
        mediaUrl: m.isDeletedForEveryone ? null : m.mediaUrl,
        mediaName: m.mediaName,
        mediaSize: m.mediaSize,
        replyTo: m.replyTo,
        status: m.status,
        reactions: m.reactions || [],
        isDeletedForEveryone: m.isDeletedForEveryone,
        isOutgoing: isSender,
        timestamp: new Date(m.createdAt).toLocaleTimeString([], {
          hour: "2-digit",
          minute: "2-digit",
        }),
        createdAt: m.createdAt,
      };
    });

    // Return array directly for tests & frontend compatibility
    return res.json(sanitized);
  } catch (err) {
    next(err);
  }
}

/**
 * Send a message via REST endpoint
 */
async function sendMessage(req, res, next) {
  try {
    const {
      conversationId,
      roomId = "general",
      text,
      mediaType = "text",
      mediaUrl = null,
      mediaName = null,
      mediaSize = null,
      replyTo = null,
      sender: customSender,
    } = req.body;

    if (!text || !text.trim()) {
      return apiError(res, "Message text is required", 400);
    }

    let conv = null;
    const targetRoom = conversationId || roomId;

    if (targetRoom.match(/^[0-9a-fA-F]{24}$/)) {
      conv = await Conversation.findById(targetRoom);
    } else {
      conv = await Conversation.findOne({ slug: targetRoom });
    }

    if (!conv) {
      conv = await Conversation.create({
        type: "group",
        slug: targetRoom,
        groupMeta: {
          name: targetRoom.charAt(0).toUpperCase() + targetRoom.slice(1),
          avatar: "https://images.unsplash.com/photo-1522071820081-009f0129c71c?auto=format&fit=crop&w=120&h=120&q=80",
        },
      });
    }

    let senderData = {
      id: "anon",
      username: "Web Guest",
      avatar: "https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&w=100&h=100&q=80",
    };

    if (req.user) {
      senderData = {
        id: req.user._id.toString(),
        userId: req.user._id,
        username: req.user.displayName || req.user.username,
        avatar: req.user.avatar,
      };
    } else if (customSender) {
      senderData = {
        id: customSender.id || "anon",
        username: sanitizeText(customSender.username || "Web Guest"),
        avatar: customSender.avatar || "https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&w=100&h=100&q=80",
      };
    }

    const cleanText = sanitizeText(text.trim());

    const newMsg = await Message.create({
      conversationId: conv._id,
      roomId: conv.slug || targetRoom,
      sender: senderData,
      text: cleanText,
      mediaType,
      mediaUrl,
      mediaName,
      mediaSize,
      replyTo,
      status: "delivered",
    });

    await Conversation.updateOne(
      { _id: conv._id },
      {
        lastMessage: {
          text: cleanText,
          senderId: req.user ? req.user._id : null,
          senderName: senderData.username,
          timestamp: new Date(),
          mediaType,
          status: "delivered",
        },
      }
    );

    const formattedMsg = {
      id: newMsg._id.toString(),
      _id: newMsg._id,
      conversationId: conv._id,
      roomId: conv.slug || targetRoom,
      sender: senderData,
      text: cleanText,
      mediaType,
      mediaUrl,
      replyTo,
      timestamp: new Date(newMsg.createdAt).toLocaleTimeString([], {
        hour: "2-digit",
        minute: "2-digit",
      }),
      status: "delivered",
    };

    const io = req.app.get("io");
    if (io) {
      const roomTarget = conv.slug || conv._id.toString();
      io.to(roomTarget).emit("message:receive", formattedMsg);
      io.to(targetRoom).emit("message:receive", formattedMsg);
    }

    return res.status(201).json(formattedMsg);
  } catch (err) {
    next(err);
  }
}

/**
 * Delete message (for me or for everyone)
 */
async function deleteMessage(req, res, next) {
  try {
    const { id } = req.params;
    const { deleteForEveryone = false } = req.body;

    const message = await Message.findById(id);
    if (!message) {
      return apiError(res, "Message not found", 404);
    }

    if (deleteForEveryone) {
      const isSender =
        req.user &&
        ((message.sender?.userId && message.sender.userId.toString() === req.user._id.toString()) ||
          message.sender?.id === req.user._id.toString() ||
          message.sender?.id === req.user.username);

      if (!isSender) {
        return apiError(res, "You can only delete your own messages for everyone", 403);
      }

      message.isDeletedForEveryone = true;
      message.text = "This message was deleted";
      message.mediaUrl = null;
      await message.save();

      const io = req.app.get("io");
      if (io) {
        const room = message.roomId || message.conversationId.toString();
        io.to(room).emit("message:deleted", { messageId: id, isDeletedForEveryone: true });
      }

      return apiSuccess(res, null, "Message deleted for everyone");
    } else {
      if (req.user) {
        await Message.findByIdAndUpdate(id, {
          $addToSet: { deletedFor: req.user._id },
        });
      }
      return apiSuccess(res, null, "Message deleted for you");
    }
  } catch (err) {
    next(err);
  }
}

/**
 * React to message with emoji
 */
async function reactToMessage(req, res, next) {
  try {
    const { id } = req.params;
    const { emoji } = req.body;

    if (!emoji) {
      return apiError(res, "Emoji is required", 400);
    }

    const message = await Message.findById(id);
    if (!message) {
      return apiError(res, "Message not found", 404);
    }

    const userId = req.user ? req.user._id : null;
    const username = req.user ? req.user.displayName || req.user.username : "Guest";

    const existingIndex = message.reactions.findIndex(
      (r) => r.emoji === emoji && r.userId?.toString() === userId?.toString()
    );

    if (existingIndex > -1) {
      message.reactions.splice(existingIndex, 1);
    } else {
      message.reactions.push({ emoji, userId, username, createdAt: new Date() });
    }

    await message.save();

    const io = req.app.get("io");
    if (io) {
      const room = message.roomId || message.conversationId.toString();
      io.to(room).emit("message:reacted", {
        messageId: id,
        reactions: message.reactions,
      });
    }

    return apiSuccess(res, message.reactions, "Reaction updated");
  } catch (err) {
    next(err);
  }
}

/**
 * Search message content
 */
async function searchMessages(req, res, next) {
  try {
    const { q, conversationId } = req.query;
    if (!q || !q.trim()) {
      return apiError(res, "Search query 'q' is required", 400);
    }

    const filter = {
      text: { $regex: q.trim(), $options: "i" },
      isDeletedForEveryone: false,
    };

    if (conversationId) {
      filter.conversationId = conversationId;
    }

    if (req.user) {
      filter.deletedFor = { $ne: req.user._id };
    }

    const results = await Message.find(filter)
      .limit(30)
      .sort({ createdAt: -1 })
      .lean();

    return apiSuccess(res, results);
  } catch (err) {
    next(err);
  }
}

module.exports = {
  getMessages,
  sendMessage,
  deleteMessage,
  reactToMessage,
  searchMessages,
};
