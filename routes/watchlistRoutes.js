import express from "express";
import { 
  getUserWatchlist, 
  addToWatchlist, 
  removeFromWatchlist, 
  updateWatchlistPrices,
  checkWatchlistItem 
} from "../controllers/watchlistController.js";
import { authenticate } from "../middleware/authMiddleware.js";

const router = express.Router();

// All watchlist routes require authentication
router.use(authenticate);

// Get user's watchlist
router.get("/", getUserWatchlist);

// Add stock to watchlist
router.post("/", addToWatchlist);

// Remove stock from watchlist
router.delete("/:symbol", removeFromWatchlist);

// Update all watchlist item prices
router.put("/update-prices", updateWatchlistPrices);

// Check if specific stock is in user's watchlist
router.get("/check/:symbol", checkWatchlistItem);

export default router;
