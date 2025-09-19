import mongoose from "mongoose";
import { scrapeStock } from "./scraper.js";
import Stock from "./models/Stock.js";
import StockInfo from "./models/StockInfo.js";

// Load environment variables
import dotenv from "dotenv";
dotenv.config();

async function bulkScrapeAllStocks() {
  try {
    // Connect to MongoDB
    console.log("🔌 Connecting to MongoDB...");
    await mongoose.connect(process.env.MONGO_URI || "mongodb://localhost:27017/platform");
    console.log("✅ Connected to MongoDB");

    // Get all unique tickers from the stocks collection
    const allTickers = await Stock.distinct("ticker");
    console.log(`📊 Found ${allTickers.length} unique tickers to scrape`);
    
    // Filter out invalid tickers (like the one with numbers and special characters)
    const validTickers = allTickers.filter(ticker => 
      ticker && 
      typeof ticker === 'string' && 
      ticker.length <= 10 && 
      !ticker.includes('(') && 
      !ticker.includes(')') &&
      !ticker.includes('Tr') &&
      !ticker.includes('KES')
    );
    
    console.log(`📋 Valid tickers to scrape: ${validTickers.length}`);
    console.log(`Tickers: ${validTickers.slice(0, 10).join(", ")}${validTickers.length > 10 ? '...' : ''}`);
    
    let successCount = 0;
    let errorCount = 0;
    const errors = [];
    
    console.log(`\n🚀 Starting bulk scraping for ${validTickers.length} stocks...`);
    console.log("⏱️  This will take approximately 3-5 minutes with rate limiting...\n");
    
    for (let i = 0; i < validTickers.length; i++) {
      const ticker = validTickers[i];
      const progress = `[${i + 1}/${validTickers.length}]`;
      
      try {
        console.log(`${progress} 📊 Scraping ${ticker}...`);
        
        // Check if we already have recent data (within last 24 hours)
        const existingData = await StockInfo.findOne({
          ticker: ticker.toUpperCase()
        }).sort({ scrapedAt: -1 });
        
        const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
        
        if (existingData && existingData.scrapedAt > oneDayAgo) {
          console.log(`${progress} ⏭️  ${ticker} - Skipping (recent data exists)`);
          successCount++;
          continue;
        }
        
        // Scrape stock data
        const stockData = await scrapeStock(ticker);
        
        if (stockData && stockData.name) {
          // Save to database
          const stockInfo = new StockInfo({
            ticker: ticker.toUpperCase(),
            ...stockData,
            scrapedAt: new Date()
          });
          
          await stockInfo.save();
          
          console.log(`${progress} ✅ ${ticker} - ${stockData.name.substring(0, 50)}...`);
          console.log(`    💾 Saved with ID: ${stockInfo._id}`);
          
          // Show key metrics
          if (stockData.lastTrading && stockData.lastTrading["Day's High Price"]) {
            console.log(`    📈 High: ${stockData.lastTrading["Day's High Price"]}, Low: ${stockData.lastTrading["Day's Low Price"]}`);
          }
          
          if (stockData.performance && stockData.performance["1WK"]) {
            console.log(`    📊 1WK: ${stockData.performance["1WK"]}, 3MO: ${stockData.performance["3MO"] || 'N/A'}`);
          }
          
          successCount++;
          
        } else {
          console.log(`${progress} ❌ ${ticker} - No valid data returned`);
          errors.push({ ticker, error: 'No valid data returned' });
          errorCount++;
        }
        
      } catch (error) {
        console.log(`${progress} ❌ ${ticker} - Error: ${error.message}`);
        errors.push({ ticker, error: error.message });
        errorCount++;
      }
      
      // Rate limiting - wait 3 seconds between requests to be respectful
      if (i < validTickers.length - 1) {
        console.log(`    ⏳ Waiting 3 seconds before next request...\n`);
        await new Promise(resolve => setTimeout(resolve, 3000));
      }
    }

    // Final summary
    console.log(`\n🎉 Bulk scraping completed!`);
    console.log(`📊 Results:`);
    console.log(`   ✅ Successful: ${successCount}/${validTickers.length}`);
    console.log(`   ❌ Errors: ${errorCount}/${validTickers.length}`);
    
    if (errors.length > 0) {
      console.log(`\n❌ Errors encountered:`);
      errors.forEach(({ ticker, error }) => {
        console.log(`   ${ticker}: ${error}`);
      });
    }
    
    // Database summary
    console.log(`\n📋 Database Summary:`);
    const totalRecords = await StockInfo.countDocuments();
    const uniqueTickers = await StockInfo.distinct("ticker");
    console.log(`   Total StockInfo records: ${totalRecords}`);
    console.log(`   Unique tickers with detailed data: ${uniqueTickers.length}`);
    console.log(`   Tickers: ${uniqueTickers.join(", ")}`);
    
    // Show some sample records
    const sampleRecords = await StockInfo.find()
      .sort({ scrapedAt: -1 })
      .limit(3);
    
    console.log(`\n🔍 Latest 3 records:`);
    sampleRecords.forEach((record, index) => {
      console.log(`${index + 1}. ${record.ticker} - ${record.name?.substring(0, 40)}... (${record.scrapedAt.toLocaleString()})`);
    });

  } catch (error) {
    console.error("❌ Fatal error:", error);
  } finally {
    // Close connection
    await mongoose.connection.close();
    console.log("\n🔌 Database connection closed");
  }
}

// Run the bulk scraper
bulkScrapeAllStocks();
