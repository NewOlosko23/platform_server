import cron from "node-cron";
import { scrapeStocks } from "./scraper.js";
import Stock from "./models/Stock.js";

/**
 * Update stocks in MongoDB using upsert logic
 * Matches the documentation example
 */
async function updateStocks() {
  try {
    const stocks = await scrapeStocks();
    for (let s of stocks) {
      await Stock.findOneAndUpdate(
        { ticker: s.ticker },
        { ...s, updatedAt: new Date() },
        { upsert: true, new: true }
      );
    }
    console.log("✅ Stocks updated:", new Date().toLocaleString());
  } catch (err) {
    console.error("Scraping error:", err);
  }
}

// Export the cron job for manual control
export const nseScrapeJob = cron.schedule("*/5 * * * *", updateStocks, {
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

// Export the updateStocks function for manual execution
export { updateStocks };
