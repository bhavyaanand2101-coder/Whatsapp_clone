const mongoose = require("mongoose");

const auditLogSchema = new mongoose.Schema(
  {
    action: {
      type: String,
      required: true,
      index: true,
    },
    actor: {
      userId: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
      username: { type: String, default: "anonymous" },
      ip: { type: String, default: "127.0.0.1" },
      userAgent: { type: String, default: "unknown" },
    },
    targetResource: {
      type: { type: String, default: "general" },
      id: { type: String, default: "" },
    },
    details: {
      type: mongoose.Schema.Types.Mixed,
      default: {},
    },
    status: {
      type: String,
      enum: ["success", "failure", "warning"],
      default: "success",
    },
  },
  {
    timestamps: true,
  }
);

auditLogSchema.index({ createdAt: -1 });

module.exports = mongoose.model("AuditLog", auditLogSchema);
