import cron from "node-cron";
import { scrapeStocks, scrapeTopGainersAndLosers, scrapeMarketInsights } from "./scraper.js";
import Stock from "./models/Stock.js";
import TopPerformers from "./models/TopPerformers.js";
import MarketInsights from "./models/MarketInsights.js";

/**
 * Update stocks in MongoDB using upsert logic
 * Matches the documentation example
 */
async function updateStocks() {
  try {
    const stocks = await scrapeStocks();
    const scrapedAt = new Date();
    
    for (let s of stocks) {
      await Stock.findOneAndUpdate(
        { ticker: s.ticker },
        { 
          ...s, 
          scrapedAt: scrapedAt,
          updatedAt: new Date() 
        },
        { upsert: true, new: true }
      );
    }
    console.log(`✅ Stocks updated: ${stocks.length} records at ${scrapedAt.toLocaleString()}`);
  } catch (err) {
    console.error("Stocks scraping error:", err);
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
    console.error("Top performers scraping error:", err);
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
    console.error("Market insights scraping error:", err);
  }
}

/**
 * Combined update function for all data
 */
async function updateAllData() {
  await Promise.all([
    updateStocks(),
    updateTopPerformers(),
    updateMarketInsights()
  ]);
}

// Export the cron job for manual control
export const nseScrapeJob = cron.schedule("*/5 * * * *", updateAllData, {
  scheduled: false
});

// Function to start the scheduler
export function startScheduler() {
  nseScrapeJob.start();
  console.log("NSE scraping scheduler started - running every 5 minutes");
}

// Function to stop the scheduler
export function stopScheduler() {
  nseScrapeJob.stop();
  console.log("NSE scraping scheduler stopped");
}

// Export functions for manual execution
export { updateStocks, updateTopPerformers, updateMarketInsights, updateAllData };
