const mongoose = require("mongoose");

const messageReceiptSchema = new mongoose.Schema(
  {
    messageId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Message",
      required: true,
      index: true,
    },
    recipientId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    status: {
      type: String,
      enum: ["sent", "delivered", "read"],
      default: "delivered",
    },
    deliveredAt: {
      type: Date,
      default: Date.now,
    },
    readAt: {
      type: Date,
    },
  },
  {
    timestamps: true,
  }
);

messageReceiptSchema.index({ messageId: 1, recipientId: 1 }, { unique: true });

module.exports = mongoose.model("MessageReceipt", messageReceiptSchema);
