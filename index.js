import express from "express";
import dotenv from "dotenv";
import mongoose from "mongoose";
import cors from "cors";

// Import routes
import authRoutes from "./routes/authRoutes.js";
import unifiedTradeRoutes from "./routes/unifiedTradeRoutes.js";
import portfolioRoutes from "./routes/portfolioRoutes.js";
import leaderboardRoutes from "./routes/leaderboardRoutes.js";
import adminRoutes from "./routes/adminRoutes.js";
import currencyRoutes from "./routes/currencyRoutes.js";
import marketDataRoutes from "./routes/marketDataRoutes.js";
import stockRoutes from "./routes/stockRoutes.js";
import marketInsightsRoutes from "./routes/marketInsightsRoutes.js";
import stockInfoRoutes from "./routes/stockInfoRoutes.js";
import watchlistRoutes from "./routes/watchlistRoutes.js";
import assetsRoutes from "./routes/assetsRoutes.js";
// Import scheduler and scraper
import { startScheduler, updateAllData } from "./scheduler.js";
import { startCombinedScheduler, triggerManualUpdate } from "./scheduler/multiAssetScheduler.js";

dotenv.config();
const app = express();

// Middleware
app.use(express.json());
app.use(cors());

// Routes
app.use("/api/auth", authRoutes);
app.use("/api/trades", unifiedTradeRoutes);
app.use("/api/portfolio", portfolioRoutes);
app.use("/api/leaderboard", leaderboardRoutes);
app.use("/api/admin", adminRoutes);
app.use("/api/currency", currencyRoutes);
app.use("/api/market", marketDataRoutes);
app.use("/api/stocks", stockRoutes);
app.use("/api/market-insights", marketInsightsRoutes);
app.use("/api/stock-info", stockInfoRoutes);
app.use("/api/watchlist", watchlistRoutes);
app.use("/api/assets", assetsRoutes);

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
      assets: "/api/assets",
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
      console.log(`📊 Trading Platform - All endpoints available`);
      
      // Run initial scrape immediately for all assets
      console.log("🔄 Running initial data fetch for all assets...");
      triggerManualUpdate("all").catch(error => {
        console.error("❌ Initial data fetch failed:", error);
      });
      
      // Start the asset scheduler if enabled
      if (process.env.ENABLE_SCHEDULER === "true") {
        startCombinedScheduler();
        console.log("✅ Asset scheduler started");
      } else {
        console.log("⏰ Scheduler disabled. Set ENABLE_SCHEDULER=true to enable automatic scraping");
      }
    });
  })
  .catch((err) => console.error("❌ DB Connection Error:", err));
