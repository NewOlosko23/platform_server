import request from 'supertest';
import express from 'express';
import marketDataRoutes from '../../routes/marketDataRoutes.js';

const app = express();
app.use(express.json());
app.use('/api/market', marketDataRoutes);

describe('Market Data Controller', () => {
  describe('GET /api/market/stock-news/:symbol', () => {
    it('should get stock news for valid symbol', async () => {
      const response = await request(app)
        .get('/api/market/stock-news/AAPL?limit=5')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.symbol).toBe('AAPL');
      expect(response.body.data.news).toBeDefined();
      expect(Array.isArray(response.body.data.news)).toBe(true);
    });

    it('should handle invalid stock symbol', async () => {
      const response = await request(app)
        .get('/api/market/stock-news/INVALID?limit=5')
        .expect(404);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toContain('not found');
    });

    it('should respect limit parameter', async () => {
      const response = await request(app)
        .get('/api/market/stock-news/AAPL?limit=3')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.news.length).toBeLessThanOrEqual(3);
    });
  });

  describe('GET /api/market/stock-timeseries/:symbol', () => {
    it('should get stock time series data', async () => {
      const response = await request(app)
        .get('/api/market/stock-timeseries/AAPL?period=1mo&interval=1d')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.symbol).toBe('AAPL');
      expect(response.body.data.timeseries).toBeDefined();
      expect(Array.isArray(response.body.data.timeseries)).toBe(true);
    });

    it('should handle different periods', async () => {
      const periods = ['1d', '5d', '1mo', '3mo', '6mo', '1y'];
      
      for (const period of periods) {
        const response = await request(app)
          .get(`/api/market/stock-timeseries/AAPL?period=${period}`)
          .expect(200);

        expect(response.body.success).toBe(true);
        expect(response.body.data.period).toBe(period);
      }
    });
  });

  describe('GET /api/market/currency-timeseries/:fromCurrency/:toCurrency', () => {
    it('should get currency time series data', async () => {
      const response = await request(app)
        .get('/api/market/currency-timeseries/USD/EUR?period=1mo&interval=1d')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.fromCurrency).toBe('USD');
      expect(response.body.data.toCurrency).toBe('EUR');
      expect(response.body.data.timeseries).toBeDefined();
      expect(Array.isArray(response.body.data.timeseries)).toBe(true);
    });

    it('should handle different currency pairs', async () => {
      const currencyPairs = [
        ['USD', 'EUR'],
        ['USD', 'GBP'],
        ['USD', 'JPY'],
        ['EUR', 'GBP']
      ];

      for (const [from, to] of currencyPairs) {
        const response = await request(app)
          .get(`/api/market/currency-timeseries/${from}/${to}?period=1mo`)
          .expect(200);

        expect(response.body.success).toBe(true);
        expect(response.body.data.fromCurrency).toBe(from);
        expect(response.body.data.toCurrency).toBe(to);
      }
    });
  });

  describe('GET /api/market/currency-news/:currency', () => {
    it('should get currency news', async () => {
      const response = await request(app)
        .get('/api/market/currency-news/USD?limit=5')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.currency).toBe('USD');
      expect(response.body.data.news).toBeDefined();
      expect(Array.isArray(response.body.data.news)).toBe(true);
    });
  });

  describe('GET /api/market/trends', () => {
    it('should get market trends', async () => {
      const response = await request(app)
        .get('/api/market/trends?market=US&limit=10')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.market).toBe('US');
      expect(response.body.data.trends).toBeDefined();
      expect(Array.isArray(response.body.data.trends)).toBe(true);
    });

    it('should handle different markets', async () => {
      const markets = ['US', 'EU', 'ASIA'];
      
      for (const market of markets) {
        const response = await request(app)
          .get(`/api/market/trends?market=${market}&limit=5`)
          .expect(200);

        expect(response.body.success).toBe(true);
        expect(response.body.data.market).toBe(market);
      }
    });
  });

  describe('GET /api/market/company-overview/:symbol', () => {
    it('should get company overview', async () => {
      const response = await request(app)
        .get('/api/market/company-overview/AAPL')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.symbol).toBe('AAPL');
      expect(response.body.data.companyName).toBeDefined();
      expect(response.body.data.description).toBeDefined();
    });

    it('should handle invalid company symbol', async () => {
      const response = await request(app)
        .get('/api/market/company-overview/INVALID')
        .expect(404);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toContain('not found');
    });
  });
});
