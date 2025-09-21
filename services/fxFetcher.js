import axios from "axios";
import OHLCV from "../models/OHLCV.js";
import { getExchangeRate, getMultipleExchangeRates } from "./currencyConverter.js";

// Free FX API configuration
const FX_API_BASE_URL = "https://api.exchangerate-api.com/v4/latest";

// Top 15 world currencies vs KES
const TOP_CURRENCY_PAIRS = [
  "USD/KES", "EUR/KES", "GBP/KES", "JPY/KES", "CAD/KES",
  "AUD/KES", "CHF/KES", "CNY/KES", "INR/KES", "BRL/KES",
  "RUB/KES", "ZAR/KES", "NGN/KES", "EGP/KES", "GHS/KES"
];

/**
 * Fetch exchange rates from Free FX API
 * This provides current exchange rates for all major currencies
 */
async function fetchFXData() {
  try {
    console.log("🔄 Fetching FX data from Free FX API...");
    
    // Get rates for USD (most common base currency)
    const response = await axios.get(`${FX_API_BASE_URL}/USD`, {
      timeout: 10000,
      headers: {
        'User-Agent': 'AvodalFinance/1.0'
      }
    });

    const rates = response.data.rates;
    const currentTime = Date.now();
    
    console.log(`✅ Fetched FX rates for ${Object.keys(rates).length} currencies`);
    return { rates, timestamp: currentTime };
    
  } catch (error) {
    console.error("❌ Error fetching FX data:", error.message);
    throw error;
  }
}

/**
 * Process and store FX data in MongoDB
 * This is the core function that ensures data is stored in MongoDB first
 */
async function processAndStoreFXData() {
  try {
    console.log("🚀 Starting FX data processing and storage...");
    
    // Fetch current FX data
    const { rates, timestamp } = await fetchFXData();
    
    // Process each currency pair
    for (const pair of TOP_CURRENCY_PAIRS) {
      try {
        const [baseCurrency, quoteCurrency] = pair.split("/");
        
        // Get the exchange rate
        let rate;
        if (baseCurrency === "USD") {
          rate = rates[quoteCurrency] || 1.0;
        } else {
          // Convert through USD if not direct USD pair
          const baseToUSD = rates[baseCurrency] || 1.0;
          const usdToQuote = rates[quoteCurrency] || 1.0;
          rate = (1 / baseToUSD) * usdToQuote;
        }
        
        // Create OHLCV document for currency pair
        const ohlcvData = {
          type: "currency",
          symbol: pair,
          timestamp: timestamp,
          open: rate,
          high: rate,
          low: rate,
          close: rate,
          volume: 0, // FX doesn't have volume in traditional sense
          valueKES: rate,
          source: "freefxapi",
          lastUpdated: new Date(),
          metadata: {
            baseCurrency: baseCurrency,
            quoteCurrency: quoteCurrency,
            rate: rate
          }
        };
        
        // Store in MongoDB (upsert to avoid duplicates)
        await OHLCV.findOneAndUpdate(
          { 
            type: "currency", 
            symbol: pair, 
            timestamp: timestamp 
          },
          ohlcvData,
          { 
            upsert: true, 
            new: true 
          }
        );
        
        console.log(`✅ Stored FX data for ${pair}: ${rate.toFixed(4)}`);
        
      } catch (error) {
        console.error(`❌ Error processing ${pair}:`, error.message);
        // Continue with other currency pairs even if one fails
      }
    }
    
    console.log(`✅ Successfully processed and stored ${TOP_CURRENCY_PAIRS.length} currency pairs`);
    
  } catch (error) {
    console.error("❌ Error in processAndStoreFXData:", error.message);
    throw error;
  }
}

/**
 * Get latest FX rate from MongoDB (not from API directly)
 * This ensures we always serve data from our database first
 * @param {string} pair - Currency pair (e.g., "USD/KES")
 * @returns {Object} Latest rate data
 */
async function getLatestFXRate(pair) {
  try {
    const latest = await OHLCV.getLatestPrice("currency", pair);
    
    if (!latest) {
      throw new Error(`No data found for ${pair}`);
    }
    
    return {
      pair: latest.symbol,
      rate: latest.valueKES,
      timestamp: latest.timestamp,
      source: latest.source,
      lastUpdated: latest.lastUpdated,
      metadata: latest.metadata
    };
    
  } catch (error) {
    console.error(`❌ Error getting latest FX rate for ${pair}:`, error.message);
    throw error;
  }
}

/**
 * Get historical FX data from MongoDB
 * @param {string} pair - Currency pair
 * @param {number} limit - Number of data points
 * @returns {Array} Historical data
 */
async function getHistoricalFXData(pair, limit = 100) {
  try {
    const historical = await OHLCV.getHistoricalData("currency", pair, limit);
    
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
    console.error(`❌ Error getting historical FX data for ${pair}:`, error.message);
    throw error;
  }
}

/**
 * Get all available currency pairs
 * @returns {Array} List of available currency pairs
 */
async function getAvailableCurrencyPairs() {
  try {
    const pairs = await OHLCV.distinct("symbol", { type: "currency" });
    return pairs.sort();
    
  } catch (error) {
    console.error("❌ Error getting available currency pairs:", error.message);
    throw error;
  }
}

/**
 * Get latest rates for all currency pairs
 * @returns {Array} Latest rates for all pairs
 */
async function getAllLatestFXRates() {
  try {
    const latestRates = await OHLCV.aggregate([
      { $match: { type: "currency" } },
      { $sort: { symbol: 1, timestamp: -1 } },
      { $group: {
        _id: "$symbol",
        latest: { $first: "$$ROOT" }
      }},
      { $replaceRoot: { newRoot: "$latest" } },
      { $sort: { symbol: 1 } }
    ]);
    
    return latestRates.map(rate => ({
      pair: rate.symbol,
      rate: rate.valueKES,
      timestamp: rate.timestamp,
      source: rate.source,
      lastUpdated: rate.lastUpdated,
      metadata: rate.metadata
    }));
    
  } catch (error) {
    console.error("❌ Error getting all latest FX rates:", error.message);
    throw error;
  }
}

/**
 * Convert amount between currencies using stored rates
 * @param {number} amount - Amount to convert
 * @param {string} fromCurrency - Source currency
 * @param {string} toCurrency - Target currency
 * @returns {number} Converted amount
 */
async function convertCurrencyAmount(amount, fromCurrency, toCurrency) {
  try {
    if (fromCurrency === toCurrency) {
      return amount;
    }
    
    // Try to get direct rate from database
    const directPair = `${fromCurrency}/${toCurrency}`;
    try {
      const directRate = await getLatestFXRate(directPair);
      return amount * directRate.rate;
    } catch (error) {
      // If direct rate not available, convert through KES
      const fromToKES = await getLatestFXRate(`${fromCurrency}/KES`);
      const kesToTarget = await getLatestFXRate(`${toCurrency}/KES`);
      const rate = fromToKES.rate / kesToTarget.rate;
      return amount * rate;
    }
    
  } catch (error) {
    console.error(`❌ Error converting ${amount} ${fromCurrency} to ${toCurrency}:`, error.message);
    throw error;
  }
}

export {
  processAndStoreFXData,
  getLatestFXRate,
  getHistoricalFXData,
  getAvailableCurrencyPairs,
  getAllLatestFXRates,
  convertCurrencyAmount,
  TOP_CURRENCY_PAIRS
};
