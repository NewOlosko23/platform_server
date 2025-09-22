#!/usr/bin/env node

/**
 * Fix Stock Data Script
 * 
 * This script manually processes stock data from the Stock collection
 * into the OHLCV collection to fix the data freshness issue.
 * 
 * Usage: node scripts/fixStockData.js
 */

import mongoose from 'mongoose';
import dotenv from 'dotenv';
import { processAndStoreStockData } from '../services/stockFetcher.js';

dotenv.config();

async function fixStockData() {
  try {
    console.log('🚀 Starting stock data fix...');
    
    // Connect to database
    await mongoose.connect(process.env.MONGO_URI);
    console.log('✅ Connected to database');
    
    // Process stock data
    await processAndStoreStockData();
    
    console.log('✅ Stock data processing completed successfully!');
    console.log('📊 Stocks should now appear fresh in the admin dashboard');
    
  } catch (error) {
    console.error('❌ Error fixing stock data:', error);
    process.exit(1);
  } finally {
    // Close database connection
    await mongoose.connection.close();
    console.log('🔌 Database connection closed');
    process.exit(0);
  }
}

// Run the fix
fixStockData();
