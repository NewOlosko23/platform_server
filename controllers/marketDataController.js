// controllers/marketDataController.js
import { 
  fetchStockNews, 
  fetchStockTimeSeries, 
  fetchCurrencyTimeSeries, 
  fetchCurrencyNews, 
  fetchMarketTrends, 
  fetchCompanyOverview 
} from '../utils/stockApi.js';

// Get stock news
export const getStockNews = async (req, res) => {
  try {
    const { symbol } = req.params;
    const { limit = 10 } = req.query;
    
    if (!symbol) {
      return res.status(400).json({
        success: false,
        message: 'Stock symbol parameter is required'
      });
    }

    const numericLimit = parseInt(limit);
    if (isNaN(numericLimit) || numericLimit <= 0 || numericLimit > 50) {
      return res.status(400).json({
        success: false,
        message: 'Limit must be a positive number between 1 and 50'
      });
    }

    const newsData = await fetchStockNews(symbol, numericLimit);
    
    res.json({
      success: true,
      data: newsData
    });
    
  } catch (error) {
    console.error('Error fetching stock news:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Failed to fetch stock news'
    });
  }
};

// Get stock time series data
export const getStockTimeSeries = async (req, res) => {
  try {
    const { symbol } = req.params;
    const { period = '1d', interval = '1h' } = req.query;
    
    if (!symbol) {
      return res.status(400).json({
        success: false,
        message: 'Stock symbol parameter is required'
      });
    }

    // Validate period and interval
    const validPeriods = ['1d', '5d', '1mo', '3mo', '6mo', '1y', '2y', '5y', '10y', 'ytd', 'max'];
    const validIntervals = ['1m', '2m', '5m', '15m', '30m', '60m', '90m', '1h', '1d', '5d', '1wk', '1mo', '3mo'];
    
    if (!validPeriods.includes(period)) {
      return res.status(400).json({
        success: false,
        message: `Invalid period. Valid options: ${validPeriods.join(', ')}`
      });
    }
    
    if (!validIntervals.includes(interval)) {
      return res.status(400).json({
        success: false,
        message: `Invalid interval. Valid options: ${validIntervals.join(', ')}`
      });
    }

    const timeSeriesData = await fetchStockTimeSeries(symbol, period, interval);
    
    res.json({
      success: true,
      data: timeSeriesData
    });
    
  } catch (error) {
    console.error('Error fetching stock time series:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Failed to fetch stock time series'
    });
  }
};

// Get currency time series data
export const getCurrencyTimeSeries = async (req, res) => {
  try {
    const { fromCurrency, toCurrency } = req.params;
    const { period = '1d', interval = '1h' } = req.query;
    
    if (!fromCurrency || !toCurrency) {
      return res.status(400).json({
        success: false,
        message: 'Both fromCurrency and toCurrency parameters are required'
      });
    }

    // Validate period and interval
    const validPeriods = ['1d', '5d', '1mo', '3mo', '6mo', '1y', '2y', '5y', '10y', 'ytd', 'max'];
    const validIntervals = ['1m', '2m', '5m', '15m', '30m', '60m', '90m', '1h', '1d', '5d', '1wk', '1mo', '3mo'];
    
    if (!validPeriods.includes(period)) {
      return res.status(400).json({
        success: false,
        message: `Invalid period. Valid options: ${validPeriods.join(', ')}`
      });
    }
    
    if (!validIntervals.includes(interval)) {
      return res.status(400).json({
        success: false,
        message: `Invalid interval. Valid options: ${validIntervals.join(', ')}`
      });
    }

    const timeSeriesData = await fetchCurrencyTimeSeries(fromCurrency, toCurrency, period, interval);
    
    res.json({
      success: true,
      data: timeSeriesData
    });
    
  } catch (error) {
    console.error('Error fetching currency time series:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Failed to fetch currency time series'
    });
  }
};

// Get currency news
export const getCurrencyNews = async (req, res) => {
  try {
    const { currency } = req.params;
    const { limit = 10 } = req.query;
    
    if (!currency) {
      return res.status(400).json({
        success: false,
        message: 'Currency parameter is required'
      });
    }

    const numericLimit = parseInt(limit);
    if (isNaN(numericLimit) || numericLimit <= 0 || numericLimit > 50) {
      return res.status(400).json({
        success: false,
        message: 'Limit must be a positive number between 1 and 50'
      });
    }

    const newsData = await fetchCurrencyNews(currency, numericLimit);
    
    res.json({
      success: true,
      data: newsData
    });
    
  } catch (error) {
    console.error('Error fetching currency news:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Failed to fetch currency news'
    });
  }
};

// Get market trends
export const getMarketTrends = async (req, res) => {
  try {
    const { market = 'US' } = req.query;
    const { limit = 20 } = req.query;
    
    const numericLimit = parseInt(limit);
    if (isNaN(numericLimit) || numericLimit <= 0 || numericLimit > 100) {
      return res.status(400).json({
        success: false,
        message: 'Limit must be a positive number between 1 and 100'
      });
    }

    const trendsData = await fetchMarketTrends(market, numericLimit);
    
    res.json({
      success: true,
      data: trendsData
    });
    
  } catch (error) {
    console.error('Error fetching market trends:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Failed to fetch market trends'
    });
  }
};

// Get company overview
export const getCompanyOverview = async (req, res) => {
  try {
    const { symbol } = req.params;
    
    if (!symbol) {
      return res.status(400).json({
        success: false,
        message: 'Stock symbol parameter is required'
      });
    }

    const companyData = await fetchCompanyOverview(symbol);
    
    res.json({
      success: true,
      data: companyData
    });
    
  } catch (error) {
    console.error('Error fetching company overview:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Failed to fetch company overview'
    });
  }
};
