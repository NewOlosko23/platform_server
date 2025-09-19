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
    },
  });
});

const PORT = process.env.PORT || 5000;
mongoose
  .connect(process.env.MONGO_URI)
  .then(() => {
    app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
  })
  .catch((err) => console.error("DB Connection Error:", err));
