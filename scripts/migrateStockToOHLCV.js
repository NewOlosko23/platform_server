import mongoose from "mongoose";
import Stock from "../models/Stock.js";
import OHLCV from "../models/OHLCV.js";
import dotenv from "dotenv";

// Load environment variables
dotenv.config();

/**
 * Migration script to populate OHLCV collection with stock data from Stock collection
 * This ensures the stock dashboard can fetch data from the unified OHLCV collection
 */
async function migrateStockToOHLCV() {
  try {
    console.log("🚀 Starting stock data migration to OHLCV collection...");
    
    // Connect to MongoDB
    await mongoose.connect(process.env.MONGO_URI);
    console.log("✅ Connected to MongoDB");
    
    // Get all stock data from Stock collection
    const stocks = await Stock.find({}).sort({ createdAt: -1 });
    console.log(`📊 Found ${stocks.length} stock records to migrate`);
    
    if (stocks.length === 0) {
      console.log("⚠️ No stock data found in Stock collection");
      return;
    }
    
    let migratedCount = 0;
    let skippedCount = 0;
    
    // Group stocks by ticker to get the latest record for each
    const stockMap = new Map();
    stocks.forEach(stock => {
      if (!stockMap.has(stock.ticker) || stock.createdAt > stockMap.get(stock.ticker).createdAt) {
        stockMap.set(stock.ticker, stock);
      }
    });
    
    console.log(`📈 Processing ${stockMap.size} unique stock symbols...`);
    
    // Migrate each unique stock to OHLCV collection
    for (const [ticker, stock] of stockMap) {
      try {
        // Parse price from string to number and round to 2 decimal places
        let price = 0;
        if (typeof stock.price === 'string') {
          price = Math.round((parseFloat(stock.price.replace(/[₹,]/g, '')) || 0) * 100) / 100;
        } else if (typeof stock.price === 'number') {
          price = Math.round(stock.price * 100) / 100;
        }
        
        if (price <= 0) {
          console.log(`⚠️ Skipping ${ticker} - invalid price: ${stock.price}`);
          skippedCount++;
          continue;
        }
        
        // Create OHLCV document
        const ohlcvData = {
          type: "stock",
          symbol: ticker.toUpperCase(),
          timestamp: stock.createdAt.getTime(),
          open: price,
          high: price,
          low: price,
          close: price,
          volume: stock.volume || 0,
          valueKES: price, // Assuming prices are already in KES or similar local currency
          source: "nse",
          lastUpdated: stock.createdAt,
          metadata: {
            companyName: stock.name,
            exchange: "NSE",
            volume: stock.volume || 0,
            change: stock.change,
            changePercent: stock.changePercent,
            type: stock.type,
            url: stock.url
          }
        };
        
        // Upsert to OHLCV collection (update if exists, insert if not)
        await OHLCV.findOneAndUpdate(
          { 
            type: "stock", 
            symbol: ticker.toUpperCase(),
            timestamp: stock.createdAt.getTime()
          },
          ohlcvData,
          { upsert: true, new: true }
        );
        
        migratedCount++;
        
        if (migratedCount % 10 === 0) {
          console.log(`📊 Migrated ${migratedCount}/${stockMap.size} stocks...`);
        }
        
      } catch (error) {
        console.error(`❌ Error migrating stock ${ticker}:`, error.message);
        skippedCount++;
      }
    }
    
    console.log(`✅ Migration completed!`);
    console.log(`📊 Successfully migrated: ${migratedCount} stocks`);
    console.log(`⚠️ Skipped: ${skippedCount} stocks`);
    
    // Verify migration by checking OHLCV collection
    const ohlcvStockCount = await OHLCV.countDocuments({ type: "stock" });
    console.log(`🔍 Verification: ${ohlcvStockCount} stock records now in OHLCV collection`);
    
  } catch (error) {
    console.error("❌ Migration failed:", error);
  } finally {
    // Close MongoDB connection
    await mongoose.connection.close();
    console.log("✅ MongoDB connection closed");
  }
}

// Run migration if this script is executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
  migrateStockToOHLCV()
    .then(() => {
      console.log("🎉 Stock migration script completed");
      process.exit(0);
    })
    .catch((error) => {
      console.error("💥 Migration script failed:", error);
      process.exit(1);
    });
}

export default migrateStockToOHLCV;
