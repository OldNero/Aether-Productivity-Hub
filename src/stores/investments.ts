import { defineStore } from 'pinia';
import { apiClient } from '@/utils/api';
import { parseTradingViewCSV } from '@/utils/csvParser';

export interface Investment {
  id: string;
  symbol: string;
  type: 'buy' | 'sell';
  price: number;
  quantity: number;
  commission: number;
  date: string;
  notes: string;
  user_id?: string;
}

export interface RealTimePrice {
  price: number;
  change: number;
  changePercent: string;
  previousClose: number;
  timestamp: number;
}

// Global fetch queue to prevent 429s
let isProcessingQueue = false;
const fetchQueue: Array<{ symbol: string, resolve: (val: any) => void, reject: (err: any) => void }> = [];
const CACHE_DURATION = 60000; // 1 minute cache for live quotes

const processQueue = async (apiKey: string) => {
    if (isProcessingQueue) return;
    isProcessingQueue = true;
    while (fetchQueue.length > 0) {
        const item = fetchQueue.shift();
        if (!item) continue;
        try {
            const response = await fetch(`https://finnhub.io/api/v1/quote?symbol=${item.symbol}&token=${apiKey}`);
            if (response.status === 429) { 
                fetchQueue.unshift(item); 
                await new Promise(r => setTimeout(r, 2000)); 
                continue; 
            }
            if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
            const data = await response.json();
            item.resolve(data);
        } catch (err) { item.reject(err); }
        await new Promise(r => setTimeout(r, 1100)); // Standard 60/min limit
    }
    isProcessingQueue = false;
};

const queuedFetch = (symbol: string, apiKey: string): Promise<any> => {
    return new Promise((resolve, reject) => {
        fetchQueue.push({ symbol, resolve, reject });
        processQueue(apiKey);
    });
};

export interface HoldingData {
  qty: number;
  totalCost: number;
  realizedPL: number;
}

export interface InvestmentStoreState {
  investments: Investment[];
  isLoaded: boolean;
  realTimePrices: Record<string, RealTimePrice>;
  isFetchingPrices: boolean;
}

export const useInvestmentStore = defineStore('investments', {
  state: (): InvestmentStoreState => ({
    investments: [],
    isLoaded: false,
    realTimePrices: {},
    isFetchingPrices: false,
  }),
  getters: {
    totalHoldings: (state): Record<string, HoldingData> => {
        const holdings: Record<string, HoldingData> = {};
        const sorted = [...state.investments].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
        
        sorted.forEach(inv => {
            if (inv.symbol === 'CASH') return;
            if (!holdings[inv.symbol]) holdings[inv.symbol] = { qty: 0, totalCost: 0, realizedPL: 0 };
            const qty = Number(inv.quantity) || 0;
            const price = Number(inv.price) || 0;
            const comm = Number(inv.commission) || 0;
            
            if (inv.type === 'buy') {
                holdings[inv.symbol].qty += qty;
                holdings[inv.symbol].totalCost += (price * qty) + comm;
            } else {
                const prevQty = holdings[inv.symbol].qty;
                const avgCostPerShare = prevQty > 0 ? holdings[inv.symbol].totalCost / prevQty : 0;
                const saleProceeds = (price * qty) - comm;
                const costOfSharesSold = avgCostPerShare * qty;
                holdings[inv.symbol].realizedPL += (saleProceeds - costOfSharesSold);
                holdings[inv.symbol].qty -= qty;
                holdings[inv.symbol].totalCost -= costOfSharesSold;
            }
        });
        return holdings;
    },
    cashBalance: (state): number => {
        return state.investments.reduce((acc, inv) => {
            if (inv.symbol === 'CASH') return acc + (Number(inv.quantity) || 0);
            const tradeValue = (Number(inv.price) || 0) * (Number(inv.quantity) || 0);
            const comm = Number(inv.commission) || 0;
            return inv.type === 'buy' ? acc - (tradeValue + comm) : acc + (tradeValue - comm);
        }, 0);
    },
    portfolioValue(): number {
        let total = 0;
        const holdings = this.totalHoldings;
        Object.entries(holdings).forEach(([symbol, data]) => {
            const currentPrice = this.realTimePrices[symbol]?.price || (data.qty > 0 ? data.totalCost / data.qty : 0);
            total += (data.qty * currentPrice);
        });
        return total;
    },
    netWorth(): number {
        return this.cashBalance + this.portfolioValue;
    },
    unrealizedGain(): number {
        let gain = 0;
        const holdings = this.totalHoldings;
        Object.entries(holdings).forEach(([symbol, data]) => {
            const currentPrice = this.realTimePrices[symbol]?.price;
            if (currentPrice && currentPrice > 0 && data.qty > 0) {
                gain += (currentPrice * data.qty) - data.totalCost;
            }
        });
        return gain;
    },
    realizedGain(): number {
        let gain = 0;
        const holdings = this.totalHoldings;
        Object.entries(holdings).forEach(([_, data]) => gain += (data as HoldingData).realizedPL);
        return gain;
    },
    totalGain(): number {
        return this.unrealizedGain + this.realizedGain;
    },
    totalGainPercent(): number {
        const activeCost = this.portfolioValue - this.unrealizedGain;
        return activeCost > 0 ? (this.totalGain / activeCost) * 100 : 0;
    },
    dayChange(): { value: number, percent: number } {
        let totalChange = 0;
        let totalValue = 0;
        const holdings = this.totalHoldings;
        Object.entries(holdings).forEach(([symbol, data]) => {
            const priceInfo = this.realTimePrices[symbol];
            if (priceInfo && data.qty > 0) {
                totalValue += priceInfo.price * data.qty;
                totalChange += priceInfo.change * data.qty;
            }
        });
        const prev = totalValue - totalChange;
        return { value: totalChange, percent: (totalValue > 0 && prev > 0) ? (totalChange / prev) * 100 : 0 };
    },
    holdings(): any[] {
        const rawHoldings = this.totalHoldings;
        return Object.entries(rawHoldings)
            .filter(([symbol, data]) => symbol !== 'CASH' && data.qty > 0)
            .map(([symbol, data]) => {
                const p = this.realTimePrices[symbol];
                const avg = data.qty > 0 ? data.totalCost / data.qty : 0;
                const currentPrice = (p?.price && p.price > 0) ? p.price : avg;
                const totalValue = data.qty * currentPrice;
                const pl = (p?.price && p.price > 0) ? totalValue - data.totalCost : 0;
                
                return {
                    symbol,
                    quantity: data.qty,
                    avgPrice: avg,
                    currentPrice,
                    totalValue,
                    pl,
                    plPercent: (data.totalCost > 0 && (p?.price && p.price > 0)) ? (pl / data.totalCost) * 100 : 0,
                    isLive: !!(p?.price && p.price > 0),
                    ytd: 0
                };
            }).sort((a, b) => b.totalValue - a.totalValue);
    },
    prices: (state): Record<string, number> => {
        const p: Record<string, number> = {};
        Object.entries(state.realTimePrices).forEach(([s, info]) => p[s] = info.price);
        return p;
    },
    sortedInvestments: (state): Investment[] => {
        return [...state.investments].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
    }
  },
  actions: {
    async fetchInvestments() {
      try {
        const data = await apiClient('/investments');
        this.investments = data || [];
      } catch (err) {
        this.investments = [];
      }
      this.isLoaded = true;
      await this.fetchRealTimePrices();
    },
    async fetchRealTimePrices() {
        if (this.isFetchingPrices) return;
        
        const authStore = useAuthStore();
        const finnhubKey = authStore.currentUser?.finnhubKey;
        const alphaKey = authStore.currentUser?.alphaKey;
        
        if (!finnhubKey && !alphaKey) return;
        
        const userSymbols = Object.keys(this.totalHoldings).filter(s => s !== 'CASH');
        const now = Date.now();
        const staleSymbols = userSymbols.filter(s => !this.realTimePrices[s] || (now - this.realTimePrices[s].timestamp > CACHE_DURATION));
        if (staleSymbols.length === 0) return;
        
        this.isFetchingPrices = true;
        
        // Priority to Finnhub if key provided
        if (finnhubKey) {
            await Promise.all(staleSymbols.map(async (symbol) => {
                try {
                    const data = await queuedFetch(symbol, finnhubKey);
                    if (data && data.c) {
                        this.realTimePrices[symbol] = {
                            price: data.c,
                            change: data.d,
                            changePercent: data.dp + '%',
                            previousClose: data.pc,
                            timestamp: Date.now()
                        };
                    }
                } catch (err) { console.error(`Finnhub failed for ${symbol}:`, err); }
            }));
        } else if (alphaKey) {
            // Fallback to Alpha Vantage (Single request per symbol, 5 per min limit)
            for (const symbol of staleSymbols) {
                try {
                    const resp = await fetch(`https://www.alphavantage.co/query?function=GLOBAL_QUOTE&symbol=${symbol}&apikey=${alphaKey}`);
                    const data = await resp.json();
                    const quote = data['Global Quote'];
                    if (quote && quote['05. price']) {
                        this.realTimePrices[symbol] = {
                            price: parseFloat(quote['05. price']),
                            change: parseFloat(quote['09. change']),
                            changePercent: quote['10. change percent'],
                            previousClose: parseFloat(quote['08. previous close']),
                            timestamp: Date.now()
                        };
                    }
                    // Wait 12 seconds between requests to respect 5/min limit if not premium
                    if (staleSymbols.length > 1) await new Promise(r => setTimeout(r, 12000));
                } catch (err) { console.error(`Alpha Vantage failed for ${symbol}:`, err); }
            }
        }
        this.isFetchingPrices = false;
    },
    async addInvestment(investment: Omit<Investment, 'id'>) {
      const newInv = await apiClient('/investments', {
        method: 'POST',
        body: JSON.stringify(investment)
      });
      this.investments.push(newInv);
      await this.fetchRealTimePrices();
    },
    async deleteInvestment(id: string) {
      await apiClient(`/investments/${id}`, { method: 'DELETE' });
      this.investments = this.investments.filter(i => i.id !== id);
    },
    async batchDelete(ids: string[]) {
      if (ids.length === 0) return;
      await apiClient('/investments/batch-delete', {
        method: 'POST',
        body: JSON.stringify({ ids })
      });
      this.investments = this.investments.filter(i => !ids.includes(i.id));
    },
    async deleteAsset(symbol: string) {
      const targetSymbol = symbol.trim().toUpperCase();
      await apiClient(`/investments/asset/${targetSymbol}`, { method: 'DELETE' });
      this.investments = this.investments.filter(i => i.symbol.trim().toUpperCase() !== targetSymbol);
    },
    async updateInvestment(id: string, updates: Partial<Investment>) {
      const idx = this.investments.findIndex(i => i.id === id);
      if (idx !== -1) {
          await apiClient(`/investments/${id}`, {
              method: 'PUT',
              body: JSON.stringify(updates)
          });
          this.investments[idx] = { ...this.investments[idx], ...updates };
          await this.fetchRealTimePrices();
      }
    },
    async importTradingViewCSV(csv: string) {
        try {
            const transactions = parseTradingViewCSV(csv);
            if (transactions.length > 0) {
                await this.addInvestments(transactions);
            }
            return transactions.length;
        } catch (err) {
            console.error('CSV Import Error:', err);
            return 0;
        }
    },
    async addInvestments(investments: Omit<Investment, 'id'>[]) {
        for (const entry of investments) {
            const newItem = await apiClient('/investments', {
                method: 'POST',
                body: JSON.stringify(entry)
            });
            this.investments.push(newItem);
        }
        await this.fetchRealTimePrices();
    }
  },
});
