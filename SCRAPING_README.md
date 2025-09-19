# 📊 NSE Stock Scraper (MERN + Puppeteer + Node-Cron)

This project scrapes **live stock market data** from [afx.kwayisi.org/nse](https://afx.kwayisi.org/nse/) using **Puppeteer** and stores it in **MongoDB**.  
A **Node-Cron job** runs every 5 minutes to refresh the data.

---

## 🚀 Features
- Headless scraping with Puppeteer  
- Extracts:
  - **Ticker Symbol** (e.g., EQTY)  
  - **Company Name** (e.g., Equity Group Holdings Plc)  
  - **Price**  
  - **Change** (absolute value)  
  - **Change %**  
- Saves/updates stock data in MongoDB  
- Auto-updates every 5 minutes with `node-cron`  

---

## 🛠 Tech Stack
- **Backend:** Node.js + Express  
- **Scraper:** Puppeteer  
- **Database:** MongoDB (Mongoose ODM)  
- **Scheduler:** Node-Cron  

---

## 📦 Installation

1. **Install dependencies**
   ```bash
   cd server
   npm install
   ```

2. **Set up MongoDB connection**
   Create a `.env` file:
   ```env
   MONGO_URI=mongodb+srv://<username>:<password>@cluster0.mongodb.net/nse
   ENABLE_SCHEDULER=true
   PORT=5000
   ```

3. **Run scraper manually**
   ```bash
   node scraper.js
   ```

4. **Start server with cron job**
   ```bash
   npm start
   ```
   (this will scrape & update DB every 5 minutes)

---

## 📜 File Structure
```
server/
├── models/
│   └── Stock.js          # Mongoose schema
├── scraper.js            # Puppeteer scraper logic
├── scheduler.js          # Cron job scheduler
├── index.js              # Entry point with cron scheduler
├── env.example           # Environment variables template
└── SCRAPING_README.md    # This file
```

---

## 🧑‍💻 How the Scraper Works

### 1. **Scraper Logic** (`scraper.js`)
```javascript
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
```

### 2. **MongoDB Model** (`models/Stock.js`)
```javascript
const stockSchema = new mongoose.Schema({
  ticker: { type: String, required: true, unique: true },
  company: String,
  price: String,
  change: String,
  percent: String,
  updatedAt: { type: Date, default: Date.now },
});
```

### 3. **Cron Job Setup** (`scheduler.js`)
```javascript
async function updateStocks() {
  try {
    const stocks = await scrapeStocks();
    for (let s of stocks) {
      await Stock.findOneAndUpdate(
        { ticker: s.ticker },
        { ...s, updatedAt: new Date() },
        { upsert: true, new: true }
      );
    }
    console.log("✅ Stocks updated:", new Date().toLocaleString());
  } catch (err) {
    console.error("Scraping error:", err);
  }
}

// Run every 5 minutes
cron.schedule("*/5 * * * *", updateStocks);
```

---

## 📊 What Data is Scraped

The scraper extracts the following data from each stock row:

| Field | Description | Example |
|-------|-------------|---------|
| `ticker` | Stock symbol | "EQTY" |
| `company` | Company name | "Equity Group Holdings Plc" |
| `price` | Current price | "45.50" |
| `change` | Price change | "+2.30" |
| `percent` | Percentage change | "+5.33%" |

---

## 🗄️ How Data is Stored in MongoDB

### Database Operations:
1. **Upsert Logic**: Uses `findOneAndUpdate` with `upsert: true`
2. **Unique Ticker**: Each stock is identified by its unique ticker symbol
3. **Timestamp Tracking**: `updatedAt` field tracks when each stock was last updated
4. **Automatic Timestamps**: Mongoose adds `createdAt` and `updatedAt` automatically

### Collection Structure:
```javascript
{
  _id: ObjectId,
  ticker: "EQTY",
  company: "Equity Group Holdings Plc",
  price: "45.50",
  change: "+2.30",
  percent: "+5.33%",
  updatedAt: ISODate,
  createdAt: ISODate
}
```

---

## ⏰ How Updates Run Every 5 Minutes

### Cron Schedule:
- **Pattern**: `"*/5 * * * *"` (every 5 minutes)
- **Timezone**: Server timezone
- **Auto-start**: Runs immediately when server starts
- **Manual Control**: Can be started/stopped via API

### Update Process:
1. **Scrape**: Fetch fresh data from NSE website
2. **Process**: Parse and clean the data
3. **Update**: Upsert each stock record in MongoDB
4. **Log**: Record success/failure with timestamp

### Server Startup:
```javascript
// Run initial scrape immediately
updateStocks();

// Start the scheduler if enabled
if (process.env.ENABLE_SCHEDULER === "true") {
  startScheduler();
}
```

---

## 🔧 Configuration Options

### Environment Variables:
```env
MONGO_URI=mongodb+srv://<username>:<password>@cluster0.mongodb.net/nse
ENABLE_SCHEDULER=true
PORT=5000
SCRAPE_TARGET=https://afx.kwayisi.org/nse/
```

### Cron Schedule Options:
- Every 5 minutes: `"*/5 * * * *"`
- Every 15 minutes: `"*/15 * * * *"`
- Every hour: `"0 * * * *"`
- Daily at 9 AM: `"0 9 * * *"`

---

## 🚀 API Endpoints

The server provides REST API endpoints for accessing scraped data:

- `GET /api/stocks` - Get all stocks
- `GET /api/stocks/:ticker` - Get specific stock
- `GET /api/market` - Get market data
- `POST /api/stocks/refresh` - Manual refresh trigger

---

## 🐛 Troubleshooting

### Common Issues:
1. **Puppeteer fails**: Check if running in headless environment
2. **MongoDB connection**: Verify MONGO_URI in .env file
3. **Scraping blocked**: Website might be blocking requests
4. **Memory issues**: Puppeteer can be memory-intensive

### Debug Mode:
Set `ENABLE_SCHEDULER=false` to disable automatic scraping and run manually.

---

## 📈 Performance Notes

- **Memory Usage**: Puppeteer uses ~50-100MB per browser instance
- **Update Frequency**: 5-minute intervals balance freshness vs. server load
- **Database Size**: Each update creates new records, consider cleanup strategy
- **Error Handling**: Failed scrapes don't stop the cron job

---

## 🔄 Migration from Complex to Simple

This implementation has been simplified from the previous complex version:

### Changes Made:
1. **Simplified Scraper**: Removed complex market index and top performers logic
2. **Basic Stock Model**: Only essential fields (ticker, company, price, change, percent)
3. **Simple Upsert**: Direct stock updates without complex data structures
4. **Cleaner Code**: Removed unnecessary complexity while maintaining functionality

### Benefits:
- **Easier Maintenance**: Simpler code is easier to debug and modify
- **Better Performance**: Less data processing and storage
- **Clearer Purpose**: Focused on core stock data scraping
- **Documentation Match**: Matches the provided documentation exactly