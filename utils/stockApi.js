// utils/stockApi.js
import axios from "axios";

export async function fetchStockPrice(symbol) {
  // Validate API key
  if (!process.env.RAPIDAPI_KEY) {
    throw new Error("No RapidAPI key configured. Please set RAPIDAPI_KEY in your .env file");
  }

  try {
    const options = {
      method: 'GET',
      url: 'https://real-time-finance-data.p.rapidapi.com/stock-quote',
      params: {
        symbol: `${symbol.toUpperCase()}:NASDAQ`,
        language: 'en'
      },
      headers: {
        'x-rapidapi-key': process.env.RAPIDAPI_KEY,
        'x-rapidapi-host': 'real-time-finance-data.p.rapidapi.com'
      }
    };

    const response = await axios.request(options);
    
    // Extract price and volume from the response
    if (response.data && response.data.data) {
      const stockData = response.data.data;
      const price = parseFloat(stockData.price);
      const volume = parseInt(stockData.volume);
      
      if (price && price > 0) {
        console.log(`✅ Stock data for ${symbol}: Price $${price}, Volume ${volume} (via RapidAPI Finance Data)`);
        return {
          price: price,
          volume: volume,
          symbol: symbol.toUpperCase(),
          timestamp: new Date().toISOString()
        };
      } else {
        throw new Error("Invalid price data from RapidAPI Finance Data");
      }
    } else {
      throw new Error("Invalid response format from RapidAPI Finance Data");
    }
    
  } catch (err) {
    console.error(`❌ RapidAPI Finance Data failed for ${symbol}: ${err.message}`);
    throw new Error(`Failed to fetch stock data for ${symbol}: ${err.message}`);
  }
}

// New function to get additional stock data
export async function fetchStockData(symbol) {
  // Validate API key
  if (!process.env.RAPIDAPI_KEY) {
    throw new Error("No RapidAPI key configured. Please set RAPIDAPI_KEY in your .env file");
  }

  try {
    const options = {
      method: 'GET',
      url: 'https://real-time-finance-data.p.rapidapi.com/stock-quote',
      params: {
        symbol: `${symbol.toUpperCase()}:NASDAQ`,
        language: 'en'
      },
      headers: {
        'x-rapidapi-key': process.env.RAPIDAPI_KEY,
        'x-rapidapi-host': 'real-time-finance-data.p.rapidapi.com'
      }
    };

    const response = await axios.request(options);
    
    if (response.data && response.data.data) {
      const stockData = response.data.data;
      
      return {
        symbol: symbol.toUpperCase(),
        price: parseFloat(stockData.price),
        volume: parseInt(stockData.volume),
        change: parseFloat(stockData.change),
        changePercent: parseFloat(stockData.change_percent),
        dayHigh: parseFloat(stockData.day_high),
        dayLow: parseFloat(stockData.day_low),
        marketCap: stockData.market_cap,
        timestamp: new Date().toISOString()
      };
    } else {
      throw new Error("Invalid response format from RapidAPI Finance Data");
    }
    
  } catch (err) {
    console.error(`❌ RapidAPI Finance Data failed for ${symbol}: ${err.message}`);
    throw new Error(`Failed to fetch stock data for ${symbol}: ${err.message}`);
  }
}

// Function to get currency exchange rates
export async function fetchExchangeRate(fromCurrency, toCurrency) {
  // Validate API key
  if (!process.env.RAPIDAPI_KEY) {
    throw new Error("No RapidAPI key configured. Please set RAPIDAPI_KEY in your .env file");
  }

  try {
    const options = {
      method: 'GET',
      url: 'https://real-time-finance-data.p.rapidapi.com/currency-exchange-rate',
      params: {
        from_symbol: fromCurrency.toUpperCase(),
        to_symbol: toCurrency.toUpperCase(),
        language: 'en'
      },
      headers: {
        'x-rapidapi-key': process.env.RAPIDAPI_KEY,
        'x-rapidapi-host': 'real-time-finance-data.p.rapidapi.com'
      }
    };

    const response = await axios.request(options);
    
    if (response.data && response.data.data) {
      const exchangeData = response.data.data;
      const rate = parseFloat(exchangeData.exchange_rate);
      
      if (rate && rate > 0) {
        console.log(`✅ Exchange rate for ${fromCurrency}/${toCurrency}: ${rate} (via RapidAPI Finance Data)`);
        return {
          fromCurrency: fromCurrency.toUpperCase(),
          toCurrency: toCurrency.toUpperCase(),
          exchangeRate: rate,
          timestamp: new Date().toISOString()
        };
      } else {
        throw new Error("Invalid exchange rate data from RapidAPI Finance Data");
      }
    } else {
      throw new Error("Invalid response format from RapidAPI Finance Data");
    }
    
  } catch (err) {
    console.error(`❌ RapidAPI Finance Data failed for ${fromCurrency}/${toCurrency}: ${err.message}`);
    throw new Error(`Failed to fetch exchange rate for ${fromCurrency}/${toCurrency}: ${err.message}`);
  }
}

// Function to get multiple currency exchange rates at once
export async function fetchMultipleExchangeRates(baseCurrency, targetCurrencies) {
  // Validate API key
  if (!process.env.RAPIDAPI_KEY) {
    throw new Error("No RapidAPI key configured. Please set RAPIDAPI_KEY in your .env file");
  }

  try {
    // For multiple currencies, we'll make individual requests since the API might not support multiple targets
    const promises = targetCurrencies.map(async (targetCurrency) => {
      try {
        const rate = await fetchExchangeRate(baseCurrency, targetCurrency);
        return rate;
      } catch (error) {
        console.warn(`Failed to fetch rate for ${baseCurrency}/${targetCurrency}: ${error.message}`);
        return null;
      }
    });

    const results = await Promise.all(promises);
    const validResults = results.filter(result => result !== null);

    console.log(`✅ Multiple exchange rates for ${baseCurrency}: ${validResults.length}/${targetCurrencies.length} rates fetched`);
    return validResults;
    
  } catch (err) {
    console.error(`❌ RapidAPI Finance Data failed for multiple rates ${baseCurrency}: ${err.message}`);
    throw new Error(`Failed to fetch multiple exchange rates for ${baseCurrency}: ${err.message}`);
  }
}

// Function to get stock news
export async function fetchStockNews(symbol, limit = 10) {
  if (!process.env.RAPIDAPI_KEY) {
    throw new Error("No RapidAPI key configured. Please set RAPIDAPI_KEY in your .env file");
  }

  try {
    const options = {
      method: 'GET',
      url: 'https://real-time-finance-data.p.rapidapi.com/stock-news',
      params: {
        symbol: `${symbol.toUpperCase()}:NASDAQ`,
        language: 'en',
        limit: limit
      },
      headers: {
        'x-rapidapi-key': process.env.RAPIDAPI_KEY,
        'x-rapidapi-host': 'real-time-finance-data.p.rapidapi.com'
      }
    };

    const response = await axios.request(options);
    
    if (response.data && response.data.data) {
      const newsData = response.data.data;
      console.log(`✅ Stock news for ${symbol}: ${newsData.length} articles fetched`);
      return {
        symbol: symbol.toUpperCase(),
        news: newsData,
        count: newsData.length,
        timestamp: new Date().toISOString()
      };
    } else {
      throw new Error("Invalid response format from RapidAPI Finance Data");
    }
    
  } catch (err) {
    console.error(`❌ RapidAPI Finance Data failed for stock news ${symbol}: ${err.message}`);
    throw new Error(`Failed to fetch stock news for ${symbol}: ${err.message}`);
  }
}

// Function to get stock time series data
export async function fetchStockTimeSeries(symbol, period = '1d', interval = '1h') {
  if (!process.env.RAPIDAPI_KEY) {
    throw new Error("No RapidAPI key configured. Please set RAPIDAPI_KEY in your .env file");
  }

  try {
    const options = {
      method: 'GET',
      url: 'https://real-time-finance-data.p.rapidapi.com/stock-time-series',
      params: {
        symbol: `${symbol.toUpperCase()}:NASDAQ`,
        period: period,
        interval: interval,
        language: 'en'
      },
      headers: {
        'x-rapidapi-key': process.env.RAPIDAPI_KEY,
        'x-rapidapi-host': 'real-time-finance-data.p.rapidapi.com'
      }
    };

    const response = await axios.request(options);
    
    if (response.data && response.data.data) {
      const timeSeriesData = response.data.data;
      console.log(`✅ Stock time series for ${symbol}: ${timeSeriesData.length} data points fetched`);
      return {
        symbol: symbol.toUpperCase(),
        period: period,
        interval: interval,
        data: timeSeriesData,
        count: timeSeriesData.length,
        timestamp: new Date().toISOString()
      };
    } else {
      throw new Error("Invalid response format from RapidAPI Finance Data");
    }
    
  } catch (err) {
    console.error(`❌ RapidAPI Finance Data failed for stock time series ${symbol}: ${err.message}`);
    throw new Error(`Failed to fetch stock time series for ${symbol}: ${err.message}`);
  }
}

// Function to get currency time series data
export async function fetchCurrencyTimeSeries(fromCurrency, toCurrency, period = '1d', interval = '1h') {
  if (!process.env.RAPIDAPI_KEY) {
    throw new Error("No RapidAPI key configured. Please set RAPIDAPI_KEY in your .env file");
  }

  try {
    const options = {
      method: 'GET',
      url: 'https://real-time-finance-data.p.rapidapi.com/currency-time-series',
      params: {
        from_symbol: fromCurrency.toUpperCase(),
        to_symbol: toCurrency.toUpperCase(),
        period: period,
        interval: interval,
        language: 'en'
      },
      headers: {
        'x-rapidapi-key': process.env.RAPIDAPI_KEY,
        'x-rapidapi-host': 'real-time-finance-data.p.rapidapi.com'
      }
    };

    const response = await axios.request(options);
    
    if (response.data && response.data.data) {
      const timeSeriesData = response.data.data;
      console.log(`✅ Currency time series for ${fromCurrency}/${toCurrency}: ${timeSeriesData.length} data points fetched`);
      return {
        fromCurrency: fromCurrency.toUpperCase(),
        toCurrency: toCurrency.toUpperCase(),
        period: period,
        interval: interval,
        data: timeSeriesData,
        count: timeSeriesData.length,
        timestamp: new Date().toISOString()
      };
    } else {
      throw new Error("Invalid response format from RapidAPI Finance Data");
    }
    
  } catch (err) {
    console.error(`❌ RapidAPI Finance Data failed for currency time series ${fromCurrency}/${toCurrency}: ${err.message}`);
    throw new Error(`Failed to fetch currency time series for ${fromCurrency}/${toCurrency}: ${err.message}`);
  }
}

// Function to get currency news
export async function fetchCurrencyNews(currency, limit = 10) {
  if (!process.env.RAPIDAPI_KEY) {
    throw new Error("No RapidAPI key configured. Please set RAPIDAPI_KEY in your .env file");
  }

  try {
    const options = {
      method: 'GET',
      url: 'https://real-time-finance-data.p.rapidapi.com/currency-news',
      params: {
        currency: currency.toUpperCase(),
        language: 'en',
        limit: limit
      },
      headers: {
        'x-rapidapi-key': process.env.RAPIDAPI_KEY,
        'x-rapidapi-host': 'real-time-finance-data.p.rapidapi.com'
      }
    };

    const response = await axios.request(options);
    
    if (response.data && response.data.data) {
      const newsData = response.data.data;
      console.log(`✅ Currency news for ${currency}: ${newsData.length} articles fetched`);
      return {
        currency: currency.toUpperCase(),
        news: newsData,
        count: newsData.length,
        timestamp: new Date().toISOString()
      };
    } else {
      throw new Error("Invalid response format from RapidAPI Finance Data");
    }
    
  } catch (err) {
    console.error(`❌ RapidAPI Finance Data failed for currency news ${currency}: ${err.message}`);
    throw new Error(`Failed to fetch currency news for ${currency}: ${err.message}`);
  }
}

// Function to get market trends
export async function fetchMarketTrends(market = 'US', limit = 20) {
  if (!process.env.RAPIDAPI_KEY) {
    throw new Error("No RapidAPI key configured. Please set RAPIDAPI_KEY in your .env file");
  }

  try {
    const options = {
      method: 'GET',
      url: 'https://real-time-finance-data.p.rapidapi.com/market-trends',
      params: {
        market: market,
        language: 'en',
        limit: limit
      },
      headers: {
        'x-rapidapi-key': process.env.RAPIDAPI_KEY,
        'x-rapidapi-host': 'real-time-finance-data.p.rapidapi.com'
      }
    };

    const response = await axios.request(options);
    
    if (response.data && response.data.data) {
      const trendsData = response.data.data;
      console.log(`✅ Market trends for ${market}: ${trendsData.length} trends fetched`);
      return {
        market: market,
        trends: trendsData,
        count: trendsData.length,
        timestamp: new Date().toISOString()
      };
    } else {
      throw new Error("Invalid response format from RapidAPI Finance Data");
    }
    
  } catch (err) {
    console.error(`❌ RapidAPI Finance Data failed for market trends ${market}: ${err.message}`);
    throw new Error(`Failed to fetch market trends for ${market}: ${err.message}`);
  }
}

// Function to get company overview
export async function fetchCompanyOverview(symbol) {
  if (!process.env.RAPIDAPI_KEY) {
    throw new Error("No RapidAPI key configured. Please set RAPIDAPI_KEY in your .env file");
  }

  try {
    const options = {
      method: 'GET',
      url: 'https://real-time-finance-data.p.rapidapi.com/company-overview',
      params: {
        symbol: `${symbol.toUpperCase()}:NASDAQ`,
        language: 'en'
      },
      headers: {
        'x-rapidapi-key': process.env.RAPIDAPI_KEY,
        'x-rapidapi-host': 'real-time-finance-data.p.rapidapi.com'
      }
    };

    const response = await axios.request(options);
    
    if (response.data && response.data.data) {
      const companyData = response.data.data;
      console.log(`✅ Company overview for ${symbol} fetched`);
      return {
        symbol: symbol.toUpperCase(),
        overview: companyData,
        timestamp: new Date().toISOString()
      };
    } else {
      throw new Error("Invalid response format from RapidAPI Finance Data");
    }
    
  } catch (err) {
    console.error(`❌ RapidAPI Finance Data failed for company overview ${symbol}: ${err.message}`);
    throw new Error(`Failed to fetch company overview for ${symbol}: ${err.message}`);
  }
}