// controllers/tradeController.js
import Trade from "../models/Trade.js";
import Portfolio from "../models/Portfolio.js";
import User from "../models/User.js";
import { fetchStockPrice, getMockStockData } from "../utils/stockApi.js"; // API rotation logic

export const buyStock = async (req, res) => {
  try {
    const { symbol, quantity } = req.body;
    const user = await User.findById(req.user.id);
    const stockData = await fetchStockPrice(symbol);
    const price = stockData.price;
    const cost = price * quantity;

    if (user.balance < cost) return res.status(400).json({ message: "Insufficient balance" });

    // Deduct balance
    user.balance -= cost;
    await user.save();

    // Update portfolio
    let holding = await Portfolio.findOne({ userId: user._id, stockSymbol: symbol });
    if (holding) {
      holding.quantity += quantity;
      holding.avgBuyPrice = (holding.avgBuyPrice + price) / 2;
      await holding.save();
    } else {
      holding = new Portfolio({ userId: user._id, stockSymbol: symbol, quantity, avgBuyPrice: price });
      await holding.save();
    }

    // Save trade
    const trade = new Trade({ userId: user._id, stockSymbol: symbol, quantity, price, type: "buy" });
    await trade.save();

    res.json({ message: "Stock purchased successfully", trade });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

export const sellStock = async (req, res) => {
  try {
    const { symbol, quantity } = req.body;
    const user = await User.findById(req.user.id);
    const holding = await Portfolio.findOne({ userId: user._id, stockSymbol: symbol });
    if (!holding || holding.quantity < quantity) return res.status(400).json({ message: "Not enough shares" });

    const stockData = await fetchStockPrice(symbol);
    const price = stockData.price;
    const proceeds = price * quantity;

    // Add balance
    user.balance += proceeds;
    await user.save();

    // Update portfolio
    holding.quantity -= quantity;
    if (holding.quantity <= 0) {
      await holding.deleteOne();
    } else {
      await holding.save();
    }

    // Save trade
    const trade = new Trade({ userId: user._id, stockSymbol: symbol, quantity, price, type: "sell" });
    await trade.save();

    res.json({ message: "Stock sold successfully", trade });
  } catch (err) {
    res.status(500).json({ error: err.message });
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