import mongoose from "mongoose";

const TradeSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  stockSymbol: { type: String, required: true },
  type: { type: String, enum: ["buy", "sell"], required: true },
  quantity: { type: Number, required: true },
  price: { type: Number, required: true }, // price per stock
  timestamp: { type: Date, default: Date.now }
});

export default mongoose.model("Trade", TradeSchema);
