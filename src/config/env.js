const path = require("path");

module.exports = {
  PORT: process.env.PORT || 5050,
  NODE_ENV: process.env.NODE_ENV || "development",
  MONGO_URI: process.env.MONGO_URI || "mongodb://127.0.0.1:27017/whatsapp_db",
  JWT_SECRET: process.env.JWT_SECRET || "whatsapp_ultra_secure_jwt_secret_2026_salt_8374921",
  JWT_ACCESS_EXPIRES_IN: 86400, // 24 hours
  JWT_REFRESH_EXPIRES_IN: 7 * 86400, // 7 days
  UPLOADS_DIR: path.resolve(__dirname, "../../uploads"),
  MAX_FILE_SIZE: 25 * 1024 * 1024, // 25 MB
  ALLOWED_MIME_TYPES: [
    "image/jpeg",
    "image/png",
    "image/gif",
    "image/webp",
    "image/svg+xml",
    "audio/mpeg",
    "audio/ogg",
    "audio/wav",
    "audio/webm",
    "video/mp4",
    "video/webm",
    "application/pdf",
    "text/plain",
    "application/msword",
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  ],
  AI_BOT_NAME: process.env.AI_BOT_NAME || "Meta AI",
  OPENAI_API_KEY: process.env.OPENAI_API_KEY || "",
};
