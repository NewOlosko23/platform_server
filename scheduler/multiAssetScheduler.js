import cron from "node-cron";
import { processAndStoreCryptoData } from "../services/cryptoFetcher.js";
import { processAndStoreFXData } from "../services/fxFetcher.js";
import { processAndStoreStockData } from "../services/stockFetcher.js";
import { updateAllData as updateNSEData } from "../scheduler.js"; // Existing NSE scraper

// Flag to prevent overlapping executions
let isScrapingInProgress = false;

/**
 * Update all asset data with MongoDB-first approach
 * This ensures all data is stored in MongoDB before being served to frontend
 */
async function updateAllAssetData() {
  // Prevent overlapping executions
  if (isScrapingInProgress) {
    console.log("⚠️ Multi-asset scraping already in progress, skipping this execution");
    return;
  }

  isScrapingInProgress = true;
  const startTime = new Date();
  
  try {
    console.log("🚀 Starting asset data update at", startTime.toLocaleString());
    
    // Update all asset types sequentially to avoid resource conflicts
    console.log("📊 Updating cryptocurrency data...");
    await processAndStoreCryptoData();
    
    console.log("💱 Updating FX data...");
    await processAndStoreFXData();
    
    console.log("📈 Updating NSE stocks data...");
    await updateNSEData();
    
    console.log("📊 Processing stock data for OHLCV collection...");
    await processAndStoreStockData();
    
    const endTime = new Date();
    const duration = (endTime - startTime) / 1000;
    console.log(`✅ All asset data updated successfully in ${duration}s at ${endTime.toLocaleString()}`);
    
  } catch (error) {
    console.error("❌ Error in updateAllAssetData:", error);
    
    // Log which specific asset update failed
    if (error.message.includes("crypto")) {
      console.error("❌ Cryptocurrency data update failed");
    } else if (error.message.includes("FX")) {
      console.error("❌ FX data update failed");
    } else if (error.message.includes("NSE")) {
      console.error("❌ NSE data update failed");
    }
    
  } finally {
    isScrapingInProgress = false;
  }
}

/**
 * Update only cryptocurrency data
 */
async function updateCryptoData() {
  try {
    console.log("🔄 Updating cryptocurrency data...");
    await processAndStoreCryptoData();
    console.log("✅ Cryptocurrency data updated successfully");
  } catch (error) {
    console.error("❌ Error updating cryptocurrency data:", error);
    throw error;
  }
}

/**
 * Update only FX data
 */
async function updateFXData() {
  try {
    console.log("🔄 Updating FX data...");
    await processAndStoreFXData();
    console.log("✅ FX data updated successfully");
  } catch (error) {
    console.error("❌ Error updating FX data:", error);
    throw error;
  }
}


/**
 * Update only NSE stocks data
 */
async function updateStocksData() {
  try {
    console.log("🔄 Updating NSE stocks data...");
    await updateNSEData();
    console.log("✅ NSE stocks data updated successfully");
  } catch (error) {
    console.error("❌ Error updating NSE stocks data:", error);
    throw error;
  }
}

// Create cron jobs for different update frequencies
const cryptoJob = cron.schedule("*/5 * * * *", updateCryptoData, {
  scheduled: false
});

const fxJob = cron.schedule("0 * * * *", updateFXData, {
  scheduled: false
});


const stocksJob = cron.schedule("*/5 * * * *", updateStocksData, {
  scheduled: false
});

// Combined job for all assets (every 5 minutes)
const allAssetsJob = cron.schedule("*/5 * * * *", updateAllAssetData, {
  scheduled: false
});

/**
 * Start all schedulers
 */
function startAllSchedulers() {
  try {
    // Start individual schedulers
    cryptoJob.start();
    fxJob.start();
    stocksJob.start();
    
    console.log("✅ Asset schedulers started:");
    console.log("  📊 Cryptocurrency: Every 5 minutes");
    console.log("  💱 FX: Every hour");
    console.log("  📈 NSE Stocks: Every 5 minutes");
    
  } catch (error) {
    console.error("❌ Error starting schedulers:", error);
    throw error;
  }
}

/**
 * Start combined scheduler (all assets every 5 minutes)
 */
function startCombinedScheduler() {
  try {
    allAssetsJob.start();
    console.log("✅ Combined asset scheduler started - all assets every 5 minutes");
  } catch (error) {
    console.error("❌ Error starting combined scheduler:", error);
    throw error;
  }
}

/**
 * Stop all schedulers
 */
function stopAllSchedulers() {
  try {
    cryptoJob.stop();
    fxJob.stop();
    stocksJob.stop();
    allAssetsJob.stop();
    
    console.log("✅ All asset schedulers stopped");
  } catch (error) {
    console.error("❌ Error stopping schedulers:", error);
    throw error;
  }
}

/**
 * Get scheduler status
 */
function getSchedulerStatus() {
  return {
    crypto: cryptoJob.running,
    fx: fxJob.running,
    stocks: stocksJob.running,
    allAssets: allAssetsJob.running,
    isScrapingInProgress: isScrapingInProgress
  };
}

/**
 * Manual trigger for testing
 */
async function triggerManualUpdate(assetType = "all") {
  try {
    console.log(`🔄 Manual update triggered for: ${assetType}`);
    
    switch (assetType) {
      case "crypto":
        await updateCryptoData();
        break;
      case "fx":
        await updateFXData();
        break;
      case "stocks":
        await updateStocksData();
        break;
      case "all":
      default:
        await updateAllAssetData();
        break;
    }
    
    console.log(`✅ Manual update completed for: ${assetType}`);
  } catch (error) {
    console.error(`❌ Manual update failed for ${assetType}:`, error);
    throw error;
  }
}

export {
  updateAllAssetData,
  updateCryptoData,
  updateFXData,
  updateStocksData,
  startAllSchedulers,
  startCombinedScheduler,
  stopAllSchedulers,
  getSchedulerStatus,
  triggerManualUpdate
};
