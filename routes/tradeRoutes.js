// routes/tradeRoutes.js
import express from "express";
import { buyStock, sellStock, getStockPrice, searchStocks, getUserTrades, getTradeFees } from "../controllers/tradeController.js";
import { authenticate } from "../middleware/authMiddleware.js";

const router = express.Router();

// Public routes
router.get("/stock/:symbol", getStockPrice);
router.get("/search", searchStocks);
router.get("/fees", getTradeFees); // Get fee information for a trade

// Protected routes
router.get("/", authenticate, getUserTrades);
router.post("/buy", authenticate, buyStock);
router.post("/sell", authenticate, sellStock);

export default router;
