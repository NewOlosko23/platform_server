import axios from "axios";

// Free FX API configuration
const FX_API_BASE_URL = "https://api.exchangerate-api.com/v4/latest";
const FALLBACK_RATES = {
  "USD": 150.0,  // Approximate USD/KES rate
  "EUR": 165.0,  // Approximate EUR/KES rate
  "GBP": 190.0,  // Approximate GBP/KES rate
  "JPY": 1.0,    // Approximate JPY/KES rate
  "CAD": 110.0,  // Approximate CAD/KES rate
  "AUD": 100.0,  // Approximate AUD/KES rate
  "CHF": 170.0,  // Approximate CHF/KES rate
  "CNY": 21.0,   // Approximate CNY/KES rate
  "INR": 1.8,    // Approximate INR/KES rate
  "BRL": 30.0,   // Approximate BRL/KES rate
  "RUB": 1.5,    // Approximate RUB/KES rate
  "ZAR": 8.0,    // Approximate ZAR/KES rate
  "NGN": 0.2,    // Approximate NGN/KES rate
  "EGP": 5.0,    // Approximate EGP/KES rate
  "GHS": 12.0    // Approximate GHS/KES rate
};

// Cache for exchange rates to avoid excessive API calls
let rateCache = new Map();
const CACHE_DURATION = 5 * 60 * 1000; // 5 minutes

/**
 * Get exchange rate from Free FX API
 * @param {string} fromCurrency - Source currency (e.g., "USD")
 * @param {string} toCurrency - Target currency (e.g., "KES")
 * @returns {number} Exchange rate
 */
async function getExchangeRate(fromCurrency, toCurrency) {
  try {
    // Check cache first
    const cacheKey = `${fromCurrency}_${toCurrency}`;
    const cached = rateCache.get(cacheKey);
    
    if (cached && (Date.now() - cached.timestamp) < CACHE_DURATION) {
      console.log(`📋 Using cached rate for ${fromCurrency}/${toCurrency}: ${cached.rate}`);
      return cached.rate;
    }
    
    console.log(`🔄 Fetching exchange rate for ${fromCurrency}/${toCurrency}...`);
    
    // If converting to KES, we need to get rates from the source currency
    if (toCurrency === "KES") {
      const response = await axios.get(`${FX_API_BASE_URL}/${fromCurrency}`, {
        timeout: 10000,
        headers: {
          'User-Agent': 'AvodalFinance/1.0'
        }
      });
      
      const rate = response.data.rates.KES;
      
      // Cache the rate
      rateCache.set(cacheKey, {
        rate: rate,
        timestamp: Date.now()
      });
      
      console.log(`✅ Fetched ${fromCurrency}/KES rate: ${rate}`);
      return rate;
    }
    
    // If converting from KES to another currency
    if (fromCurrency === "KES") {
      const response = await axios.get(`${FX_API_BASE_URL}/${toCurrency}`, {
        timeout: 10000,
        headers: {
          'User-Agent': 'AvodalFinance/1.0'
        }
      });
      
      const rate = 1 / response.data.rates.KES; // Inverse rate
      
      // Cache the rate
      rateCache.set(cacheKey, {
        rate: rate,
        timestamp: Date.now()
      });
      
      console.log(`✅ Fetched KES/${toCurrency} rate: ${rate}`);
      return rate;
    }
    
    // For other currency pairs, convert through USD
    const fromToUSD = await getExchangeRate(fromCurrency, "USD");
    const usdToTarget = await getExchangeRate("USD", toCurrency);
    const rate = fromToUSD * usdToTarget;
    
    // Cache the rate
    rateCache.set(cacheKey, {
      rate: rate,
      timestamp: Date.now()
    });
    
    console.log(`✅ Calculated ${fromCurrency}/${toCurrency} rate: ${rate}`);
    return rate;
    
  } catch (error) {
    console.error(`❌ Error fetching exchange rate for ${fromCurrency}/${toCurrency}:`, error.message);
    
    // Use fallback rates if API fails
    if (toCurrency === "KES" && FALLBACK_RATES[fromCurrency]) {
      console.log(`⚠️ Using fallback rate for ${fromCurrency}/KES: ${FALLBACK_RATES[fromCurrency]}`);
      return FALLBACK_RATES[fromCurrency];
    }
    
    if (fromCurrency === "KES" && FALLBACK_RATES[toCurrency]) {
      const fallbackRate = 1 / FALLBACK_RATES[toCurrency];
      console.log(`⚠️ Using fallback rate for KES/${toCurrency}: ${fallbackRate}`);
      return fallbackRate;
    }
    
    // Default fallback
    console.log(`⚠️ Using default fallback rate: 1.0`);
    return 1.0;
  }
}

/**
 * Convert amount from one currency to another
 * @param {number} amount - Amount to convert
 * @param {string} fromCurrency - Source currency
 * @param {string} toCurrency - Target currency
 * @returns {number} Converted amount
 */
async function convertCurrency(amount, fromCurrency, toCurrency) {
  try {
    if (fromCurrency === toCurrency) {
      return amount;
    }
    
    const rate = await getExchangeRate(fromCurrency, toCurrency);
    return amount * rate;
    
  } catch (error) {
    console.error(`❌ Error converting ${amount} ${fromCurrency} to ${toCurrency}:`, error.message);
    throw error;
  }
}

/**
 * Get multiple exchange rates at once
 * @param {string} baseCurrency - Base currency
 * @param {Array} targetCurrencies - Array of target currencies
 * @returns {Object} Object with currency pairs and rates
 */
async function getMultipleExchangeRates(baseCurrency, targetCurrencies) {
  try {
    const rates = {};
    
    for (const targetCurrency of targetCurrencies) {
      try {
        rates[targetCurrency] = await getExchangeRate(baseCurrency, targetCurrency);
      } catch (error) {
        console.error(`❌ Error getting rate for ${baseCurrency}/${targetCurrency}:`, error.message);
        rates[targetCurrency] = null;
      }
    }
    
    return rates;
    
  } catch (error) {
    console.error(`❌ Error getting multiple exchange rates:`, error.message);
    throw error;
  }
}

/**
 * Clear the exchange rate cache
 */
function clearRateCache() {
  rateCache.clear();
  console.log("🧹 Exchange rate cache cleared");
}

/**
 * Get cache statistics
 * @returns {Object} Cache statistics
 */
function getCacheStats() {
  return {
    size: rateCache.size,
    entries: Array.from(rateCache.keys())
  };
}

export {
  getExchangeRate,
  convertCurrency,
  getMultipleExchangeRates,
  clearRateCache,
  getCacheStats,
  FALLBACK_RATES
};
