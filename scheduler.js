import cron from "node-cron";
import { scrapeStocks, scrapeTopGainersAndLosers, scrapeMarketInsights, closeGlobalBrowser } from "./scraper.js";
import Stock from "./models/Stock.js";
import TopPerformers from "./models/TopPerformers.js";
import MarketInsights from "./models/MarketInsights.js";

// Flag to prevent overlapping cron job executions
// Sequential execution prevents Windows EBUSY errors from concurrent browser instances
let isScrapingInProgress = false;

/**
 * Update stocks in MongoDB using upsert logic
 * Stock data is now properly formatted from the scraper
 */
async function updateStocks() {
  try {
    const stocks = await scrapeStocks();
    const scrapedAt = new Date();
    
    // Stock data is now properly formatted from the scraper
    const stocksWithTimestamp = stocks.map(stock => ({
      ...stock,
      createdAt: scrapedAt
    }));
    
    for (let stock of stocksWithTimestamp) {
      await Stock.findOneAndUpdate(
        { ticker: stock.ticker },
        stock,
        { upsert: true, new: true }
      );
    }
    console.log(`✅ Stocks updated: ${stocksWithTimestamp.length} records at ${scrapedAt.toLocaleString()}`);
  } catch (err) {
    console.error("❌ Stocks scraping error:", err);
    throw err; // Re-throw to handle in updateAllData
  }
}

/**
 * Update top gainers and losers in MongoDB
 */
async function updateTopPerformers() {
  try {
    const { topGainers, bottomLosers } = await scrapeTopGainersAndLosers();
    const scrapedAt = new Date();
    
    // Clear existing records for this scrape session
    await TopPerformers.deleteMany({ scrapedAt: { $gte: new Date(scrapedAt.getTime() - 60000) } });
    
    // Save top gainers
    const gainerDocs = topGainers.map(gainer => ({
      type: 'gainers',
      ticker: gainer.ticker,
      price: parseFloat(gainer.price?.replace(/,/g, '') || 0),
      change: parseFloat(gainer.change?.replace(/,/g, '') || 0),
      changePercent: parseFloat(gainer.change?.replace(/,/g, '') || 0), // You might want to calculate this properly
      rank: gainer.rank,
      scrapedAt: scrapedAt
    }));
    
    // Save bottom losers
    const loserDocs = bottomLosers.map(loser => ({
      type: 'losers',
      ticker: loser.ticker,
      price: parseFloat(loser.price?.replace(/,/g, '') || 0),
      change: parseFloat(loser.change?.replace(/,/g, '') || 0),
      changePercent: parseFloat(loser.change?.replace(/,/g, '') || 0), // You might want to calculate this properly
      rank: loser.rank,
      scrapedAt: scrapedAt
    }));
    
    if (gainerDocs.length > 0) {
      await TopPerformers.insertMany(gainerDocs);
    }
    
    if (loserDocs.length > 0) {
      await TopPerformers.insertMany(loserDocs);
    }
    
    console.log(`✅ Top performers updated: ${gainerDocs.length} gainers, ${loserDocs.length} losers at ${scrapedAt.toLocaleString()}`);
  } catch (err) {
    console.error("❌ Top performers scraping error:", err);
    throw err; // Re-throw to handle in updateAllData
  }
}

/**
 * Update market insights in MongoDB
 */
async function updateMarketInsights() {
  try {
    const marketInsights = await scrapeMarketInsights();
    const scrapedAt = new Date();
    
    // Only save if we have valid data
    if (marketInsights && marketInsights.nasiIndex && marketInsights.yearToDate && marketInsights.marketCap) {
      const insightsDoc = new MarketInsights({
        ...marketInsights,
        scrapedAt: scrapedAt
      });
      
      await insightsDoc.save();
      console.log(`✅ Market insights updated: NASI ${marketInsights.nasiIndex}, YTD ${marketInsights.yearToDate}, Market Cap ${marketInsights.marketCap} at ${scrapedAt.toLocaleString()}`);
    } else {
      console.log("⚠️ No valid market insights data found");
    }
  } catch (err) {
    console.error("❌ Market insights scraping error:", err);
    throw err; // Re-throw to handle in updateAllData
  }
}

/**
 * Combined update function for all data
 * Sequential execution prevents Windows EBUSY errors from concurrent browser instances
 */
async function updateAllData() {
  // Prevent overlapping executions to avoid Windows EBUSY errors
  if (isScrapingInProgress) {
    console.log("⚠️ Scraping already in progress, skipping this execution");
    return;
  }

  isScrapingInProgress = true;
  const startTime = new Date();
  
  try {
    console.log("🚀 Starting sequential data update at", startTime.toLocaleString());
    
    // Sequential execution prevents Windows EBUSY errors
    // Each scrape uses the same browser instance with separate pages
    await updateStocks();
    await updateTopPerformers();
    await updateMarketInsights();
    
    const endTime = new Date();
    const duration = (endTime - startTime) / 1000;
    console.log(`✅ All data updated successfully in ${duration}s at ${endTime.toLocaleString()}`);
    
  } catch (error) {
    console.error("❌ Error in updateAllData:", error);
    
    // Attempt to close browser on error to prevent resource leaks
    try {
      await closeGlobalBrowser();
    } catch (closeError) {
      console.error("❌ Error closing browser after failure:", closeError);
    }
  } finally {
    isScrapingInProgress = false;
  }
}

// Export the cron job for manual control
export const nseScrapeJob = cron.schedule("*/5 * * * *", updateAllData, {
  scheduled: false
});

// Function to start the scheduler
export function startScheduler() {
  nseScrapeJob.start();
  console.log("✅ NSE scraping scheduler started - running every 5 minutes");
}

// Function to stop the scheduler
export function stopScheduler() {
  nseScrapeJob.stop();
  console.log("✅ NSE scraping scheduler stopped");
  
  // Close browser when scheduler stops
  closeGlobalBrowser().catch(error => {
    console.error("❌ Error closing browser on scheduler stop:", error);
  });
}

// Export functions for manual execution
export { updateStocks, updateTopPerformers, updateMarketInsights, updateAllData };