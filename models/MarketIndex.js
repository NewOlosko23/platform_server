import mongoose from "mongoose";

const marketIndexSchema = new mongoose.Schema({
  indexName: {
    type: String,
    required: true,
    index: true
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
  timestamp: {
    type: String,
    default: ""
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
marketIndexSchema.index({ indexName: 1, scrapedAt: -1 });

const MarketIndex = mongoose.model("MarketIndex", marketIndexSchema);

export default MarketIndex;
