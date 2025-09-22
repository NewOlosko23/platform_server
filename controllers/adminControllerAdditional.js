// Additional admin controller functions
import SystemSettings from "../models/SystemSettings.js";
import ActivityLog from "../models/ActivityLog.js";
import User from "../models/User.js";
import { getCurrentFeeConfiguration } from "../utils/feeCalculator.js";

// Get system settings
export const getSystemSettings = async (req, res) => {
  try {
    let settings = await SystemSettings.findOne();
    
    // If no settings exist, create default settings
    if (!settings) {
      settings = new SystemSettings();
      await settings.save();
    }
    
    res.json({
      success: true,
      data: { settings }
    });
  } catch (err) {
    res.status(500).json({ 
      success: false,
      error: err.message 
    });
  }
};

// Update system settings
export const updateSystemSettings = async (req, res) => {
  try {
    const updates = req.body;
    const adminId = req.user._id;
    
    let settings = await SystemSettings.findOne();
    
    if (!settings) {
      settings = new SystemSettings();
    }
    
    // Update settings
    Object.keys(updates).forEach(key => {
      if (settings.schema.paths[key]) {
        settings[key] = updates[key];
      }
    });
    
    settings.updatedBy = adminId;
    settings.lastUpdated = new Date();
    
    await settings.save();
    
    res.json({
      success: true,
      message: 'System settings updated successfully. Restart required for changes to take effect.',
      data: { settings }
    });
  } catch (err) {
    res.status(500).json({ 
      success: false,
      error: err.message 
    });
  }
};

// Get activity logs with pagination and filtering
export const getActivityLogs = async (req, res) => {
  try {
    const { 
      page = 1, 
      limit = 50, 
      activityType = '', 
      userId = '', 
      startDate = '', 
      endDate = '',
      severity = ''
    } = req.query;
    
    const skip = (page - 1) * limit;
    
    // Build filter query
    const filter = {};
    
    if (activityType) filter.activityType = activityType;
    if (userId) filter.userId = userId;
    if (severity) filter.severity = severity;
    
    // Date range filter
    if (startDate || endDate) {
      filter.timestamp = {};
      if (startDate) filter.timestamp.$gte = new Date(startDate);
      if (endDate) filter.timestamp.$lte = new Date(endDate);
    }
    
    const logs = await ActivityLog.find(filter)
      .populate('userId', 'firstName lastName email')
      .sort({ timestamp: -1 })
      .skip(skip)
      .limit(parseInt(limit));
    
    const totalLogs = await ActivityLog.countDocuments(filter);
    
    // Get activity statistics
    const stats = await ActivityLog.aggregate([
      { $match: filter },
      {
        $group: {
          _id: '$activityType',
          count: { $sum: 1 }
        }
      }
    ]);
    
    res.json({
      success: true,
      data: {
        logs,
        pagination: {
          currentPage: parseInt(page),
          totalPages: Math.ceil(totalLogs / limit),
          totalLogs,
          hasNext: page < Math.ceil(totalLogs / limit),
          hasPrev: page > 1
        },
        statistics: stats
      }
    });
  } catch (err) {
    res.status(500).json({ 
      success: false,
      error: err.message 
    });
  }
};

// Get user activity summary
export const getUserActivitySummary = async (req, res) => {
  try {
    const { userId } = req.params;
    const { days = 30 } = req.query;
    
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - parseInt(days));
    
    const activities = await ActivityLog.find({
      userId,
      timestamp: { $gte: startDate }
    }).sort({ timestamp: -1 });
    
    // Group activities by type
    const activitySummary = activities.reduce((acc, activity) => {
      if (!acc[activity.activityType]) {
        acc[activity.activityType] = 0;
      }
      acc[activity.activityType]++;
      return acc;
    }, {});
    
    // Get recent trades
    const recentTrades = activities.filter(activity => 
      activity.activityType === 'trade_buy' || activity.activityType === 'trade_sell'
    ).slice(0, 10);
    
    res.json({
      success: true,
      data: {
        summary: activitySummary,
        recentActivities: activities.slice(0, 20),
        recentTrades,
        totalActivities: activities.length,
        period: `${days} days`
      }
    });
  } catch (err) {
    res.status(500).json({ 
      success: false,
      error: err.message 
    });
  }
};

// Create activity log (utility function for other controllers)
export const createActivityLog = async (userId, activityType, description, details = {}) => {
  try {
    const user = await User.findById(userId);
    if (!user) return;
    
    const activityLog = new ActivityLog({
      userId,
      userEmail: user.email,
      userName: `${user.firstName} ${user.lastName}`,
      activityType,
      activityDescription: description,
      tradeDetails: details.tradeDetails || {},
      ipAddress: details.ipAddress,
      userAgent: details.userAgent,
      sessionId: details.sessionId,
      metadata: details.metadata || {}
    });
    
    await activityLog.save();
  } catch (err) {
    console.error('Error creating activity log:', err);
  }
};

// Get fee configuration
export const getFeeSettings = async (req, res) => {
  try {
    const feeConfig = await getCurrentFeeConfiguration();
    
    res.json({
      success: true,
      data: {
        feeSettings: feeConfig
      }
    });
  } catch (err) {
    res.status(500).json({ 
      success: false,
      error: err.message 
    });
  }
};

// Update fee configuration
export const updateFeeSettings = async (req, res) => {
  try {
    const { platformFeePercentage, taxPercentage, minimumFee, maximumFee } = req.body;
    const adminId = req.user._id;
    
    // Validate fee settings
    if (platformFeePercentage !== undefined && (platformFeePercentage < 0 || platformFeePercentage > 10)) {
      return res.status(400).json({
        success: false,
        message: "Platform fee percentage must be between 0 and 10"
      });
    }
    
    if (taxPercentage !== undefined && (taxPercentage < 0 || taxPercentage > 5)) {
      return res.status(400).json({
        success: false,
        message: "Tax percentage must be between 0 and 5"
      });
    }
    
    if (minimumFee !== undefined && minimumFee < 0) {
      return res.status(400).json({
        success: false,
        message: "Minimum fee must be 0 or greater"
      });
    }
    
    if (maximumFee !== undefined && maximumFee < 0) {
      return res.status(400).json({
        success: false,
        message: "Maximum fee must be 0 or greater"
      });
    }
    
    if (minimumFee !== undefined && maximumFee !== undefined && minimumFee > maximumFee) {
      return res.status(400).json({
        success: false,
        message: "Minimum fee cannot be greater than maximum fee"
      });
    }
    
    let settings = await SystemSettings.findOne();
    
    if (!settings) {
      settings = new SystemSettings();
    }
    
    // Update fee settings
    if (platformFeePercentage !== undefined) settings.platformFeePercentage = platformFeePercentage;
    if (taxPercentage !== undefined) settings.taxPercentage = taxPercentage;
    if (minimumFee !== undefined) settings.minimumFee = minimumFee;
    if (maximumFee !== undefined) settings.maximumFee = maximumFee;
    
    settings.updatedBy = adminId;
    settings.lastUpdated = new Date();
    
    await settings.save();
    
    // Log the activity
    const activityLog = new ActivityLog({
      userId: adminId,
      action: 'update_fee_settings',
      details: {
        platformFeePercentage: settings.platformFeePercentage,
        taxPercentage: settings.taxPercentage,
        minimumFee: settings.minimumFee,
        maximumFee: settings.maximumFee
      },
      timestamp: new Date()
    });
    await activityLog.save();
    
    res.json({
      success: true,
      message: 'Fee settings updated successfully',
      data: {
        feeSettings: {
          platformFeePercentage: settings.platformFeePercentage,
          taxPercentage: settings.taxPercentage,
          minimumFee: settings.minimumFee,
          maximumFee: settings.maximumFee
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
