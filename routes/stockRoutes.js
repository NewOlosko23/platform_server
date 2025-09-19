import express from "express";
import { fetchNSEListings } from "../scraper.js";
import Stock from "../models/Stock.js";
import MarketIndex from "../models/MarketIndex.js";
import TopPerformers from "../models/TopPerformers.js";

const router = express.Router();

/**
 * POST /api/stocks/scrape
 * Trigger a manual scrape of comprehensive NSE data
 * Returns the count of saved records across all collections
 */
router.post("/scrape", async (req, res) => {
  try {
    console.log("Manual comprehensive scrape triggered");
    
    const marketData = await fetchNSEListings(process.env.SCRAPE_TARGET || "https://afx.kwayisi.org/nse/");
    
    if (!marketData || (!marketData.stocks.length && !marketData.topGainers.length && !marketData.topLosers.length)) {
      return res.status(204).json({ 
        message: "No data scraped",
        saved: 0 
      });
    }
    
    let totalSaved = 0;
    const results = {};
    
    // Save market index data
    if (marketData.marketIndex) {
      const indexDoc = new MarketIndex({
        ...marketData.marketIndex,
        scrapedAt: new Date()
      });
      await indexDoc.save();
      results.marketIndex = 1;
      totalSaved += 1;
    }
    
    // Save stock data
    if (marketData.stocks.length > 0) {
      const stockDocs = marketData.stocks.map(stock => ({
        ...stock,
        scrapedAt: new Date()
      }));
      await Stock.insertMany(stockDocs);
      results.stocks = stockDocs.length;
      totalSaved += stockDocs.length;
    }
    
    // Save top gainers
    if (marketData.topGainers.length > 0) {
      const gainerDocs = marketData.topGainers.map(gainer => ({
        type: 'gainers',
        ...gainer,
        scrapedAt: new Date()
      }));
      await TopPerformers.insertMany(gainerDocs);
      results.topGainers = gainerDocs.length;
      totalSaved += gainerDocs.length;
    }
    
    // Save top losers
    if (marketData.topLosers.length > 0) {
      const loserDocs = marketData.topLosers.map(loser => ({
        type: 'losers',
        ...loser,
        scrapedAt: new Date()
      }));
      await TopPerformers.insertMany(loserDocs);
      results.topLosers = loserDocs.length;
      totalSaved += loserDocs.length;
    }
    
    res.json({ 
      message: "Comprehensive scrape completed successfully",
      saved: totalSaved,
      breakdown: results,
      sample: {
        marketIndex: marketData.marketIndex,
        stocks: marketData.stocks.slice(0, 3),
        topGainers: marketData.topGainers.slice(0, 3),
        topLosers: marketData.topLosers.slice(0, 3)
      }
    });
    
  } catch (error) {
    console.error("Scrape error:", error);
    res.status(500).json({ 
      error: error.message,
      message: "Failed to scrape NSE data"
    });
  }
});

/**
 * GET /api/stocks/latest
 * Get the latest stock data snapshot
 * Query params: limit (default: 200)
 */
router.get("/latest", async (req, res) => {
  try {
    const { limit = 200 } = req.query;
    
    // Get latest entries sorted by scrapedAt
    const stocks = await Stock.find()
      .sort({ scrapedAt: -1 })
      .limit(Number(limit));
    
    res.json({
      count: stocks.length,
      data: stocks,
      lastUpdated: stocks.length > 0 ? stocks[0].scrapedAt : null
    });
    
  } catch (error) {
    console.error("Error fetching latest stocks:", error);
    res.status(500).json({ 
      error: error.message,
      message: "Failed to fetch latest stock data"
    });
  }
});

/**
 * GET /api/stocks/market-status
 * Get current market status and trading hours
 */
router.get("/market-status", async (req, res) => {
  try {
    const now = new Date();
    const currentHour = now.getHours();
    const currentMinute = now.getMinutes();
    const currentTime = currentHour * 60 + currentMinute;
    
    // NSE trading hours: 9:15 AM to 3:30 PM (IST)
    const marketOpenTime = 9 * 60 + 15; // 9:15 AM
    const marketCloseTime = 15 * 60 + 30; // 3:30 PM
    
    let marketStatus = "CLOSED";
    let nextAction = "";
    let timeToNextAction = 0;
    
    if (currentTime >= marketOpenTime && currentTime <= marketCloseTime) {
      marketStatus = "OPEN";
      timeToNextAction = marketCloseTime - currentTime;
      nextAction = "Market closes in";
    } else if (currentTime < marketOpenTime) {
      timeToNextAction = marketOpenTime - currentTime;
      nextAction = "Market opens in";
    } else {
      timeToNextAction = (24 * 60) - currentTime + marketOpenTime;
      nextAction = "Market opens in";
    }
    
    // Get latest market data
    const [latestStock, marketIndex] = await Promise.all([
      Stock.findOne().sort({ scrapedAt: -1 }),
      MarketIndex.findOne().sort({ scrapedAt: -1 })
    ]);
    
    const hours = Math.floor(timeToNextAction / 60);
    const minutes = timeToNextAction % 60;
    
    res.json({
      marketStatus,
      tradingHours: {
        open: "09:15 AM",
        close: "03:30 PM",
        timezone: "IST"
      },
      currentTime: now.toISOString(),
      nextAction: `${nextAction} ${hours}h ${minutes}m`,
      lastDataUpdate: latestStock?.scrapedAt || null,
      marketIndex: marketIndex || null,
      message: marketStatus === "OPEN" ? "Market is currently trading" : "Market is closed"
    });
    
  } catch (error) {
    console.error("Error fetching market status:", error);
    res.status(500).json({ 
      error: error.message,
      message: "Failed to fetch market status"
    });
  }
});

/**
 * GET /api/stocks/market-index
 * Get the latest market index data (NASI)
 */
router.get("/market-index", async (req, res) => {
  try {
    const marketIndex = await MarketIndex.findOne()
      .sort({ scrapedAt: -1 });
    
    if (!marketIndex) {
      return res.status(404).json({ 
        error: "Market index data not found"
      });
    }
    
    res.json(marketIndex);
    
  } catch (error) {
    console.error("Error fetching market index:", error);
    res.status(500).json({ 
      error: error.message,
      message: "Failed to fetch market index data"
    });
  }
});

/**
 * GET /api/stocks/top-gainers
 * Get the latest top gainers data
 */
router.get("/top-gainers", async (req, res) => {
  try {
    const { limit = 20 } = req.query;
    
    const topGainers = await TopPerformers.find({ type: 'gainers' })
      .sort({ scrapedAt: -1, rank: 1 })
      .limit(Number(limit));
    
    res.json({
      count: topGainers.length,
      data: topGainers,
      lastUpdated: topGainers.length > 0 ? topGainers[0].scrapedAt : null
    });
    
  } catch (error) {
    console.error("Error fetching top gainers:", error);
    res.status(500).json({ 
      error: error.message,
      message: "Failed to fetch top gainers data"
    });
  }
});

/**
 * GET /api/stocks/top-losers
 * Get the latest top losers data
 */
router.get("/top-losers", async (req, res) => {
  try {
    const { limit = 20 } = req.query;
    
    const topLosers = await TopPerformers.find({ type: 'losers' })
      .sort({ scrapedAt: -1, rank: 1 })
      .limit(Number(limit));
    
    res.json({
      count: topLosers.length,
      data: topLosers,
      lastUpdated: topLosers.length > 0 ? topLosers[0].scrapedAt : null
    });
    
  } catch (error) {
    console.error("Error fetching top losers:", error);
    res.status(500).json({ 
      error: error.message,
      message: "Failed to fetch top losers data"
    });
  }
});

/**
 * GET /api/stocks/market-overview
 * Get comprehensive market overview data
 */
router.get("/market-overview", async (req, res) => {
  try {
    // Get latest data from all collections
    const [marketIndex, topGainers, topLosers, latestStocks] = await Promise.all([
      MarketIndex.findOne().sort({ scrapedAt: -1 }),
      TopPerformers.find({ type: 'gainers' }).sort({ scrapedAt: -1, rank: 1 }).limit(10),
      TopPerformers.find({ type: 'losers' }).sort({ scrapedAt: -1, rank: 1 }).limit(10),
      Stock.find().sort({ scrapedAt: -1 }).limit(50)
    ]);
    
    res.json({
      marketIndex,
      topGainers: {
        count: topGainers.length,
        data: topGainers
      },
      topLosers: {
        count: topLosers.length,
        data: topLosers
      },
      latestStocks: {
        count: latestStocks.length,
        data: latestStocks
      },
      lastUpdated: new Date()
    });
    
  } catch (error) {
    console.error("Error fetching market overview:", error);
    res.status(500).json({ 
      error: error.message,
      message: "Failed to fetch market overview data"
    });
  }
});

/**
 * GET /api/stocks/stats/summary
 * Get summary statistics about scraped data
 */
router.get("/stats/summary", async (req, res) => {
  try {
    const [totalStocks, totalGainers, totalLosers, totalIndexRecords] = await Promise.all([
      Stock.countDocuments(),
      TopPerformers.countDocuments({ type: 'gainers' }),
      TopPerformers.countDocuments({ type: 'losers' }),
      MarketIndex.countDocuments()
    ]);
    
    const uniqueTickers = await Stock.distinct("ticker");
    const latestScrape = await Stock.findOne().sort({ scrapedAt: -1 });
    const oldestScrape = await Stock.findOne().sort({ scrapedAt: 1 });
    
    res.json({
      totalRecords: {
        stocks: totalStocks,
        topGainers: totalGainers,
        topLosers: totalLosers,
        marketIndex: totalIndexRecords
      },
      uniqueTickers: uniqueTickers.length,
      latestScrape: latestScrape?.scrapedAt || null,
      oldestScrape: oldestScrape?.scrapedAt || null,
      tickers: uniqueTickers.slice(0, 20) // First 20 tickers as sample
    });
    
  } catch (error) {
    console.error("Error fetching stats:", error);
    res.status(500).json({ 
      error: error.message,
      message: "Failed to fetch statistics"
    });
  }
});

/**
 * GET /api/stocks/:ticker
 * Get the latest data for a specific ticker
 */
router.get("/:ticker", async (req, res) => {
  try {
    const { ticker } = req.params;
    
    // Find latest entry for this ticker (case insensitive)
    const stock = await Stock.findOne({ 
      ticker: new RegExp("^" + ticker + "$", "i") 
    }).sort({ scrapedAt: -1 });
    
    if (!stock) {
      return res.status(404).json({ 
        error: "Stock not found",
        ticker: ticker
      });
    }
    
    res.json(stock);
    
  } catch (error) {
    console.error("Error fetching stock:", error);
    res.status(500).json({ 
      error: error.message,
      message: "Failed to fetch stock data"
    });
  }
});

/**
 * GET /api/stocks
 * Get all stocks with optional filtering
 * Query params: ticker, limit, sortBy
 */
router.get("/", async (req, res) => {
  try {
    const { ticker, limit = 100, sortBy = "scrapedAt" } = req.query;
    
    let query = {};
    
    // Add ticker filter if provided
    if (ticker) {
      query.ticker = new RegExp(ticker, "i");
    }
    
    // Build sort object
    const sort = {};
    sort[sortBy] = -1; // Default to descending
    
    const stocks = await Stock.find(query)
      .sort(sort)
      .limit(Number(limit));
    
    res.json({
      count: stocks.length,
      data: stocks,
      filters: { ticker, limit, sortBy }
    });
    
  } catch (error) {
    console.error("Error fetching stocks:", error);
    res.status(500).json({ 
      error: error.message,
      message: "Failed to fetch stock data"
    });
  }
});

export default router;
