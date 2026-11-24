const mongoose = require("mongoose");

const messageSchema = new mongoose.Schema(
  {
    conversationId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Conversation",
      required: true,
      index: true,
    },
    roomId: {
      type: String,
      index: true,
      trim: true,
    },
    sender: {
      id: { type: String, default: "anon" },
      userId: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
      username: { type: String, default: "Guest" },
      avatar: {
        type: String,
        default: "https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&w=120&h=120&q=80",
      },
      isAI: { type: Boolean, default: false },
    },
    text: {
      type: String,
      default: "",
    },
    mediaType: {
      type: String,
      enum: ["text", "image", "video", "audio", "voice", "document", "file"],
      default: "text",
    },
    mediaUrl: {
      type: String,
      default: null,
    },
    mediaName: {
      type: String,
      default: null,
    },
    mediaSize: {
      type: Number,
      default: null,
    },
    replyTo: {
      messageId: { type: mongoose.Schema.Types.ObjectId, ref: "Message" },
      text: { type: String, default: "" },
      senderName: { type: String, default: "" },
    },
    status: {
      type: String,
      enum: ["sent", "delivered", "read"],
      default: "sent",
    },
    readBy: [
      {
        userId: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
        readAt: { type: Date, default: Date.now },
      },
    ],
    reactions: [
      {
        emoji: { type: String, required: true },
        userId: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
        username: { type: String, default: "User" },
        createdAt: { type: Date, default: Date.now },
      },
    ],
    deletedFor: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
      },
    ],
    isDeletedForEveryone: {
      type: Boolean,
      default: false,
    },
    isEdited: {
      type: Boolean,
      default: false,
    },
  },
  {
    timestamps: true,
  }
);

messageSchema.index({ conversationId: 1, createdAt: -1 });
messageSchema.index({ roomId: 1, createdAt: -1 });
messageSchema.index({ text: "text" });

module.exports = mongoose.model("Message", messageSchema);
