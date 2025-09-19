// controllers/tradeController.js
import Trade from "../models/Trade.js";
import Portfolio from "../models/Portfolio.js";
import User from "../models/User.js";
import { fetchStockPrice } from "../utils/stockApi.js"; // API rotation logic

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