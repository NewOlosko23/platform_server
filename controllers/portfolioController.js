// controllers/portfolioController.js
import Portfolio from "../models/Portfolio.js";
import User from "../models/User.js";
import Trade from "../models/Trade.js";
import { fetchStockPrice } from "../utils/stockApi.js";
import { getLatestCryptoPrice } from "../services/cryptoFetcher.js";
import { getLatestFXRate } from "../services/fxFetcher.js";

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
    
    console.log(`Portfolio calculation for user ${user._id}: Found ${holdings.length} holdings`);

    for (const holding of holdings) {
      try {
        let assetData;
        
        // Get current price based on asset type
        switch (holding.assetType) {
          case 'stock':
            assetData = await fetchStockPrice(holding.assetSymbol);
            break;
          case 'crypto':
            assetData = await getLatestCryptoPrice(holding.assetSymbol);
            break;
          case 'currency':
            assetData = await getLatestFXRate(holding.assetSymbol);
            break;
          default:
            throw new Error(`Unsupported asset type: ${holding.assetType}`);
        }
        
        const currentPrice = assetData.price;
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
          dayChange: assetData.change || 0,
          dayChangePercent: assetData.changePercent || 0
        });
      } catch (err) {
        console.error(`Error fetching price for ${holding.assetType}:${holding.assetSymbol}:`, err);
        // Use average buy price as fallback for current price
        const fallbackPrice = holding.avgBuyPrice;
        const fallbackValue = fallbackPrice * holding.quantity;
        
        // Calculate cost basis properly (use avgCostBasis if available)
        const fallbackCostBasis = holding.avgCostBasis ? 
          holding.avgCostBasis * holding.quantity : 
          fallbackValue;
        
        const fallbackGainLoss = fallbackValue - fallbackCostBasis;
        const fallbackGainLossPercent = fallbackCostBasis > 0 ? (fallbackGainLoss / fallbackCostBasis) * 100 : 0;
        
        totalPortfolioValue += fallbackValue;
        totalCostBasis += fallbackCostBasis;

        holdingsWithCurrentData.push({
          ...holding.toObject(),
          currentPrice: fallbackPrice,
          marketValue: fallbackValue,
          costBasis: fallbackCostBasis,
          gainLoss: fallbackGainLoss,
          gainLossPercent: fallbackGainLossPercent,
          dayChange: 0,
          dayChangePercent: 0,
          priceError: true // Flag to indicate price fetch failed
        });
      }
    }

    // Ensure totalPortfolioValue is never null
    const safeTotalPortfolioValue = totalPortfolioValue || 0;
    const safeTotalCostBasis = totalCostBasis || 0;
    
    const totalGainLoss = safeTotalPortfolioValue - safeTotalCostBasis;
    const totalGainLossPercent = safeTotalCostBasis > 0 ? (totalGainLoss / safeTotalCostBasis) * 100 : 0;
    const totalValue = user.balance + safeTotalPortfolioValue;
    
    console.log(`Portfolio calculation summary: user.balance=${user.balance}, totalPortfolioValue=${safeTotalPortfolioValue}, totalValue=${totalValue}`);
    
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
          totalPortfolioValue: safeTotalPortfolioValue,
          totalCostBasis: safeTotalCostBasis,
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
        let assetData;
        
        // Get current price based on asset type
        switch (holding.assetType) {
          case 'stock':
            assetData = await fetchStockPrice(holding.assetSymbol);
            break;
          case 'crypto':
            assetData = await getLatestCryptoPrice(holding.assetSymbol);
            break;
          case 'currency':
            assetData = await getLatestFXRate(holding.assetSymbol);
            break;
          default:
            throw new Error(`Unsupported asset type: ${holding.assetType}`);
        }
        
        const currentPrice = assetData.price;
        const marketValue = currentPrice * holding.quantity;
        
        // Calculate actual cost basis including fees paid
        // Use avgCostBasis if available, otherwise fall back to avgBuyPrice
        const actualCostBasis = holding.avgCostBasis ? 
          holding.avgCostBasis * holding.quantity : 
          holding.avgBuyPrice * holding.quantity;
        
        const dayChange = (assetData.change || 0) * holding.quantity;
        
        totalPortfolioValue += marketValue;
        totalCostBasis += actualCostBasis;
        totalDayChange += dayChange;
      } catch (err) {
        console.error(`Error fetching price for ${holding.assetType}:${holding.assetSymbol}:`, err);
        // Use average buy price as fallback
        const fallbackValue = holding.avgBuyPrice * holding.quantity;
        const fallbackCostBasis = holding.avgCostBasis ? 
          holding.avgCostBasis * holding.quantity : 
          fallbackValue;
        totalPortfolioValue += fallbackValue;
        totalCostBasis += fallbackCostBasis;
      }
    }
    
    // Ensure totalPortfolioValue is never null
    const safeTotalPortfolioValue = totalPortfolioValue || 0;
    const safeTotalCostBasis = totalCostBasis || 0;
    
    const totalGainLoss = safeTotalPortfolioValue - safeTotalCostBasis;
    const totalGainLossPercent = safeTotalCostBasis > 0 ? (totalGainLoss / safeTotalCostBasis) * 100 : 0;
    const totalValue = user.balance + safeTotalPortfolioValue;
    const dailyChangePercent = safeTotalPortfolioValue > 0 ? (totalDayChange / safeTotalPortfolioValue) * 100 : 0;
    
    console.log(`PortfolioSummary calculation: user.balance=${user.balance}, totalPortfolioValue=${safeTotalPortfolioValue}, totalValue=${totalValue}`);
    
    // Calculate total return percentage based on starting balance of 100,000
    const startingBalance = 100000;
    const totalReturnPercent = ((totalValue - startingBalance) / startingBalance) * 100;
    
    // Calculate allocation percentages
    const cashAllocation = totalValue > 0 ? (user.balance / totalValue) * 100 : 100;
    const stockAllocation = totalValue > 0 ? (safeTotalPortfolioValue / totalValue) * 100 : 0;
    
    res.json({
      success: true,
      data: {
        totalValue: totalValue,
        totalGain: totalGainLoss,
        totalGainPercent: totalGainLossPercent,
        assetCount: holdings.length,
        availableBalance: user.balance, // Cash available to invest
        investedAmount: safeTotalPortfolioValue, // Amount invested in assets
        lastUpdated: new Date().toISOString()
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

export const getPortfolioHistory = async (req, res) => {
  try {
    const { days = 7 } = req.query;
    const user = await User.findById(req.user.id);
    
    if (!user) {
      return res.status(404).json({ 
        success: false, 
        message: "User not found" 
      });
    }

    // Get portfolio history from trades
    const endDate = new Date();
    const startDate = new Date();
    startDate.setDate(endDate.getDate() - parseInt(days));

    const trades = await Trade.find({ 
      userId: user._id,
      timestamp: { $gte: startDate, $lte: endDate }
    }).sort({ timestamp: 1 });

    // Calculate portfolio value over time
    const history = [];
    let runningBalance = user.balance;
    let runningPortfolioValue = 0;

    // Group trades by day
    const tradesByDay = {};
    trades.forEach(trade => {
      const day = trade.timestamp.toISOString().split('T')[0];
      if (!tradesByDay[day]) {
        tradesByDay[day] = [];
      }
      tradesByDay[day].push(trade);
    });

    // Calculate daily portfolio values
    for (let i = 0; i < parseInt(days); i++) {
      const date = new Date();
      date.setDate(date.getDate() - (parseInt(days) - 1 - i));
      const dayStr = date.toISOString().split('T')[0];
      
      // Apply trades for this day
      if (tradesByDay[dayStr]) {
        tradesByDay[dayStr].forEach(trade => {
          if (trade.type === 'buy') {
            runningBalance -= (trade.price * trade.quantity + trade.fees);
          } else {
            runningBalance += (trade.price * trade.quantity - trade.fees);
          }
        });
      }

      // Calculate current portfolio value
      const holdings = await Portfolio.find({ userId: user._id });
      let currentPortfolioValue = 0;
      
      for (const holding of holdings) {
        try {
          let assetData;
          switch (holding.assetType) {
            case 'stock':
              assetData = await fetchStockPrice(holding.assetSymbol);
              break;
            case 'crypto':
              assetData = await getLatestCryptoPrice(holding.assetSymbol);
              break;
            case 'currency':
              assetData = await getLatestFXRate(holding.assetSymbol);
              break;
          }
          currentPortfolioValue += assetData.price * holding.quantity;
        } catch (err) {
          // Use average buy price as fallback
          currentPortfolioValue += holding.avgBuyPrice * holding.quantity;
        }
      }

      history.push({
        date: dayStr,
        totalValue: runningBalance + currentPortfolioValue,
        portfolioValue: currentPortfolioValue,
        cashBalance: runningBalance
      });
    }

    res.json({
      success: true,
      data: history
    });
  } catch (err) {
    console.error('Portfolio history error:', err);
    res.status(500).json({ 
      success: false,
      error: err.message,
      message: "Failed to fetch portfolio history"
    });
  }
};
