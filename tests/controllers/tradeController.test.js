import request from 'supertest';
import express from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import User from '../../models/User.js';
import Trade from '../../models/Trade.js';
import tradeRoutes from '../../routes/tradeRoutes.js';
import authMiddleware from '../../middleware/authMiddleware.js';

const app = express();
app.use(express.json());
app.use('/api/trades', authMiddleware, tradeRoutes);

describe('Trade Controller', () => {
  let authToken;
  let userId;

  beforeEach(async () => {
    await User.deleteMany({});
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

  describe('POST /api/trades', () => {
    it('should create a buy trade', async () => {
      const tradeData = {
        symbol: 'AAPL',
        type: 'buy',
        quantity: 10,
        price: 150.00,
        totalValue: 1500.00
      };

      const response = await request(app)
        .post('/api/trades')
        .set('Authorization', `Bearer ${authToken}`)
        .send(tradeData)
        .expect(201);

      expect(response.body.success).toBe(true);
      expect(response.body.message).toBe('Trade created successfully');
      expect(response.body.data.symbol).toBe(tradeData.symbol);
      expect(response.body.data.type).toBe(tradeData.type);
      expect(response.body.data.quantity).toBe(tradeData.quantity);
      expect(response.body.data.price).toBe(tradeData.price);
      expect(response.body.data.totalValue).toBe(tradeData.totalValue);
    });

    it('should create a sell trade', async () => {
      const tradeData = {
        symbol: 'AAPL',
        type: 'sell',
        quantity: 5,
        price: 175.00,
        totalValue: 875.00
      };

      const response = await request(app)
        .post('/api/trades')
        .set('Authorization', `Bearer ${authToken}`)
        .send(tradeData)
        .expect(201);

      expect(response.body.success).toBe(true);
      expect(response.body.data.type).toBe('sell');
    });

    it('should validate required fields', async () => {
      const response = await request(app)
        .post('/api/trades')
        .set('Authorization', `Bearer ${authToken}`)
        .send({})
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toContain('required');
    });

    it('should validate trade type', async () => {
      const tradeData = {
        symbol: 'AAPL',
        type: 'invalid',
        quantity: 10,
        price: 150.00,
        totalValue: 1500.00
      };

      const response = await request(app)
        .post('/api/trades')
        .set('Authorization', `Bearer ${authToken}`)
        .send(tradeData)
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toContain('type');
    });

    it('should validate quantity is positive', async () => {
      const tradeData = {
        symbol: 'AAPL',
        type: 'buy',
        quantity: -10,
        price: 150.00,
        totalValue: 1500.00
      };

      const response = await request(app)
        .post('/api/trades')
        .set('Authorization', `Bearer ${authToken}`)
        .send(tradeData)
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toContain('quantity');
    });

    it('should require authentication', async () => {
      const tradeData = {
        symbol: 'AAPL',
        type: 'buy',
        quantity: 10,
        price: 150.00,
        totalValue: 1500.00
      };

      const response = await request(app)
        .post('/api/trades')
        .send(tradeData)
        .expect(401);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toBe('Access denied. No token provided.');
    });
  });

  describe('GET /api/trades', () => {
    beforeEach(async () => {
      // Create test trades
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
          symbol: 'GOOGL',
          type: 'sell',
          quantity: 5,
          price: 2800.00,
          totalValue: 14000.00,
          timestamp: new Date('2024-01-02')
        }
      ]);
    });

    it('should get user trades', async () => {
      const response = await request(app)
        .get('/api/trades')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.trades).toHaveLength(2);
      expect(response.body.data.totalTrades).toBe(2);
    });

    it('should filter trades by type', async () => {
      const response = await request(app)
        .get('/api/trades?type=buy')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.trades).toHaveLength(1);
      expect(response.body.data.trades[0].type).toBe('buy');
    });

    it('should filter trades by symbol', async () => {
      const response = await request(app)
        .get('/api/trades?symbol=AAPL')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.trades).toHaveLength(1);
      expect(response.body.data.trades[0].symbol).toBe('AAPL');
    });

    it('should require authentication', async () => {
      const response = await request(app)
        .get('/api/trades')
        .expect(401);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toBe('Access denied. No token provided.');
    });
  });

  describe('GET /api/trades/:id', () => {
    let tradeId;

    beforeEach(async () => {
      const trade = await Trade.create({
        userId,
        symbol: 'AAPL',
        type: 'buy',
        quantity: 10,
        price: 150.00,
        totalValue: 1500.00
      });
      tradeId = trade._id;
    });

    it('should get specific trade', async () => {
      const response = await request(app)
        .get(`/api/trades/${tradeId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data._id).toBe(tradeId.toString());
      expect(response.body.data.symbol).toBe('AAPL');
    });

    it('should not get trade from different user', async () => {
      // Create another user and trade
      const hashedPassword = await bcrypt.hash('password123', 10);
      const otherUser = await User.create({
        firstName: 'Jane',
        lastName: 'Doe',
        email: 'jane.doe@example.com',
        password: hashedPassword
      });

      const otherTrade = await Trade.create({
        userId: otherUser._id,
        symbol: 'GOOGL',
        type: 'buy',
        quantity: 5,
        price: 2800.00,
        totalValue: 14000.00
      });

      const response = await request(app)
        .get(`/api/trades/${otherTrade._id}`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(404);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toBe('Trade not found');
    });

    it('should handle invalid trade ID', async () => {
      const response = await request(app)
        .get('/api/trades/invalid-id')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toContain('Invalid trade ID');
    });
  });

  describe('PUT /api/trades/:id', () => {
    let tradeId;

    beforeEach(async () => {
      const trade = await Trade.create({
        userId,
        symbol: 'AAPL',
        type: 'buy',
        quantity: 10,
        price: 150.00,
        totalValue: 1500.00
      });
      tradeId = trade._id;
    });

    it('should update trade', async () => {
      const updateData = {
        quantity: 15,
        price: 160.00,
        totalValue: 2400.00
      };

      const response = await request(app)
        .put(`/api/trades/${tradeId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .send(updateData)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.message).toBe('Trade updated successfully');
      expect(response.body.data.quantity).toBe(15);
      expect(response.body.data.price).toBe(160.00);
      expect(response.body.data.totalValue).toBe(2400.00);
    });

    it('should not update trade from different user', async () => {
      // Create another user and trade
      const hashedPassword = await bcrypt.hash('password123', 10);
      const otherUser = await User.create({
        firstName: 'Jane',
        lastName: 'Doe',
        email: 'jane.doe@example.com',
        password: hashedPassword
      });

      const otherTrade = await Trade.create({
        userId: otherUser._id,
        symbol: 'GOOGL',
        type: 'buy',
        quantity: 5,
        price: 2800.00,
        totalValue: 14000.00
      });

      const updateData = { quantity: 10 };

      const response = await request(app)
        .put(`/api/trades/${otherTrade._id}`)
        .set('Authorization', `Bearer ${authToken}`)
        .send(updateData)
        .expect(404);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toBe('Trade not found');
    });
  });

  describe('DELETE /api/trades/:id', () => {
    let tradeId;

    beforeEach(async () => {
      const trade = await Trade.create({
        userId,
        symbol: 'AAPL',
        type: 'buy',
        quantity: 10,
        price: 150.00,
        totalValue: 1500.00
      });
      tradeId = trade._id;
    });

    it('should delete trade', async () => {
      const response = await request(app)
        .delete(`/api/trades/${tradeId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.message).toBe('Trade deleted successfully');

      // Verify trade is deleted
      const deletedTrade = await Trade.findById(tradeId);
      expect(deletedTrade).toBeNull();
    });

    it('should not delete trade from different user', async () => {
      // Create another user and trade
      const hashedPassword = await bcrypt.hash('password123', 10);
      const otherUser = await User.create({
        firstName: 'Jane',
        lastName: 'Doe',
        email: 'jane.doe@example.com',
        password: hashedPassword
      });

      const otherTrade = await Trade.create({
        userId: otherUser._id,
        symbol: 'GOOGL',
        type: 'buy',
        quantity: 5,
        price: 2800.00,
        totalValue: 14000.00
      });

      const response = await request(app)
        .delete(`/api/trades/${otherTrade._id}`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(404);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toBe('Trade not found');
    });
  });
});
