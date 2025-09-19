# 🚀 Avodal Finance API - Complete Endpoints Documentation

## Base URL
```
http://localhost:5000/api
```

## 📊 Market Data Endpoints (`/api/market`)

### 1. Stock News
**GET** `/api/market/stock-news/:symbol`

Get latest news articles for a specific stock.

**Parameters:**
- `symbol` (path): Stock symbol (e.g., AAPL, GOOGL, MSFT)
- `limit` (query, optional): Number of articles to return (1-50, default: 10)

**Example:**
```bash
GET /api/market/stock-news/AAPL?limit=5
```

**Response:**
```json
{
  "success": true,
  "data": {
    "symbol": "AAPL",
    "news": [...],
    "count": 5,
    "timestamp": "2024-01-01T12:00:00.000Z"
  }
}
```

### 2. Stock Time Series
**GET** `/api/market/stock-timeseries/:symbol`

Get historical price data for a stock.

**Parameters:**
- `symbol` (path): Stock symbol
- `period` (query, optional): Time period (1d, 5d, 1mo, 3mo, 6mo, 1y, 2y, 5y, 10y, ytd, max)
- `interval` (query, optional): Data interval (1m, 2m, 5m, 15m, 30m, 60m, 90m, 1h, 1d, 5d, 1wk, 1mo, 3mo)

**Example:**
```bash
GET /api/market/stock-timeseries/AAPL?period=1mo&interval=1d
```

### 3. Currency Time Series
**GET** `/api/market/currency-timeseries/:fromCurrency/:toCurrency`

Get historical exchange rate data for a currency pair.

**Parameters:**
- `fromCurrency` (path): Base currency (e.g., USD, EUR, GBP)
- `toCurrency` (path): Target currency
- `period` (query, optional): Time period
- `interval` (query, optional): Data interval

**Example:**
```bash
GET /api/market/currency-timeseries/USD/EUR?period=1mo&interval=1d
```

### 4. Currency News
**GET** `/api/market/currency-news/:currency`

Get latest news articles for a specific currency.

**Parameters:**
- `currency` (path): Currency code (e.g., USD, EUR, GBP)
- `limit` (query, optional): Number of articles (1-50, default: 10)

**Example:**
```bash
GET /api/market/currency-news/USD?limit=5
```

### 5. Market Trends
**GET** `/api/market/trends`

Get current market trends and analysis.

**Parameters:**
- `market` (query, optional): Market region (US, EU, ASIA, default: US)
- `limit` (query, optional): Number of trends (1-100, default: 20)

**Example:**
```bash
GET /api/market/trends?market=US&limit=10
```

### 6. Company Overview
**GET** `/api/market/company-overview/:symbol`

Get comprehensive company information and overview.

**Parameters:**
- `symbol` (path): Stock symbol

**Example:**
```bash
GET /api/market/company-overview/AAPL
```

## 💱 Currency Exchange Endpoints (`/api/currency`)

### 1. Single Exchange Rate
**GET** `/api/currency/rate/:fromCurrency/:toCurrency`

Get current exchange rate for a currency pair.

**Example:**
```bash
GET /api/currency/rate/USD/EUR
```

### 2. Multiple Exchange Rates
**GET** `/api/currency/rates/:baseCurrency`

Get exchange rates from a base currency to multiple target currencies.

**Example:**
```bash
GET /api/currency/rates/USD?currencies=EUR,GBP,JPY
```

### 3. Currency Conversion
**GET** `/api/currency/convert/:fromCurrency/:toCurrency/:amount`

Convert a specific amount from one currency to another.

**Example:**
```bash
GET /api/currency/convert/USD/EUR/100
```

## 🔐 Authentication Endpoints (`/api/auth`)

### 1. Register
**POST** `/api/auth/register`

### 2. Login
**POST** `/api/auth/login`

### 3. Logout
**POST** `/api/auth/logout`

## 📈 Trading Endpoints (`/api/trades`)

### 1. Create Trade
**POST** `/api/trades`

### 2. Get User Trades
**GET** `/api/trades`

### 3. Get Trade by ID
**GET** `/api/trades/:id`

### 4. Update Trade
**PUT** `/api/trades/:id`

### 5. Delete Trade
**DELETE** `/api/trades/:id`

## 💼 Portfolio Endpoints (`/api/portfolio`)

### 1. Get Portfolio
**GET** `/api/portfolio`

### 2. Get Portfolio Summary
**GET** `/api/portfolio/summary`

### 3. Get Portfolio Performance
**GET** `/api/portfolio/performance`

## 🏆 Leaderboard Endpoints (`/api/leaderboard`)

### 1. Get Leaderboard
**GET** `/api/leaderboard`

### 2. Get User Rank
**GET** `/api/leaderboard/rank`

## 👑 Admin Endpoints (`/api/admin`)

### 1. Get All Users
**GET** `/api/admin/users`

### 2. Get User by ID
**GET** `/api/admin/users/:id`

### 3. Update User
**PUT** `/api/admin/users/:id`

### 4. Delete User
**DELETE** `/api/admin/users/:id`

## 🚀 Quick Start Examples

### Get Apple Stock News
```bash
curl http://localhost:5000/api/market/stock-news/AAPL?limit=5
```

### Get USD to EUR Exchange Rate
```bash
curl http://localhost:5000/api/currency/rate/USD/EUR
```

### Get Apple Stock Price History (1 Month)
```bash
curl http://localhost:5000/api/market/stock-timeseries/AAPL?period=1mo&interval=1d
```

### Get Market Trends
```bash
curl http://localhost:5000/api/market/trends?market=US&limit=10
```

### Get Company Overview for Apple
```bash
curl http://localhost:5000/api/market/company-overview/AAPL
```

## 📝 Notes

- All endpoints return JSON responses
- Error responses include `success: false` and an error message
- Successful responses include `success: true` and the requested data
- All timestamps are in ISO 8601 format
- Rate limiting may apply to prevent API abuse
- Authentication required for trading and portfolio endpoints
