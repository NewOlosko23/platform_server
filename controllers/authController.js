// controllers/authController.js
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import User from "../models/User.js";

export const register = async (req, res) => {
  try {
    const { firstName, lastName, email, password } = req.body;
    
    // Check if user already exists
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(400).json({ 
        success: false,
        message: "Email already in use" 
      });
    }

    // Hash password
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    // Create username from firstName and lastName
    const username = `${firstName}${lastName}`.toLowerCase().replace(/\s+/g, '');

    // Create new user
    const newUser = new User({ 
      username, 
      email, 
      passwordHash: hashedPassword,
      firstName,
      lastName
    });
    
    await newUser.save();

    // Generate JWT token
    const token = jwt.sign(
      { id: newUser._id, role: newUser.role }, 
      process.env.JWT_SECRET, 
      { expiresIn: "7d" }
    );

    // Return user data without password
    const userData = {
      id: newUser._id,
      firstName: newUser.firstName,
      lastName: newUser.lastName,
      email: newUser.email,
      username: newUser.username,
      role: newUser.role,
      balance: newUser.balance,
      region: newUser.region,
      currency: newUser.currency,
      createdAt: newUser.createdAt
    };

    res.status(201).json({ 
      success: true,
      message: "User registered successfully",
      data: {
        user: userData,
        token
      }
    });
  } catch (err) {
    console.error('Registration error:', err);
    res.status(500).json({ 
      success: false,
      message: err.message || "Registration failed" 
    });
  }
};

export const login = async (req, res) => {
  try {
    const { email, password } = req.body;
    const user = await User.findOne({ email });
    
    if (!user) {
      return res.status(404).json({ 
        success: false,
        message: "User not found" 
      });
    }

    const isMatch = await bcrypt.compare(password, user.passwordHash);
    if (!isMatch) {
      return res.status(400).json({ 
        success: false,
        message: "Invalid credentials" 
      });
    }

    const token = jwt.sign(
      { id: user._id, role: user.role }, 
      process.env.JWT_SECRET, 
      { expiresIn: "7d" }
    );

    // Return user data without password
    const userData = {
      id: user._id,
      firstName: user.firstName,
      lastName: user.lastName,
      email: user.email,
      username: user.username,
      role: user.role,
      balance: user.balance,
      region: user.region,
      currency: user.currency,
      createdAt: user.createdAt
    };

    res.json({ 
      success: true,
      message: "Login successful",
      data: {
        user: userData,
        token
      }
    });
  } catch (err) {
    console.error('Login error:', err);
    res.status(500).json({ 
      success: false,
      message: err.message || "Login failed" 
    });
  }
};

export const logout = async (req, res) => {
  try {
    // For JWT-based authentication, logout is primarily handled on the client side
    // by removing the token from localStorage. However, we can:
    // 1. Log the logout event for security/analytics
    // 2. Add token to a blacklist if needed (for immediate invalidation)
    // 3. Clear any server-side sessions if using session-based auth
    
    // For now, we'll just return a success response
    // In a production app, you might want to:
    // - Add the token to a blacklist/revocation list
    // - Log the logout event
    // - Clear any server-side sessions
    
    res.json({ 
      success: true,
      message: "Logout successful" 
    });
  } catch (err) {
    console.error('Logout error:', err);
    res.status(500).json({ 
      success: false,
      message: err.message || "Logout failed" 
    });
  }
};