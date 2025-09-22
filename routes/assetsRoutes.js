import express from "express";
import { 
  getLatestCryptoPrice, 
  getHistoricalCryptoData 
} from "../services/cryptoFetcher.js";
import { 
  getLatestFXRate, 
  getHistoricalFXData,
  getAllLatestFXRates,
  getAvailableCurrencyPairs 
} from "../services/fxFetcher.js";
import { getLatestStockPrice, getHistoricalStockData } from "../services/stockFetcher.js";
import OHLCV from "../models/OHLCV.js";

const router = express.Router();

/**
 * Get latest price for any asset type
 * GET /api/assets/latest/:type/:symbol
 */
router.get("/latest/:type/:symbol", async (req, res) => {
  try {
    const { type, symbol } = req.params;
    
    // Validate asset type
    if (!["stock", "crypto", "currency"].includes(type)) {
      return res.status(400).json({
        success: false,
        message: "Invalid asset type. Must be: stock, crypto, or currency"
      });
    }
    
    // Get latest price from MongoDB for all asset types
    const latest = await OHLCV.getLatestPrice(type, symbol);
    
    if (!latest) {
      return res.status(404).json({
        success: false,
        message: `No data found for ${type}:${symbol}`
      });
    }
    
    res.json({
      success: true,
      data: {
        type: latest.type,
        symbol: latest.symbol,
        price: latest.valueKES,
        volume: latest.volume || null,
        change: latest.metadata?.change || null,
        timestamp: latest.timestamp,
        source: latest.source,
        lastUpdated: latest.lastUpdated,
        metadata: latest.metadata
      }
    });
    
  } catch (error) {
    console.error("Error getting latest price:", error);
    res.status(500).json({
      success: false,
      message: "Failed to get latest price",
      error: error.message
    });
  }
});

/**
 * Get historical data for any asset type
 * GET /api/assets/history/:type/:symbol?limit=100
 */
router.get("/history/:type/:symbol", async (req, res) => {
  try {
    const { type, symbol } = req.params;
    const limit = parseInt(req.query.limit) || 100;
    
    // Validate asset type
    if (!["stock", "crypto", "currency"].includes(type)) {
      return res.status(400).json({
        success: false,
        message: "Invalid asset type. Must be: stock, crypto, or currency"
      });
    }
    
    // Get historical data from MongoDB
    const historical = await OHLCV.getHistoricalData(type, symbol, limit);
    
    if (!historical || historical.length === 0) {
      return res.status(404).json({
        success: false,
        message: `No historical data found for ${type}:${symbol}`
      });
    }
    
    res.json({
      success: true,
      data: {
        type: type,
        symbol: symbol,
        historical: historical.map(item => ({
          timestamp: item.timestamp,
          open: item.open,
          high: item.high,
          low: item.low,
          close: item.close,
          volume: item.volume,
          valueKES: item.valueKES
        })),
        count: historical.length
      }
    });
    
  } catch (error) {
    console.error("Error getting historical data:", error);
    res.status(500).json({
      success: false,
      message: "Failed to get historical data",
      error: error.message
    });
  }
});

/**
 * Search assets by type
 * GET /api/assets/search/:type?query=btc&limit=10
 */
router.get("/search/:type", async (req, res) => {
  try {
    const { type } = req.params;
    const { query, limit = 10 } = req.query;
    
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
    
    // Get distinct symbols with latest data
    const assets = await OHLCV.aggregate([
      { $match: searchQuery },
      { $sort: { symbol: 1, timestamp: -1 } },
      { $group: {
        _id: "$symbol",
        latest: { $first: "$$ROOT" }
      }},
      { $replaceRoot: { newRoot: "$latest" } },
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

/**
 * Get all available assets by type
 * GET /api/assets/list/:type
 */
router.get("/list/:type", async (req, res) => {
  try {
    const { type } = req.params;
    
    // Validate asset type
    if (!["stock", "crypto", "currency"].includes(type)) {
      return res.status(400).json({
        success: false,
        message: "Invalid asset type. Must be: stock, crypto, or currency"
      });
    }
    
    // Get all available symbols for this type from database
    const symbols = await OHLCV.distinct("symbol", { type: type });
    
    res.json({
      success: true,
      data: {
        type: type,
        symbols: symbols.sort(),
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

/**
 * Get market overview for all asset types
 * GET /api/assets/overview
 */
router.get("/overview", async (req, res) => {
  try {
    // Get latest data for each asset type
    const [stocks, crypto, currencies] = await Promise.all([
      OHLCV.aggregate([
        { $match: { type: "stock" } },
        { $sort: { symbol: 1, timestamp: -1 } },
        { $group: { _id: "$symbol", latest: { $first: "$$ROOT" } } },
        { $replaceRoot: { newRoot: "$latest" } },
        { $limit: 10 }
      ]),
      OHLCV.aggregate([
        { $match: { type: "crypto" } },
        { $sort: { symbol: 1, timestamp: -1 } },
        { $group: { _id: "$symbol", latest: { $first: "$$ROOT" } } },
        { $replaceRoot: { newRoot: "$latest" } },
        { $limit: 10 }
      ]),
      OHLCV.aggregate([
        { $match: { type: "currency" } },
        { $sort: { symbol: 1, timestamp: -1 } },
        { $group: { _id: "$symbol", latest: { $first: "$$ROOT" } } },
        { $replaceRoot: { newRoot: "$latest" } },
        { $limit: 10 }
      ])
    ]);
    
    res.json({
      success: true,
      data: {
        stocks: {
          count: stocks.length,
          assets: stocks.map(asset => ({
            symbol: asset.symbol,
            price: asset.valueKES,
            lastUpdated: asset.lastUpdated
          }))
        },
        crypto: {
          count: crypto.length,
          assets: crypto.map(asset => ({
            symbol: asset.symbol,
            price: asset.valueKES,
            lastUpdated: asset.lastUpdated
          }))
        },
        currencies: {
          count: currencies.length,
          assets: currencies.map(asset => ({
            symbol: asset.symbol,
            price: asset.valueKES,
            lastUpdated: asset.lastUpdated
          }))
        }
      }
    });
    
  } catch (error) {
    console.error("Error getting market overview:", error);
    res.status(500).json({
      success: false,
      message: "Failed to get market overview",
      error: error.message
    });
  }
});

/**
 * Get price range for an asset
 * GET /api/assets/range/:type/:symbol?start=1695300000&end=1695300000
 */
router.get("/range/:type/:symbol", async (req, res) => {
  try {
    const { type, symbol } = req.params;
    const { start, end } = req.query;
    
    // Validate asset type
    if (!["stock", "crypto", "currency"].includes(type)) {
      return res.status(400).json({
        success: false,
        message: "Invalid asset type. Must be: stock, crypto, or currency"
      });
    }
    
    // Validate time range
    if (!start || !end) {
      return res.status(400).json({
        success: false,
        message: "Start and end timestamps are required"
      });
    }
    
    const startTime = parseInt(start);
    const endTime = parseInt(end);
    
    if (isNaN(startTime) || isNaN(endTime)) {
      return res.status(400).json({
        success: false,
        message: "Invalid timestamp format"
      });
    }
    
    // Get price range from MongoDB
    const range = await OHLCV.getPriceRange(type, symbol, startTime, endTime);
    
    res.json({
      success: true,
      data: {
        type: type,
        symbol: symbol,
        startTime: startTime,
        endTime: endTime,
        data: range.map(item => ({
          timestamp: item.timestamp,
          open: item.open,
          high: item.high,
          low: item.low,
          close: item.close,
          volume: item.volume,
          valueKES: item.valueKES
        })),
        count: range.length
      }
    });
    
  } catch (error) {
    console.error("Error getting price range:", error);
    res.status(500).json({
      success: false,
      message: "Failed to get price range",
      error: error.message
    });
  }
});

export default router;
