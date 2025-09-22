# Platform Fees and Taxes System

## Overview

The platform implements a comprehensive fee and tax system that generates revenue from both buy and sell transactions. This system is designed to be transparent, configurable, and fair to users while providing a sustainable revenue model for the platform.

## Fee Structure

### Current Fee Configuration (Default)
- **Platform Fee**: 0.5% of trade amount
- **Tax**: 0.1% of trade amount
- **Minimum Fee**: KSh 10
- **Maximum Fee**: KSh 1,000

### How Fees Work

#### For BUY Orders:
- User pays: `Stock Price × Quantity + Platform Fee + Tax`
- Platform gains: `Platform Fee + Tax`
- User's balance decreases by the total amount

#### For SELL Orders:
- User receives: `Stock Price × Quantity - Platform Fee - Tax`
- Platform gains: `Platform Fee + Tax`
- User's balance increases by the net amount (after fees)

## Configuration

### Admin Dashboard Configuration

Fee settings are now configurable through the admin dashboard at `/dashboard/admin/settings`. The admin can set:

- **Platform Fee Percentage**: 0-10% (default: 0.5%)
- **Tax Percentage**: 0-5% (default: 0.1%)
- **Minimum Fee**: KSh amount (default: 10)
- **Maximum Fee**: KSh amount (default: 1000)

### Database Storage

Fee configuration is stored in the `SystemSettings` collection and automatically applied to all trades. Changes take effect immediately without requiring server restart.

### Fee Calculation Logic

```javascript
// Example for a KSh 5,000 trade
const tradeAmount = 5000;
const platformFee = Math.max(
  Math.min(tradeAmount * 0.005, 1000), // 0.5% with max KSh 1,000
  10 // minimum KSh 10
); // = KSh 25

const taxAmount = tradeAmount * 0.001; // 0.1% = KSh 5
const totalFees = platformFee + taxAmount; // KSh 30

// For BUY: User pays KSh 5,030 (5,000 + 30)
// For SELL: User receives KSh 4,970 (5,000 - 30)
// Platform gains: KSh 30
```

## Database Schema

### Trade Model Updates

The `Trade` model now includes fee tracking fields:

```javascript
{
  // ... existing fields
  platformFee: Number,        // Platform fee amount
  taxAmount: Number,          // Tax amount
  totalFees: Number,          // Total fees (platform + tax)
  netAmount: Number,          // Amount after fees
  feeBreakdown: {
    platformFeePercentage: Number,
    taxPercentage: Number,
    platformFee: Number,
    taxAmount: Number,
    totalFees: Number
  }
}
```

## API Endpoints

### Admin Fee Settings Management

**GET** `/api/admin/fee-settings`
- Get current fee configuration
- Requires admin authentication

**PUT** `/api/admin/fee-settings`
- Update fee configuration
- Requires admin authentication
- Body: `{ platformFeePercentage, taxPercentage, minimumFee, maximumFee }`

### Get Trade Fees

**GET** `/api/trades/fees`

Query Parameters:
- `symbol`: Stock symbol (required)
- `quantity`: Number of shares (required)
- `type`: 'buy' or 'sell' (required)

Response:
```json
{
  "success": true,
  "data": {
    "symbol": "SCOM",
    "quantity": 100,
    "type": "buy",
    "price": 25.50,
    "tradeAmount": 2550,
    "fees": {
      "platformFee": 12.75,
      "taxAmount": 2.55,
      "totalFees": 15.30,
      "feeBreakdown": {
        "platformFeePercentage": 0.5,
        "taxPercentage": 0.1,
        "platformFee": 12.75,
        "taxAmount": 2.55,
        "totalFees": 15.30
      }
    },
    "netAmount": 2534.70,
    "totalCost": 2565.30,
    "platformRevenue": 15.30
  }
}
```

### Updated Trade Endpoints

Both `/api/trades/buy` and `/api/trades/sell` now return fee information in their responses:

```json
{
  "success": true,
  "message": "Successfully bought 100 shares of SCOM at KSh 25.50 per share",
  "data": {
    "trade": { /* trade details */ },
    "fees": {
      "platformFee": 12.75,
      "taxAmount": 2.55,
      "totalFees": 15.30,
      "feeBreakdown": { /* detailed breakdown */ }
    },
    "user": { /* user balance info */ },
    "portfolio": { /* portfolio info */ },
    "platformRevenue": 15.30
  }
}
```

## Frontend Integration

### Trade Component

The trade component now shows:
- Real-time fee calculation
- Detailed fee breakdown
- Total cost including fees (for buys)
- Net proceeds after fees (for sells)
- Balance validation including fees

### Portfolio Component

The portfolio component displays:
- Total fees paid across all trades
- Fee information in transaction history
- Net amounts in transaction details

## Revenue Tracking

### Platform Revenue Calculation

The platform tracks revenue through:
- `getPlatformRevenue(feeData)` function
- Fee data stored in trade records
- Total fees paid displayed in portfolio

### Revenue Analytics (Future Enhancement)

Consider implementing:
- Daily/monthly revenue reports
- Fee collection analytics
- User fee payment tracking
- Revenue optimization insights

## Best Practices

### Fee Transparency
- Always show fee breakdown before trade execution
- Display total cost including fees
- Provide clear fee explanations

### User Experience
- Calculate fees in real-time
- Validate sufficient balance including fees
- Show fee impact on returns

### Configuration Management
- Use environment variables for easy fee adjustment
- Implement fee validation (min/max limits)
- Consider different fee structures for different user tiers

## Testing

### Test Scenarios

1. **Buy Order with Fees**
   - Verify total cost includes fees
   - Check balance deduction includes fees
   - Validate fee calculation accuracy

2. **Sell Order with Fees**
   - Verify net proceeds after fees
   - Check balance addition is net amount
   - Validate fee calculation accuracy

3. **Edge Cases**
   - Minimum fee application
   - Maximum fee capping
   - Zero quantity trades
   - Invalid stock symbols

### Example Test Cases

```javascript
// Test minimum fee
const smallTrade = calculateFees(100, 'buy'); // KSh 100 trade
// Should apply minimum fee of KSh 10

// Test maximum fee
const largeTrade = calculateFees(500000, 'buy'); // KSh 500,000 trade
// Should cap at maximum fee of KSh 1,000

// Test normal fee
const normalTrade = calculateFees(10000, 'buy'); // KSh 10,000 trade
// Should calculate 0.5% + 0.1% = KSh 60 total fees
```

## Future Enhancements

### Potential Improvements

1. **Tiered Fee Structure**
   - Different fees for different user levels
   - Volume-based fee discounts
   - Premium user benefits

2. **Dynamic Fee Adjustment**
   - Market-based fee adjustments
   - Time-based fee variations
   - Promotional fee periods

3. **Advanced Analytics**
   - Fee collection reports
   - User fee payment patterns
   - Revenue optimization insights

4. **Fee Management Dashboard**
   - Admin interface for fee configuration
   - Real-time fee monitoring
   - Fee adjustment controls

## Support

For questions or issues related to the fee system:
1. Check the fee calculation logic in `utils/feeCalculator.js`
2. Verify environment variable configuration
3. Review trade controller implementations
4. Test with the fee calculation endpoint

## Version History

- **v1.0.0**: Initial fee system implementation
  - Basic platform fee and tax structure
  - Real-time fee calculation
  - Frontend fee display
  - Database fee tracking
