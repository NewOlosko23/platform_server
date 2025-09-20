import mongoose from "mongoose";

const stockSchema = new mongoose.Schema({
  ticker: { 
    type: String, 
    required: true, 
    unique: true 
  },
  name: String,
  volume: { 
    type: Number, 
    default: null 
  },
  price: Number,
  change: { 
    type: Number, 
    default: null 
  },
  type: { 
    type: String, 
    enum: ["gainer", "loser", "neutral"], 
    default: "neutral" 
  },
  url: String,
  createdAt: { 
    type: Date, 
    default: Date.now 
  }
}, {
  timestamps: false // We're using createdAt instead of timestamps
});

const Stock = mongoose.model("Stock", stockSchema);

export default Stock;
