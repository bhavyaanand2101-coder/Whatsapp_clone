const express = require("express");
const router = express.Router();
const authController = require("../controllers/auth.controller");
const { requireAuth } = require("../middleware/auth.middleware");

// Public auth endpoints
router.post("/register", authController.register);
router.post("/login", authController.login);
router.post("/refresh", authController.refresh);
router.post("/logout", authController.logout);

// Protected user endpoints
router.get("/me", requireAuth, authController.getMe);
router.put("/profile", requireAuth, authController.updateProfile);
router.post("/users/:targetUserId/block", requireAuth, authController.blockUser);
router.delete("/users/:targetUserId/block", requireAuth, authController.unblockUser);
router.get("/users", requireAuth, authController.listUsers);

module.exports = router;
