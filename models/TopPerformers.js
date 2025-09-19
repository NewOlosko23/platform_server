import mongoose from "mongoose";

const topPerformersSchema = new mongoose.Schema({
  type: {
    type: String,
    required: true,
    enum: ['gainers', 'losers'],
    index: true
  },
  ticker: {
    type: String,
    required: true,
    index: true
  },
  price: {
    type: Number,
    required: true
  },
  change: {
    type: Number,
    required: true
  },
  changePercent: {
    type: Number,
    required: true
  },
  rank: {
    type: Number,
    default: 0
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
topPerformersSchema.index({ type: 1, scrapedAt: -1 });
topPerformersSchema.index({ ticker: 1, scrapedAt: -1 });

const TopPerformers = mongoose.model("TopPerformers", topPerformersSchema);

export default TopPerformers;
