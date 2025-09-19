import request from 'supertest';
import express from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import User from '../../models/User.js';
import Portfolio from '../../models/Portfolio.js';
import Trade from '../../models/Trade.js';
import portfolioRoutes from '../../routes/portfolioRoutes.js';
import authMiddleware from '../../middleware/authMiddleware.js';

const app = express();
app.use(express.json());
app.use('/api/portfolio', authMiddleware, portfolioRoutes);

describe('Portfolio Controller', () => {
  let authToken;
  let userId;

  beforeEach(async () => {
    await User.deleteMany({});
    await Portfolio.deleteMany({});
    await Trade.deleteMany({});

    // Create test user
    const hashedPassword = await bcrypt.hash('password123', 10);
    const user = await User.create({
      firstName: 'John',
      lastName: 'Doe',
      email: 'john.doe@example.com',
      password: hashedPassword
    });

    userId = user._id;
    authToken = jwt.sign({ userId: user._id }, process.env.JWT_SECRET || 'test-secret');
  });

  describe('GET /api/portfolio', () => {
    it('should get user portfolio', async () => {
      // Create portfolio data
      await Portfolio.create({
        userId,
        holdings: [
          {
            symbol: 'AAPL',
            quantity: 10,
            averagePrice: 150.00,
            currentPrice: 175.00
          }
        ],
        totalValue: 1750.00,
        totalCost: 1500.00,
        totalGainLoss: 250.00,
        totalGainLossPercent: 16.67
      });

      const response = await request(app)
        .get('/api/portfolio')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.holdings).toHaveLength(1);
      expect(response.body.data.holdings[0].symbol).toBe('AAPL');
      expect(response.body.data.totalValue).toBe(1750.00);
    });

    it('should return empty portfolio for new user', async () => {
      const response = await request(app)
        .get('/api/portfolio')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.holdings).toHaveLength(0);
      expect(response.body.data.totalValue).toBe(0);
    });

    it('should require authentication', async () => {
      const response = await request(app)
        .get('/api/portfolio')
        .expect(401);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toBe('Access denied. No token provided.');
    });
  });

  describe('GET /api/portfolio/summary', () => {
    it('should get portfolio summary', async () => {
      // Create portfolio data
      await Portfolio.create({
        userId,
        holdings: [
          {
            symbol: 'AAPL',
            quantity: 10,
            averagePrice: 150.00,
            currentPrice: 175.00
          }
        ],
        totalValue: 1750.00,
        totalCost: 1500.00,
        totalGainLoss: 250.00,
        totalGainLossPercent: 16.67
      });

      const response = await request(app)
        .get('/api/portfolio/summary')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.totalValue).toBe(1750.00);
      expect(response.body.data.totalGainLoss).toBe(250.00);
      expect(response.body.data.totalGainLossPercent).toBe(16.67);
    });
  });

  describe('GET /api/portfolio/performance', () => {
    it('should get portfolio performance data', async () => {
      // Create trade history
      await Trade.create([
        {
          userId,
          symbol: 'AAPL',
          type: 'buy',
          quantity: 10,
          price: 150.00,
          totalValue: 1500.00,
          timestamp: new Date('2024-01-01')
        },
        {
          userId,
          symbol: 'AAPL',
          type: 'sell',
          quantity: 5,
          price: 175.00,
          totalValue: 875.00,
          timestamp: new Date('2024-01-15')
        }
      ]);

      const response = await request(app)
        .get('/api/portfolio/performance')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.trades).toHaveLength(2);
      expect(response.body.data.totalTrades).toBe(2);
    });
  });
});
