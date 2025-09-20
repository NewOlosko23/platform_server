import Watchlist from '../models/Watchlist.js';
import { fetchStockPrice } from '../utils/stockApi.js';

// Get user's watchlist
export const getUserWatchlist = async (req, res) => {
  try {
    const userId = req.user.id;
    
    const watchlistItems = await Watchlist.find({ userId })
      .sort({ addedAt: -1 });
    
    res.json({
      success: true,
      data: watchlistItems,
      count: watchlistItems.length
    });
  } catch (err) {
    console.error('Get user watchlist error:', err);
    res.status(500).json({ 
      success: false,
      error: err.message,
      message: 'Failed to fetch watchlist'
    });
  }
};

// Add stock to watchlist
export const addToWatchlist = async (req, res) => {
  try {
    const userId = req.user.id;
    const { symbol, company, currentPrice, change, changePercent } = req.body;
    
    if (!symbol) {
      return res.status(400).json({ 
        success: false, 
        message: 'Stock symbol is required' 
      });
    }

    // Check if stock is already in watchlist
    const existingItem = await Watchlist.findOne({ userId, symbol: symbol.toUpperCase() });
    if (existingItem) {
      return res.status(400).json({ 
        success: false, 
        message: 'Stock is already in your watchlist' 
      });
    }

    // Create new watchlist item
    const watchlistItem = new Watchlist({
      userId,
      symbol: symbol.toUpperCase(),
      company: company || symbol,
      currentPrice: currentPrice || 0,
      change: change || 0,
      changePercent: changePercent || 0
    });

    await watchlistItem.save();

    res.json({
      success: true,
      message: `${symbol} added to watchlist`,
      data: watchlistItem
    });
  } catch (err) {
    console.error('Add to watchlist error:', err);
    if (err.code === 11000) {
      // Duplicate key error
      res.status(400).json({ 
        success: false, 
        message: 'Stock is already in your watchlist' 
      });
    } else {
      res.status(500).json({ 
        success: false,
        error: err.message,
        message: 'Failed to add stock to watchlist'
      });
    }
  }
};

// Remove stock from watchlist
export const removeFromWatchlist = async (req, res) => {
  try {
    const userId = req.user.id;
    const { symbol } = req.params;
    
    if (!symbol) {
      return res.status(400).json({ 
        success: false, 
        message: 'Stock symbol is required' 
      });
    }

    const deletedItem = await Watchlist.findOneAndDelete({ 
      userId, 
      symbol: symbol.toUpperCase() 
    });

    if (!deletedItem) {
      return res.status(404).json({ 
        success: false, 
        message: 'Stock not found in watchlist' 
      });
    }

    res.json({
      success: true,
      message: `${symbol} removed from watchlist`,
      data: deletedItem
    });
  } catch (err) {
    console.error('Remove from watchlist error:', err);
    res.status(500).json({ 
      success: false,
      error: err.message,
      message: 'Failed to remove stock from watchlist'
    });
  }
};

// Update watchlist item prices
export const updateWatchlistPrices = async (req, res) => {
  try {
    const userId = req.user.id;
    
    // Get all watchlist items for the user
    const watchlistItems = await Watchlist.find({ userId });
    
    if (watchlistItems.length === 0) {
      return res.json({
        success: true,
        message: 'No items in watchlist to update',
        data: []
      });
    }

    // Update prices for all items
    const updatedItems = await Promise.all(
      watchlistItems.map(async (item) => {
        try {
          const stockData = await fetchStockPrice(item.symbol);
          item.currentPrice = stockData.price || item.currentPrice;
          item.change = stockData.change || item.change;
          item.changePercent = stockData.changePercent || item.changePercent;
          item.lastUpdated = new Date();
          await item.save();
          return item;
        } catch (err) {
          console.warn(`Failed to update price for ${item.symbol}:`, err.message);
          return item; // Return original item if update fails
        }
      })
    );

    res.json({
      success: true,
      message: 'Watchlist prices updated',
      data: updatedItems,
      count: updatedItems.length
    });
  } catch (err) {
    console.error('Update watchlist prices error:', err);
    res.status(500).json({ 
      success: false,
      error: err.message,
      message: 'Failed to update watchlist prices'
    });
  }
};

// Check if stock is in user's watchlist
export const checkWatchlistItem = async (req, res) => {
  try {
    const userId = req.user.id;
    const { symbol } = req.params;
    
    if (!symbol) {
      return res.status(400).json({ 
        success: false, 
        message: 'Stock symbol is required' 
      });
    }

    const watchlistItem = await Watchlist.findOne({ 
      userId, 
      symbol: symbol.toUpperCase() 
    });

    res.json({
      success: true,
      data: {
        symbol: symbol.toUpperCase(),
        inWatchlist: !!watchlistItem,
        item: watchlistItem
      }
    });
  } catch (err) {
    console.error('Check watchlist item error:', err);
    res.status(500).json({ 
      success: false,
      error: err.message,
      message: 'Failed to check watchlist item'
    });
  }
};
