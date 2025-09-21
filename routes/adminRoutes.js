// routes/adminRoutes.js
import express from "express";
import { 
  getAllUsers, 
  getUserDetails,
  getUserTrades, 
  updateUser,
  banUser,
  getPlatformStats,
  getSystemHealth
} from "../controllers/adminController.js";
import { 
  getSystemSettings,
  updateSystemSettings,
  getActivityLogs,
  getUserActivitySummary
} from "../controllers/adminControllerAdditional.js";
import { authenticate, authorizeRoles } from "../middleware/authMiddleware.js";
import OHLCV from "../models/OHLCV.js";

const router = express.Router();

// Platform Statistics
router.get("/stats", authenticate, authorizeRoles("admin"), getPlatformStats);
router.get("/system-health", authenticate, authorizeRoles("admin"), getSystemHealth);

// System Settings
router.get("/settings", authenticate, authorizeRoles("admin"), getSystemSettings);
router.put("/settings", authenticate, authorizeRoles("admin"), updateSystemSettings);

// Activity Monitoring
router.get("/activity", authenticate, authorizeRoles("admin"), getActivityLogs);
router.get("/users/:userId/activity", authenticate, authorizeRoles("admin"), getUserActivitySummary);

// User Management
router.get("/users", authenticate, authorizeRoles("admin"), getAllUsers);
router.get("/users/:userId", authenticate, authorizeRoles("admin"), getUserDetails);
router.get("/users/:userId/trades", authenticate, authorizeRoles("admin"), getUserTrades);
router.put("/users/:userId", authenticate, authorizeRoles("admin"), updateUser);
router.patch("/users/:userId/ban", authenticate, authorizeRoles("admin"), banUser);

// Assets Management
router.get("/assets/overview", authenticate, authorizeRoles("admin"), async (req, res) => {
  try {
    // Get latest data for each asset type with more comprehensive stats
    const [stocks, crypto, currencies] = await Promise.all([
      OHLCV.aggregate([
        { $match: { type: "stock" } },
        { $sort: { symbol: 1, timestamp: -1 } },
        { $group: { _id: "$symbol", latest: { $first: "$$ROOT" } } },
        { $replaceRoot: { newRoot: "$latest" } },
        { $sort: { symbol: 1 } }
      ]),
      OHLCV.aggregate([
        { $match: { type: "crypto" } },
        { $sort: { symbol: 1, timestamp: -1 } },
        { $group: { _id: "$symbol", latest: { $first: "$$ROOT" } } },
        { $replaceRoot: { newRoot: "$latest" } },
        { $sort: { symbol: 1 } }
      ]),
      OHLCV.aggregate([
        { $match: { type: "currency" } },
        { $sort: { symbol: 1, timestamp: -1 } },
        { $group: { _id: "$symbol", latest: { $first: "$$ROOT" } } },
        { $replaceRoot: { newRoot: "$latest" } },
        { $sort: { symbol: 1 } }
      ])
    ]);

    // Get asset counts and health status
    const [stockCount, cryptoCount, currencyCount] = await Promise.all([
      OHLCV.distinct("symbol", { type: "stock" }),
      OHLCV.distinct("symbol", { type: "crypto" }),
      OHLCV.distinct("symbol", { type: "currency" })
    ]);

    // Check data freshness (last 5 minutes)
    const now = new Date();
    const fiveMinutesAgo = new Date(now.getTime() - 5 * 60 * 1000);

    res.json({
      success: true,
      data: {
        overview: {
          stocks: {
            count: stockCount.length,
            totalRecords: stocks.length,
            isHealthy: stocks.some(asset => asset.timestamp > fiveMinutesAgo),
            lastUpdate: stocks.length > 0 ? Math.max(...stocks.map(s => s.timestamp)) : null
          },
          crypto: {
            count: cryptoCount.length,
            totalRecords: crypto.length,
            isHealthy: crypto.some(asset => asset.timestamp > fiveMinutesAgo),
            lastUpdate: crypto.length > 0 ? Math.max(...crypto.map(c => c.timestamp)) : null
          },
          currencies: {
            count: currencyCount.length,
            totalRecords: currencies.length,
            isHealthy: currencies.some(asset => asset.timestamp > fiveMinutesAgo),
            lastUpdate: currencies.length > 0 ? Math.max(...currencies.map(c => c.timestamp)) : null
          }
        },
        assets: {
          stocks: stocks.slice(0, 20).map(asset => ({
            symbol: asset.symbol,
            price: asset.valueKES,
            timestamp: asset.timestamp,
            source: asset.source,
            lastUpdated: asset.lastUpdated,
            isRecent: asset.timestamp > fiveMinutesAgo
          })),
          crypto: crypto.slice(0, 20).map(asset => ({
            symbol: asset.symbol,
            price: asset.valueKES,
            timestamp: asset.timestamp,
            source: asset.source,
            lastUpdated: asset.lastUpdated,
            isRecent: asset.timestamp > fiveMinutesAgo
          })),
          currencies: currencies.slice(0, 20).map(asset => ({
            symbol: asset.symbol,
            price: asset.valueKES,
            timestamp: asset.timestamp,
            source: asset.source,
            lastUpdated: asset.lastUpdated,
            isRecent: asset.timestamp > fiveMinutesAgo
          }))
        }
      }
    });
  } catch (error) {
    console.error("Error getting assets overview:", error);
    res.status(500).json({
      success: false,
      message: "Failed to get assets overview",
      error: error.message
    });
  }
});

// Search assets for admin management
router.get("/assets/search/:type", authenticate, authorizeRoles("admin"), async (req, res) => {
  try {
    const { type } = req.params;
    const { query, limit = 50 } = req.query;
    
    // Validate asset type
    if (!["stock", "crypto", "currency"].includes(type)) {
      return res.status(400).json({
        success: false,
        message: "Invalid asset type. Must be: stock, crypto, or currency"
      });
    }
    
    // Build search query
    const searchQuery = { type: type };
    if (query) {
      searchQuery.symbol = { $regex: query, $options: "i" };
    }
    
    // Get distinct symbols with latest data and admin details
    const assets = await OHLCV.aggregate([
      { $match: searchQuery },
      { $sort: { symbol: 1, timestamp: -1 } },
      { $group: {
        _id: "$symbol",
        latest: { $first: "$$ROOT" },
        totalRecords: { $sum: 1 },
        firstSeen: { $min: "$timestamp" },
        lastSeen: { $max: "$timestamp" }
      }},
      { $replaceRoot: { newRoot: "$latest" } },
      { $addFields: {
        totalRecords: "$totalRecords",
        firstSeen: "$firstSeen",
        lastSeen: "$lastSeen"
      }},
      { $sort: { symbol: 1 } },
      { $limit: parseInt(limit) }
    ]);
    
    res.json({
      success: true,
      data: {
        type: type,
        assets: assets.map(asset => ({
          symbol: asset.symbol,
          price: asset.valueKES,
          timestamp: asset.timestamp,
          source: asset.source,
          lastUpdated: asset.lastUpdated,
          totalRecords: asset.totalRecords,
          firstSeen: asset.firstSeen,
          lastSeen: asset.lastSeen,
          metadata: asset.metadata
        })),
        count: assets.length
      }
    });
  } catch (error) {
    console.error("Error searching assets:", error);
    res.status(500).json({
      success: false,
      message: "Failed to search assets",
      error: error.message
    });
  }
});

// Get asset list for admin management
router.get("/assets/list/:type", authenticate, authorizeRoles("admin"), async (req, res) => {
  try {
    const { type } = req.params;
    
    // Validate asset type
    if (!["stock", "crypto", "currency"].includes(type)) {
      return res.status(400).json({
        success: false,
        message: "Invalid asset type. Must be: stock, crypto, or currency"
      });
    }
    
    // Get all available symbols with additional admin info
    const symbols = await OHLCV.aggregate([
      { $match: { type: type } },
      { $group: {
        _id: "$symbol",
        totalRecords: { $sum: 1 },
        firstSeen: { $min: "$timestamp" },
        lastSeen: { $max: "$timestamp" },
        latestPrice: { $first: "$valueKES" }
      }},
      { $sort: { _id: 1 } }
    ]);
    
    res.json({
      success: true,
      data: {
        type: type,
        symbols: symbols.map(symbol => ({
          symbol: symbol._id,
          totalRecords: symbol.totalRecords,
          firstSeen: symbol.firstSeen,
          lastSeen: symbol.lastSeen,
          latestPrice: symbol.latestPrice
        })),
        count: symbols.length
      }
    });
  } catch (error) {
    console.error("Error getting asset list:", error);
    res.status(500).json({
      success: false,
      message: "Failed to get asset list",
      error: error.message
    });
  }
});

// Get specific asset details for admin
router.get("/assets/:type/:symbol", authenticate, authorizeRoles("admin"), async (req, res) => {
  try {
    const { type, symbol } = req.params;
    
    // Validate asset type
    if (!["stock", "crypto", "currency"].includes(type)) {
      return res.status(400).json({
        success: false,
        message: "Invalid asset type. Must be: stock, crypto, or currency"
      });
    }
    
    // Get latest price and historical data
    const [latest, historical] = await Promise.all([
      OHLCV.getLatestPrice(type, symbol),
      OHLCV.getHistoricalData(type, symbol, 100)
    ]);
    
    if (!latest) {
      return res.status(404).json({
        success: false,
        message: `No data found for ${type}:${symbol}`
      });
    }
    
    // Get additional statistics
    const stats = await OHLCV.aggregate([
      { $match: { type: type, symbol: symbol } },
      { $group: {
        _id: null,
        totalRecords: { $sum: 1 },
        firstSeen: { $min: "$timestamp" },
        lastSeen: { $max: "$timestamp" },
        avgPrice: { $avg: "$valueKES" },
        minPrice: { $min: "$valueKES" },
        maxPrice: { $max: "$valueKES" }
      }}
    ]);
    
    res.json({
      success: true,
      data: {
        asset: {
          type: latest.type,
          symbol: latest.symbol,
          currentPrice: latest.valueKES,
          timestamp: latest.timestamp,
          source: latest.source,
          lastUpdated: latest.lastUpdated,
          metadata: latest.metadata
        },
        statistics: stats[0] || {},
        recentHistory: historical.slice(0, 20).map(item => ({
          timestamp: item.timestamp,
          open: item.open,
          high: item.high,
          low: item.low,
          close: item.close,
          volume: item.volume,
          valueKES: item.valueKES
        }))
      }
    });
  } catch (error) {
    console.error("Error getting asset details:", error);
    res.status(500).json({
      success: false,
      message: "Failed to get asset details",
      error: error.message
    });
  }
});

export default router;
