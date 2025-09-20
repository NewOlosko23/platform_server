// utils/stockApi.js
// Stock API utilities that fetch data from MongoDB database

import Stock from '../models/Stock.js';

/**
 * Fetch stock price from MongoDB database
 * @param {string} symbol - Stock symbol (e.g., 'AAPL', 'GOOGL')
 * @returns {Promise<Object>} Stock data with price, volume, timestamp
 */
export async function fetchStockPrice(symbol) {
  try {
    // Find the latest stock data from MongoDB
    const stock = await Stock.findOne({ 
      ticker: new RegExp("^" + symbol + "$", "i") 
    }).sort({ scrapedAt: -1 });
    
    if (!stock) {
      console.warn(`Stock ${symbol} not found in database, using mock data`);
      return getMockStockData(symbol);
    }
    
    // Parse the price from string to number - handle both string and number formats
    let price = 0;
    if (typeof stock.price === 'string') {
      // If price is a string, remove currency symbols and commas, then parse
      price = parseFloat(stock.price.replace(/[₹,]/g, '')) || 0;
    } else if (typeof stock.price === 'number') {
      // If price is already a number, use it directly
      price = stock.price;
    } else {
      // If price is null, undefined, or other type, default to 0
      console.warn(`Invalid price format for ${symbol}: ${typeof stock.price} - ${stock.price}`);
      price = 0;
    }
    
    return {
      symbol: stock.ticker.toUpperCase(),
      price: price,
      volume: stock.volume || 0,
      timestamp: stock.scrapedAt || new Date().toISOString(),
      change: stock.change,
      changePercent: stock.percent
    };
  } catch (error) {
    console.error(`Error fetching stock price for ${symbol} from database:`, error.message);
    return getMockStockData(symbol);
  }
}

/**
 * Get mock stock data for testing and fallback purposes
 * @param {string} symbol - Stock symbol
 * @returns {Object} Mock stock data
 */
export function getMockStockData(symbol) {
  // Generate consistent mock data based on symbol
  const basePrice = Math.abs(symbol.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0)) % 1000 + 50;
  const variation = (Math.sin(symbol.length) * 0.1 + 1); // Small variation based on symbol
  const price = Math.round(basePrice * variation * 100) / 100;
  
  return {
    symbol: symbol.toUpperCase(),
    price: price,
    volume: Math.floor(Math.random() * 1000000) + 100000,
    timestamp: new Date().toISOString()
  };
}

/**
 * Fetch exchange rate between two currencies
 * @param {string} fromCurrency - Source currency code (e.g., 'USD')
 * @param {string} toCurrency - Target currency code (e.g., 'EUR')
 * @returns {Promise<Object>} Exchange rate data
 */
export async function fetchExchangeRate(fromCurrency, toCurrency) {
  try {
    // Try to fetch from a real exchange rate API
    const response = await fetch(`https://api.exchangerate-api.com/v4/latest/${fromCurrency}`);
    
    if (!response.ok) {
      throw new Error(`Exchange rate API request failed: ${response.status}`);
    }
    
    const data = await response.json();
    const rate = data.rates[toCurrency.toUpperCase()];
    
    if (!rate) {
      throw new Error(`Exchange rate not found for ${toCurrency}`);
    }
    
    return {
      fromCurrency: fromCurrency.toUpperCase(),
      toCurrency: toCurrency.toUpperCase(),
      exchangeRate: rate,
      timestamp: new Date().toISOString()
    };
  } catch (error) {
    console.warn(`Failed to fetch real exchange rate for ${fromCurrency}/${toCurrency}, using mock data:`, error.message);
    return getMockExchangeRate(fromCurrency, toCurrency);
  }
}

/**
 * Fetch multiple exchange rates from a base currency
 * @param {string} baseCurrency - Base currency code
 * @param {Array<string>} targetCurrencies - Array of target currency codes
 * @returns {Promise<Object>} Multiple exchange rates data
 */
export async function fetchMultipleExchangeRates(baseCurrency, targetCurrencies) {
  try {
    const rates = {};
    
    // Fetch rates for each target currency
    for (const targetCurrency of targetCurrencies) {
      const rateData = await fetchExchangeRate(baseCurrency, targetCurrency);
      rates[targetCurrency.toUpperCase()] = rateData.exchangeRate;
    }
    
    return {
      baseCurrency: baseCurrency.toUpperCase(),
      rates: rates,
      timestamp: new Date().toISOString()
    };
  } catch (error) {
    console.warn(`Failed to fetch multiple exchange rates, using mock data:`, error.message);
    return getMockMultipleExchangeRates(baseCurrency, targetCurrencies);
  }
}

/**
 * Get mock exchange rate data
 * @param {string} fromCurrency - Source currency
 * @param {string} toCurrency - Target currency
 * @returns {Object} Mock exchange rate data
 */
function getMockExchangeRate(fromCurrency, toCurrency) {
  // Generate consistent mock exchange rates
  const currencies = [fromCurrency, toCurrency].sort();
  const seed = currencies.join('').split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
  const rate = 0.5 + (seed % 100) / 100; // Rate between 0.5 and 1.5
  
  return {
    fromCurrency: fromCurrency.toUpperCase(),
    toCurrency: toCurrency.toUpperCase(),
    exchangeRate: Math.round(rate * 10000) / 10000, // Round to 4 decimal places
    timestamp: new Date().toISOString()
  };
}

/**
 * Get mock multiple exchange rates data
 * @param {string} baseCurrency - Base currency
 * @param {Array<string>} targetCurrencies - Target currencies
 * @returns {Object} Mock multiple exchange rates data
 */
function getMockMultipleExchangeRates(baseCurrency, targetCurrencies) {
  const rates = {};
  
  for (const targetCurrency of targetCurrencies) {
    const rateData = getMockExchangeRate(baseCurrency, targetCurrency);
    rates[targetCurrency.toUpperCase()] = rateData.exchangeRate;
  }
  
  return {
    baseCurrency: baseCurrency.toUpperCase(),
    rates: rates,
    timestamp: new Date().toISOString()
  };
}
