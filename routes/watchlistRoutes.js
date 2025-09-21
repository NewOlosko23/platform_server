import express from "express";
import { 
  getUserWatchlist, 
  addToWatchlist, 
  removeFromWatchlist, 
  updateWatchlistPrices,
  checkWatchlistItem,
  searchAssetsForWatchlist,
  getAvailableAssetsForWatchlist
} from "../controllers/watchlistController.js";
import { authenticate } from "../middleware/authMiddleware.js";

const router = express.Router();

// All watchlist routes require authentication
router.use(authenticate);

// Get user's watchlist
router.get("/", getUserWatchlist);

// Add asset to watchlist
router.post("/", addToWatchlist);

// Remove asset from watchlist
router.delete("/:assetType/:symbol", removeFromWatchlist);

// Update all watchlist item prices
router.put("/update-prices", updateWatchlistPrices);

// Check if specific asset is in user's watchlist
router.get("/check/:assetType/:symbol", checkWatchlistItem);

// Search for assets to add to watchlist
router.get("/search", searchAssetsForWatchlist);

// Get available assets for watchlist
router.get("/available", getAvailableAssetsForWatchlist);

export default router;
