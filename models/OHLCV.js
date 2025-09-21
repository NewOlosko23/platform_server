import mongoose from "mongoose";

// Unified OHLCV Schema for all asset types (stocks, crypto, currencies)
const OHLCVSchema = new mongoose.Schema({
  // Asset identification
  type: { 
    type: String, 
    enum: ["stock", "crypto", "currency"], 
    required: true,
    index: true
  },
  symbol: { 
    type: String, 
    required: true,
    index: true
  },
  
  // OHLCV data
  timestamp: { 
    type: Number, 
    required: true,
    index: true
  },
  open: { 
    type: Number, 
    required: true 
  },
  high: { 
    type: Number, 
    required: true 
  },
  low: { 
    type: Number, 
    required: true 
  },
  close: { 
    type: Number, 
    required: true 
  },
  volume: { 
    type: Number, 
    default: 0 
  },
  
  // KES conversion
  valueKES: { 
    type: Number, 
    required: true,
    index: true
  },
  
  // Metadata
  source: { 
    type: String, 
    required: true 
  },
  lastUpdated: { 
    type: Date, 
    default: Date.now,
    index: true
  },
  
  // Additional data for specific asset types
  metadata: {
    // For stocks
    companyName: String,
    exchange: String,
    
    // For crypto
    baseAsset: String,
    quoteAsset: String,
    
    // For metals
    metalType: String,
    unit: String,
    
    // For currencies
    baseCurrency: String,
    quoteCurrency: String
  }
});

// Compound indexes for efficient querying
OHLCVSchema.index({ type: 1, symbol: 1, timestamp: -1 });
OHLCVSchema.index({ type: 1, symbol: 1, lastUpdated: -1 });
OHLCVSchema.index({ timestamp: -1 });

// Static method to get latest price for an asset
OHLCVSchema.statics.getLatestPrice = async function(type, symbol) {
  const latest = await this.findOne(
    { type, symbol },
    {},
    { sort: { timestamp: -1 } }
  );
  return latest;
};

// Static method to get historical data
OHLCVSchema.statics.getHistoricalData = async function(type, symbol, limit = 100) {
  return await this.find(
    { type, symbol },
    {},
    { 
      sort: { timestamp: -1 },
      limit: limit
    }
  );
};

// Static method to get price range
OHLCVSchema.statics.getPriceRange = async function(type, symbol, startTime, endTime) {
  return await this.find({
    type,
    symbol,
    timestamp: { $gte: startTime, $lte: endTime }
  }).sort({ timestamp: 1 });
};

export default mongoose.model("OHLCV", OHLCVSchema);
