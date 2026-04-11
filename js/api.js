/**
 * Centralized API Service for Aether Productivity Hub
 * Handles interaction with API Ninjas and other external data sources.
 */

const API = (function() {
  const NINJA_API_KEY = 'F1ZUIGi9ZMtPfKZknSizD9VgaKORsCZjNoDmds3e';
  const ALPHA_VANTAGE_KEY = 'QM642MJ8XZK68PR4';

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
    const cached = Store.get(cacheKey);
    const now = Date.now();

    // 1. Return cached data if it's less than 60 minutes old
    if (cached && (now - cached.timestamp < 3600000)) {
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
        changesPercentage: parseFloat(quote['10. change percent'].replace('%', ''))
      };

      // Update cache
      Store.set(cacheKey, { data: standardizedData, timestamp: now });
      
      return standardizedData;
    } catch (error) {
      console.error(`API Error (Stock - ${ticker}):`, error);
      return cached ? cached.data : null;
    }
  }

  return {
    fetchQuote,
    fetchStockPrice
  };
})();

  return {
    fetchQuote,
    fetchStockPrice
  };
})();
