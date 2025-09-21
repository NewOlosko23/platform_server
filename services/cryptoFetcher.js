import axios from "axios";
import OHLCV from "../models/OHLCV.js";
import { getExchangeRate } from "./currencyConverter.js";

// Binance API configuration
const BINANCE_BASE_URL = "https://api.binance.com/api/v3";
const BINANCE_24HR_TICKER = "/ticker/24hr";
const BINANCE_KLINES = "/klines";

// Top 25 cryptocurrencies by market cap
const TOP_CRYPTO_SYMBOLS = [
  "BTCUSDT", "ETHUSDT", "BNBUSDT", "XRPUSDT", "ADAUSDT",
  "SOLUSDT", "DOGEUSDT", "DOTUSDT", "AVAXUSDT", "SHIBUSDT",
  "MATICUSDT", "LTCUSDT", "UNIUSDT", "LINKUSDT", "ATOMUSDT",
  "XLMUSDT", "BCHUSDT", "FILUSDT", "TRXUSDT", "ETCUSDT",
  "XMRUSDT", "VETUSDT", "ICPUSDT", "THETAUSDT", "ALGOUSDT"
];

// Mapping of short symbols to full symbols
const CRYPTO_SYMBOL_MAP = {
  "BTC": "BTCUSDT",
  "ETH": "ETHUSDT", 
  "BNB": "BNBUSDT",
  "XRP": "XRPUSDT",
  "ADA": "ADAUSDT",
  "SOL": "SOLUSDT",
  "DOGE": "DOGEUSDT",
  "DOT": "DOTUSDT",
  "AVAX": "AVAXUSDT",
  "SHIB": "SHIBUSDT",
  "MATIC": "MATICUSDT",
  "LTC": "LTCUSDT",
  "UNI": "UNIUSDT",
  "LINK": "LINKUSDT",
  "ATOM": "ATOMUSDT",
  "XLM": "XLMUSDT",
  "BCH": "BCHUSDT",
  "FIL": "FILUSDT",
  "TRX": "TRXUSDT",
  "ETC": "ETCUSDT",
  "XMR": "XMRUSDT",
  "VET": "VETUSDT",
  "ICP": "ICPUSDT",
  "THETA": "THETAUSDT",
  "ALGO": "ALGOUSDT"
};

/**
 * Convert short crypto symbol to full symbol
 * @param {string} symbol - Short symbol (e.g., 'ADA') or full symbol (e.g., 'ADAUSDT')
 * @returns {string} Full symbol (e.g., 'ADAUSDT')
 */
function normalizeCryptoSymbol(symbol) {
  if (!symbol) return symbol;
  
  const upperSymbol = symbol.toUpperCase();
  
  // If it's already a full symbol, return as is
  if (TOP_CRYPTO_SYMBOLS.includes(upperSymbol)) {
    return upperSymbol;
  }
  
  // If it's a short symbol, convert to full symbol
  if (CRYPTO_SYMBOL_MAP[upperSymbol]) {
    return CRYPTO_SYMBOL_MAP[upperSymbol];
  }
  
  // If not found, return the original symbol
  return upperSymbol;
}

/**
 * Fetch 24hr ticker data from Binance for all top cryptocurrencies
 * This provides current price, volume, and 24hr change
 */
async function fetchCrypto24hrData() {
  try {
    console.log("🔄 Fetching 24hr crypto data from Binance...");
    
    const response = await axios.get(`${BINANCE_BASE_URL}${BINANCE_24HR_TICKER}`, {
      timeout: 10000,
      headers: {
        'User-Agent': 'AvodalFinance/1.0'
      }
    });

    const allTickers = response.data;
    
    // Filter for our top cryptocurrencies
    const filteredTickers = allTickers.filter(ticker => 
      TOP_CRYPTO_SYMBOLS.includes(ticker.symbol)
    );

    console.log(`✅ Fetched ${filteredTickers.length} crypto tickers from Binance`);
    return filteredTickers;
    
  } catch (error) {
    console.error("❌ Error fetching crypto 24hr data:", error.message);
    throw error;
  }
}

/**
 * Fetch historical klines (OHLCV) data from Binance
 * @param {string} symbol - Trading pair symbol (e.g., BTCUSDT)
 * @param {string} interval - Time interval (1m, 5m, 1h, 1d)
 * @param {number} limit - Number of klines to fetch (max 1000)
 */
async function fetchCryptoKlines(symbol, interval = "5m", limit = 100) {
  try {
    const response = await axios.get(`${BINANCE_BASE_URL}${BINANCE_KLINES}`, {
      params: {
        symbol: symbol,
        interval: interval,
        limit: limit
      },
      timeout: 10000,
      headers: {
        'User-Agent': 'AvodalFinance/1.0'
      }
    });

    return response.data;
    
  } catch (error) {
    console.error(`❌ Error fetching klines for ${symbol}:`, error.message);
    throw error;
  }
}

/**
 * Convert USD price to KES using our currency converter
 * @param {number} usdPrice - Price in USD
 * @returns {number} Price in KES
 */
async function convertUSDToKES(usdPrice) {
  try {
    const exchangeRate = await getExchangeRate("USD", "KES");
    return usdPrice * exchangeRate;
  } catch (error) {
    console.error("❌ Error converting USD to KES:", error.message);
    // Fallback to approximate rate if API fails
    return usdPrice * 150; // Approximate USD/KES rate
  }
}

/**
 * Process and store crypto data in MongoDB
 * This is the core function that ensures data is stored in MongoDB first
 */
async function processAndStoreCryptoData() {
  try {
    console.log("🚀 Starting crypto data processing and storage...");
    
    // Fetch 24hr data for current prices
    const tickers = await fetchCrypto24hrData();
    const currentTime = Date.now();
    
    // Process each cryptocurrency
    for (const ticker of tickers) {
      try {
        const symbol = ticker.symbol;
        const baseAsset = symbol.replace("USDT", "");
        
        // Convert USD prices to KES
        const priceKES = await convertUSDToKES(parseFloat(ticker.lastPrice));
        const openKES = await convertUSDToKES(parseFloat(ticker.openPrice));
        const highKES = await convertUSDToKES(parseFloat(ticker.highPrice));
        const lowKES = await convertUSDToKES(parseFloat(ticker.lowPrice));
        const volumeKES = await convertUSDToKES(parseFloat(ticker.volume));
        
        // Create OHLCV document
        const ohlcvData = {
          type: "crypto",
          symbol: symbol,
          timestamp: currentTime,
          open: openKES,
          high: highKES,
          low: lowKES,
          close: priceKES,
          volume: volumeKES,
          valueKES: priceKES,
          source: "binance",
          lastUpdated: new Date(),
          metadata: {
            baseAsset: baseAsset,
            quoteAsset: "USDT",
            priceChange: parseFloat(ticker.priceChange),
            priceChangePercent: parseFloat(ticker.priceChangePercent),
            volume: parseFloat(ticker.volume),
            count: parseInt(ticker.count)
          }
        };
        
        // Store in MongoDB (upsert to avoid duplicates)
        await OHLCV.findOneAndUpdate(
          { 
            type: "crypto", 
            symbol: symbol, 
            timestamp: currentTime 
          },
          ohlcvData,
          { 
            upsert: true, 
            new: true 
          }
        );
        
        console.log(`✅ Stored crypto data for ${symbol}: KSh ${priceKES.toFixed(2)}`);
        
      } catch (error) {
        console.error(`❌ Error processing ${ticker.symbol}:`, error.message);
        // Continue with other cryptocurrencies even if one fails
      }
    }
    
    console.log(`✅ Successfully processed and stored ${tickers.length} cryptocurrencies`);
    
  } catch (error) {
    console.error("❌ Error in processAndStoreCryptoData:", error.message);
    throw error;
  }
}

/**
 * Fetch and store historical klines data for a specific cryptocurrency
 * @param {string} symbol - Trading pair symbol
 * @param {string} interval - Time interval
 * @param {number} limit - Number of historical points
 */
async function fetchAndStoreHistoricalCryptoData(symbol, interval = "5m", limit = 100) {
  try {
    console.log(`🔄 Fetching historical data for ${symbol}...`);
    
    const klines = await fetchCryptoKlines(symbol, interval, limit);
    
    for (const kline of klines) {
      const [timestamp, open, high, low, close, volume] = kline;
      
      // Convert USD prices to KES
      const openKES = await convertUSDToKES(parseFloat(open));
      const highKES = await convertUSDToKES(parseFloat(high));
      const lowKES = await convertUSDToKES(parseFloat(low));
      const closeKES = await convertUSDToKES(parseFloat(close));
      const volumeKES = await convertUSDToKES(parseFloat(volume));
      
      const ohlcvData = {
        type: "crypto",
        symbol: symbol,
        timestamp: timestamp,
        open: openKES,
        high: highKES,
        low: lowKES,
        close: closeKES,
        volume: volumeKES,
        valueKES: closeKES,
        source: "binance",
        lastUpdated: new Date(),
        metadata: {
          baseAsset: symbol.replace("USDT", ""),
          quoteAsset: "USDT"
        }
      };
      
      // Store in MongoDB
      await OHLCV.findOneAndUpdate(
        { 
          type: "crypto", 
          symbol: symbol, 
          timestamp: timestamp 
        },
        ohlcvData,
        { 
          upsert: true, 
          new: true 
        }
      );
    }
    
    console.log(`✅ Stored ${klines.length} historical data points for ${symbol}`);
    
  } catch (error) {
    console.error(`❌ Error fetching historical data for ${symbol}:`, error.message);
    throw error;
  }
}

/**
 * Get latest crypto price from MongoDB (not from API directly)
 * This ensures we always serve data from our database first
 * @param {string} symbol - Trading pair symbol
 * @returns {Object} Latest price data
 */
async function getLatestCryptoPrice(symbol) {
  try {
    // Normalize the symbol to full format
    const normalizedSymbol = normalizeCryptoSymbol(symbol);
    
    const latest = await OHLCV.getLatestPrice("crypto", normalizedSymbol);
    
    if (!latest) {
      throw new Error(`No data found for ${normalizedSymbol}`);
    }
    
    return {
      symbol: latest.symbol,
      price: latest.valueKES,
      timestamp: latest.timestamp,
      source: latest.source,
      lastUpdated: latest.lastUpdated,
      metadata: latest.metadata
    };
    
  } catch (error) {
    console.error(`❌ Error getting latest crypto price for ${symbol}:`, error.message);
    throw error;
  }
}

/**
 * Get historical crypto data from MongoDB
 * @param {string} symbol - Trading pair symbol
 * @param {number} limit - Number of data points
 * @returns {Array} Historical data
 */
async function getHistoricalCryptoData(symbol, limit = 100) {
  try {
    const historical = await OHLCV.getHistoricalData("crypto", symbol, limit);
    
    return historical.map(item => ({
      timestamp: item.timestamp,
      open: item.open,
      high: item.high,
      low: item.low,
      close: item.close,
      volume: item.volume,
      valueKES: item.valueKES
    }));
    
  } catch (error) {
    console.error(`❌ Error getting historical crypto data for ${symbol}:`, error.message);
    throw error;
  }
}

export {
  processAndStoreCryptoData,
  fetchAndStoreHistoricalCryptoData,
  getLatestCryptoPrice,
  getHistoricalCryptoData,
  TOP_CRYPTO_SYMBOLS
};
