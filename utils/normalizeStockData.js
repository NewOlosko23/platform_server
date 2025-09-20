/**
 * Normalize stock data to fix mismatched field mappings
 * This function corrects the field mappings where:
 * - change → price
 * - percent → absolute change  
 * - price → volume
 * @param {Object} apiData - Raw stock data from API/scraper
 * @returns {Object} Normalized stock data with correct field mappings
 */
export function normalizeStockData(apiData) {
  if (!apiData) {
    throw new Error('API data is required for normalization');
  }

  return {
    ticker: apiData.ticker,
    company: apiData.company,
    price: parseFloat(apiData.change) || 0,           // change → price
    change: parseFloat(apiData.percent) || 0,         // percent → absolute change
    percentChange: apiData.percent + "%",             // ensure stored as percentage string
    volume: parseInt(apiData.price?.replace(/,/g, "")) || 0, // price → volume
    scrapedAt: new Date(apiData.scrapedAt || new Date())
  };
}

/**
 * Normalize an array of stock data objects
 * @param {Array} stockArray - Array of raw stock data objects
 * @returns {Array} Array of normalized stock data objects
 */
export function normalizeStockDataArray(stockArray) {
  if (!Array.isArray(stockArray)) {
    throw new Error('Expected an array of stock data');
  }

  return stockArray.map(stock => normalizeStockData(stock));
}
