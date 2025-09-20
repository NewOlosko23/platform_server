// controllers/portfolioController.js
import Portfolio from "../models/Portfolio.js";
import User from "../models/User.js";
import Trade from "../models/Trade.js";
import { fetchStockPrice } from "../utils/stockApi.js";

export const getPortfolio = async (req, res) => {
  try {
    const user = await User.findById(req.user.id);
    
    if (!user) {
      return res.status(404).json({ 
        success: false, 
        message: "User not found" 
      });
    }

    const holdings = await Portfolio.find({ userId: user._id });
    
    // Get recent transactions
    const recentTransactions = await Trade.find({ userId: user._id })
      .sort({ timestamp: -1 })
      .limit(10);
    
    // Calculate portfolio value with current prices
    let totalPortfolioValue = 0;
    let totalCostBasis = 0;
    const holdingsWithCurrentData = [];

    for (const holding of holdings) {
      try {
        const stockData = await fetchStockPrice(holding.stockSymbol);
        const currentPrice = stockData.price;
        const marketValue = currentPrice * holding.quantity;
        
        // Calculate actual cost basis including fees paid
        // Use avgCostBasis if available, otherwise fall back to avgBuyPrice
        const actualCostBasis = holding.avgCostBasis ? 
          holding.avgCostBasis * holding.quantity : 
          holding.avgBuyPrice * holding.quantity;
        
        const gainLoss = marketValue - actualCostBasis;
        const gainLossPercent = (gainLoss / actualCostBasis) * 100;

        totalPortfolioValue += marketValue;
        totalCostBasis += actualCostBasis;

        holdingsWithCurrentData.push({
          ...holding.toObject(),
          currentPrice: currentPrice,
          marketValue: marketValue,
          costBasis: actualCostBasis,
          gainLoss: gainLoss,
          gainLossPercent: gainLossPercent,
          dayChange: stockData.change || 0,
          dayChangePercent: stockData.changePercent || 0
        });
      } catch (err) {
        console.error(`Error fetching price for ${holding.stockSymbol}:`, err);
        // Use average buy price as fallback
        const fallbackValue = holding.avgBuyPrice * holding.quantity;
        totalPortfolioValue += fallbackValue;
        totalCostBasis += fallbackValue;

        holdingsWithCurrentData.push({
          ...holding.toObject(),
          currentPrice: holding.avgBuyPrice,
          marketValue: fallbackValue,
          costBasis: fallbackValue,
          gainLoss: 0,
          gainLossPercent: 0,
          dayChange: 0,
          dayChangePercent: 0
        });
      }
    }

    const totalGainLoss = totalPortfolioValue - totalCostBasis;
    const totalGainLossPercent = totalCostBasis > 0 ? (totalGainLoss / totalCostBasis) * 100 : 0;
    const totalValue = user.balance + totalPortfolioValue;
    
    // Calculate total return percentage based on starting balance of 100,000
    const startingBalance = 100000;
    const totalReturnPercent = ((totalValue - startingBalance) / startingBalance) * 100;

    res.json({ 
      success: true,
      data: { 
        user: {
          balance: user.balance,
          totalValue: totalValue
        },
        portfolio: {
          holdings: holdingsWithCurrentData,
          totalHoldings: holdingsWithCurrentData.length,
          totalPortfolioValue: totalPortfolioValue,
          totalCostBasis: totalCostBasis,
          totalGainLoss: totalGainLoss,
          totalGainLossPercent: totalGainLossPercent,
          totalReturnPercent: totalReturnPercent
        },
        recentTransactions: recentTransactions,
        lastUpdated: new Date()
      } 
    });
  } catch (err) {
    console.error('Portfolio fetch error:', err);
    res.status(500).json({ 
      success: false,
      error: err.message,
      message: "Failed to fetch portfolio data"
    });
  }
};

export const getPortfolioSummary = async (req, res) => {
  try {
    const user = await User.findById(req.user.id);
    
    if (!user) {
      return res.status(404).json({ 
        success: false, 
        message: "User not found" 
      });
    }

    const holdings = await Portfolio.find({ userId: user._id });
    
    let totalPortfolioValue = 0;
    let totalCostBasis = 0;
    let totalDayChange = 0;
    
    // Calculate portfolio value with live prices
    for (const holding of holdings) {
      try {
        const stockData = await fetchStockPrice(holding.stockSymbol);
        const currentPrice = stockData.price;
        const marketValue = currentPrice * holding.quantity;
        
        // Calculate actual cost basis including fees paid
        // Use avgCostBasis if available, otherwise fall back to avgBuyPrice
        const actualCostBasis = holding.avgCostBasis ? 
          holding.avgCostBasis * holding.quantity : 
          holding.avgBuyPrice * holding.quantity;
        
        const dayChange = (stockData.change || 0) * holding.quantity;
        
        totalPortfolioValue += marketValue;
        totalCostBasis += actualCostBasis;
        totalDayChange += dayChange;
      } catch (err) {
        console.error(`Error fetching price for ${holding.stockSymbol}:`, err);
        // Use average buy price as fallback
        const fallbackValue = holding.avgBuyPrice * holding.quantity;
        totalPortfolioValue += fallbackValue;
        totalCostBasis += fallbackValue;
      }
    }
    
    const totalGainLoss = totalPortfolioValue - totalCostBasis;
    const totalGainLossPercent = totalCostBasis > 0 ? (totalGainLoss / totalCostBasis) * 100 : 0;
    const totalValue = user.balance + totalPortfolioValue;
    const dailyChangePercent = totalPortfolioValue > 0 ? (totalDayChange / totalPortfolioValue) * 100 : 0;
    
    // Calculate total return percentage based on starting balance of 100,000
    const startingBalance = 100000;
    const totalReturnPercent = ((totalValue - startingBalance) / startingBalance) * 100;
    
    // Calculate allocation percentages
    const cashAllocation = (user.balance / totalValue) * 100;
    const stockAllocation = (totalPortfolioValue / totalValue) * 100;
    
    res.json({
      success: true,
      data: {
        user: {
          balance: user.balance,
          totalValue: totalValue
        },
        portfolio: {
          totalPortfolioValue: totalPortfolioValue,
          totalCostBasis: totalCostBasis,
          totalGainLoss: totalGainLoss,
          totalGainLossPercent: totalGainLossPercent,
          totalReturnPercent: totalReturnPercent,
          totalHoldings: holdings.length
        },
        performance: {
          dailyChange: totalDayChange,
          dailyChangePercent: dailyChangePercent,
          totalReturn: totalValue - startingBalance,
          totalReturnPercent: totalReturnPercent
        },
        allocation: {
          cash: {
            amount: user.balance,
            percentage: cashAllocation
          },
          stocks: {
            amount: totalPortfolioValue,
            percentage: stockAllocation
          }
        },
        lastUpdated: new Date()
      }
    });
  } catch (err) {
    console.error('Portfolio summary error:', err);
    res.status(500).json({ 
      success: false,
      error: err.message,
      message: "Failed to fetch portfolio summary"
    });
  }
};
