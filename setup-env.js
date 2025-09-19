#!/usr/bin/env node

/**
 * Environment Setup Script
 * This script helps you set up the required environment variables for the Avodal Finance API
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const envPath = path.join(__dirname, '.env');
const envExamplePath = path.join(__dirname, '.env.example');

// Check if .env already exists
if (fs.existsSync(envPath)) {
  console.log('✅ .env file already exists');
  process.exit(0);
}

// Create .env from template
const envTemplate = `# Database Configuration
MONGO_URI=mongodb://localhost:27017/avodal-finance

# Server Configuration
PORT=5000
NODE_ENV=development

# JWT Configuration
JWT_SECRET=your-super-secret-jwt-key-change-this-in-production-${Math.random().toString(36).substring(2, 15)}
JWT_EXPIRE=7d

# RapidAPI Configuration
# Get your API key from: https://rapidapi.com/real-time-finance-data/api/real-time-finance-data
RAPIDAPI_KEY=your-rapidapi-key-here

# CORS Configuration
CORS_ORIGIN=http://localhost:3000

# Rate Limiting
RATE_LIMIT_WINDOW_MS=900000
RATE_LIMIT_MAX_REQUESTS=100
`;

try {
  fs.writeFileSync(envPath, envTemplate);
  console.log('✅ Created .env file successfully!');
  console.log('');
  console.log('⚠️  IMPORTANT: You need to set up the following:');
  console.log('');
  console.log('1. MongoDB: Make sure MongoDB is running on your system');
  console.log('2. RapidAPI Key: Get your API key from:');
  console.log('   https://rapidapi.com/real-time-finance-data/api/real-time-finance-data');
  console.log('   Then update RAPIDAPI_KEY in the .env file');
  console.log('');
  console.log('3. JWT Secret: A random secret has been generated, but you can change it');
  console.log('');
  console.log('After setting up these, restart your server with: npm run dev');
} catch (error) {
  console.error('❌ Error creating .env file:', error.message);
  process.exit(1);
}
