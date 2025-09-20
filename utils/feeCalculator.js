// utils/feeCalculator.js
// Platform fee and tax calculation utilities

/**
 * Calculate platform fees for a trade
 * @param {number} tradeAmount - The total trade amount (price × quantity)
 * @param {string} tradeType - 'buy' or 'sell'
 * @returns {Object} Fee breakdown object
 */
export function calculateFees(tradeAmount, tradeType = 'buy') {
  // Get fee configuration from environment variables
  const PLATFORM_FEE_PERCENTAGE = parseFloat(process.env.PLATFORM_FEE_PERCENTAGE) || 0.5; // 0.5% default
  const TAX_PERCENTAGE = parseFloat(process.env.TAX_PERCENTAGE) || 0.1; // 0.1% default
  const MINIMUM_FEE = parseFloat(process.env.MINIMUM_FEE) || 10; // KSh 10 minimum
  const MAXIMUM_FEE = parseFloat(process.env.MAXIMUM_FEE) || 1000; // KSh 1000 maximum

  // Calculate platform fee
  const platformFee = Math.max(
    Math.min(tradeAmount * (PLATFORM_FEE_PERCENTAGE / 100), MAXIMUM_FEE),
    MINIMUM_FEE
  );

  // Calculate tax
  const taxAmount = tradeAmount * (TAX_PERCENTAGE / 100);

  // Total fees
  const totalFees = platformFee + taxAmount;

  // Calculate net amounts based on trade type
  let netAmount, totalCost;
  if (tradeType === 'buy') {
    // For buy orders: user pays trade amount + fees
    totalCost = tradeAmount + totalFees;
    netAmount = totalCost;
  } else {
    // For sell orders: user receives trade amount - fees
    netAmount = tradeAmount - totalFees;
    totalCost = tradeAmount;
  }

  return {
    tradeAmount: tradeAmount,
    platformFee: platformFee,
    taxAmount: taxAmount,
    totalFees: totalFees,
    netAmount: netAmount,
    totalCost: totalCost,
    feeBreakdown: {
      platformFeePercentage: PLATFORM_FEE_PERCENTAGE,
      taxPercentage: TAX_PERCENTAGE,
      platformFee: platformFee,
      taxAmount: taxAmount,
      totalFees: totalFees
    }
  };
}

/**
 * Get current fee configuration
 * @returns {Object} Current fee settings
 */
export function getFeeConfiguration() {
  return {
    platformFeePercentage: parseFloat(process.env.PLATFORM_FEE_PERCENTAGE) || 0.5,
    taxPercentage: parseFloat(process.env.TAX_PERCENTAGE) || 0.1,
    minimumFee: parseFloat(process.env.MINIMUM_FEE) || 10,
    maximumFee: parseFloat(process.env.MAXIMUM_FEE) || 1000
  };
}

/**
 * Format fee information for display
 * @param {Object} feeData - Fee calculation result
 * @param {string} tradeType - 'buy' or 'sell'
 * @returns {Object} Formatted fee information
 */
export function formatFeeInfo(feeData, tradeType) {
  const { tradeAmount, platformFee, taxAmount, totalFees, netAmount, totalCost } = feeData;

  if (tradeType === 'buy') {
    return {
      tradeAmount: tradeAmount,
      platformFee: platformFee,
      taxAmount: taxAmount,
      totalFees: totalFees,
      totalCost: totalCost,
      userPays: totalCost,
      platformGains: totalFees,
      message: `Total cost: KSh ${totalCost.toLocaleString()} (including KSh ${totalFees.toLocaleString()} in fees)`
    };
  } else {
    return {
      tradeAmount: tradeAmount,
      platformFee: platformFee,
      taxAmount: taxAmount,
      totalFees: totalFees,
      netAmount: netAmount,
      userReceives: netAmount,
      platformGains: totalFees,
      message: `You'll receive: KSh ${netAmount.toLocaleString()} (after KSh ${totalFees.toLocaleString()} in fees)`
    };
  }
}

/**
 * Validate if user has sufficient balance for buy order with fees
 * @param {number} userBalance - User's current balance
 * @param {Object} feeData - Fee calculation result
 * @returns {Object} Validation result
 */
export function validateBuyOrder(userBalance, feeData) {
  const { totalCost } = feeData;
  const hasSufficientBalance = userBalance >= totalCost;
  
  return {
    hasSufficientBalance: hasSufficientBalance,
    requiredAmount: totalCost,
    availableBalance: userBalance,
    shortfall: hasSufficientBalance ? 0 : totalCost - userBalance,
    message: hasSufficientBalance 
      ? 'Sufficient balance for this trade'
      : `Insufficient balance. You need KSh ${totalCost.toLocaleString()} but only have KSh ${userBalance.toLocaleString()}`
  };
}

/**
 * Calculate total platform revenue from a trade
 * @param {Object} feeData - Fee calculation result
 * @returns {number} Platform revenue
 */
export function getPlatformRevenue(feeData) {
  return feeData.totalFees;
}
