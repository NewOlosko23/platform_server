import puppeteer from "puppeteer";
import fs from "fs";
import path from "path";

// Global browser instance for all scraping operations
// Single browser instance prevents Windows EBUSY errors from multiple temp profile lockfiles
let globalBrowser = null;
let isBrowserInitialized = false;

/**
 * Initialize the global browser instance with Windows-safe configuration
 * userDataDir prevents EBUSY errors by avoiding Windows temp folder conflicts
 */
async function initializeBrowser() {
  if (isBrowserInitialized && globalBrowser) {
    return globalBrowser;
  }

  try {
    // Ensure tmp directory exists for Puppeteer profile
    const tmpDir = "./tmp/puppeteer-profile";
    if (!fs.existsSync(tmpDir)) {
      fs.mkdirSync(tmpDir, { recursive: true });
    }

    globalBrowser = await puppeteer.launch({
      headless: true,
      userDataDir: tmpDir, // Prevents EBUSY errors on Windows
      args: [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-dev-shm-usage',
        '--disable-accelerated-2d-canvas',
        '--no-first-run',
        '--no-zygote',
        '--disable-gpu'
      ]
    });
    
    isBrowserInitialized = true;
    console.log("✅ Global browser instance initialized");
    return globalBrowser;
  } catch (error) {
    console.error("❌ Failed to initialize browser:", error);
    throw error;
  }
}

/**
 * Close the global browser instance
 */
export async function closeGlobalBrowser() {
  if (globalBrowser) {
    try {
      await globalBrowser.close();
      globalBrowser = null;
      isBrowserInitialized = false;
      console.log("✅ Global browser instance closed");
    } catch (error) {
      console.error("❌ Error closing browser:", error);
    }
  }
}

/**
 * Enhanced NSE stock scraper that extracts comprehensive stock data
 * Uses global browser instance to prevent Windows EBUSY errors
 * @returns {Promise<Array>} Array of stock objects with ticker, name, volume, price, change, type, url
 */
export async function scrapeStocks() {
  let page = null;
  try {
    const browser = await initializeBrowser();
    page = await browser.newPage();
    
    await page.goto("https://afx.kwayisi.org/nse/", { waitUntil: "networkidle2" });

    const data = await page.evaluate(() => {
      const rows = document.querySelectorAll("body > div > div > div > main > article > div.t > table tbody tr");
      return Array.from(rows).map(row => {
        const tds = row.querySelectorAll("td");
        if (tds.length < 5) return null;

        // Extract ticker and URL
        const tickerElement = tds[0];
        const ticker = tickerElement?.innerText.trim() || null;
        const url = tickerElement?.querySelector("a")?.href || null;

        // Extract company name
        const name = tds[1]?.innerText.trim() || null;

        // Extract volume (remove commas and parse as integer)
        const volumeText = tds[2]?.innerText.replace(/,/g, "") || null;
        const volume = volumeText ? parseInt(volumeText, 10) : null;

        // Extract price (parse as float)
        const priceText = tds[3]?.innerText.trim() || null;
        const price = priceText ? parseFloat(priceText) : null;

        // Extract change and determine type
        const changeElement = tds[4];
        const changeText = changeElement?.innerText.trim() || null;
        const changeClass = changeElement?.className || "";
        
        // Parse change value (remove + sign and parse as float)
        const change = changeText ? parseFloat(changeText.replace("+", "")) : null;

        // Determine stock type based on change value and CSS class
        let type = "neutral";
        if (change !== null) {
          if (change > 0 || changeClass.includes("hi")) {
            type = "gainer";
          } else if (change < 0 || changeClass.includes("lo")) {
            type = "loser";
          }
        }

        // Only return data if we have at least ticker and name
        if (!ticker || !name) return null;

        return {
          ticker,
          name,
          volume,
          price,
          change,
          type,
          url,
          createdAt: new Date().toISOString()
        };
      }).filter(Boolean); // Remove null entries
    });

    return data;
  } catch (error) {
    console.error("❌ Error in scrapeStocks:", error);
    throw error;
  } finally {
    // Always close the page to prevent resource leaks
    if (page) {
      try {
        await page.close();
      } catch (error) {
        console.error("❌ Error closing page in scrapeStocks:", error);
      }
    }
  }
}

/**
 * Scrape top gainers and bottom losers from NSE
 * Uses global browser instance to prevent Windows EBUSY errors
 * @returns {Promise<Object>} Object containing topGainers and bottomLosers arrays
 */
export async function scrapeTopGainersAndLosers() {
  let page = null;
  try {
    const browser = await initializeBrowser();
    page = await browser.newPage();
    
    await page.goto("https://afx.kwayisi.org/nse/", { waitUntil: "networkidle2" });

    const data = await page.evaluate(() => {
      // Grab all stock tables inside the wrapper <div data-stat="">
      const tables = document.querySelectorAll("div[data-stat] table");

      function parseTable(table) {
        return Array.from(table.querySelectorAll("tbody tr")).map((row, index) => {
          const cols = row.querySelectorAll("td");
          return {
            ticker: cols[0]?.innerText.trim(),
            price: cols[1]?.innerText.trim(),
            change: cols[2]?.innerText.trim(),
            rank: index + 1
          };
        });
      }

      return {
        topGainers: parseTable(tables[0]), // first table = Top Gainers
        bottomLosers: parseTable(tables[1]) // second table = Bottom Losers
      };
    });

    return data;
  } catch (error) {
    console.error("❌ Error in scrapeTopGainersAndLosers:", error);
    throw error;
  } finally {
    // Always close the page to prevent resource leaks
    if (page) {
      try {
        await page.close();
      } catch (error) {
        console.error("❌ Error closing page in scrapeTopGainersAndLosers:", error);
      }
    }
  }
}

/**
 * Scrape market insights from NSE
 * Uses global browser instance to prevent Windows EBUSY errors
 * @returns {Promise<Object>} Object containing market insights data
 */
export async function scrapeMarketInsights() {
  let page = null;
  try {
    const browser = await initializeBrowser();
    page = await browser.newPage();
    
    await page.goto("https://afx.kwayisi.org/nse/", { waitUntil: "networkidle2" });

    const data = await page.evaluate(() => {
      // ---- Market Insights ----
      const marketTable = document.querySelector("table[style*='margin-top:.125em']");
      let marketInsights = {};
      if (marketTable) {
        const row = marketTable.querySelector("tbody tr");
        const cols = row.querySelectorAll("td");
        marketInsights = {
          nasiIndex: cols[0]?.innerText.trim(),    // "173.50 (-1.52)"
          yearToDate: cols[1]?.innerText.trim(),   // "+50.02 (40.51%)"
          marketCap: cols[2]?.innerText.trim(),    // "KES 2.73Tr"
        };
      }

      return marketInsights;
    });

    return data;
  } catch (error) {
    console.error("❌ Error in scrapeMarketInsights:", error);
    throw error;
  } finally {
    // Always close the page to prevent resource leaks
    if (page) {
      try {
        await page.close();
      } catch (error) {
        console.error("❌ Error closing page in scrapeMarketInsights:", error);
      }
    }
  }
}

/**
 * Scrape detailed information for a specific stock by ticker
 * Uses global browser instance to prevent Windows EBUSY errors
 * @param {string} ticker - The stock ticker symbol
 * @returns {Promise<Object>} Object containing detailed stock information
 */
export async function scrapeStock(ticker) {
  let page = null;
  try {
    const browser = await initializeBrowser();
    page = await browser.newPage();
    
    await page.goto(`https://afx.kwayisi.org/nse/${ticker.toLowerCase()}.html`, { waitUntil: "networkidle2" });

    const data = await page.evaluate(() => {
      const getText = (selector) =>
        document.querySelector(selector)?.innerText.trim() || null;

      // --- Basic Info ---
      const name = getText("h1") || getText("h2");
      const description = document.querySelector("p")?.innerText || "";

      // --- Current Share Price ---
      const priceBlock = document.querySelector("h3, h4, .price")?.innerText || "";

      // --- Last Trading Results ---
      let lastTrading = {};
      const tradingTable = Array.from(document.querySelectorAll("table"))
        .find((t) => t.innerText.includes("Opening Price"));
      if (tradingTable) {
        lastTrading = Object.fromEntries(
          Array.from(tradingTable.querySelectorAll("tr")).map((tr) => {
            const [label, value] = tr.innerText.split(/\t| {2,}/);
            return [label, value];
          })
        );
      }

      // --- Performance Table (1WK, 4WK, 3MO, etc.) ---
      let performance = {};
      const perfTable = Array.from(document.querySelectorAll("table"))
        .find((t) => t.innerText.includes("1WK"));
      if (perfTable) {
        const headers = Array.from(perfTable.querySelectorAll("thead th")).map((th) => th.innerText.trim());
        const values = Array.from(perfTable.querySelectorAll("tbody td")).map((td) => td.innerText.trim());
        headers.forEach((h, i) => {
          performance[h] = values[i];
        });
      }

      // --- Last 10 Trading Days ---
      let history = [];
      const histTable = Array.from(document.querySelectorAll("table"))
        .find((t) => t.innerText.includes("Date") && t.innerText.includes("Volume"));
      if (histTable) {
        history = Array.from(histTable.querySelectorAll("tbody tr")).map((tr) => {
          const cols = Array.from(tr.querySelectorAll("td")).map((td) => td.innerText.trim());
          return {
            date: cols[0],
            volume: cols[1],
            close: cols[2],
            change: cols[3],
            changePct: cols[4],
          };
        });
      }

      // --- Company Profile ---
      let profile = {};
      const profileTable = Array.from(document.querySelectorAll("table"))
        .find((t) => t.innerText.includes("Sector") && t.innerText.includes("Address"));
      if (profileTable) {
        profile = Object.fromEntries(
          Array.from(profileTable.querySelectorAll("tr")).map((tr) => {
            const [label, value] = tr.innerText.split(/\t| {2,}/);
            return [label, value];
          })
        );
      }

      return {
        name,
        description,
        currentPrice: priceBlock,
        lastTrading,
        performance,
        history,
        profile,
      };
    });

    return data;
  } catch (error) {
    console.error("❌ Error in scrapeStock:", error);
    throw error;
  } finally {
    // Always close the page to prevent resource leaks
    if (page) {
      try {
        await page.close();
      } catch (error) {
        console.error("❌ Error closing page in scrapeStock:", error);
      }
    }
  }
}

/**
 * Legacy function for backward compatibility
 * @deprecated Use scrapeStocks() instead
 */
export async function fetchNSEListings() {
  console.log('Using legacy fetchNSEListings - consider using scrapeStocks() instead');
  const stocks = await scrapeStocks();
  return {
    stocks: stocks,
    timestamp: new Date().toISOString()
  };
}