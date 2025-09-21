import mongoose from 'mongoose';
import Watchlist from '../models/Watchlist.js';
import { getAssetPrice } from '../services/unifiedAssetService.js';

/**
 * Migration script to update existing watchlist items to the new multi-asset format
 * This script will:
 * 1. Convert existing stock-only watchlist items to the new format
 * 2. Add assetType field (defaulting to 'stock')
 * 3. Add addedPrice field (using currentPrice as initial value)
 * 4. Update metadata structure
 */

async function migrateWatchlist() {
  try {
    console.log('🔄 Starting watchlist migration...');
    
    // Connect to MongoDB
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/avodal-finance');
    console.log('✅ Connected to MongoDB');
    
    // Find all existing watchlist items
    const existingItems = await Watchlist.find({});
    console.log(`📊 Found ${existingItems.length} existing watchlist items`);
    
    if (existingItems.length === 0) {
      console.log('✅ No items to migrate');
      return;
    }
    
    let migratedCount = 0;
    let errorCount = 0;
    
    for (const item of existingItems) {
      try {
        // Skip if already migrated (has assetType field)
        if (item.assetType) {
          console.log(`⏭️  Skipping ${item.symbol} - already migrated`);
          continue;
        }
        
        console.log(`🔄 Migrating ${item.symbol}...`);
        
        // Get current price to set as addedPrice
        let addedPrice = item.currentPrice || 0;
        try {
          const priceData = await getAssetPrice('stock', item.symbol);
          addedPrice = priceData.price;
        } catch (error) {
          console.warn(`⚠️  Could not fetch current price for ${item.symbol}, using existing price`);
        }
        
        // Update the item with new fields
        await Watchlist.findByIdAndUpdate(item._id, {
          $set: {
            assetType: 'stock',
            name: item.company || item.symbol,
            addedPrice: addedPrice,
            currentPrice: addedPrice,
            priceChange: 0,
            priceChangePercent: 0,
            dailyChange: item.change || 0,
            dailyChangePercent: item.changePercent || 0,
            metadata: {
              company: item.company,
              source: 'migration'
            }
          }
        });
        
        migratedCount++;
        console.log(`✅ Migrated ${item.symbol}`);
        
      } catch (error) {
        console.error(`❌ Error migrating ${item.symbol}:`, error.message);
        errorCount++;
      }
    }
    
    console.log(`\n📊 Migration Summary:`);
    console.log(`✅ Successfully migrated: ${migratedCount} items`);
    console.log(`❌ Errors: ${errorCount} items`);
    console.log(`⏭️  Skipped: ${existingItems.length - migratedCount - errorCount} items`);
    
    // Update the index to include the new compound index
    try {
      await Watchlist.collection.dropIndex({ userId: 1, symbol: 1 });
      console.log('✅ Dropped old index');
    } catch (error) {
      console.log('ℹ️  Old index not found or already dropped');
    }
    
    // Create new compound index
    await Watchlist.collection.createIndex({ userId: 1, assetType: 1, symbol: 1 }, { unique: true });
    console.log('✅ Created new compound index');
    
    console.log('\n🎉 Watchlist migration completed successfully!');
    
  } catch (error) {
    console.error('❌ Migration failed:', error);
  } finally {
    await mongoose.disconnect();
    console.log('🔌 Disconnected from MongoDB');
  }
}

// Run migration if this script is executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
  migrateWatchlist();
}

export default migrateWatchlist;
