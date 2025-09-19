import mongoose from "mongoose";

const stockInfoSchema = new mongoose.Schema({
  ticker: {
    type: String,
    required: true,
    index: true
  },
  name: String,
  description: String,
  currentPrice: String,
  lastTrading: {
    type: mongoose.Schema.Types.Mixed,
    default: {}
  },
  performance: {
    type: mongoose.Schema.Types.Mixed,
    default: {}
  },
  history: [{
    date: String,
    volume: String,
    close: String,
    change: String,
    changePct: String
  }],
  profile: {
    type: mongoose.Schema.Types.Mixed,
    default: {}
  },
  scrapedAt: {
    type: Date,
    default: Date.now,
    index: true
  }
}, {
  timestamps: true
});

// Compound index for efficient queries
stockInfoSchema.index({ ticker: 1, scrapedAt: -1 });

const StockInfo = mongoose.model("StockInfo", stockInfoSchema);

export default StockInfo;
