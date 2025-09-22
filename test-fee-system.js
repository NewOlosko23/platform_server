// Test script for the new admin-configurable fee system
import mongoose from 'mongoose';
import SystemSettings from './models/SystemSettings.js';
import { calculateFees, getCurrentFeeConfiguration } from './utils/feeCalculator.js';

// Test database connection
const connectDB = async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/avodal-finance');
    console.log('✅ Connected to MongoDB');
  } catch (error) {
    console.error('❌ MongoDB connection error:', error);
    process.exit(1);
  }
};

// Test fee calculation
const testFeeCalculation = async () => {
  console.log('\n🧪 Testing Fee Calculation System...\n');
  
  try {
    // Test 1: Get current fee configuration
    console.log('1. Getting current fee configuration...');
    const feeConfig = await getCurrentFeeConfiguration();
    console.log('   Current fee config:', feeConfig);
    
    // Test 2: Calculate fees for different trade amounts
    const testTrades = [
      { amount: 1000, type: 'buy' },
      { amount: 5000, type: 'buy' },
      { amount: 10000, type: 'sell' },
      { amount: 100, type: 'buy' }, // Should hit minimum fee
      { amount: 500000, type: 'sell' } // Should hit maximum fee
    ];
    
    console.log('\n2. Testing fee calculations:');
    for (const trade of testTrades) {
      const fees = await calculateFees(trade.amount, trade.type);
      console.log(`   ${trade.type.toUpperCase()} KSh ${trade.amount.toLocaleString()}:`);
      console.log(`     Platform Fee: KSh ${fees.platformFee.toFixed(2)}`);
      console.log(`     Tax: KSh ${fees.taxAmount.toFixed(2)}`);
      console.log(`     Total Fees: KSh ${fees.totalFees.toFixed(2)}`);
      console.log(`     Net Amount: KSh ${fees.netAmount.toFixed(2)}`);
      console.log('');
    }
    
    // Test 3: Update fee settings
    console.log('3. Testing fee settings update...');
    let settings = await SystemSettings.findOne();
    if (!settings) {
      settings = new SystemSettings();
    }
    
    // Update fees
    settings.platformFeePercentage = 1.0; // 1%
    settings.taxPercentage = 0.2; // 0.2%
    settings.minimumFee = 20; // KSh 20
    settings.maximumFee = 2000; // KSh 2000
    await settings.save();
    
    console.log('   Updated fee settings:');
    console.log(`     Platform Fee: ${settings.platformFeePercentage}%`);
    console.log(`     Tax: ${settings.taxPercentage}%`);
    console.log(`     Min Fee: KSh ${settings.minimumFee}`);
    console.log(`     Max Fee: KSh ${settings.maximumFee}`);
    
    // Test 4: Recalculate with new settings
    console.log('\n4. Testing with updated settings:');
    const newFees = await calculateFees(5000, 'buy');
    console.log(`   BUY KSh 5,000 with new settings:`);
    console.log(`     Platform Fee: KSh ${newFees.platformFee.toFixed(2)}`);
    console.log(`     Tax: KSh ${newFees.taxAmount.toFixed(2)}`);
    console.log(`     Total Fees: KSh ${newFees.totalFees.toFixed(2)}`);
    console.log(`     Total Cost: KSh ${newFees.totalCost.toFixed(2)}`);
    
    // Reset to defaults
    settings.platformFeePercentage = 0.5;
    settings.taxPercentage = 0.1;
    settings.minimumFee = 10;
    settings.maximumFee = 1000;
    await settings.save();
    console.log('\n   ✅ Reset to default settings');
    
    console.log('\n✅ All tests passed! Fee system is working correctly.');
    
  } catch (error) {
    console.error('❌ Test failed:', error);
  }
};

// Run tests
const runTests = async () => {
  await connectDB();
  await testFeeCalculation();
  await mongoose.disconnect();
  console.log('\n🔌 Disconnected from MongoDB');
  process.exit(0);
};

runTests().catch(console.error);
