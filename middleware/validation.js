// middleware/validation.js

// Trade validation middleware
export const validateTrade = (req, res, next) => {
  const { symbol, quantity } = req.body;
  
  if (!symbol || typeof symbol !== 'string' || symbol.trim().length === 0) {
    return res.status(400).json({ 
      message: 'Stock symbol is required and must be a valid string' 
    });
  }
  
  if (!quantity || typeof quantity !== 'number' || quantity <= 0) {
    return res.status(400).json({ 
      message: 'Quantity is required and must be a positive number' 
    });
  }
  
  if (quantity % 1 !== 0) {
    return res.status(400).json({ 
      message: 'Quantity must be a whole number' 
    });
  }
  
  next();
};

// Registration validation middleware
export const validateRegistration = (req, res, next) => {
  const { username, email, password } = req.body;
  
  if (!username || typeof username !== 'string' || username.trim().length < 3) {
    return res.status(400).json({ 
      message: 'Username is required and must be at least 3 characters long' 
    });
  }
  
  if (!email || typeof email !== 'string' || !email.includes('@')) {
    return res.status(400).json({ 
      message: 'Valid email is required' 
    });
  }
  
  if (!password || typeof password !== 'string' || password.length < 6) {
    return res.status(400).json({ 
      message: 'Password is required and must be at least 6 characters long' 
    });
  }
  
  next();
};

// Login validation middleware
export const validateLogin = (req, res, next) => {
  const { email, password } = req.body;
  
  if (!email || typeof email !== 'string') {
    return res.status(400).json({ 
      message: 'Email is required' 
    });
  }
  
  if (!password || typeof password !== 'string') {
    return res.status(400).json({ 
      message: 'Password is required' 
    });
  }
  
  next();
};

// Stock symbol validation
export const validateStockSymbol = (req, res, next) => {
  const { symbol } = req.params;
  
  if (!symbol || typeof symbol !== 'string' || symbol.trim().length === 0) {
    return res.status(400).json({ 
      message: 'Valid stock symbol is required' 
    });
  }
  
  // Basic stock symbol format validation (uppercase, alphanumeric)
  if (!/^[A-Z0-9]+$/.test(symbol.trim().toUpperCase())) {
    return res.status(400).json({ 
      message: 'Stock symbol must contain only letters and numbers' 
    });
  }
  
  next();
};
