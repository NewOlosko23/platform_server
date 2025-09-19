// controllers/portfolioController.js
import Portfolio from "../models/Portfolio.js";
import User from "../models/User.js";
import Trade from "../models/Trade.js";
import { fetchStockPrice } from "../utils/stockApi.js";

export const getPortfolio = async (req, res) => {
  try {
    const user = await User.findById(req.user.id);
    const holdings = await Portfolio.find({ userId: user._id });
    
    // Get recent transactions
    const recentTransactions = await Trade.find({ userId: user._id })
      .sort({ timestamp: -1 })
      .limit(10);
    
    res.json({ 
      success: true,
      data: { 
        balance: user.balance, 
        holdings,
        recentTransactions 
      } 
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

export const getPortfolioSummary = async (req, res) => {
  try {
    const user = await User.findById(req.user.id);
    const holdings = await Portfolio.find({ userId: user._id });
    
    let totalValue = user.balance; // Start with cash balance
    let totalCost = user.balance; // Start with initial balance
    let totalGainLoss = 0;
    
    // Calculate portfolio value with live prices
    for (const holding of holdings) {
      try {
        const stockData = await fetchStockPrice(holding.stockSymbol);
        const currentPrice = stockData.price;
        const marketValue = currentPrice * holding.quantity;
        const costBasis = holding.avgBuyPrice * holding.quantity;
        
        totalValue += marketValue;
        totalCost += costBasis;
        totalGainLoss += (marketValue - costBasis);
      } catch (err) {
        console.error(`Error fetching price for ${holding.stockSymbol}:`, err);
        // Use average buy price as fallback
        const fallbackValue = holding.avgBuyPrice * holding.quantity;
        totalValue += fallbackValue;
        totalCost += fallbackValue;
      }
    }
    
    const totalGainLossPercent = totalCost > 0 ? (totalGainLoss / totalCost) * 100 : 0;
    
    // Calculate daily change (simplified - in real app, you'd track previous day's value)
    const dailyChange = 0; // This would need to be calculated based on previous day's portfolio value
    const dailyChangePercent = 0;
    
    res.json({
      success: true,
      data: {
        balance: user.balance,
        totalValue,
        totalCost,
        totalGainLoss,
        totalGainLossPercent,
        dailyChange,
        dailyChangePercent
      }
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};
