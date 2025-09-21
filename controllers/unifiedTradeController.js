// controllers/unifiedTradeController.js
import Trade from "../models/Trade.js";
import Portfolio from "../models/Portfolio.js";
import User from "../models/User.js";
import { fetchStockPrice, getMockStockData } from "../utils/stockApi.js";
import { getLatestCryptoPrice } from "../services/cryptoFetcher.js";
import { getLatestFXRate } from "../services/fxFetcher.js";
import { calculateFees, formatFeeInfo, validateBuyOrder, getPlatformRevenue } from "../utils/feeCalculator.js";
import OHLCV from "../models/OHLCV.js";

/**
 * Get current price for any asset type
 */
const fetchAssetPrice = async (assetType, symbol) => {
  try {
    switch (assetType) {
      case 'stock':
        const stockData = await fetchStockPrice(symbol);
        return {
          price: stockData.price,
          change: stockData.change || 0,
          changePercent: stockData.changePercent || 0,
          volume: stockData.volume || 0
        };
      
      case 'crypto':
        const cryptoData = await getLatestCryptoPrice(symbol);
        return {
          price: cryptoData.price,
          change: cryptoData.change24h || 0,
          changePercent: cryptoData.changePercent24h || 0,
          volume: cryptoData.volume24h || 0
        };
      
      case 'currency':
        const fxData = await getLatestFXRate(symbol);
        return {
          price: fxData.rate,
          change: fxData.change24h || 0,
          changePercent: fxData.changePercent24h || 0,
          volume: 0 // FX doesn't have volume
        };
      
      default:
        throw new Error(`Unsupported asset type: ${assetType}`);
    }
  } catch (error) {
    console.error(`Error fetching price for ${assetType}:${symbol}:`, error);
    throw error;
  }
};

/**
 * Buy any asset type (stock, crypto, currency) - Unified function
 */
export const buyAsset = async (req, res) => {
  try {
    const { assetType = 'stock', symbol, quantity } = req.body;
    const user = await User.findById(req.user.id);
    
    if (!user) {
      return res.status(404).json({ 
        success: false, 
        message: "User not found" 
      });
    }

    // Validate asset type
    if (!['stock', 'crypto', 'currency'].includes(assetType)) {
      return res.status(400).json({ 
        success: false, 
        message: "Invalid asset type. Must be: stock, crypto, or currency" 
      });
    }

    // Get current asset price
    const assetData = await fetchAssetPrice(assetType, symbol);
    const price = assetData.price;
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
        message: `Invalid ${assetType} price` 
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
      let holding = await Portfolio.findOne({ 
        userId: user._id, 
        assetType: assetType,
        assetSymbol: symbol 
      });
      
      if (holding) {
        // Calculate new average buy price (asset price only)
        const totalAssetCost = (holding.avgBuyPrice * holding.quantity) + (price * quantity);
        const totalQuantity = holding.quantity + quantity;
        holding.avgBuyPrice = totalAssetCost / totalQuantity;
        
        // Calculate new average cost basis (including fees)
        const totalCostBasis = (holding.avgCostBasis * holding.quantity) + feeData.totalCost;
        holding.avgCostBasis = totalCostBasis / totalQuantity;
        
        holding.quantity = totalQuantity;
        holding.updatedAt = new Date();
        await holding.save();
      } else {
        holding = new Portfolio({ 
          userId: user._id, 
          assetType: assetType,
          assetSymbol: symbol, 
          quantity, 
          avgBuyPrice: price,
          avgCostBasis: feeData.totalCost / quantity, // cost per unit including fees
          updatedAt: new Date()
        });
        await holding.save();
      }

      // Save trade record with fee information
      const trade = new Trade({ 
        userId: user._id, 
        assetType: assetType,
        assetSymbol: symbol, 
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
        message: `Successfully bought ${quantity} ${assetType === 'crypto' ? 'units' : assetType === 'currency' ? 'units' : 'shares'} of ${symbol} at KSh ${price.toFixed(2)} per unit`,
        data: {
          trade: {
            id: trade._id,
            assetType: trade.assetType,
            symbol: trade.assetSymbol,
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
            assetType: holding.assetType,
            symbol: holding.assetSymbol,
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
    console.error('Buy asset error:', err);
    res.status(500).json({ 
      success: false,
      error: err.message,
      message: "Failed to execute buy order"
    });
  }
};

/**
 * Sell any asset type (stock, crypto, currency) - Unified function
 */
export const sellAsset = async (req, res) => {
  try {
    const { assetType = 'stock', symbol, quantity } = req.body;
    const user = await User.findById(req.user.id);
    
    if (!user) {
      return res.status(404).json({ 
        success: false, 
        message: "User not found" 
      });
    }

    // Validate asset type
    if (!['stock', 'crypto', 'currency'].includes(assetType)) {
      return res.status(400).json({ 
        success: false, 
        message: "Invalid asset type. Must be: stock, crypto, or currency" 
      });
    }

    // Check if user owns this asset
    const holding = await Portfolio.findOne({ 
      userId: user._id, 
      assetType: assetType,
      assetSymbol: symbol 
    });
    
    if (!holding) {
      return res.status(400).json({ 
        success: false, 
        message: `You don't own any ${assetType === 'crypto' ? 'units' : assetType === 'currency' ? 'units' : 'shares'} of ${symbol}` 
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
        message: `Insufficient ${assetType === 'crypto' ? 'units' : assetType === 'currency' ? 'units' : 'shares'}. You own ${holding.quantity} but trying to sell ${quantity}` 
      });
    }

    // Get current asset price
    const assetData = await fetchAssetPrice(assetType, symbol);
    const price = assetData.price;
    const tradeAmount = price * quantity;

    if (!price || price <= 0) {
      return res.status(400).json({ 
        success: false, 
        message: `Invalid ${assetType} price` 
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
        assetType: assetType,
        assetSymbol: symbol, 
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
        message: `Successfully sold ${quantity} ${assetType === 'crypto' ? 'units' : assetType === 'currency' ? 'units' : 'shares'} of ${symbol} at KSh ${price.toFixed(2)} per unit`,
        data: {
          trade: {
            id: trade._id,
            assetType: trade.assetType,
            symbol: trade.assetSymbol,
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
            assetType: assetType,
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
    console.error('Sell asset error:', err);
    res.status(500).json({ 
      success: false,
      error: err.message,
      message: "Failed to execute sell order"
    });
  }
};

/**
 * Get current price for any asset - Unified function
 */
export const getAssetPrice = async (req, res) => {
  try {
    const { assetType = 'stock', symbol } = req.params;
    
    if (!symbol) {
      return res.status(400).json({ 
        success: false,
        message: "Symbol is required" 
      });
    }

    if (!['stock', 'crypto', 'currency'].includes(assetType)) {
      return res.status(400).json({ 
        success: false,
        message: "Invalid asset type. Must be: stock, crypto, or currency" 
      });
    }

    const assetData = await fetchAssetPrice(assetType, symbol.toUpperCase());
    
    res.json({
      success: true,
      data: {
        assetType: assetType,
        symbol: symbol.toUpperCase(),
        price: assetData.price,
        change: assetData.change,
        changePercent: assetData.changePercent,
        volume: assetData.volume,
        timestamp: new Date().toISOString()
      }
    });
  } catch (err) {
    console.error('Get asset price error:', err);
    res.status(500).json({ 
      success: false,
      error: err.message,
      message: "Failed to get asset price"
    });
  }
};

/**
 * Search assets by type - Unified function
 */
export const searchAssets = async (req, res) => {
  try {
    const { assetType = 'stock', query } = req.query;
    
    if (!query || query.trim().length < 1) {
      return res.status(400).json({ 
        success: false,
        message: "Search query is required" 
      });
    }

    if (!['stock', 'crypto', 'currency'].includes(assetType)) {
      return res.status(400).json({ 
        success: false,
        message: "Invalid asset type. Must be: stock, crypto, or currency" 
      });
    }

    let results = [];

    switch (assetType) {
      case 'stock':
        // Use existing stock search logic
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
        results = popularStocks.filter(stock => 
          stock.symbol.toLowerCase().includes(searchTerm) ||
          stock.name.toLowerCase().includes(searchTerm)
        ).slice(0, 10);
        break;

      case 'crypto':
        // Get available crypto symbols from database
        const cryptoSymbols = await OHLCV.distinct("symbol", { type: "crypto" });
        const searchTermCrypto = query.toLowerCase().trim();
        results = cryptoSymbols
          .filter(symbol => symbol.toLowerCase().includes(searchTermCrypto))
          .slice(0, 10)
          .map(symbol => ({
            symbol: symbol,
            name: symbol.replace('USDT', ''),
            exchange: 'Binance'
          }));
        break;

      case 'currency':
        // Get available currency pairs from database
        const currencySymbols = await OHLCV.distinct("symbol", { type: "currency" });
        const searchTermCurrency = query.toLowerCase().trim();
        results = currencySymbols
          .filter(symbol => symbol.toLowerCase().includes(searchTermCurrency))
          .slice(0, 10)
          .map(symbol => ({
            symbol: symbol,
            name: symbol,
            exchange: 'Forex'
          }));
        break;
    }

    // Get prices for each result
    const assetsWithPrices = await Promise.all(
      results.map(async (asset) => {
        try {
          const assetData = await fetchAssetPrice(assetType, asset.symbol);
          return {
            ...asset,
            price: assetData.price,
            change: assetData.change,
            changePercent: assetData.changePercent,
            volume: assetData.volume
          };
        } catch (error) {
          console.warn(`Could not fetch price for ${asset.symbol}: ${error.message}`);
          return {
            ...asset,
            price: 0,
            change: 0,
            changePercent: 0,
            volume: 0
          };
        }
      })
    );

    res.json({
      success: true,
      data: {
        assetType: assetType,
        query: query,
        results: assetsWithPrices,
        count: assetsWithPrices.length,
        timestamp: new Date().toISOString()
      }
    });
  } catch (err) {
    console.error('Search assets error:', err);
    res.status(500).json({ 
      success: false,
      error: err.message,
      message: "Failed to search assets"
    });
  }
};

/**
 * Get user trades - Unified function
 */
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

/**
 * Get trade fees for any asset type - Unified function
 */
export const getTradeFees = async (req, res) => {
  try {
    const { assetType = 'stock', symbol, quantity, type } = req.query;
    
    if (!symbol || !quantity || !type) {
      return res.status(400).json({ 
        success: false, 
        message: "Symbol, quantity, and type are required" 
      });
    }

    if (!['stock', 'crypto', 'currency'].includes(assetType)) {
      return res.status(400).json({ 
        success: false, 
        message: "Invalid asset type. Must be: stock, crypto, or currency" 
      });
    }

    if (!['buy', 'sell'].includes(type)) {
      return res.status(400).json({ 
        success: false, 
        message: "Type must be 'buy' or 'sell'" 
      });
    }

    const quantityNum = parseFloat(quantity);
    if (isNaN(quantityNum) || quantityNum <= 0) {
      return res.status(400).json({ 
        success: false, 
        message: "Invalid quantity" 
      });
    }

    // Get current asset price
    const assetData = await fetchAssetPrice(assetType, symbol);
    const price = assetData.price;
    const tradeAmount = price * quantityNum;

    if (!price || price <= 0) {
      return res.status(400).json({ 
        success: false, 
        message: `Invalid ${assetType} price` 
      });
    }

    // Calculate fees
    const feeData = calculateFees(tradeAmount, type);
    const feeInfo = formatFeeInfo(feeData, type);

    res.json({
      success: true,
      data: {
        assetType: assetType,
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
