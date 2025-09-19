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
