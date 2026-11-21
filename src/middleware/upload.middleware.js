const multer = require("multer");
const path = require("path");
const fs = require("fs");
const crypto = require("crypto");
const env = require("../config/env");

if (!fs.existsSync(env.UPLOADS_DIR)) {
  fs.mkdirSync(env.UPLOADS_DIR, { recursive: true });
}

// Secure storage configuration: cryptographic random filename
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, env.UPLOADS_DIR);
  },
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    const safeBase = crypto.randomBytes(16).toString("hex");
    cb(null, `${safeBase}${ext}`);
  },
});

// Strict MIME type validation
const fileFilter = (req, file, cb) => {
  if (env.ALLOWED_MIME_TYPES.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error(`File type '${file.mimetype}' is not permitted for upload.`));
  }
};

const upload = multer({
  storage,
  limits: {
    fileSize: env.MAX_FILE_SIZE, // 25 MB
  },
  fileFilter,
});

module.exports = upload;
