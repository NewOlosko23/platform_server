// controllers/tradeController.js
import Trade from "../models/Trade.js";
import Portfolio from "../models/Portfolio.js";
import User from "../models/User.js";
import { fetchStockPrice, getMockStockData } from "../utils/stockApi.js"; // API rotation logic
import { calculateFees, formatFeeInfo, validateBuyOrder, getPlatformRevenue } from "../utils/feeCalculator.js";

export const buyStock = async (req, res) => {
  try {
    const { symbol, quantity } = req.body;
    const user = await User.findById(req.user.id);
    
    if (!user) {
      return res.status(404).json({ 
        success: false, 
        message: "User not found" 
      });
    }

    // Get current stock price from database
    const stockData = await fetchStockPrice(symbol);
    const price = stockData.price;
    const tradeAmount = price * quantity;

    // Validate inputs
    if (!quantity || quantity <= 0) {
      return res.status(400).json({ 
        success: false, 
        message: "Invalid quantity" 
      });
    }

    if (!price || price <= 0) {
      return res.status(400).json({ 
        success: false, 
        message: "Invalid stock price" 
      });
    }

    // Calculate fees for buy order
    const feeData = calculateFees(tradeAmount, 'buy');
    const feeInfo = formatFeeInfo(feeData, 'buy');

    // Validate sufficient balance including fees
    const balanceValidation = validateBuyOrder(user.balance, feeData);
    if (!balanceValidation.hasSufficientBalance) {
      return res.status(400).json({ 
        success: false, 
        message: balanceValidation.message,
        feeBreakdown: feeInfo
      });
    }

    // Start transaction-like operations
    try {
      // Deduct balance (including fees)
      user.balance -= feeData.totalCost;
      await user.save();

      // Update or create portfolio holding
      let holding = await Portfolio.findOne({ userId: user._id, stockSymbol: symbol });
      if (holding) {
        // Calculate new average buy price (stock price only)
        const totalStockCost = (holding.avgBuyPrice * holding.quantity) + (price * quantity);
        const totalQuantity = holding.quantity + quantity;
        holding.avgBuyPrice = totalStockCost / totalQuantity;
        
        // Calculate new average cost basis (including fees)
        const totalCostBasis = (holding.avgCostBasis * holding.quantity) + feeData.totalCost;
        holding.avgCostBasis = totalCostBasis / totalQuantity;
        
        holding.quantity = totalQuantity;
        holding.updatedAt = new Date();
        await holding.save();
      } else {
        holding = new Portfolio({ 
          userId: user._id, 
          stockSymbol: symbol, 
          quantity, 
          avgBuyPrice: price,
          avgCostBasis: feeData.totalCost / quantity, // cost per share including fees
          updatedAt: new Date()
        });
        await holding.save();
      }

      // Save trade record with fee information
      const trade = new Trade({ 
        userId: user._id, 
        stockSymbol: symbol, 
        quantity, 
        price, 
        type: "buy",
        platformFee: feeData.platformFee,
        taxAmount: feeData.taxAmount,
        totalFees: feeData.totalFees,
        netAmount: feeData.netAmount,
        feeBreakdown: feeData.feeBreakdown,
        timestamp: new Date()
      });
      await trade.save();

      // Return success response with updated data
      res.json({ 
        success: true,
        message: `Successfully bought ${quantity} shares of ${symbol} at KSh ${price.toFixed(2)} per share`,
        data: {
          trade: {
            id: trade._id,
            symbol: trade.stockSymbol,
            type: trade.type,
            quantity: trade.quantity,
            price: trade.price,
            totalCost: feeData.totalCost,
            timestamp: trade.timestamp
          },
          fees: {
            platformFee: feeData.platformFee,
            taxAmount: feeData.taxAmount,
            totalFees: feeData.totalFees,
            feeBreakdown: feeData.feeBreakdown
          },
          user: {
            balance: user.balance,
            newBalance: user.balance
          },
          portfolio: {
            symbol: holding.stockSymbol,
            quantity: holding.quantity,
            avgBuyPrice: holding.avgBuyPrice,
            totalValue: holding.quantity * price
          },
          platformRevenue: getPlatformRevenue(feeData)
        }
      });

    } catch (transactionError) {
      // Rollback user balance if portfolio/trade operations fail
      user.balance += feeData.totalCost;
      await user.save();
      throw transactionError;
    }

  } catch (err) {
    console.error('Buy stock error:', err);
    res.status(500).json({ 
      success: false,
      error: err.message,
      message: "Failed to execute buy order"
    });
  }
};

export const sellStock = async (req, res) => {
  try {
    const { symbol, quantity } = req.body;
    const user = await User.findById(req.user.id);
    
    if (!user) {
      return res.status(404).json({ 
        success: false, 
        message: "User not found" 
      });
    }

    // Check if user owns this stock
    const holding = await Portfolio.findOne({ userId: user._id, stockSymbol: symbol });
    if (!holding) {
      return res.status(400).json({ 
        success: false, 
        message: `You don't own any shares of ${symbol}` 
      });
    }

    // Validate inputs
    if (!quantity || quantity <= 0) {
      return res.status(400).json({ 
        success: false, 
        message: "Invalid quantity" 
      });
    }

    if (holding.quantity < quantity) {
      return res.status(400).json({ 
        success: false, 
        message: `Insufficient shares. You own ${holding.quantity} shares but trying to sell ${quantity}` 
      });
    }

    // Get current stock price
    const stockData = await fetchStockPrice(symbol);
    const price = stockData.price;
    const tradeAmount = price * quantity;

    if (!price || price <= 0) {
      return res.status(400).json({ 
        success: false, 
        message: "Invalid stock price" 
      });
    }

    // Calculate fees for sell order
    const feeData = calculateFees(tradeAmount, 'sell');
    const feeInfo = formatFeeInfo(feeData, 'sell');

    // Start transaction-like operations
    try {
      // Add net proceeds to balance (after fees)
      user.balance += feeData.netAmount;
      await user.save();

      // Update portfolio
      holding.quantity -= quantity;
      if (holding.quantity <= 0) {
        await holding.deleteOne();
      } else {
        holding.updatedAt = new Date();
        await holding.save();
      }

      // Save trade record with fee information
      const trade = new Trade({ 
        userId: user._id, 
        stockSymbol: symbol, 
        quantity, 
        price, 
        type: "sell",
        platformFee: feeData.platformFee,
        taxAmount: feeData.taxAmount,
        totalFees: feeData.totalFees,
        netAmount: feeData.netAmount,
        feeBreakdown: feeData.feeBreakdown,
        timestamp: new Date()
      });
      await trade.save();

      // Calculate profit/loss (using net proceeds after fees)
      const costBasis = holding.avgBuyPrice * quantity;
      const profitLoss = feeData.netAmount - costBasis;
      const profitLossPercent = (profitLoss / costBasis) * 100;

      // Return success response with updated data
      res.json({ 
        success: true,
        message: `Successfully sold ${quantity} shares of ${symbol} at KSh ${price.toFixed(2)} per share`,
        data: {
          trade: {
            id: trade._id,
            symbol: trade.stockSymbol,
            type: trade.type,
            quantity: trade.quantity,
            price: trade.price,
            totalProceeds: feeData.netAmount,
            timestamp: trade.timestamp
          },
          fees: {
            platformFee: feeData.platformFee,
            taxAmount: feeData.taxAmount,
            totalFees: feeData.totalFees,
            feeBreakdown: feeData.feeBreakdown
          },
          user: {
            balance: user.balance,
            newBalance: user.balance
          },
          portfolio: {
            symbol: symbol,
            remainingQuantity: holding.quantity > 0 ? holding.quantity : 0,
            avgBuyPrice: holding.avgBuyPrice
          },
          performance: {
            costBasis: costBasis,
            grossProceeds: tradeAmount,
            netProceeds: feeData.netAmount,
            profitLoss: profitLoss,
            profitLossPercent: profitLossPercent
          },
          platformRevenue: getPlatformRevenue(feeData)
        }
      });

    } catch (transactionError) {
      // Rollback user balance if portfolio/trade operations fail
      user.balance -= feeData.netAmount;
      await user.save();
      throw transactionError;
    }

  } catch (err) {
    console.error('Sell stock error:', err);
    res.status(500).json({ 
      success: false,
      error: err.message,
      message: "Failed to execute sell order"
    });
  }
};

// Public endpoint for testing stock price API
export const getStockPrice = async (req, res) => {
  try {
    const { symbol } = req.params;
    
    if (!symbol) {
      return res.status(400).json({ error: "Stock symbol is required" });
    }

    const stockData = await fetchStockPrice(symbol.toUpperCase());
    
    res.json({
      symbol: stockData.symbol,
      price: stockData.price,
      volume: stockData.volume,
      timestamp: stockData.timestamp,
      message: "Stock data fetched successfully"
    });
  } catch (err) {
    res.status(500).json({ 
      error: err.message,
      symbol: req.params.symbol?.toUpperCase() || "Unknown"
    });
  }
};

// Get user trades
export const getUserTrades = async (req, res) => {
  try {
    const userId = req.user.id;
    
    const trades = await Trade.find({ userId })
      .sort({ timestamp: -1 })
      .limit(50); // Limit to last 50 trades
    
    res.json({
      success: true,
      data: trades,
      count: trades.length
    });
  } catch (err) {
    res.status(500).json({ 
      error: err.message,
      message: 'Failed to fetch user trades'
    });
  }
};

// Get fee information for a potential trade
export const getTradeFees = async (req, res) => {
  try {
    const { symbol, quantity, type } = req.query;
    
    if (!symbol || !quantity || !type) {
      return res.status(400).json({ 
        success: false, 
        message: "Symbol, quantity, and type are required" 
      });
    }

    if (!['buy', 'sell'].includes(type)) {
      return res.status(400).json({ 
        success: false, 
        message: "Type must be 'buy' or 'sell'" 
      });
    }

    const quantityNum = parseInt(quantity);
    if (isNaN(quantityNum) || quantityNum <= 0) {
      return res.status(400).json({ 
        success: false, 
        message: "Invalid quantity" 
      });
    }

    // Get current stock price
    const stockData = await fetchStockPrice(symbol);
    const price = stockData.price;
    const tradeAmount = price * quantityNum;

    if (!price || price <= 0) {
      return res.status(400).json({ 
        success: false, 
        message: "Invalid stock price" 
      });
    }

    // Calculate fees
    const feeData = calculateFees(tradeAmount, type);
    const feeInfo = formatFeeInfo(feeData, type);

    res.json({
      success: true,
      data: {
        symbol: symbol.toUpperCase(),
        quantity: quantityNum,
        type: type,
        price: price,
        tradeAmount: tradeAmount,
        fees: {
          platformFee: feeData.platformFee,
          taxAmount: feeData.taxAmount,
          totalFees: feeData.totalFees,
          feeBreakdown: feeData.feeBreakdown
        },
        netAmount: feeData.netAmount,
        totalCost: feeData.totalCost,
        feeInfo: feeInfo,
        platformRevenue: getPlatformRevenue(feeData)
      }
    });

  } catch (err) {
    console.error('Get trade fees error:', err);
    res.status(500).json({ 
      success: false,
      error: err.message,
      message: "Failed to calculate trade fees"
    });
  }
};

// Stock search endpoint
export const searchStocks = async (req, res) => {
  try {
    const { query } = req.query;
    
    if (!query || query.trim().length < 1) {
      return res.status(400).json({ error: "Search query is required" });
    }

    // For now, we'll search against a predefined list of popular stocks
    // In a real application, you'd use a stock search API
    const popularStocks = [
      { symbol: 'AAPL', name: 'Apple Inc.', exchange: 'NASDAQ' },
      { symbol: 'GOOGL', name: 'Alphabet Inc. Class A', exchange: 'NASDAQ' },
      { symbol: 'MSFT', name: 'Microsoft Corporation', exchange: 'NASDAQ' },
      { symbol: 'TSLA', name: 'Tesla, Inc.', exchange: 'NASDAQ' },
      { symbol: 'AMZN', name: 'Amazon.com, Inc.', exchange: 'NASDAQ' },
      { symbol: 'META', name: 'Meta Platforms, Inc.', exchange: 'NASDAQ' },
      { symbol: 'NVDA', name: 'NVIDIA Corporation', exchange: 'NASDAQ' },
      { symbol: 'NFLX', name: 'Netflix, Inc.', exchange: 'NASDAQ' },
      { symbol: 'AMD', name: 'Advanced Micro Devices, Inc.', exchange: 'NASDAQ' },
      { symbol: 'INTC', name: 'Intel Corporation', exchange: 'NASDAQ' },
      { symbol: 'CRM', name: 'Salesforce, Inc.', exchange: 'NYSE' },
      { symbol: 'ORCL', name: 'Oracle Corporation', exchange: 'NYSE' },
      { symbol: 'IBM', name: 'International Business Machines Corporation', exchange: 'NYSE' },
      { symbol: 'JPM', name: 'JPMorgan Chase & Co.', exchange: 'NYSE' },
      { symbol: 'BAC', name: 'Bank of America Corporation', exchange: 'NYSE' },
      { symbol: 'WMT', name: 'Walmart Inc.', exchange: 'NYSE' },
      { symbol: 'JNJ', name: 'Johnson & Johnson', exchange: 'NYSE' },
      { symbol: 'PG', name: 'Procter & Gamble Company', exchange: 'NYSE' },
      { symbol: 'KO', name: 'The Coca-Cola Company', exchange: 'NYSE' },
      { symbol: 'PFE', name: 'Pfizer Inc.', exchange: 'NYSE' }
    ];

    const searchTerm = query.toLowerCase().trim();
    const results = popularStocks.filter(stock => 
      stock.symbol.toLowerCase().includes(searchTerm) ||
      stock.name.toLowerCase().includes(searchTerm)
    ).slice(0, 10); // Limit to 10 results

    // For each result, try to get real-time price data
    const stocksWithPrices = await Promise.all(
      results.map(async (stock) => {
        try {
          const stockData = await fetchStockPrice(stock.symbol);
          return {
            symbol: stock.symbol,
            name: stock.name,
            exchange: stock.exchange,
            price: stockData.price,
            volume: stockData.volume,
            timestamp: stockData.timestamp
          };
        } catch (error) {
          // If we can't get real-time data, return the stock with mock price
          console.warn(`Could not fetch price for ${stock.symbol}: ${error.message}`);
          const mockData = getMockStockData(stock.symbol);
          return {
            symbol: stock.symbol,
            name: stock.name,
            exchange: stock.exchange,
            price: mockData.price,
            volume: mockData.volume,
            timestamp: mockData.timestamp
          };
        }
      })
    );

    res.json({
      success: true,
      data: {
        query: query,
        results: stocksWithPrices,
        count: stocksWithPrices.length,
        timestamp: new Date().toISOString()
      }
    });
  } catch (err) {
    res.status(500).json({ 
      error: err.message,
      query: req.query.query || "Unknown"
    });
  }
};