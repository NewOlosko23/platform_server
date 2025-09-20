import Stock from "../models/Stock.js";
import { normalizeStockData } from "./normalizeStockData.js";

/**
 * Example function showing how to save normalized stock data
 * This demonstrates the flow: fetch → normalize → save
 * @param {Object} apiData - Raw stock data from API/scraper
 * @returns {Promise<Object>} Saved stock document
 */
export async function saveStock(apiData) {
  try {
    // Fix the mismatched fields using normalization
    const normalized = normalizeStockData(apiData);

    // Save into DB
    const stock = new Stock(normalized);
    await stock.save();

    console.log("✅ Stock saved:", stock);
    return stock;
  } catch (error) {
    console.error("❌ Error saving stock:", error);
    throw error;
  }
}

/**
 * Save multiple stocks with normalization
 * @param {Array} stockArray - Array of raw stock data objects
 * @returns {Promise<Array>} Array of saved stock documents
 */
export async function saveStocks(stockArray) {
  try {
    const normalizedStocks = stockArray.map(stock => normalizeStockData(stock));
    const savedStocks = await Stock.insertMany(normalizedStocks);
    
    console.log(`✅ ${savedStocks.length} stocks saved successfully`);
    return savedStocks;
  } catch (error) {
    console.error("❌ Error saving stocks:", error);
    throw error;
  }
}
