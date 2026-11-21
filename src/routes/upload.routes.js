const express = require("express");
const router = express.Router();
const uploadController = require("../controllers/upload.controller");
const uploadMiddleware = require("../middleware/upload.middleware");
const { optionalAuth } = require("../middleware/auth.middleware");

router.post("/", optionalAuth, uploadMiddleware.single("file"), uploadController.uploadFile);

module.exports = router;
