import OHLCV from "../models/OHLCV.js";
import Stock from "../models/Stock.js";

/**
 * Get latest stock price from MongoDB (converted from existing NSE data)
 * @param {string} symbol - Stock symbol (e.g., "EQTY")
 * @returns {Object} Latest price data
 */
async function getLatestStockPrice(symbol) {
  try {
    // First try to get from OHLCV collection
    const latestOHLCV = await OHLCV.getLatestPrice("stock", symbol);
    
    if (latestOHLCV) {
      return {
        symbol: latestOHLCV.symbol,
        price: Math.round(latestOHLCV.valueKES * 100) / 100,
        volume: latestOHLCV.volume || null,
        change: latestOHLCV.metadata?.change || null,
        timestamp: latestOHLCV.timestamp,
        source: latestOHLCV.source,
        lastUpdated: latestOHLCV.lastUpdated,
        metadata: latestOHLCV.metadata
      };
    }
    
    // Fallback to existing Stock collection
    const stock = await Stock.findOne({ ticker: symbol }).sort({ createdAt: -1 });
    
    if (!stock) {
      throw new Error(`No data found for ${symbol}`);
    }
    
    return {
      symbol: stock.ticker,
      price: Math.round(stock.price * 100) / 100,
      volume: stock.volume || null,
      change: stock.change,
      timestamp: stock.createdAt.getTime(),
      source: "nse",
      lastUpdated: stock.createdAt,
      metadata: {
        companyName: stock.name,
        exchange: "NSE",
        volume: stock.volume,
        change: stock.change,
        type: stock.type
      }
    };
    
  } catch (error) {
    console.error(`❌ Error getting latest stock price for ${symbol}:`, error.message);
    throw error;
  }
}

/**
 * Get historical stock data from MongoDB
 * @param {string} symbol - Stock symbol
 * @param {number} limit - Number of data points
 * @returns {Array} Historical data
 */
async function getHistoricalStockData(symbol, limit = 100) {
  try {
    // Try to get from OHLCV collection first
    const historicalOHLCV = await OHLCV.getHistoricalData("stock", symbol, limit);
    
    if (historicalOHLCV && historicalOHLCV.length > 0) {
      return historicalOHLCV.map(item => ({
        timestamp: item.timestamp,
        open: item.open,
        high: item.high,
        low: item.low,
        close: item.close,
        volume: item.volume,
        valueKES: item.valueKES
      }));
    }
    
    // Fallback to existing Stock collection
    const stocks = await Stock.find({ ticker: symbol })
      .sort({ createdAt: -1 })
      .limit(limit);
    
    return stocks.map(stock => ({
      timestamp: stock.createdAt.getTime(),
      open: stock.price,
      high: stock.price,
      low: stock.price,
      close: stock.price,
      volume: stock.volume || 0,
      valueKES: stock.price
    }));
    
  } catch (error) {
    console.error(`❌ Error getting historical stock data for ${symbol}:`, error.message);
    throw error;
  }
}

/**
 * Get all available stock symbols
 * @returns {Array} List of available stock symbols
 */
async function getAvailableStockSymbols() {
  try {
    // Get from OHLCV collection first
    const ohlcvSymbols = await OHLCV.distinct("symbol", { type: "stock" });
    
    if (ohlcvSymbols.length > 0) {
      return ohlcvSymbols.sort();
    }
    
    // Fallback to existing Stock collection
    const stockSymbols = await Stock.distinct("ticker");
    return stockSymbols.sort();
    
  } catch (error) {
    console.error("❌ Error getting available stock symbols:", error.message);
    throw error;
  }
}

/**
 * Search stocks by symbol or name
 * @param {string} query - Search query
 * @param {number} limit - Number of results
 * @returns {Array} Search results
 */
async function searchStocks(query, limit = 10) {
  try {
    const searchRegex = new RegExp(query, "i");
    
    // Search in OHLCV collection first
    const ohlcvResults = await OHLCV.find({
      type: "stock",
      $or: [
        { symbol: searchRegex },
        { "metadata.companyName": searchRegex }
      ]
    })
    .sort({ timestamp: -1 })
    .limit(limit);
    
    if (ohlcvResults.length > 0) {
      return ohlcvResults.map(stock => ({
        symbol: stock.symbol,
        name: stock.metadata?.companyName || stock.symbol,
        price: stock.valueKES,
        timestamp: stock.timestamp,
        source: stock.source,
        lastUpdated: stock.lastUpdated
      }));
    }
    
    // Fallback to existing Stock collection
    const stockResults = await Stock.find({
      $or: [
        { ticker: searchRegex },
        { name: searchRegex }
      ]
    })
    .sort({ createdAt: -1 })
    .limit(limit);
    
    return stockResults.map(stock => ({
      symbol: stock.ticker,
      name: stock.name,
      price: stock.price,
      timestamp: stock.createdAt.getTime(),
      source: "nse",
      lastUpdated: stock.createdAt
    }));
    
  } catch (error) {
    console.error("❌ Error searching stocks:", error.message);
    throw error;
  }
}

/**
 * Process and store stock data in OHLCV collection
 * This ensures stock data is available in the unified OHLCV collection
 */
async function processAndStoreStockData() {
  try {
    console.log("🚀 Starting stock data processing and storage...");
    
    // Get all stock data from Stock collection
    const stocks = await Stock.find({}).sort({ createdAt: -1 });
    
    if (stocks.length === 0) {
      console.log("⚠️ No stock data found in Stock collection");
      return;
    }
    
    // Group stocks by ticker to get the latest record for each
    const stockMap = new Map();
    stocks.forEach(stock => {
      if (!stockMap.has(stock.ticker) || stock.createdAt > stockMap.get(stock.ticker).createdAt) {
        stockMap.set(stock.ticker, stock);
      }
    });
    
    console.log(`📈 Processing ${stockMap.size} unique stock symbols...`);
    
    let processedCount = 0;
    const currentTime = Date.now();
    
    // Process each unique stock
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
          continue;
        }
        
        // Create OHLCV document
        const ohlcvData = {
          type: "stock",
          symbol: ticker.toUpperCase(),
          timestamp: currentTime,
          open: price,
          high: price,
          low: price,
          close: price,
          volume: stock.volume || 0,
          valueKES: price,
          source: "nse",
          lastUpdated: new Date(),
          metadata: {
            companyName: stock.name,
            exchange: "NSE",
            volume: stock.volume || null,
            change: stock.change || null,
            stockType: stock.type,
            url: stock.url
          }
        };
        
        // Store in OHLCV collection (upsert to avoid duplicates)
        await OHLCV.findOneAndUpdate(
          { 
            type: "stock", 
            symbol: ticker.toUpperCase()
          },
          ohlcvData,
          { upsert: true, new: true, setDefaultsOnInsert: true }
        );
        
        processedCount++;
        
      } catch (error) {
        console.error(`❌ Error processing stock ${ticker}:`, error.message);
      }
    }
    
    console.log(`✅ Stock data processing completed: ${processedCount} stocks processed`);
    
  } catch (error) {
    console.error("❌ Error in processAndStoreStockData:", error);
    throw error;
  }
}

export {
  getLatestStockPrice,
  getHistoricalStockData,
  getAvailableStockSymbols,
  searchStocks,
  processAndStoreStockData
};
