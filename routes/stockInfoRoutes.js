import express from "express";
import { scrapeStock } from "../scraper.js";
import StockInfo from "../models/StockInfo.js";

const router = express.Router();

/**
 * GET /api/stock-info/:ticker
 * Get detailed information for a specific stock by ticker
 */
router.get("/:ticker", async (req, res) => {
  try {
    const { ticker } = req.params;
    
    if (!ticker) {
      return res.status(400).json({
        success: false,
        message: "Ticker parameter is required"
      });
    }

    // Check if we have recent data (within last hour)
    const recentData = await StockInfo.findOne({
      ticker: ticker.toUpperCase()
    }).sort({ scrapedAt: -1 });

    const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);
    
    if (recentData && recentData.scrapedAt > oneHourAgo) {
      // Return cached data if it's recent
      return res.json({
        success: true,
        data: recentData,
        cached: true,
        lastUpdated: recentData.scrapedAt
      });
    }

    // Scrape fresh data
    console.log(`Scraping fresh data for ticker: ${ticker}`);
    const stockData = await scrapeStock(ticker);
    
    if (!stockData || !stockData.name) {
      return res.status(404).json({
        success: false,
        message: `Stock information not found for ticker: ${ticker}`
      });
    }

    // Save to database
    const stockInfo = new StockInfo({
      ticker: ticker.toUpperCase(),
      ...stockData,
      scrapedAt: new Date()
    });

    await stockInfo.save();

    res.json({
      success: true,
      data: stockInfo,
      cached: false,
      lastUpdated: stockInfo.scrapedAt
    });

  } catch (error) {
    console.error(`Error fetching stock info for ${req.params.ticker}:`, error);
    res.status(500).json({
      success: false,
      message: error.message || "Failed to fetch stock information"
    });
  }
});

/**
 * GET /api/stock-info/:ticker/history
 * Get historical data for a specific stock
 * Query params: limit (default: 10)
 */
router.get("/:ticker/history", async (req, res) => {
  try {
    const { ticker } = req.params;
    const { limit = 10 } = req.query;
    
    if (!ticker) {
      return res.status(400).json({
        success: false,
        message: "Ticker parameter is required"
      });
    }

    const stockHistory = await StockInfo.find({
      ticker: ticker.toUpperCase()
    })
    .sort({ scrapedAt: -1 })
    .limit(Number(limit));

    if (stockHistory.length === 0) {
      return res.status(404).json({
        success: false,
        message: `No historical data found for ticker: ${ticker}`
      });
    }

    res.json({
      success: true,
      count: stockHistory.length,
      data: stockHistory,
      filters: {
        ticker: ticker.toUpperCase(),
        limit: Number(limit)
      }
    });

  } catch (error) {
    console.error(`Error fetching stock history for ${req.params.ticker}:`, error);
    res.status(500).json({
      success: false,
      message: error.message || "Failed to fetch stock history"
    });
  }
});

/**
 * POST /api/stock-info/:ticker/refresh
 * Force refresh stock information (bypass cache)
 */
router.post("/:ticker/refresh", async (req, res) => {
  try {
    const { ticker } = req.params;
    
    if (!ticker) {
      return res.status(400).json({
        success: false,
        message: "Ticker parameter is required"
      });
    }

    console.log(`Force refreshing data for ticker: ${ticker}`);
    const stockData = await scrapeStock(ticker);
    
    if (!stockData || !stockData.name) {
      return res.status(404).json({
        success: false,
        message: `Stock information not found for ticker: ${ticker}`
      });
    }

    // Save to database
    const stockInfo = new StockInfo({
      ticker: ticker.toUpperCase(),
      ...stockData,
      scrapedAt: new Date()
    });

    await stockInfo.save();

    res.json({
      success: true,
      data: stockInfo,
      message: "Stock information refreshed successfully",
      lastUpdated: stockInfo.scrapedAt
    });

  } catch (error) {
    console.error(`Error refreshing stock info for ${req.params.ticker}:`, error);
    res.status(500).json({
      success: false,
      message: error.message || "Failed to refresh stock information"
    });
  }
});

/**
 * GET /api/stock-info/stats/summary
 * Get summary statistics about stock info data
 */
router.get("/stats/summary", async (req, res) => {
  try {
    const totalRecords = await StockInfo.countDocuments();
    const uniqueTickers = await StockInfo.distinct("ticker");
    const latestRecord = await StockInfo.findOne().sort({ scrapedAt: -1 });
    const oldestRecord = await StockInfo.findOne().sort({ scrapedAt: 1 });
    
    res.json({
      success: true,
      data: {
        totalRecords,
        uniqueTickers: uniqueTickers.length,
        tickers: uniqueTickers,
        latestRecord: latestRecord?.scrapedAt || null,
        oldestRecord: oldestRecord?.scrapedAt || null,
        dataRange: latestRecord && oldestRecord ? 
          `${oldestRecord.scrapedAt.toISOString()} to ${latestRecord.scrapedAt.toISOString()}` : 
          "No data available"
      }
    });
    
  } catch (error) {
    console.error("Error fetching stock info stats:", error);
    res.status(500).json({
      success: false,
      message: error.message || "Failed to fetch stock info statistics"
    });
  }
});

export default router;
