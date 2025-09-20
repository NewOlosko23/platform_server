import mongoose from "mongoose";

const stockSchema = new mongoose.Schema({
  ticker: { 
    type: String, 
    required: true, 
    unique: true 
  },
  company: String,
  price: Number,           // Changed from String to Number for normalized data
  change: Number,          // Changed from String to Number for normalized data
  percent: String,         // Keep original percent field for backward compatibility
  percentChange: String,   // New field for normalized percentage change
  volume: Number,          // New field for normalized volume data
  scrapedAt: { 
    type: Date, 
    default: Date.now 
  },
  updatedAt: { 
    type: Date, 
    default: Date.now 
  },
}, {
  timestamps: true
});

const Stock = mongoose.model("Stock", stockSchema);

export default Stock;
