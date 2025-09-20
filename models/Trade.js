import mongoose from "mongoose";

const TradeSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  stockSymbol: { type: String, required: true },
  type: { type: String, enum: ["buy", "sell"], required: true },
  quantity: { type: Number, required: true },
  price: { type: Number, required: true }, // price per stock
  
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

export default mongoose.model("Trade", TradeSchema);
