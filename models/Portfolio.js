import mongoose from "mongoose";

const PortfolioSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  assetType: { 
    type: String, 
    enum: ["stock", "crypto", "currency"], 
    required: true,
    index: true
  },
  assetSymbol: { type: String, required: true, index: true }, // Changed from stockSymbol to assetSymbol
  // Legacy field for backward compatibility
  stockSymbol: { type: String, index: true }, // Keep for backward compatibility
  quantity: { type: Number, required: true }, // total held
  avgBuyPrice: { type: Number, required: true }, // average buy price (asset price only)
  avgCostBasis: { type: Number, required: true }, // average cost basis including fees
  updatedAt: { type: Date, default: Date.now }
});

// Pre-save middleware to ensure assetSymbol is set
PortfolioSchema.pre('save', function(next) {
  // If assetSymbol is not set but stockSymbol is, use stockSymbol
  if (!this.assetSymbol && this.stockSymbol) {
    this.assetSymbol = this.stockSymbol;
  }
  // If assetType is not set, default to 'stock'
  if (!this.assetType) {
    this.assetType = 'stock';
  }
  next();
});

// Compound index for efficient querying - use sparse to handle null values
PortfolioSchema.index({ userId: 1, assetType: 1, assetSymbol: 1 }, { unique: true, sparse: true });

export default mongoose.model("Portfolio", PortfolioSchema);
