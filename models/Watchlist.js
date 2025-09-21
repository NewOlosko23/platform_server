import mongoose from 'mongoose';

const watchlistSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true
  },
  assetType: {
    type: String,
    required: true,
    enum: ['stock', 'crypto', 'currency'],
    index: true
  },
  symbol: {
    type: String,
    required: true,
    uppercase: true,
    trim: true
  },
  name: {
    type: String,
    required: true,
    trim: true
  },
  // Price when added to watchlist
  addedPrice: {
    type: Number,
    required: true
  },
  // Current market price
  currentPrice: {
    type: Number,
    default: 0
  },
  // Price change since adding to watchlist
  priceChange: {
    type: Number,
    default: 0
  },
  // Percentage change since adding to watchlist
  priceChangePercent: {
    type: Number,
    default: 0
  },
  // Daily change (for display purposes)
  dailyChange: {
    type: Number,
    default: 0
  },
  dailyChangePercent: {
    type: Number,
    default: 0
  },
  // Additional metadata for different asset types
  metadata: {
    // For stocks
    company: String,
    exchange: String,
    sector: String,
    
    // For crypto
    baseAsset: String,
    quoteAsset: String,
    
    // For currencies
    baseCurrency: String,
    quoteCurrency: String,
    
    // Common fields
    volume: Number,
    marketCap: Number,
    source: String
  },
  addedAt: {
    type: Date,
    default: Date.now
  },
  lastUpdated: {
    type: Date,
    default: Date.now
  }
}, {
  timestamps: true
});

// Compound index to ensure unique symbol per user per asset type
watchlistSchema.index({ userId: 1, assetType: 1, symbol: 1 }, { unique: true });

// Update lastUpdated when document is modified
watchlistSchema.pre('save', function(next) {
  this.lastUpdated = new Date();
  next();
});

const Watchlist = mongoose.model('Watchlist', watchlistSchema);

export default Watchlist;
