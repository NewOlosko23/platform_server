import Stock from "../models/Stock.js";

/**
 * Save properly formatted stock data to database
 * Stock data is now correctly formatted from the scraper
 * @param {Object} stockData - Properly formatted stock data from scraper
 * @returns {Promise<Object>} Saved stock document
 */
export async function saveStock(stockData) {
  try {
    // Stock data is now properly formatted from the scraper
    const stock = new Stock(stockData);
    await stock.save();

    console.log("✅ Stock saved:", stock);
    return stock;
  } catch (error) {
    console.error("❌ Error saving stock:", error);
    throw error;
  }
}

/**
 * Save multiple stocks
 * @param {Array} stockArray - Array of properly formatted stock data objects
 * @returns {Promise<Array>} Array of saved stock documents
 */
export async function saveStocks(stockArray) {
  try {
    const savedStocks = await Stock.insertMany(stockArray);
    
    console.log(`✅ ${savedStocks.length} stocks saved successfully`);
    return savedStocks;
  } catch (error) {
    console.error("❌ Error saving stocks:", error);
    throw error;
  }
}
