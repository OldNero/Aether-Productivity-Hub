export interface SymbolInfo {
  symbol: string;
  name: string;
  type: 'Stock' | 'ETF';
}

export const POPULAR_SYMBOLS: SymbolInfo[] = [
  { symbol: 'AAPL', name: 'Apple Inc.', type: 'Stock' },
  { symbol: 'MSFT', name: 'Microsoft Corporation', type: 'Stock' },
  { symbol: 'GOOGL', name: 'Alphabet Inc.', type: 'Stock' },
  { symbol: 'AMZN', name: 'Amazon.com Inc.', type: 'Stock' },
  { symbol: 'NVDA', name: 'NVIDIA Corporation', type: 'Stock' },
  { symbol: 'TSLA', name: 'Tesla, Inc.', type: 'Stock' },
  { symbol: 'META', name: 'Meta Platforms, Inc.', type: 'Stock' },
  { symbol: 'BRK.B', name: 'Berkshire Hathaway Inc.', type: 'Stock' },
  { symbol: 'V', name: 'Visa Inc.', type: 'Stock' },
  { symbol: 'JNJ', name: 'Johnson & Johnson', type: 'Stock' },
  { symbol: 'WMT', name: 'Walmart Inc.', type: 'Stock' },
  { symbol: 'JPM', name: 'JPMorgan Chase & Co.', type: 'Stock' },
  { symbol: 'MA', name: 'Mastercard Incorporated', type: 'Stock' },
  { symbol: 'PG', name: 'Procter & Gamble Co.', type: 'Stock' },
  { symbol: 'UNH', name: 'UnitedHealth Group Incorporated', type: 'Stock' },
  { symbol: 'SPY', name: 'SPDR S&P 500 ETF Trust', type: 'ETF' },
  { symbol: 'QQQ', name: 'Invesco QQQ Trust', type: 'ETF' },
  { symbol: 'VOO', name: 'Vanguard S&P 500 ETF', type: 'ETF' },
  { symbol: 'VTI', name: 'Vanguard Total Stock Market ETF', type: 'ETF' },
  { symbol: 'IWM', name: 'iShares Russell 2000 ETF', type: 'ETF' },
  { symbol: 'DIA', name: 'SPDR Dow Jones Industrial Average ETF', type: 'ETF' },
  { symbol: 'ARKK', name: 'ARK Innovation ETF', type: 'ETF' },
  { symbol: 'SCHD', name: 'Schwab US Dividend Equity ETF', type: 'ETF' },
  { symbol: 'VGT', name: 'Vanguard Information Technology ETF', type: 'ETF' },
  { symbol: 'TLT', name: 'iShares 20+ Year Treasury Bond ETF', type: 'ETF' },
  { symbol: 'BTC', name: 'Bitcoin', type: 'Stock' },
  { symbol: 'ETH', name: 'Ethereum', type: 'Stock' },
];
