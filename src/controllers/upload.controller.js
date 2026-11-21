const path = require("path");
const fs = require("fs");
const env = require("../config/env");
const { apiSuccess, apiError } = require("../utils/response");

/**
 * Handle secure file upload
 */
function uploadFile(req, res, next) {
  try {
    if (!req.file) {
      return apiError(res, "No file uploaded or file rejected by security filter", 400);
    }

    const file = req.file;
    const fileUrl = `/uploads/${file.filename}`;

    let mediaType = "file";
    if (file.mimetype.startsWith("image/")) mediaType = "image";
    else if (file.mimetype.startsWith("audio/")) mediaType = "voice";
    else if (file.mimetype.startsWith("video/")) mediaType = "video";
    else if (file.mimetype === "application/pdf") mediaType = "document";

    return apiSuccess(
      res,
      {
        url: fileUrl,
        filename: file.filename,
        originalName: file.originalname,
        mimeType: file.mimetype,
        size: file.size,
        mediaType,
      },
      "File uploaded securely",
      201
    );
  } catch (err) {
    next(err);
  }
}

/**
 * Serve uploaded file safely against path traversal
 */
function serveFile(req, res, next) {
  try {
    const filename = path.basename(req.params.filename);
    const filePath = path.join(env.UPLOADS_DIR, filename);

    if (!fs.existsSync(filePath)) {
      return apiError(res, "Requested file not found", 404);
    }

    res.sendFile(filePath);
  } catch (err) {
    next(err);
  }
}

module.exports = {
  uploadFile,
  serveFile,
};
