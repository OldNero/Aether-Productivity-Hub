/**
 * Centralized API Service for Aether Productivity Hub
 * Handles interaction with API Ninjas and other external data sources.
 */

const API = (function() {
  const NINJA_API_KEY = CONFIG.keys.NINJA_API_KEY;
  const ALPHA_VANTAGE_KEY = CONFIG.keys.ALPHA_VANTAGE_KEY;

  /**
   * Fetch a random quote
   */
  async function fetchQuote() {
    try {
      const categories = ['wisdom', 'inspirational', 'success', 'philosophy', 'life'];
      const randomCategory = categories[Math.floor(Math.random() * categories.length)];
      
      const response = await fetch(`https://api.api-ninjas.com/v2/quotes?categories=${randomCategory}&t=${Date.now()}`, {
        headers: { 'X-Api-Key': NINJA_API_KEY }
      });

      if (!response.ok) throw new Error(`Quote fetch failed: ${response.status}`);
      
      const data = await response.json();
      return data[0]; 
    } catch (error) {
      console.error('API Error (Quote):', error);
      return null;
    }
  }

  /**
   * Fetch stock data via Alpha Vantage
   * Implements 60-minute caching to respect the 25 req/day limit
   */
  async function fetchStockPrice(ticker) {
    const cacheKey = `stock_cache_${ticker}`;
    const cached = await Store.get(cacheKey);
    const now = Date.now();

    // 1. Return cached data if it's less than 12 hours old (conserves 25/day limit)
    if (cached && (now - cached.timestamp < 43200000)) {
      console.log(`Using cached data for ${ticker}`);
      return cached.data;
    }

    try {
      const response = await fetch(`https://www.alphavantage.co/query?function=GLOBAL_QUOTE&symbol=${ticker}&apikey=${ALPHA_VANTAGE_KEY}`);

      if (!response.ok) throw new Error(`Stock fetch failed for ${ticker}`);
      
      const resData = await response.json();
      const quote = resData['Global Quote'];

      if (!quote || !quote['05. price']) {
        if (cached) return cached.data; // Fallback to stale cache if API fails/limits
        return null;
      }

      const standardizedData = {
        ticker: quote['01. symbol'],
        price: parseFloat(quote['05. price']),
        change: parseFloat(quote['09. change']),
        changesPercentage: parseFloat(quote['10. change percent']?.replace('%', '') || 0)
      };

      // Update cache
      await Store.set(cacheKey, { data: standardizedData, timestamp: now });
      
      return standardizedData;
    } catch (error) {
      console.error(`API Error (Stock - ${ticker}):`, error);
      return cached ? cached.data : null;
    }
  }

  /**
   * Fetch top gainers & losers in ONE call (vs 10 individual calls)
   * Cached for 24 hours since this data changes once per trading day
   */
  async function fetchMarketMovers() {
    const cacheKey = 'market_movers_cache';
    const cached = await Store.get(cacheKey);
    const now = Date.now();

    if (cached && (now - cached.timestamp < 86400000)) {
      console.log('Using cached Market Movers data');
      return cached.data;
    }

    try {
      const response = await fetch(
        `https://www.alphavantage.co/query?function=TOP_GAINERS_LOSERS&apikey=${ALPHA_VANTAGE_KEY}`
      );
      if (!response.ok) throw new Error(`Market Movers fetch failed: ${response.status}`);

      const resData = await response.json();

      if (!resData.top_gainers || !resData.top_losers) {
        if (cached) return cached.data;
        return null;
      }

      const normalize = (item) => ({
        ticker: item.ticker,
        price: parseFloat(item.price),
        change: parseFloat(item.change_amount),
        changesPercentage: parseFloat(item.change_percentage?.replace('%', '') || 0)
      });

      const moversData = {
        gainers: resData.top_gainers.slice(0, 5).map(normalize),
        losers: resData.top_losers.slice(0, 5).map(normalize)
      };

      await Store.set(cacheKey, { data: moversData, timestamp: now });
      return moversData;
    } catch (error) {
      console.error('API Error (Market Movers):', error);
      return cached ? cached.data : null;
    }
  }

  return {
    fetchQuote,
    fetchStockPrice,
    fetchMarketMovers
  };
})();
