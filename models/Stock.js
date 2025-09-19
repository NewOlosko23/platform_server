import mongoose from "mongoose";

const stockSchema = new mongoose.Schema({
  ticker: { 
    type: String, 
    required: true, 
    unique: true 
  },
  company: String,
  price: String,
  change: String,
  percent: String,
  updatedAt: { 
    type: Date, 
    default: Date.now 
  },
}, {
  timestamps: true
});

const Stock = mongoose.model("Stock", stockSchema);

export default Stock;
