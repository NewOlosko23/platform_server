// routes/authRoutes.js
import express from "express";
import { register, login, logout, resetTradingData } from "../controllers/authController.js";
import { validateRegistration, validateLogin } from "../middleware/validation.js";
import { authenticate } from "../middleware/authMiddleware.js";

const router = express.Router();

router.post("/register", validateRegistration, register);
router.post("/login", validateLogin, login);
router.post("/logout", authenticate, logout);
router.post("/reset-trading-data", authenticate, resetTradingData);

export default router;
