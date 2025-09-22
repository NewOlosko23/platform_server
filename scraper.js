import puppeteer from "puppeteer";
import fs from "fs";
import path from "path";

// Global browser instance for all scraping operations
// Single browser instance prevents Windows EBUSY errors from multiple temp profile lockfiles
let globalBrowser = null;
let isBrowserInitialized = false;

/**
 * Initialize a new browser instance for each scraping operation
 * This prevents conflicts and resource leaks
 */
async function createBrowser() {
  try {
    // Simple, reliable browser configuration
    const launchOptions = {
      headless: true,
      args: [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-dev-shm-usage',
        '--disable-gpu',
        '--disable-web-security',
        '--disable-features=VizDisplayCompositor',
        '--disable-extensions',
        '--disable-plugins',
        '--disable-images',
        '--disable-default-apps',
        '--disable-sync',
        '--disable-translate',
        '--hide-scrollbars',
        '--mute-audio',
        '--no-default-browser-check',
        '--no-pings',
        '--disable-background-timer-throttling',
        '--disable-backgrounding-occluded-windows',
        '--disable-renderer-backgrounding',
        '--disable-component-extensions-with-background-pages',
        '--disable-background-networking',
        '--disable-client-side-phishing-detection',
        '--disable-sync-preferences',
        '--disable-component-update',
        '--disable-background-downloads',
        '--disable-add-to-shelf',
        '--disable-breakpad',
        '--disable-datasaver-prompt',
        '--disable-desktop-notifications',
        '--disable-device-discovery-notifications',
        '--disable-domain-reliability-monitoring',
        '--disable-features=TranslateUI,BlinkGenPropertyTrees',
        '--disable-ipc-flooding-protection',
        '--disable-logging',
        '--disable-permissions-api',
        '--disable-popup-blocking',
        '--disable-prompt-on-repost',
        '--disable-speech-api',
        '--disable-web-resources',
        '--enable-features=NetworkService,NetworkServiceLogging',
        '--force-color-profile=srgb',
        '--metrics-recording-only',
        '--use-mock-keychain'
      ],
      timeout: 30000,
      protocolTimeout: 30000,
      ignoreDefaultArgs: ['--disable-extensions'],
      ignoreHTTPSErrors: true
    };

// Detect Render environment by checking NODE_ENV
if (process.env.NODE_ENV === "production") {
  // Render build path from puppeteer postinstall
  const chromePath = "/opt/render/.cache/puppeteer/chrome/linux-131.0.6778.204/chrome-linux64/chrome";
  launchOptions.executablePath = chromePath;
  console.log(`🔍 Using Render Chrome at: ${chromePath}`);
} else {
  // Local dev fallback (Windows paths)
  const possiblePaths = [
    "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe",
    "C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe",
    `C:\\Users\\${process.env.USERNAME || "user"}\\AppData\\Local\\Google\\Chrome\\Application\\chrome.exe`,
  ];
  for (const chromePath of possiblePaths) {
    if (fs.existsSync(chromePath)) {
      launchOptions.executablePath = chromePath;
      console.log(`🔍 Found Chrome at: ${chromePath}`);
      break;
    }
  }
}


    console.log("🚀 Launching Puppeteer browser...");
    const browser = await puppeteer.launch(launchOptions);
    console.log("✅ Browser launched successfully");
    return browser;
  } catch (error) {
    console.error("❌ Failed to launch browser:", error.message);
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
 * Creates a new browser instance for each scraping operation
 * @returns {Promise<Array>} Array of stock objects with ticker, name, volume, price, change, type, url
 */
export async function scrapeStocks() {
  let browser = null;
  let page = null;
  try {
    browser = await createBrowser();
    page = await browser.newPage();
    
    console.log("📊 Navigating to NSE website...");
    await page.goto("https://afx.kwayisi.org/nse/", { 
      waitUntil: "networkidle2",
      timeout: 30000 
    });

    console.log("🔍 Extracting stock data...");
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

        // Extract price (parse as float and round to 2 decimal places)
        const priceText = tds[3]?.innerText.trim() || null;
        const price = priceText ? Math.round(parseFloat(priceText) * 100) / 100 : null;

        // Extract change and determine type
        const changeElement = tds[4];
        const changeText = changeElement?.innerText.trim() || null;
        const changeClass = changeElement?.className || "";
        
        // Parse change value (preserve sign - don't remove + sign)
        let change = null;
        let changePercent = null;
        
        if (changeText) {
          // Parse the absolute change value (handle +0.00 case)
          const cleanChangeText = changeText.replace(/[+]/g, "");
          change = parseFloat(cleanChangeText);
          
          // Calculate percentage change if we have both price and change
          if (!isNaN(change) && price !== null && price > 0) {
            changePercent = ((change / price) * 100).toFixed(2);
          }
        }

        // Determine stock type based on change value and CSS class
        let type = "neutral";
        if (!isNaN(change)) {
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
          changePercent,
          type,
          url,
          createdAt: new Date().toISOString()
        };
      }).filter(Boolean); // Remove null entries
    });

    console.log(`✅ Successfully scraped ${data.length} stocks`);
    return data;
  } catch (error) {
    console.error("❌ Error in scrapeStocks:", error);
    throw error;
  } finally {
    // Always close the page and browser to prevent resource leaks
    if (page) {
      try {
        await page.close();
      } catch (error) {
        console.error("❌ Error closing page in scrapeStocks:", error);
      }
    }
    if (browser) {
      try {
        await browser.close();
      } catch (error) {
        console.error("❌ Error closing browser in scrapeStocks:", error);
      }
    }
  }
}

/**
 * Scrape top gainers and bottom losers from NSE
 * Creates a new browser instance for each scraping operation
 * @returns {Promise<Object>} Object containing topGainers and bottomLosers arrays
 */
export async function scrapeTopGainersAndLosers() {
  let browser = null;
  let page = null;
  try {
    browser = await createBrowser();
    page = await browser.newPage();
    
    await page.goto("https://afx.kwayisi.org/nse/", { waitUntil: "networkidle2" });

    const data = await page.evaluate(() => {
      // Target the specific div with data-stat="" and margin-top:.25em style
      const statDiv = document.querySelector('div[data-stat=""][style*="margin-top:.25em"]');
      
      if (!statDiv) {
        console.warn("Could not find the specific stat div with margin-top:.25em");
        return { topGainers: [], bottomLosers: [] };
      }

      // Get the two tables within this div
      const tables = statDiv.querySelectorAll("table");
      
      if (tables.length < 2) {
        console.warn("Expected 2 tables (gainers and losers) but found:", tables.length);
        return { topGainers: [], bottomLosers: [] };
      }

      function parseTable(table, tableType) {
        const rows = table.querySelectorAll("tbody tr");
        return Array.from(rows).map((row, index) => {
          const cols = row.querySelectorAll("td");
          
          // Extract ticker from the link
          const tickerLink = cols[0]?.querySelector("a");
          const ticker = tickerLink?.innerText.trim() || cols[0]?.innerText.trim();
          const tickerUrl = tickerLink?.href;
          
          // Extract price (second column)
          const priceText = cols[1]?.innerText.trim();
          const price = priceText ? parseFloat(priceText.replace(/,/g, '')) : null;
          
          // Extract change percentage (third column)
          const changeText = cols[2]?.innerText.trim();
          const changePercent = changeText ? parseFloat(changeText.replace(/[+%]/g, '')) : null;
          
          // Determine if it's a gain or loss based on the CSS class
          const changeClass = cols[2]?.className || "";
          const isGain = changeClass.includes("hi") || changeText?.startsWith("+");
          const isLoss = changeClass.includes("lo") || changeText?.startsWith("-");
          
          return {
            ticker: ticker,
            price: price,
            changePercent: changePercent,
            changeText: changeText,
            isGain: isGain,
            isLoss: isLoss,
            tickerUrl: tickerUrl,
            rank: index + 1,
            tableType: tableType
          };
        });
      }

      // Parse the first table (Top Gainers)
      const topGainers = parseTable(tables[0], "gainers");
      
      // Parse the second table (Bottom Losers) 
      const bottomLosers = parseTable(tables[1], "losers");

      console.log(`Scraped ${topGainers.length} gainers and ${bottomLosers.length} losers`);
      
      return {
        topGainers: topGainers,
        bottomLosers: bottomLosers
      };
    });

    return data;
  } catch (error) {
    console.error("❌ Error in scrapeTopGainersAndLosers:", error);
    throw error;
  } finally {
    // Always close the page and browser to prevent resource leaks
    if (page) {
      try {
        await page.close();
      } catch (error) {
        console.error("❌ Error closing page in scrapeTopGainersAndLosers:", error);
      }
    }
    if (browser) {
      try {
        await browser.close();
      } catch (error) {
        console.error("❌ Error closing browser in scrapeTopGainersAndLosers:", error);
      }
    }
  }
}

/**
 * Scrape market insights from NSE
 * Creates a new browser instance for each scraping operation
 * @returns {Promise<Object>} Object containing market insights data
 */
export async function scrapeMarketInsights() {
  let browser = null;
  let page = null;
  try {
    browser = await createBrowser();
    page = await browser.newPage();
    
    await page.goto("https://afx.kwayisi.org/nse/", { waitUntil: "networkidle2" });

    const data = await page.evaluate(() => {
      // ---- Market Insights ----
      const marketTable = document.querySelector("table[style*='margin-top:.125em']");
      let marketInsights = {};
      if (marketTable) {
        const row = marketTable.querySelector("tbody tr");
        const cols = row.querySelectorAll("td");
        
        // Parse NASI Index (e.g., "173.50 (-1.52)")
        const nasiIndexText = cols[0]?.innerText.trim() || "";
        const nasiMatch = nasiIndexText.match(/([\d.]+)\s*\(([+-]?[\d.]+)\)/);
        
        // Parse Year to Date (e.g., "+50.02 (40.51%)")
        const yearToDateText = cols[1]?.innerText.trim() || "";
        const ytdMatch = yearToDateText.match(/([+-]?[\d.]+)\s*\(([+-]?[\d.]+)%\)/);
        
        marketInsights = {
          indexName: "NASI",
          currentValue: nasiMatch ? parseFloat(nasiMatch[1]) : 0,
          change: nasiMatch ? parseFloat(nasiMatch[2]) : 0,
          changePercent: ytdMatch ? parseFloat(ytdMatch[2]) : 0,
          timestamp: new Date().toISOString(),
          // Keep original data for backward compatibility
          nasiIndex: nasiIndexText,
          yearToDate: yearToDateText,
          marketCap: cols[2]?.innerText.trim() || ""
        };
      } else {
        // Return default values if table not found
        marketInsights = {
          indexName: "NASI",
          currentValue: 0,
          change: 0,
          changePercent: 0,
          timestamp: new Date().toISOString(),
          nasiIndex: "N/A",
          yearToDate: "N/A",
          marketCap: "N/A"
        };
      }

      return marketInsights;
    });

    return data;
  } catch (error) {
    console.error("❌ Error in scrapeMarketInsights:", error);
    throw error;
  } finally {
    // Always close the page and browser to prevent resource leaks
    if (page) {
      try {
        await page.close();
      } catch (error) {
        console.error("❌ Error closing page in scrapeMarketInsights:", error);
      }
    }
    if (browser) {
      try {
        await browser.close();
      } catch (error) {
        console.error("❌ Error closing browser in scrapeMarketInsights:", error);
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
  let browser = null;
  let page = null;
  try {
    browser = await createBrowser();
    page = await browser.newPage();
    
    await page.goto(`https://afx.kwayisi.org/nse/${ticker.toLowerCase()}.html`, { 
      waitUntil: "domcontentloaded",
      timeout: 30000 
    });

    // Wait a bit for dynamic content to load
    await new Promise(resolve => setTimeout(resolve, 1000));

    const data = await page.evaluate(() => {
      const getText = (selector) =>
        document.querySelector(selector)?.innerText.trim() || null;

      // --- Basic Info ---
      const name = getText("h1") || getText("h2");
      const description = document.querySelector("p")?.innerText || "";

      // --- Current Share Price and Change Data ---
      let currentPrice = "";
      let changeAmount = "";
      let changePercent = "";
      let marketCap = "";
      
      // Look for the price display in the h2 div with abbr and span structure
      const priceDiv = document.querySelector(".h2");
      if (priceDiv) {
        const priceSpan = priceDiv.querySelector("span");
        if (priceSpan) {
          const priceText = priceSpan.innerText.trim();
          // Extract price (e.g., "4.10 ▾ 0.22 (5.09%)")
          const priceMatch = priceText.match(/(\d+\.?\d*)\s*[▾▴]\s*(\d+\.?\d*)\s*\(([+-]?\d+\.?\d*%)\)/);
          if (priceMatch) {
            currentPrice = priceMatch[1];
            changeAmount = priceMatch[2];
            changePercent = priceMatch[3];
          }
        }
      }

      // --- Market Capitalization ---
      const paragraphs = document.querySelectorAll("p");
      for (const p of paragraphs) {
        const text = p.innerText;
        const marketCapMatch = text.match(/market capitalization of KES ([\d.]+ billion)/i);
        if (marketCapMatch) {
          marketCap = marketCapMatch[1] + "B";
          break;
        }
      }

      // --- Live Trading Feed & Growth & Valuation ---
      let liveTradingFeed = {};
      let growthValuation = {};
      
      // Find tables by their header text (more robust approach)
      const allTables = document.querySelectorAll('table');
      console.log('Found', allTables.length, 'tables on the page');
      
      allTables.forEach((table, index) => {
        const header = table.querySelector('thead th');
        if (header) {
          const headerText = header.innerText.trim();
          console.log('Table', index, 'header:', headerText);
          
          if (headerText.includes('Live Trading Feed')) {
            // Extract Live Trading Feed data
            const rows = table.querySelectorAll('tbody tr');
            rows.forEach(row => {
              const cells = row.querySelectorAll('td');
              if (cells.length >= 2) {
                const label = cells[0].innerText.trim();
                const value = cells[1].innerText.trim();
                liveTradingFeed[label] = value;
              }
            });
          } else if (headerText.includes('Growth & Valuation')) {
            // Extract Growth & Valuation data
            const rows = table.querySelectorAll('tbody tr');
            rows.forEach(row => {
              const cells = row.querySelectorAll('td');
              if (cells.length >= 2) {
                const label = cells[0].innerText.trim();
                const value = cells[1].innerText.trim();
                growthValuation[label] = value;
              }
            });
          }
        }
      });
      
      // Also try the specific CSS selector as a fallback
      if (Object.keys(liveTradingFeed).length === 0 || Object.keys(growthValuation).length === 0) {
        const targetDiv = document.querySelector('body > div:nth-child(4) > div > div > main > article > div:nth-child(7)');
        if (targetDiv) {
          const tables = targetDiv.querySelectorAll('table');
          
          tables.forEach((table) => {
            const header = table.querySelector('thead th');
            if (header) {
              const headerText = header.innerText.trim();
              
              if (headerText.includes('Live Trading Feed') && Object.keys(liveTradingFeed).length === 0) {
                const rows = table.querySelectorAll('tbody tr');
                rows.forEach(row => {
                  const cells = row.querySelectorAll('td');
                  if (cells.length >= 2) {
                    const label = cells[0].innerText.trim();
                    const value = cells[1].innerText.trim();
                    liveTradingFeed[label] = value;
                  }
                });
              } else if (headerText.includes('Growth & Valuation') && Object.keys(growthValuation).length === 0) {
                const rows = table.querySelectorAll('tbody tr');
                rows.forEach(row => {
                  const cells = row.querySelectorAll('td');
                  if (cells.length >= 2) {
                    const label = cells[0].innerText.trim();
                    const value = cells[1].innerText.trim();
                    growthValuation[label] = value;
                  }
                });
              }
            }
          });
        }
      }

      // --- Legacy Last Trading Results (fallback) ---
      let lastTrading = {};
      const tradingTable = Array.from(document.querySelectorAll("table"))
        .find((t) => t.innerText.includes("Opening Price"));
      if (tradingTable && Object.keys(liveTradingFeed).length === 0) {
        lastTrading = Object.fromEntries(
          Array.from(tradingTable.querySelectorAll("tr")).map((tr) => {
            const [label, value] = tr.innerText.split(/\t| {2,}/);
            return [label, value];
          })
        );
      }

      // --- Performance Table (1WK, 4WK, 3MO, etc.) ---
      let performance = {};
      const perfDiv = document.querySelector('[data-perf]');
      if (perfDiv) {
        const tables = perfDiv.querySelectorAll('table');
        tables.forEach(table => {
          const headers = Array.from(table.querySelectorAll("thead th")).map((th) => th.innerText.trim());
          const values = Array.from(table.querySelectorAll("tbody td")).map((td) => td.innerText.trim());
          headers.forEach((h, i) => {
            if (values[i]) {
              performance[h] = values[i];
            }
          });
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

      // --- Company Profile & Factsheet ---
      let profile = {};
      let factsheet = {};
      
      // Try to get factsheet data from the specific div with data-fact attribute
      const factsheetDiv = document.querySelector('[data-fact]');
      if (factsheetDiv) {
        const dl = factsheetDiv.querySelector('dl');
        if (dl) {
          const divs = dl.querySelectorAll('div');
          divs.forEach(div => {
            const dt = div.querySelector('dt');
            const dd = div.querySelector('dd');
            if (dt && dd) {
              const label = dt.innerText.trim();
              let value = dd.innerText.trim();
              
              // Handle website links
              const link = dd.querySelector('a');
              if (link) {
                value = link.getAttribute('href') || link.innerText.trim();
              }
              
              factsheet[label] = value;
            }
          });
        }
      }
      
      // Fallback to profile table if factsheet not found
      const profileTable = Array.from(document.querySelectorAll("table"))
        .find((t) => t.innerText.includes("Sector") && t.innerText.includes("Address"));
      if (profileTable && Object.keys(factsheet).length === 0) {
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
        currentPrice,
        changeAmount,
        changePercent,
        marketCap,
        lastTrading,
        liveTradingFeed,
        growthValuation,
        performance,
        history,
        profile,
        factsheet,
      };
    });

    return data;
  } catch (error) {
    console.error("❌ Error in scrapeStock:", error);
    throw error;
  } finally {
    // Always close the page and browser to prevent resource leaks
    if (page) {
      try {
        await page.close();
      } catch (error) {
        console.error("❌ Error closing page in scrapeStock:", error);
      }
    }
    if (browser) {
      try {
        await browser.close();
      } catch (error) {
        console.error("❌ Error closing browser in scrapeStock:", error);
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
  
  // Get stocks data
  const stocks = await scrapeStocks();
  
  // Get top gainers and losers data
  const { topGainers, bottomLosers } = await scrapeTopGainersAndLosers();
  
  // Get market insights
  const marketInsights = await scrapeMarketInsights();
  
  return {
    stocks: stocks,
    topGainers: topGainers,
    topLosers: bottomLosers, // Note: using bottomLosers as topLosers for consistency
    marketIndex: marketInsights,
    timestamp: new Date().toISOString()
  };
}
