// routes/currencyRoutes.js
import express from 'express';
import { getExchangeRate, getMultipleExchangeRates, convertCurrency } from '../controllers/currencyController.js';

const router = express.Router();

// Get exchange rate for a single currency pair
// GET /api/currency/rate/USD/EUR
router.get('/rate/:fromCurrency/:toCurrency', getExchangeRate);

// Get multiple exchange rates from a base currency
// GET /api/currency/rates/USD?currencies=EUR,GBP,JPY
router.get('/rates/:baseCurrency', getMultipleExchangeRates);

// Convert currency amount
// GET /api/currency/convert/USD/EUR/100
router.get('/convert/:fromCurrency/:toCurrency/:amount', convertCurrency);

export default router;
