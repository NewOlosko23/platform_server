import { getLatestStockPrice, searchStocks } from './stockFetcher.js';
import { getLatestCryptoPrice } from './cryptoFetcher.js';
import { getLatestFXRate, getAllLatestFXRates } from './fxFetcher.js';

/**
 * Unified Asset Service
 * Provides a single interface for fetching prices and data across all asset types
 */

/**
 * Get current price for any asset type
 * @param {string} assetType - 'stock', 'crypto', or 'currency'
 * @param {string} symbol - Asset symbol
 * @returns {Object} Price data with metadata
 */
export async function getAssetPrice(assetType, symbol) {
  try {
    switch (assetType.toLowerCase()) {
      case 'stock':
        return await getLatestStockPrice(symbol);
      
      case 'crypto':
        return await getLatestCryptoPrice(symbol);
      
      case 'currency':
        return await getLatestFXRate(symbol);
      
      default:
        throw new Error(`Unsupported asset type: ${assetType}`);
    }
  } catch (error) {
    console.error(`Error fetching ${assetType} price for ${symbol}:`, error.message);
    throw error;
  }
}

/**
 * Search for assets across all types
 * @param {string} query - Search query
 * @param {string} assetType - Optional asset type filter
 * @param {number} limit - Number of results per type
 * @returns {Object} Search results grouped by asset type
 */
export async function searchAssets(query, assetType = null, limit = 10) {
  const results = {
    stocks: [],
    crypto: [],
    currencies: []
  };

  try {
    // Search stocks
    if (!assetType || assetType === 'stock') {
      try {
        const stockResults = await searchStocks(query, limit);
        results.stocks = stockResults.map(stock => ({
          type: 'stock',
          symbol: stock.symbol,
          name: stock.name,
          price: stock.price,
          change: stock.metadata?.change || 0,
          changePercent: stock.metadata?.changePercent || 0,
          metadata: stock.metadata
        }));
      } catch (error) {
        console.warn('Error searching stocks:', error.message);
      }
    }

    // Search crypto (using predefined list for now)
    if (!assetType || assetType === 'crypto') {
      try {
        const cryptoSymbols = [
          'BTCUSDT', 'ETHUSDT', 'BNBUSDT', 'XRPUSDT', 'ADAUSDT',
          'SOLUSDT', 'DOGEUSDT', 'DOTUSDT', 'AVAXUSDT', 'SHIBUSDT',
          'MATICUSDT', 'LTCUSDT', 'UNIUSDT', 'LINKUSDT', 'ATOMUSDT'
        ];
        
        const filteredCrypto = cryptoSymbols.filter(symbol => 
          symbol.toLowerCase().includes(query.toLowerCase())
        ).slice(0, limit);

        for (const symbol of filteredCrypto) {
          try {
            const cryptoData = await getLatestCryptoPrice(symbol);
            results.crypto.push({
              type: 'crypto',
              symbol: cryptoData.symbol,
              name: cryptoData.metadata?.baseAsset || symbol.replace('USDT', ''),
              price: cryptoData.price,
              change: cryptoData.metadata?.priceChange || 0,
              changePercent: cryptoData.metadata?.priceChangePercent || 0,
              metadata: cryptoData.metadata
            });
          } catch (error) {
            console.warn(`Error fetching crypto data for ${symbol}:`, error.message);
          }
        }
      } catch (error) {
        console.warn('Error searching crypto:', error.message);
      }
    }

    // Search currencies
    if (!assetType || assetType === 'currency') {
      try {
        const currencyPairs = [
          'USD/KES', 'EUR/KES', 'GBP/KES', 'JPY/KES', 'CAD/KES',
          'AUD/KES', 'CHF/KES', 'CNY/KES', 'INR/KES', 'BRL/KES',
          'RUB/KES', 'ZAR/KES', 'NGN/KES', 'EGP/KES', 'GHS/KES'
        ];
        
        const filteredCurrencies = currencyPairs.filter(pair => 
          pair.toLowerCase().includes(query.toLowerCase())
        ).slice(0, limit);

        for (const pair of filteredCurrencies) {
          try {
            const currencyData = await getLatestFXRate(pair);
            results.currencies.push({
              type: 'currency',
              symbol: currencyData.pair,
              name: pair,
              price: currencyData.rate,
              change: 0, // FX rates don't have daily change in our current setup
              changePercent: 0,
              metadata: currencyData.metadata
            });
          } catch (error) {
            console.warn(`Error fetching currency data for ${pair}:`, error.message);
          }
        }
      } catch (error) {
        console.warn('Error searching currencies:', error.message);
      }
    }

    return results;
  } catch (error) {
    console.error('Error in searchAssets:', error.message);
    throw error;
  }
}

/**
 * Get available assets for each type
 * @returns {Object} Available assets grouped by type
 */
export async function getAvailableAssets() {
  try {
    const assets = {
      stocks: [],
      crypto: [],
      currencies: []
    };

    // Get available stocks
    try {
      const stockSymbols = await searchStocks('', 50); // Get first 50 stocks
      assets.stocks = stockSymbols.map(stock => ({
        type: 'stock',
        symbol: stock.symbol,
        name: stock.name,
        price: stock.price
      }));
    } catch (error) {
      console.warn('Error getting available stocks:', error.message);
    }

    // Get available crypto
    const cryptoSymbols = [
      'BTCUSDT', 'ETHUSDT', 'BNBUSDT', 'XRPUSDT', 'ADAUSDT',
      'SOLUSDT', 'DOGEUSDT', 'DOTUSDT', 'AVAXUSDT', 'SHIBUSDT',
      'MATICUSDT', 'LTCUSDT', 'UNIUSDT', 'LINKUSDT', 'ATOMUSDT',
      'XLMUSDT', 'BCHUSDT', 'FILUSDT', 'TRXUSDT', 'ETCUSDT'
    ];

    for (const symbol of cryptoSymbols) {
      try {
        const cryptoData = await getLatestCryptoPrice(symbol);
        assets.crypto.push({
          type: 'crypto',
          symbol: cryptoData.symbol,
          name: cryptoData.metadata?.baseAsset || symbol.replace('USDT', ''),
          price: cryptoData.price
        });
      } catch (error) {
        console.warn(`Error getting crypto data for ${symbol}:`, error.message);
      }
    }

    // Get available currencies
    const currencyPairs = [
      'USD/KES', 'EUR/KES', 'GBP/KES', 'JPY/KES', 'CAD/KES',
      'AUD/KES', 'CHF/KES', 'CNY/KES', 'INR/KES', 'BRL/KES',
      'RUB/KES', 'ZAR/KES', 'NGN/KES', 'EGP/KES', 'GHS/KES'
    ];

    for (const pair of currencyPairs) {
      try {
        const currencyData = await getLatestFXRate(pair);
        assets.currencies.push({
          type: 'currency',
          symbol: currencyData.pair,
          name: pair,
          price: currencyData.rate
        });
      } catch (error) {
        console.warn(`Error getting currency data for ${pair}:`, error.message);
      }
    }

    return assets;
  } catch (error) {
    console.error('Error getting available assets:', error.message);
    throw error;
  }
}

/**
 * Calculate price change since adding to watchlist
 * @param {number} addedPrice - Price when added
 * @param {number} currentPrice - Current price
 * @returns {Object} Price change data
 */
export function calculatePriceChange(addedPrice, currentPrice) {
  const priceChange = currentPrice - addedPrice;
  const priceChangePercent = addedPrice > 0 ? (priceChange / addedPrice) * 100 : 0;

  return {
    priceChange: Math.round(priceChange * 100) / 100,
    priceChangePercent: Math.round(priceChangePercent * 100) / 100
  };
}

/**
 * Update watchlist item with current price and calculate changes
 * @param {Object} watchlistItem - Watchlist item from database
 * @returns {Object} Updated watchlist item
 */
export async function updateWatchlistItemPrice(watchlistItem) {
  try {
    // Get current price
    const currentPriceData = await getAssetPrice(watchlistItem.assetType, watchlistItem.symbol);
    
    // Calculate changes since adding to watchlist
    const { priceChange, priceChangePercent } = calculatePriceChange(
      watchlistItem.addedPrice,
      currentPriceData.price
    );

    // Update the item
    watchlistItem.currentPrice = currentPriceData.price;
    watchlistItem.priceChange = priceChange;
    watchlistItem.priceChangePercent = priceChangePercent;
    watchlistItem.dailyChange = currentPriceData.metadata?.priceChange || 0;
    watchlistItem.dailyChangePercent = currentPriceData.metadata?.priceChangePercent || 0;
    watchlistItem.lastUpdated = new Date();

    // Update metadata if available
    if (currentPriceData.metadata) {
      watchlistItem.metadata = {
        ...watchlistItem.metadata,
        ...currentPriceData.metadata
      };
    }

    return watchlistItem;
  } catch (error) {
    console.error(`Error updating price for ${watchlistItem.symbol}:`, error.message);
    // Return original item if update fails
    return watchlistItem;
  }
}
