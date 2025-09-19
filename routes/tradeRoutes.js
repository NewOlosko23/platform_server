// routes/tradeRoutes.js
import express from "express";
import { buyStock, sellStock, getStockPrice } from "../controllers/tradeController.js";
import { authenticate } from "../middleware/authMiddleware.js";

const router = express.Router();

// Public route for testing stock price API
router.get("/stock/:symbol", getStockPrice);
router.post("/buy", authenticate, buyStock);
router.post("/sell", authenticate, sellStock);

export default router;
