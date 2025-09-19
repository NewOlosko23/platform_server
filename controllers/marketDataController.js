// controllers/marketDataController.js
import Stock from '../models/Stock.js';
import MarketIndex from '../models/MarketIndex.js';
import TopPerformers from '../models/TopPerformers.js';

// Get market overview data from database
export const getMarketOverview = async (req, res) => {
  try {
    // Get latest data from all collections
    const [marketIndex, topGainers, topLosers, latestStocks] = await Promise.all([
      MarketIndex.findOne().sort({ scrapedAt: -1 }),
      TopPerformers.find({ type: 'gainers' }).sort({ scrapedAt: -1, rank: 1 }).limit(10),
      TopPerformers.find({ type: 'losers' }).sort({ scrapedAt: -1, rank: 1 }).limit(10),
      Stock.find().sort({ scrapedAt: -1 }).limit(50)
    ]);
    
    res.json({
      success: true,
      data: {
        marketIndex,
        topGainers: {
          count: topGainers.length,
          data: topGainers
        },
        topLosers: {
          count: topLosers.length,
          data: topLosers
        },
        latestStocks: {
          count: latestStocks.length,
          data: latestStocks
        },
        lastUpdated: new Date()
      }
    });
    
  } catch (error) {
    console.error('Error fetching market overview:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Failed to fetch market overview'
    });
  }
};

// Get stock news (placeholder - will be implemented when news scraping is added)
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

    // TODO: Implement news scraping and storage
    // For now, return empty data
    res.json({
      success: true,
      data: {
        symbol: symbol.toUpperCase(),
        news: [],
        count: 0,
        message: 'News scraping not yet implemented'
      }
    });
    
  } catch (error) {
    console.error('Error fetching stock news:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Failed to fetch stock news'
    });
  }
};

// Get stock time series data from database
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

    // Get historical stock data from database
    const stockHistory = await Stock.find({ 
      ticker: new RegExp("^" + symbol + "$", "i") 
    })
    .sort({ scrapedAt: -1 })
    .limit(100); // Get last 100 records

    // Transform data to match expected format
    const timeSeriesData = {
      symbol: symbol.toUpperCase(),
      period: period,
      interval: interval,
      data: stockHistory.map(stock => ({
        timestamp: stock.scrapedAt,
        open: stock.price,
        high: stock.dayHigh || stock.price,
        low: stock.dayLow || stock.price,
        close: stock.price,
        volume: stock.volume
      })),
      count: stockHistory.length,
      timestamp: new Date().toISOString()
    };
    
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

// Get currency time series data (placeholder - will be implemented when currency scraping is added)
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

    // TODO: Implement currency scraping and storage
    // For now, return empty data
    res.json({
      success: true,
      data: {
        fromCurrency: fromCurrency.toUpperCase(),
        toCurrency: toCurrency.toUpperCase(),
        period: period,
        interval: interval,
        data: [],
        count: 0,
        message: 'Currency scraping not yet implemented'
      }
    });
    
  } catch (error) {
    console.error('Error fetching currency time series:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Failed to fetch currency time series'
    });
  }
};

// Get currency news (placeholder - will be implemented when news scraping is added)
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

    // TODO: Implement currency news scraping and storage
    // For now, return empty data
    res.json({
      success: true,
      data: {
        currency: currency.toUpperCase(),
        news: [],
        count: 0,
        message: 'Currency news scraping not yet implemented'
      }
    });
    
  } catch (error) {
    console.error('Error fetching currency news:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Failed to fetch currency news'
    });
  }
};

// Get market trends from database
export const getMarketTrends = async (req, res) => {
  try {
    const { market = 'NSE' } = req.query;
    const { limit = 20 } = req.query;
    
    const numericLimit = parseInt(limit);
    if (isNaN(numericLimit) || numericLimit <= 0 || numericLimit > 100) {
      return res.status(400).json({
        success: false,
        message: 'Limit must be a positive number between 1 and 100'
      });
    }

    // Get top gainers and losers as market trends
    const [topGainers, topLosers] = await Promise.all([
      TopPerformers.find({ type: 'gainers' }).sort({ scrapedAt: -1, rank: 1 }).limit(numericLimit / 2),
      TopPerformers.find({ type: 'losers' }).sort({ scrapedAt: -1, rank: 1 }).limit(numericLimit / 2)
    ]);

    const trendsData = {
      market: market,
      trends: [
        ...topGainers.map(gainer => ({
          symbol: gainer.ticker,
          change: gainer.change,
          changePercent: gainer.changePercent,
          price: gainer.price,
          type: 'gain'
        })),
        ...topLosers.map(loser => ({
          symbol: loser.ticker,
          change: loser.change,
          changePercent: loser.changePercent,
          price: loser.price,
          type: 'loss'
        }))
      ],
      count: topGainers.length + topLosers.length,
      timestamp: new Date().toISOString()
    };
    
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

// Get company overview (placeholder - will be implemented when company info scraping is added)
export const getCompanyOverview = async (req, res) => {
  try {
    const { symbol } = req.params;
    
    if (!symbol) {
      return res.status(400).json({
        success: false,
        message: 'Stock symbol parameter is required'
      });
    }

    // Get latest stock data as basic company info
    const stockData = await Stock.findOne({ 
      ticker: new RegExp("^" + symbol + "$", "i") 
    }).sort({ scrapedAt: -1 });

    if (!stockData) {
      return res.status(404).json({
        success: false,
        message: 'Company data not found'
      });
    }

    const companyData = {
      symbol: symbol.toUpperCase(),
      overview: {
        name: stockData.name,
        currentPrice: stockData.price,
        change: stockData.change,
        changePercent: stockData.changePercent,
        volume: stockData.volume,
        marketCap: stockData.marketCap,
        dayHigh: stockData.dayHigh,
        dayLow: stockData.dayLow,
        open: stockData.open,
        previousClose: stockData.previousClose
      },
      timestamp: new Date().toISOString()
    };
    
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
