// routes/marketDataRoutes.js
import express from 'express';
import { 
  getStockNews, 
  getStockTimeSeries, 
  getCurrencyTimeSeries, 
  getCurrencyNews, 
  getMarketTrends, 
  getCompanyOverview 
} from '../controllers/marketDataController.js';

const router = express.Router();

// Stock News
// GET /api/market/stock-news/AAPL?limit=10
router.get('/stock-news/:symbol', getStockNews);

// Stock Time Series
// GET /api/market/stock-timeseries/AAPL?period=1d&interval=1h
router.get('/stock-timeseries/:symbol', getStockTimeSeries);

// Currency Time Series
// GET /api/market/currency-timeseries/USD/EUR?period=1d&interval=1h
router.get('/currency-timeseries/:fromCurrency/:toCurrency', getCurrencyTimeSeries);

// Currency News
// GET /api/market/currency-news/USD?limit=10
router.get('/currency-news/:currency', getCurrencyNews);

// Market Trends
// GET /api/market/trends?market=US&limit=20
router.get('/trends', getMarketTrends);

// Company Overview
// GET /api/market/company-overview/AAPL
router.get('/company-overview/:symbol', getCompanyOverview);

export default router;
