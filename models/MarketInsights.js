import mongoose from "mongoose";

const marketInsightsSchema = new mongoose.Schema({
  indexName: {
    type: String,
    default: "NASI",
    required: true
  },
  currentValue: {
    type: Number,
    required: true
  },
  change: {
    type: Number,
    default: 0
  },
  changePercent: {
    type: Number,
    default: 0
  },
  nasiIndex: {
    type: String,
    required: true
  },
  yearToDate: {
    type: String,
    required: true
  },
  marketCap: {
    type: String,
    required: true
  },
  timestamp: {
    type: Date,
    default: Date.now
  },
  scrapedAt: {
    type: Date,
    default: Date.now,
    index: true
  }
}, {
  timestamps: true
});

// Index for efficient queries
marketInsightsSchema.index({ scrapedAt: -1 });

const MarketInsights = mongoose.model("MarketInsights", marketInsightsSchema);

export default MarketInsights;
