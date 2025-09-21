import Watchlist from '../models/Watchlist.js';
import { fetchStockPrice } from '../utils/stockApi.js';
import { 
  getAssetPrice, 
  searchAssets, 
  getAvailableAssets, 
  updateWatchlistItemPrice 
} from '../services/unifiedAssetService.js';

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

// Add asset to watchlist
export const addToWatchlist = async (req, res) => {
  try {
    const userId = req.user.id;
    const { assetType, symbol, name, addedPrice, metadata } = req.body;
    
    if (!assetType || !symbol) {
      return res.status(400).json({ 
        success: false, 
        message: 'Asset type and symbol are required' 
      });
    }

    if (!['stock', 'crypto', 'currency'].includes(assetType)) {
      return res.status(400).json({ 
        success: false, 
        message: 'Invalid asset type. Must be stock, crypto, or currency' 
      });
    }

    // Check if asset is already in watchlist
    const existingItem = await Watchlist.findOne({ 
      userId, 
      assetType, 
      symbol: symbol.toUpperCase() 
    });
    
    if (existingItem) {
      return res.status(400).json({ 
        success: false, 
        message: `${assetType} ${symbol} is already in your watchlist` 
      });
    }

    // Get current price if not provided
    let currentPrice = addedPrice;
    if (!currentPrice) {
      try {
        const priceData = await getAssetPrice(assetType, symbol);
        currentPrice = priceData.price;
      } catch (error) {
        console.warn(`Could not fetch current price for ${symbol}:`, error.message);
        currentPrice = 0;
      }
    }

    // Create new watchlist item
    const watchlistItem = new Watchlist({
      userId,
      assetType,
      symbol: symbol.toUpperCase(),
      name: name || symbol,
      addedPrice: currentPrice,
      currentPrice: currentPrice,
      priceChange: 0,
      priceChangePercent: 0,
      metadata: metadata || {}
    });

    await watchlistItem.save();

    res.json({
      success: true,
      message: `${assetType} ${symbol} added to watchlist`,
      data: watchlistItem
    });
  } catch (err) {
    console.error('Add to watchlist error:', err);
    if (err.code === 11000) {
      // Duplicate key error
      res.status(400).json({ 
        success: false, 
        message: 'Asset is already in your watchlist' 
      });
    } else {
      res.status(500).json({ 
        success: false,
        error: err.message,
        message: 'Failed to add asset to watchlist'
      });
    }
  }
};

// Remove asset from watchlist
export const removeFromWatchlist = async (req, res) => {
  try {
    const userId = req.user.id;
    const { assetType, symbol } = req.params;
    
    if (!assetType || !symbol) {
      return res.status(400).json({ 
        success: false, 
        message: 'Asset type and symbol are required' 
      });
    }

    const deletedItem = await Watchlist.findOneAndDelete({ 
      userId, 
      assetType,
      symbol: symbol.toUpperCase() 
    });

    if (!deletedItem) {
      return res.status(404).json({ 
        success: false, 
        message: `${assetType} ${symbol} not found in watchlist` 
      });
    }

    res.json({
      success: true,
      message: `${assetType} ${symbol} removed from watchlist`,
      data: deletedItem
    });
  } catch (err) {
    console.error('Remove from watchlist error:', err);
    res.status(500).json({ 
      success: false,
      error: err.message,
      message: 'Failed to remove asset from watchlist'
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

    // Update prices for all items using unified service
    const updatedItems = await Promise.all(
      watchlistItems.map(async (item) => {
        try {
          const updatedItem = await updateWatchlistItemPrice(item);
          await updatedItem.save();
          return updatedItem;
        } catch (err) {
          console.warn(`Failed to update price for ${item.assetType} ${item.symbol}:`, err.message);
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

// Check if asset is in user's watchlist
export const checkWatchlistItem = async (req, res) => {
  try {
    const userId = req.user.id;
    const { assetType, symbol } = req.params;
    
    if (!assetType || !symbol) {
      return res.status(400).json({ 
        success: false, 
        message: 'Asset type and symbol are required' 
      });
    }

    const watchlistItem = await Watchlist.findOne({ 
      userId, 
      assetType,
      symbol: symbol.toUpperCase() 
    });

    res.json({
      success: true,
      data: {
        assetType,
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

// Search for assets to add to watchlist
export const searchAssetsForWatchlist = async (req, res) => {
  try {
    const { query, assetType, limit = 10 } = req.query;
    
    if (!query || query.trim().length < 1) {
      return res.status(400).json({ 
        success: false, 
        message: 'Search query is required' 
      });
    }

    const results = await searchAssets(query.trim(), assetType, parseInt(limit));
    
    res.json({
      success: true,
      data: results,
      query: query.trim(),
      assetType: assetType || 'all'
    });
  } catch (err) {
    console.error('Search assets error:', err);
    res.status(500).json({ 
      success: false,
      error: err.message,
      message: 'Failed to search assets'
    });
  }
};

// Get available assets for watchlist
export const getAvailableAssetsForWatchlist = async (req, res) => {
  try {
    const { assetType } = req.query;
    
    const assets = await getAvailableAssets(assetType);
    
    res.json({
      success: true,
      data: assets,
      assetType: assetType || 'all'
    });
  } catch (err) {
    console.error('Get available assets error:', err);
    res.status(500).json({ 
      success: false,
      error: err.message,
      message: 'Failed to get available assets'
    });
  }
};
