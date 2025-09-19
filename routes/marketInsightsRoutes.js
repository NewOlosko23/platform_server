import express from "express";
import MarketInsights from "../models/MarketInsights.js";

const router = express.Router();

/**
 * GET /api/market-insights/latest
 * Get the latest market insights data
 */
router.get("/latest", async (req, res) => {
  try {
    const marketInsights = await MarketInsights.findOne()
      .sort({ scrapedAt: -1 });
    
    if (!marketInsights) {
      return res.status(404).json({ 
        success: false,
        error: "Market insights data not found" 
      });
    }
    
    res.json({
      success: true,
      data: marketInsights,
      lastUpdated: marketInsights.scrapedAt
    });
    
  } catch (error) {
    console.error("Error fetching market insights:", error);
    res.status(500).json({ 
      success: false,
      error: error.message,
      message: "Failed to fetch market insights data"
    });
  }
});

/**
 * GET /api/market-insights/history
 * Get market insights history with optional limit
 * Query params: limit (default: 50)
 */
router.get("/history", async (req, res) => {
  try {
    const { limit = 50 } = req.query;
    
    const marketInsights = await MarketInsights.find()
      .sort({ scrapedAt: -1 })
      .limit(Number(limit));
    
    res.json({
      success: true,
      count: marketInsights.length,
      data: marketInsights,
      filters: {
        limit: Number(limit)
      }
    });
    
  } catch (error) {
    console.error("Error fetching market insights history:", error);
    res.status(500).json({ 
      success: false,
      error: error.message,
      message: "Failed to fetch market insights history"
    });
  }
});

/**
 * GET /api/market-insights/stats
 * Get statistics about market insights data
 */
router.get("/stats", async (req, res) => {
  try {
    const totalRecords = await MarketInsights.countDocuments();
    const latestRecord = await MarketInsights.findOne().sort({ scrapedAt: -1 });
    const oldestRecord = await MarketInsights.findOne().sort({ scrapedAt: 1 });
    
    res.json({
      success: true,
      data: {
        totalRecords,
        latestRecord: latestRecord?.scrapedAt || null,
        oldestRecord: oldestRecord?.scrapedAt || null,
        dataRange: latestRecord && oldestRecord ? 
          `${oldestRecord.scrapedAt.toISOString()} to ${latestRecord.scrapedAt.toISOString()}` : 
          "No data available"
      }
    });
    
  } catch (error) {
    console.error("Error fetching market insights stats:", error);
    res.status(500).json({ 
      success: false,
      error: error.message,
      message: "Failed to fetch market insights statistics"
    });
  }
});

/**
 * GET /api/market-insights
 * Get all market insights with optional filtering
 * Query params: limit, sortBy
 */
router.get("/", async (req, res) => {
  try {
    const { limit = 100, sortBy = "scrapedAt" } = req.query;
    
    // Build sort object
    const sort = {};
    sort[sortBy] = -1; // Default to descending
    
    const marketInsights = await MarketInsights.find()
      .sort(sort)
      .limit(Number(limit));
    
    res.json({
      success: true,
      count: marketInsights.length,
      data: marketInsights,
      filters: { 
        limit: Number(limit), 
        sortBy 
      }
    });
    
  } catch (error) {
    console.error("Error fetching market insights:", error);
    res.status(500).json({ 
      success: false,
      error: error.message,
      message: "Failed to fetch market insights data"
    });
  }
});

export default router;
