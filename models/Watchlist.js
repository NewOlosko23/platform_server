import mongoose from 'mongoose';

const watchlistSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true
  },
  symbol: {
    type: String,
    required: true,
    uppercase: true,
    trim: true
  },
  company: {
    type: String,
    required: true,
    trim: true
  },
  currentPrice: {
    type: Number,
    default: 0
  },
  change: {
    type: Number,
    default: 0
  },
  changePercent: {
    type: Number,
    default: 0
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

// Compound index to ensure unique symbol per user
watchlistSchema.index({ userId: 1, symbol: 1 }, { unique: true });

// Update lastUpdated when document is modified
watchlistSchema.pre('save', function(next) {
  this.lastUpdated = new Date();
  next();
});

const Watchlist = mongoose.model('Watchlist', watchlistSchema);

export default Watchlist;
