import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';
import User from '../../models/User.js';

describe('User Model', () => {
  beforeEach(async () => {
    await User.deleteMany({});
  });

  it('should create a new user with valid data', async () => {
    const userData = {
      firstName: 'John',
      lastName: 'Doe',
      email: 'john.doe@example.com',
      password: 'password123'
    };

    const user = new User(userData);
    const savedUser = await user.save();

    expect(savedUser._id).toBeDefined();
    expect(savedUser.firstName).toBe(userData.firstName);
    expect(savedUser.lastName).toBe(userData.lastName);
    expect(savedUser.email).toBe(userData.email);
    expect(savedUser.password).not.toBe(userData.password); // Should be hashed
    expect(savedUser.createdAt).toBeDefined();
    expect(savedUser.updatedAt).toBeDefined();
  });

  it('should hash password before saving', async () => {
    const userData = {
      firstName: 'John',
      lastName: 'Doe',
      email: 'john.doe@example.com',
      password: 'password123'
    };

    const user = new User(userData);
    await user.save();

    expect(user.password).not.toBe(userData.password);
    expect(user.password.length).toBeGreaterThan(50); // bcrypt hash length
  });

  it('should validate required fields', async () => {
    const user = new User({});

    let error;
    try {
      await user.save();
    } catch (err) {
      error = err;
    }

    expect(error).toBeDefined();
    expect(error.errors.firstName).toBeDefined();
    expect(error.errors.lastName).toBeDefined();
    expect(error.errors.email).toBeDefined();
    expect(error.errors.password).toBeDefined();
  });

  it('should validate email format', async () => {
    const userData = {
      firstName: 'John',
      lastName: 'Doe',
      email: 'invalid-email',
      password: 'password123'
    };

    const user = new User(userData);

    let error;
    try {
      await user.save();
    } catch (err) {
      error = err;
    }

    expect(error).toBeDefined();
    expect(error.errors.email).toBeDefined();
  });

  it('should validate password length', async () => {
    const userData = {
      firstName: 'John',
      lastName: 'Doe',
      email: 'john.doe@example.com',
      password: '123'
    };

    const user = new User(userData);

    let error;
    try {
      await user.save();
    } catch (err) {
      error = err;
    }

    expect(error).toBeDefined();
    expect(error.errors.password).toBeDefined();
  });

  it('should enforce unique email', async () => {
    const userData = {
      firstName: 'John',
      lastName: 'Doe',
      email: 'john.doe@example.com',
      password: 'password123'
    };

    // Create first user
    await User.create(userData);

    // Try to create second user with same email
    const user2 = new User(userData);

    let error;
    try {
      await user2.save();
    } catch (err) {
      error = err;
    }

    expect(error).toBeDefined();
    expect(error.code).toBe(11000); // MongoDB duplicate key error
  });

  it('should compare password correctly', async () => {
    const userData = {
      firstName: 'John',
      lastName: 'Doe',
      email: 'john.doe@example.com',
      password: 'password123'
    };

    const user = new User(userData);
    await user.save();

    // Test correct password
    const isMatch = await bcrypt.compare('password123', user.password);
    expect(isMatch).toBe(true);

    // Test incorrect password
    const isNotMatch = await bcrypt.compare('wrongpassword', user.password);
    expect(isNotMatch).toBe(false);
  });

  it('should update timestamps on save', async () => {
    const userData = {
      firstName: 'John',
      lastName: 'Doe',
      email: 'john.doe@example.com',
      password: 'password123'
    };

    const user = new User(userData);
    const savedUser = await user.save();

    const createdAt = savedUser.createdAt;
    const updatedAt = savedUser.updatedAt;

    expect(createdAt).toBeDefined();
    expect(updatedAt).toBeDefined();

    // Update user
    savedUser.firstName = 'Jane';
    const updatedUser = await savedUser.save();

    expect(updatedUser.createdAt.getTime()).toBe(createdAt.getTime());
    expect(updatedUser.updatedAt.getTime()).toBeGreaterThan(updatedAt.getTime());
  });
});
