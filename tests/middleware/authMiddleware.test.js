import request from 'supertest';
import express from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import User from '../../models/User.js';
import authMiddleware from '../../middleware/authMiddleware.js';

const app = express();
app.use(express.json());

// Test route that requires authentication
app.get('/protected', authMiddleware, (req, res) => {
  res.json({ success: true, userId: req.userId });
});

describe('Auth Middleware', () => {
  beforeEach(async () => {
    await User.deleteMany({});
  });

  it('should allow access with valid token', async () => {
    // Create test user
    const hashedPassword = await bcrypt.hash('password123', 10);
    const user = await User.create({
      firstName: 'John',
      lastName: 'Doe',
      email: 'john.doe@example.com',
      password: hashedPassword
    });

    const token = jwt.sign({ userId: user._id }, process.env.JWT_SECRET || 'test-secret');

    const response = await request(app)
      .get('/protected')
      .set('Authorization', `Bearer ${token}`)
      .expect(200);

    expect(response.body.success).toBe(true);
    expect(response.body.userId).toBe(user._id.toString());
  });

  it('should deny access without token', async () => {
    const response = await request(app)
      .get('/protected')
      .expect(401);

    expect(response.body.success).toBe(false);
    expect(response.body.message).toBe('Access denied. No token provided.');
  });

  it('should deny access with invalid token', async () => {
    const response = await request(app)
      .get('/protected')
      .set('Authorization', 'Bearer invalid-token')
      .expect(401);

    expect(response.body.success).toBe(false);
    expect(response.body.message).toBe('Invalid token.');
  });

  it('should deny access with malformed authorization header', async () => {
    const response = await request(app)
      .get('/protected')
      .set('Authorization', 'InvalidFormat token')
      .expect(401);

    expect(response.body.success).toBe(false);
    expect(response.body.message).toBe('Access denied. No token provided.');
  });

  it('should deny access with token for non-existent user', async () => {
    const fakeUserId = '507f1f77bcf86cd799439011';
    const token = jwt.sign({ userId: fakeUserId }, process.env.JWT_SECRET || 'test-secret');

    const response = await request(app)
      .get('/protected')
      .set('Authorization', `Bearer ${token}`)
      .expect(401);

    expect(response.body.success).toBe(false);
    expect(response.body.message).toBe('Invalid token.');
  });

  it('should handle expired token', async () => {
    // Create test user
    const hashedPassword = await bcrypt.hash('password123', 10);
    const user = await User.create({
      firstName: 'John',
      lastName: 'Doe',
      email: 'john.doe@example.com',
      password: hashedPassword
    });

    // Create expired token (expires in 1ms)
    const token = jwt.sign(
      { userId: user._id }, 
      process.env.JWT_SECRET || 'test-secret',
      { expiresIn: '1ms' }
    );

    // Wait for token to expire
    await new Promise(resolve => setTimeout(resolve, 10));

    const response = await request(app)
      .get('/protected')
      .set('Authorization', `Bearer ${token}`)
      .expect(401);

    expect(response.body.success).toBe(false);
    expect(response.body.message).toBe('Invalid token.');
  });
});
