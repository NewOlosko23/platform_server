import express from "express";
import dotenv from "dotenv";
import mongoose from "mongoose";
import cors from "cors";

// Import routes
import authRoutes from "./routes/authRoutes.js";
import tradeRoutes from "./routes/tradeRoutes.js";
import portfolioRoutes from "./routes/portfolioRoutes.js";
import leaderboardRoutes from "./routes/leaderboardRoutes.js";
import adminRoutes from "./routes/adminRoutes.js";
import currencyRoutes from "./routes/currencyRoutes.js";
import marketDataRoutes from "./routes/marketDataRoutes.js";
import stockRoutes from "./routes/stockRoutes.js";
import marketInsightsRoutes from "./routes/marketInsightsRoutes.js";
import stockInfoRoutes from "./routes/stockInfoRoutes.js";
import watchlistRoutes from "./routes/watchlistRoutes.js";
// Import scheduler and scraper
import { startScheduler, updateAllData } from "./scheduler.js";

dotenv.config();
const app = express();

// Middleware
app.use(express.json());
app.use(cors());

// Routes
app.use("/api/auth", authRoutes);
app.use("/api/trades", tradeRoutes);
app.use("/api/portfolio", portfolioRoutes);
app.use("/api/leaderboard", leaderboardRoutes);
app.use("/api/admin", adminRoutes);
app.use("/api/currency", currencyRoutes);
app.use("/api/market", marketDataRoutes);
app.use("/api/stocks", stockRoutes);
app.use("/api/market-insights", marketInsightsRoutes);
app.use("/api/stock-info", stockInfoRoutes);
app.use("/api/watchlist", watchlistRoutes);

// Health check endpoint
app.get("/", (req, res) => {
  res.json({
    message: "🚀 Avodal Finance API Server Running...",
    version: "1.0.0",
    endpoints: {
      auth: "/api/auth",
      trades: "/api/trades",
      portfolio: "/api/portfolio",
      leaderboard: "/api/leaderboard",
      admin: "/api/admin",
      currency: "/api/currency",
      market: "/api/market",
      stocks: "/api/stocks",
      marketInsights: "/api/market-insights",
      stockInfo: "/api/stock-info",
      watchlist: "/api/watchlist",
    },
  });
});

const PORT = process.env.PORT || 5000;
mongoose
  .connect(process.env.MONGO_URI)
  .then(() => {
    console.log("✅ MongoDB connected successfully");
    
    // Start the server
    app.listen(PORT, () => {
      console.log(`🚀 Server running on port ${PORT}`);
      console.log(`📊 NSE Scraping endpoints available at /api/stocks`);
      
      // Run initial scrape immediately
      updateAllData();
      
      // Start the scheduler if enabled
      if (process.env.ENABLE_SCHEDULER === "true") {
        startScheduler();
      } else {
        console.log("⏰ Scheduler disabled. Set ENABLE_SCHEDULER=true to enable automatic scraping");
      }
    });
  })
  .catch((err) => console.error("❌ DB Connection Error:", err));
