import mongoose from "mongoose";

const marketInsightsSchema = new mongoose.Schema({
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
