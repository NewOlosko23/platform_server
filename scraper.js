import puppeteer from "puppeteer";

/**
 * Simple NSE stock scraper that extracts basic stock data
 * Matches the structure from the documentation
 * @returns {Promise<Array>} Array of stock objects with ticker, company, price, change, percent
 */
export async function scrapeStocks() {
  const browser = await puppeteer.launch({ headless: true });
  const page = await browser.newPage();

  await page.goto("https://afx.kwayisi.org/nse/", { waitUntil: "networkidle2" });

  const data = await page.evaluate(() => {
    const rows = document.querySelectorAll("table tbody tr");
    return Array.from(rows).map(row => {
      const cols = row.querySelectorAll("td");
      return {
        ticker: cols[0]?.innerText.trim(),
        company: cols[1]?.innerText.trim(),
        price: cols[2]?.innerText.trim(),
        change: cols[3]?.innerText.trim(),
        percent: cols[4]?.innerText.trim(),
      };
    });
  });

  await browser.close();
  return data;
}

/**
 * Scrape top gainers and bottom losers from NSE
 * @returns {Promise<Object>} Object containing topGainers and bottomLosers arrays
 */
export async function scrapeTopGainersAndLosers() {
  const url = "https://afx.kwayisi.org/nse/";

  const browser = await puppeteer.launch({ headless: true });
  const page = await browser.newPage();

  await page.goto(url, { waitUntil: "networkidle2" });

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

  await browser.close();
  return data;
}

/**
 * Scrape market insights from NSE
 * @returns {Promise<Object>} Object containing market insights data
 */
export async function scrapeMarketInsights() {
  const url = "https://afx.kwayisi.org/nse/";

  const browser = await puppeteer.launch({ headless: true });
  const page = await browser.newPage();

  await page.goto(url, { waitUntil: "networkidle2" });

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

  await browser.close();
  return data;
}

/**
 * Scrape detailed information for a specific stock by ticker
 * @param {string} ticker - The stock ticker symbol
 * @returns {Promise<Object>} Object containing detailed stock information
 */
export async function scrapeStock(ticker) {
  const url = `https://afx.kwayisi.org/nse/${ticker.toLowerCase()}.html`;

  const browser = await puppeteer.launch({ headless: true });
  const page = await browser.newPage();

  await page.goto(url, { waitUntil: "networkidle2" });

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

  await browser.close();
  return data;
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
