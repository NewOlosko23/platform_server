import mongoose from "mongoose";

const SystemSettingsSchema = new mongoose.Schema({
  // Platform Configuration
  platformName: { type: String, default: "Avodal Finance" },
  platformVersion: { type: String, default: "1.0.0" },
  maintenanceMode: { type: Boolean, default: false },
  
  // Trading Configuration
  tradingEnabled: { type: Boolean, default: true },
  minTradeAmount: { type: Number, default: 100 },
  maxTradeAmount: { type: Number, default: 1000000 },
  
  // Fee Configuration
  platformFeePercentage: { type: Number, default: 0.5, min: 0, max: 10 }, // 0.5% default, max 10%
  taxPercentage: { type: Number, default: 0.1, min: 0, max: 5 }, // 0.1% default, max 5%
  minimumFee: { type: Number, default: 10, min: 0 }, // KSh 10 minimum
  maximumFee: { type: Number, default: 1000, min: 0 }, // KSh 1000 maximum
  
  // Data Scraping Configuration
  scrapingEnabled: { type: Boolean, default: true },
  scrapingInterval: { type: Number, default: 300 }, // 5 minutes in seconds
  dataRetentionDays: { type: Number, default: 30 },
  
  // User Management
  registrationEnabled: { type: Boolean, default: true },
  maxUsersPerDay: { type: Number, default: 100 },
  accountVerificationRequired: { type: Boolean, default: false },
  
  // Security Settings
  maxLoginAttempts: { type: Number, default: 5 },
  sessionTimeout: { type: Number, default: 3600 }, // 1 hour in seconds
  passwordMinLength: { type: Number, default: 8 },
  
  // Notification Settings
  emailNotifications: { type: Boolean, default: true },
  pushNotifications: { type: Boolean, default: true },
  
  // Analytics Settings
  analyticsEnabled: { type: Boolean, default: true },
  dataCollectionEnabled: { type: Boolean, default: true },
  
  // System Information
  lastUpdated: { type: Date, default: Date.now },
  updatedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  
  // Metadata
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
});

// Update the updatedAt field before saving
SystemSettingsSchema.pre('save', function(next) {
  this.updatedAt = new Date();
  next();
});

export default mongoose.model("SystemSettings", SystemSettingsSchema);
