import mongoose from "mongoose";

const marketDataSchema = new mongoose.Schema({
  symbol: {
    type: String,
    required: true,
    index: true
  },
  timeframe: {
    type: String,
    required: true,
    enum: ['1m', '3m', '6m', 'ytd', '1y', 'all'],
    index: true
  },
  data: [{
    date: {
      type: Date,
      required: true
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
    }
  }],
  scrapedAt: {
    type: Date,
    default: Date.now,
    index: true
  }
}, {
  timestamps: true
});

// Compound index for efficient queries
marketDataSchema.index({ symbol: 1, timeframe: 1, scrapedAt: -1 });

const MarketData = mongoose.model("MarketData", marketDataSchema);

export default MarketData;
