// utils/feeCalculator.js
// Platform fee and tax calculation utilities
import SystemSettings from "../models/SystemSettings.js";

/**
 * Get fee configuration from database
 * @returns {Object} Fee configuration object
 */
async function getFeeConfiguration() {
  try {
    let settings = await SystemSettings.findOne();
    
    // If no settings exist, create default settings
    if (!settings) {
      settings = new SystemSettings();
      await settings.save();
    }
    
    return {
      platformFeePercentage: settings.platformFeePercentage || 0.5,
      taxPercentage: settings.taxPercentage || 0.1,
      minimumFee: settings.minimumFee || 10,
      maximumFee: settings.maximumFee || 1000
    };
  } catch (error) {
    console.error('Error fetching fee configuration:', error);
    // Fallback to default values
    return {
      platformFeePercentage: 0.5,
      taxPercentage: 0.1,
      minimumFee: 10,
      maximumFee: 1000
    };
  }
}

/**
 * Calculate platform fees for a trade
 * @param {number} tradeAmount - The total trade amount (price × quantity)
 * @param {string} tradeType - 'buy' or 'sell'
 * @returns {Object} Fee breakdown object
 */
export async function calculateFees(tradeAmount, tradeType = 'buy') {
  // Get fee configuration from database
  const feeConfig = await getFeeConfiguration();
  const PLATFORM_FEE_PERCENTAGE = feeConfig.platformFeePercentage;
  const TAX_PERCENTAGE = feeConfig.taxPercentage;
  const MINIMUM_FEE = feeConfig.minimumFee;
  const MAXIMUM_FEE = feeConfig.maximumFee;

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
 * Get current fee configuration (synchronous version for API responses)
 * @returns {Object} Current fee settings
 */
export async function getCurrentFeeConfiguration() {
  return await getFeeConfiguration();
}

/**
 * Get fee configuration synchronously (cached version)
 * This should be used when you need immediate access to fee config
 * @returns {Object} Current fee settings
 */
export function getFeeConfigurationSync() {
  // This is a fallback for cases where we can't use async
  // In production, you might want to implement caching here
  return {
    platformFeePercentage: 0.5,
    taxPercentage: 0.1,
    minimumFee: 10,
    maximumFee: 1000
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
