// controllers/currencyController.js
import { fetchExchangeRate, fetchMultipleExchangeRates } from '../utils/stockApi.js';

// Get exchange rate for a single currency pair
export const getExchangeRate = async (req, res) => {
  try {
    const { fromCurrency, toCurrency } = req.params;
    
    if (!fromCurrency || !toCurrency) {
      return res.status(400).json({
        success: false,
        message: 'Both fromCurrency and toCurrency parameters are required'
      });
    }

    const exchangeData = await fetchExchangeRate(fromCurrency, toCurrency);
    
    res.json({
      success: true,
      data: exchangeData
    });
    
  } catch (error) {
    console.error('Error fetching exchange rate:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Failed to fetch exchange rate'
    });
  }
};

// Get exchange rates for multiple currency pairs from a base currency
export const getMultipleExchangeRates = async (req, res) => {
  try {
    const { baseCurrency } = req.params;
    const { currencies } = req.query;
    
    if (!baseCurrency) {
      return res.status(400).json({
        success: false,
        message: 'baseCurrency parameter is required'
      });
    }

    if (!currencies) {
      return res.status(400).json({
        success: false,
        message: 'currencies query parameter is required (comma-separated list)'
      });
    }

    const targetCurrencies = currencies.split(',').map(curr => curr.trim());
    
    if (targetCurrencies.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'At least one target currency is required'
      });
    }

    const exchangeData = await fetchMultipleExchangeRates(baseCurrency, targetCurrencies);
    
    res.json({
      success: true,
      data: exchangeData
    });
    
  } catch (error) {
    console.error('Error fetching multiple exchange rates:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Failed to fetch exchange rates'
    });
  }
};

// Get exchange rate with amount conversion
export const convertCurrency = async (req, res) => {
  try {
    const { fromCurrency, toCurrency, amount } = req.params;
    
    if (!fromCurrency || !toCurrency || !amount) {
      return res.status(400).json({
        success: false,
        message: 'fromCurrency, toCurrency, and amount parameters are required'
      });
    }

    const numericAmount = parseFloat(amount);
    if (isNaN(numericAmount) || numericAmount <= 0) {
      return res.status(400).json({
        success: false,
        message: 'Amount must be a positive number'
      });
    }

    const exchangeData = await fetchExchangeRate(fromCurrency, toCurrency);
    const convertedAmount = numericAmount * exchangeData.exchangeRate;
    
    res.json({
      success: true,
      data: {
        fromCurrency: exchangeData.fromCurrency,
        toCurrency: exchangeData.toCurrency,
        originalAmount: numericAmount,
        exchangeRate: exchangeData.exchangeRate,
        convertedAmount: convertedAmount,
        timestamp: exchangeData.timestamp
      }
    });
    
  } catch (error) {
    console.error('Error converting currency:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Failed to convert currency'
    });
  }
};
