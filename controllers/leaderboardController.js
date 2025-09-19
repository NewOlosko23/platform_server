// controllers/leaderboardController.js
import User from "../models/User.js";
import Portfolio from "../models/Portfolio.js";
import { fetchStockPrice } from "../utils/stockApi.js";

export const getLeaderboard = async (req, res) => {
  try {
    const users = await User.find({ role: "user" });
    const leaderboard = [];

    for (const user of users) {
      let portfolioValue = 0;
      const holdings = await Portfolio.find({ userId: user._id });
      for (const holding of holdings) {
        const stockData = await fetchStockPrice(holding.stockSymbol);
        portfolioValue += holding.quantity * stockData.price;
      }
      leaderboard.push({ username: user.username, totalValue: user.balance + portfolioValue });
    }

    leaderboard.sort((a, b) => b.totalValue - a.totalValue);
    res.json(leaderboard);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};
