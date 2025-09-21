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
  quantity: { type: Number, required: true }, // total held
  avgBuyPrice: { type: Number, required: true }, // average buy price (asset price only)
  avgCostBasis: { type: Number, required: true }, // average cost basis including fees
  updatedAt: { type: Date, default: Date.now }
});

// Compound index for efficient querying
PortfolioSchema.index({ userId: 1, assetType: 1, assetSymbol: 1 }, { unique: true });

export default mongoose.model("Portfolio", PortfolioSchema);
