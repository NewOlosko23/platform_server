// routes/unifiedTradeRoutes.js
import express from "express";
import { 
  buyAsset, 
  sellAsset, 
  getAssetPrice, 
  searchAssets, 
  getUserTrades,
  getTradeFees 
} from "../controllers/unifiedTradeController.js";
import { authenticate } from "../middleware/authMiddleware.js";

const router = express.Router();

// Public routes (no authentication required)
router.get("/price/:assetType/:symbol", getAssetPrice);
router.get("/search", searchAssets);
router.get("/fees", getTradeFees);

// Protected routes (authentication required)
router.get("/", authenticate, getUserTrades);
router.post("/buy", authenticate, buyAsset);
router.post("/sell", authenticate, sellAsset);

export default router;
