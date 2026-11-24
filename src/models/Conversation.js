const mongoose = require("mongoose");

const conversationSchema = new mongoose.Schema(
  {
    type: {
      type: String,
      enum: ["direct", "group"],
      default: "direct",
    },
    // Slug for permanent starter channels ('general', 'webdev', 'devteam') and 'meta-ai'
    slug: {
      type: String,
      unique: true,
      sparse: true,
      trim: true,
      lowercase: true,
    },
    participants: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
        required: true,
      },
    ],
    admins: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
      },
    ],
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
    },
    groupMeta: {
      name: {
        type: String,
        trim: true,
        maxlength: [100, "Group name cannot exceed 100 characters"],
      },
      description: {
        type: String,
        trim: true,
        maxlength: [500, "Group description cannot exceed 500 characters"],
      },
      avatar: {
        type: String,
        default: "https://images.unsplash.com/photo-1522071820081-009f0129c71c?auto=format&fit=crop&w=120&h=120&q=80",
      },
    },
    inviteCode: {
      type: String,
      unique: true,
      sparse: true,
      trim: true,
    },
    lastMessage: {
      text: { type: String, default: "" },
      senderId: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
      senderName: { type: String, default: "" },
      timestamp: { type: Date, default: Date.now },
      mediaType: { type: String, default: "text" },
      status: { type: String, default: "sent" },
    },
    unreadCounts: {
      type: Map,
      of: Number,
      default: {},
    },
  },
  {
    timestamps: true,
  }
);

conversationSchema.index({ participants: 1 });
conversationSchema.index({ updatedAt: -1 });

module.exports = mongoose.model("Conversation", conversationSchema);
