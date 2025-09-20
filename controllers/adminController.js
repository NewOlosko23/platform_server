// controllers/adminController.js
import User from "../models/User.js";
import Trade from "../models/Trade.js";
import Portfolio from "../models/Portfolio.js";
import Stock from "../models/Stock.js";
import TopPerformers from "../models/TopPerformers.js";
import MarketInsights from "../models/MarketInsights.js";
import SystemSettings from "../models/SystemSettings.js";
import ActivityLog from "../models/ActivityLog.js";

// Get all users with pagination and filtering
export const getAllUsers = async (req, res) => {
  try {
    const { page = 1, limit = 20, search = '', sortBy = 'createdAt', sortOrder = 'desc' } = req.query;
    const skip = (page - 1) * limit;
    
    // Build search query
    const searchQuery = search ? {
      $or: [
        { firstName: { $regex: search, $options: 'i' } },
        { lastName: { $regex: search, $options: 'i' } },
        { email: { $regex: search, $options: 'i' } },
        { username: { $regex: search, $options: 'i' } }
      ]
    } : {};

    // Build sort object
    const sort = {};
    sort[sortBy] = sortOrder === 'desc' ? -1 : 1;

    const users = await User.find(searchQuery)
      .select('-passwordHash')
      .sort(sort)
      .skip(skip)
      .limit(parseInt(limit));

    const totalUsers = await User.countDocuments(searchQuery);

    res.json({
      success: true,
      data: {
        users,
        pagination: {
          currentPage: parseInt(page),
          totalPages: Math.ceil(totalUsers / limit),
          totalUsers,
          hasNext: page < Math.ceil(totalUsers / limit),
          hasPrev: page > 1
        }
      }
    });
  } catch (err) {
    res.status(500).json({ 
      success: false,
      error: err.message 
    });
  }
};

// Get user details with portfolio and trading stats
export const getUserDetails = async (req, res) => {
  try {
    const { userId } = req.params;
    
    const user = await User.findById(userId).select('-passwordHash');
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    // Get user's portfolio
    const portfolio = await Portfolio.find({ userId });
    
    // Get user's trading stats
    const trades = await Trade.find({ userId }).sort({ timestamp: -1 });
    const totalTrades = trades.length;
    const totalVolume = trades.reduce((sum, trade) => sum + (trade.price * trade.quantity), 0);
    const totalFees = trades.reduce((sum, trade) => sum + (trade.totalFees || 0), 0);
    
    // Calculate portfolio value
    let portfolioValue = 0;
    for (const holding of portfolio) {
      try {
        const stock = await Stock.findOne({ ticker: holding.stockSymbol }).sort({ scrapedAt: -1 });
        if (stock) {
          portfolioValue += stock.price * holding.quantity;
        }
      } catch (err) {
        console.error(`Error fetching stock price for ${holding.stockSymbol}:`, err);
      }
    }

    res.json({
      success: true,
      data: {
        user,
        portfolio: {
          holdings: portfolio,
          totalValue: portfolioValue,
          totalHoldings: portfolio.length
        },
        trading: {
          totalTrades,
          totalVolume,
          totalFees,
          recentTrades: trades.slice(0, 10)
        }
      }
    });
  } catch (err) {
    res.status(500).json({ 
      success: false,
      error: err.message 
    });
  }
};

// Get user trades with pagination
export const getUserTrades = async (req, res) => {
  try {
    const { userId } = req.params;
    const { page = 1, limit = 20, type = '', symbol = '' } = req.query;
    const skip = (page - 1) * limit;
    
    // Build filter query
    const filter = { userId };
    if (type) filter.type = type;
    if (symbol) filter.stockSymbol = { $regex: symbol, $options: 'i' };

    const trades = await Trade.find(filter)
      .sort({ timestamp: -1 })
      .skip(skip)
      .limit(parseInt(limit));

    const totalTrades = await Trade.countDocuments(filter);

    res.json({
      success: true,
      data: {
        trades,
        pagination: {
          currentPage: parseInt(page),
          totalPages: Math.ceil(totalTrades / limit),
          totalTrades,
          hasNext: page < Math.ceil(totalTrades / limit),
          hasPrev: page > 1
        }
      }
    });
  } catch (err) {
    res.status(500).json({ 
      success: false,
      error: err.message 
    });
  }
};

// Update user (promote to admin, update balance, etc.)
export const updateUser = async (req, res) => {
  try {
    const { userId } = req.params;
    const { role, balance, firstName, lastName, email } = req.body;
    
    const updateData = {};
    if (role) updateData.role = role;
    if (balance !== undefined) updateData.balance = balance;
    if (firstName) updateData.firstName = firstName;
    if (lastName) updateData.lastName = lastName;
    if (email) updateData.email = email;

    const user = await User.findByIdAndUpdate(
      userId, 
      updateData, 
      { new: true, runValidators: true }
    ).select('-passwordHash');

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    res.json({
      success: true,
      message: 'User updated successfully',
      data: { user }
    });
  } catch (err) {
    res.status(500).json({ 
      success: false,
      error: err.message 
    });
  }
};

// Ban/Unban user (soft delete)
export const banUser = async (req, res) => {
  try {
    const { userId } = req.params;
    const { action = 'ban' } = req.body; // 'ban' or 'unban'
    
    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    if (action === 'ban') {
      user.isBanned = true;
      user.bannedAt = new Date();
    } else {
      user.isBanned = false;
      user.bannedAt = null;
    }

    await user.save();

    res.json({
      success: true,
      message: `User ${action === 'ban' ? 'banned' : 'unbanned'} successfully`,
      data: { user: { id: user._id, isBanned: user.isBanned } }
    });
  } catch (err) {
    res.status(500).json({ 
      success: false,
      error: err.message 
    });
  }
};

// Get platform statistics
export const getPlatformStats = async (req, res) => {
  try {
    const [
      totalUsers,
      totalTrades,
      totalVolume,
      totalFees,
      activeUsers,
      bannedUsers,
      totalStocks,
      recentTrades
    ] = await Promise.all([
      User.countDocuments(),
      Trade.countDocuments(),
      Trade.aggregate([{ $group: { _id: null, total: { $sum: { $multiply: ['$price', '$quantity'] } } } }]),
      Trade.aggregate([{ $group: { _id: null, total: { $sum: '$totalFees' } } }]),
      User.countDocuments({ isBanned: { $ne: true } }),
      User.countDocuments({ isBanned: true }),
      Stock.countDocuments(),
      Trade.find().sort({ timestamp: -1 }).limit(10).populate('userId', 'firstName lastName email')
    ]);

    // Get daily trading volume for last 7 days
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
    
    const dailyVolume = await Trade.aggregate([
      {
        $match: { timestamp: { $gte: sevenDaysAgo } }
      },
      {
        $group: {
          _id: { $dateToString: { format: '%Y-%m-%d', date: '$timestamp' } },
          volume: { $sum: { $multiply: ['$price', '$quantity'] } },
          trades: { $sum: 1 }
        }
      },
      {
        $sort: { _id: 1 }
      }
    ]);

    res.json({
      success: true,
      data: {
        overview: {
          totalUsers,
          totalTrades,
          totalVolume: totalVolume[0]?.total || 0,
          totalFees: totalFees[0]?.total || 0,
          activeUsers,
          bannedUsers,
          totalStocks
        },
        recentActivity: {
          recentTrades
        },
        analytics: {
          dailyVolume
        }
      }
    });
  } catch (err) {
    res.status(500).json({ 
      success: false,
      error: err.message 
    });
  }
};

// Get system health and data status
export const getSystemHealth = async (req, res) => {
  try {
    const [
      latestStockUpdate,
      latestMarketInsights,
      latestTopPerformers,
      totalStockRecords,
      totalMarketInsightsRecords
    ] = await Promise.all([
      Stock.findOne().sort({ scrapedAt: -1 }),
      MarketInsights.findOne().sort({ scrapedAt: -1 }),
      TopPerformers.findOne().sort({ scrapedAt: -1 }),
      Stock.countDocuments(),
      MarketInsights.countDocuments()
    ]);

    const now = new Date();
    const fiveMinutesAgo = new Date(now.getTime() - 5 * 60 * 1000);

    res.json({
      success: true,
      data: {
        dataFreshness: {
          stocks: {
            lastUpdate: latestStockUpdate?.scrapedAt,
            isRecent: latestStockUpdate?.scrapedAt > fiveMinutesAgo,
            totalRecords: totalStockRecords
          },
          marketInsights: {
            lastUpdate: latestMarketInsights?.scrapedAt,
            isRecent: latestMarketInsights?.scrapedAt > fiveMinutesAgo,
            totalRecords: totalMarketInsightsRecords
          },
          topPerformers: {
            lastUpdate: latestTopPerformers?.scrapedAt,
            isRecent: latestTopPerformers?.scrapedAt > fiveMinutesAgo
          }
        },
        systemStatus: {
          database: 'connected',
          scraping: 'active',
          timestamp: now
        }
      }
    });
  } catch (err) {
    res.status(500).json({ 
      success: false,
      error: err.message 
    });
  }
};
