import mongoose from "mongoose";

const ActivityLogSchema = new mongoose.Schema({
  // User Information
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  userEmail: { type: String, required: true },
  userName: { type: String, required: true },
  
  // Activity Details
  activityType: { 
    type: String, 
    enum: ['trade_buy', 'trade_sell', 'login', 'logout', 'profile_update', 'password_change'],
    required: true 
  },
  activityDescription: { type: String, required: true },
  
  // Trade-specific fields
  tradeDetails: {
    stockSymbol: { type: String },
    quantity: { type: Number },
    price: { type: Number },
    totalAmount: { type: Number },
    fees: { type: Number },
    tradeId: { type: mongoose.Schema.Types.ObjectId, ref: 'Trade' }
  },
  
  // System Information
  ipAddress: { type: String },
  userAgent: { type: String },
  sessionId: { type: String },
  
  // Metadata
  timestamp: { type: Date, default: Date.now },
  severity: { 
    type: String, 
    enum: ['info', 'warning', 'error', 'critical'],
    default: 'info'
  },
  
  // Additional Data
  metadata: { type: mongoose.Schema.Types.Mixed, default: {} }
});

// Index for efficient querying
ActivityLogSchema.index({ userId: 1, timestamp: -1 });
ActivityLogSchema.index({ activityType: 1, timestamp: -1 });
ActivityLogSchema.index({ timestamp: -1 });

export default mongoose.model("ActivityLog", ActivityLogSchema);
