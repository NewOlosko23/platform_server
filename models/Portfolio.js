import mongoose from "mongoose";

const PortfolioSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  stockSymbol: { type: String, required: true },
  quantity: { type: Number, required: true }, // total held
  avgBuyPrice: { type: Number, required: true }, // average buy price
  updatedAt: { type: Date, default: Date.now }
});

export default mongoose.model("Portfolio", PortfolioSchema);
