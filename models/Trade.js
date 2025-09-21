import mongoose from "mongoose";

const TradeSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  assetType: { 
    type: String, 
    enum: ["stock", "crypto", "currency"], 
    required: true,
    index: true
  },
  assetSymbol: { type: String, required: true, index: true }, // Changed from stockSymbol to assetSymbol
  type: { type: String, enum: ["buy", "sell"], required: true },
  quantity: { type: Number, required: true },
  price: { type: Number, required: true }, // price per asset
  
  // Fee tracking fields
  platformFee: { type: Number, default: 0 },
  taxAmount: { type: Number, default: 0 },
  totalFees: { type: Number, default: 0 },
  netAmount: { type: Number, required: true }, // Amount after fees (what user pays/receives)
  
  // Fee breakdown for transparency
  feeBreakdown: {
    platformFeePercentage: { type: Number, default: 0 },
    taxPercentage: { type: Number, default: 0 },
    platformFee: { type: Number, default: 0 },
    taxAmount: { type: Number, default: 0 },
    totalFees: { type: Number, default: 0 }
  },
  
  timestamp: { type: Date, default: Date.now }
});

// Compound index for efficient querying
TradeSchema.index({ userId: 1, assetType: 1, assetSymbol: 1, timestamp: -1 });

export default mongoose.model("Trade", TradeSchema);
