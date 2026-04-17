import { defineStore } from 'pinia';
import { Storage } from '@/utils/storage';

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

export const useInvestmentStore = defineStore('investments', {
  state: () => ({
    investments: [] as Investment[],
    isLoaded: false,
    realTimePrices: {} as Record<string, RealTimePrice>,
    isFetchingPrices: false,
  }),
  getters: {
    totalHoldings: (state) => {
        const holdings: Record<string, { qty: number, totalCost: number, realizedPL: number }> = {};
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
    cashBalance: (state) => {
        return state.investments.reduce((acc, inv) => {
            if (inv.symbol === 'CASH') return acc + (Number(inv.quantity) || 0);
            const tradeValue = (Number(inv.price) || 0) * (Number(inv.quantity) || 0);
            const comm = Number(inv.commission) || 0;
            return inv.type === 'buy' ? acc - (tradeValue + comm) : acc + (tradeValue - comm);
        }, 0);
    },
    portfolioValue: (state) => {
        let total = 0;
        const holdings = useInvestmentStore().totalHoldings;
        Object.entries(holdings).forEach(([symbol, data]) => {
            const currentPrice = state.realTimePrices[symbol]?.price || 0;
            total += (data.qty * currentPrice);
        });
        return total;
    },
    netWorth: (state) => {
        const store = useInvestmentStore();
        return store.cashBalance + store.portfolioValue;
    },
    unrealizedGain: (state) => {
        let gain = 0;
        const holdings = useInvestmentStore().totalHoldings;
        Object.entries(holdings).forEach(([symbol, data]) => {
            const currentPrice = state.realTimePrices[symbol]?.price || 0;
            if (currentPrice > 0 && data.qty > 0) {
                gain += (currentPrice * data.qty) - data.totalCost;
            }
        });
        return gain;
    },
    realizedGain: (state) => {
        let gain = 0;
        const holdings = useInvestmentStore().totalHoldings;
        Object.entries(holdings).forEach(([_, data]) => gain += data.realizedPL);
        return gain;
    },
    totalGain: (state) => {
        const store = useInvestmentStore();
        return store.unrealizedGain + store.realizedGain;
    },
    totalGainPercent: (state) => {
        const store = useInvestmentStore();
        const activeCost = store.portfolioValue - store.unrealizedGain;
        return activeCost > 0 ? (store.totalGain / activeCost) * 100 : 0;
    },
    dayChange: (state) => {
        let totalChange = 0;
        let totalValue = 0;
        const holdings = useInvestmentStore().totalHoldings;
        Object.entries(holdings).forEach(([symbol, data]) => {
            const priceInfo = state.realTimePrices[symbol];
            if (priceInfo && data.qty > 0) {
                totalValue += priceInfo.price * data.qty;
                totalChange += priceInfo.change * data.qty;
            }
        });
        const prev = totalValue - totalChange;
        return { value: totalChange, percent: (totalValue > 0 && prev > 0) ? (totalChange / prev) * 100 : 0 };
    },
    holdings: (state) => {
        const rawHoldings = useInvestmentStore().totalHoldings;
        return Object.entries(rawHoldings)
            .filter(([symbol, data]) => symbol !== 'CASH' && data.qty > 0)
            .map(([symbol, data]) => {
                const p = state.realTimePrices[symbol];
                const currentPrice = p?.price || 0;
                const totalValue = data.qty * currentPrice;
                const pl = currentPrice > 0 ? totalValue - data.totalCost : 0;
                return {
                    symbol,
                    quantity: data.qty,
                    avgPrice: data.qty > 0 ? data.totalCost / data.qty : 0,
                    currentPrice,
                    totalValue,
                    pl,
                    plPercent: data.totalCost > 0 ? (pl / data.totalCost) * 100 : 0,
                };
            }).sort((a, b) => b.totalValue - a.totalValue);
    },
    prices: (state) => {
        const p: Record<string, number> = {};
        Object.entries(state.realTimePrices).forEach(([s, info]) => p[s] = info.price);
        return p;
    }
  },
  actions: {
    async fetchInvestments() {
      const data = await Storage.get<Investment[]>('investments');
      this.investments = data || [];
      this.isLoaded = true;
      await this.fetchRealTimePrices();
    },
    async fetchRealTimePrices() {
        if (this.isFetchingPrices) return;
        const apiKey = import.meta.env.VITE_FINNHUB_KEY;
        if (!apiKey) return;
        
        const userSymbols = Object.keys(this.totalHoldings).filter(s => s !== 'CASH');
        const now = Date.now();
        const staleSymbols = userSymbols.filter(s => !this.realTimePrices[s] || (now - this.realTimePrices[s].timestamp > CACHE_DURATION));
        if (staleSymbols.length === 0) return;
        
        this.isFetchingPrices = true;
        await Promise.all(staleSymbols.map(async (symbol) => {
            try {
                const data = await queuedFetch(symbol, apiKey);
                if (data && data.c) {
                    this.realTimePrices[symbol] = {
                        price: data.c,
                        change: data.d,
                        changePercent: data.dp + '%',
                        previousClose: data.pc,
                        timestamp: Date.now()
                    };
                }
            } catch (err) { console.error(`Fetch failed for ${symbol}:`, err); }
        }));
        this.isFetchingPrices = false;
    },
    async addInvestment(investment: Omit<Investment, 'id'>) {
      const newInv: Investment = { ...investment, id: Storage.generateUUID(), notes: '' };
      this.investments.push(newInv);
      await Storage.set('investments', this.investments);
      await this.fetchRealTimePrices();
    },
    async deleteInvestment(id: string) {
      this.investments = this.investments.filter(i => i.id !== id);
      await Storage.set('investments', this.investments);
    },
    async deleteAsset(symbol: string) {
      this.investments = this.investments.filter(i => i.symbol !== symbol);
      await Storage.set('investments', this.investments);
    },
    async updateInvestment(id: string, updates: Partial<Investment>) {
      const idx = this.investments.findIndex(i => i.id === id);
      if (idx !== -1) {
          this.investments[idx] = { ...this.investments[idx], ...updates };
          await Storage.set('investments', this.investments);
          await this.fetchRealTimePrices();
      }
    },
    async importTradingViewCSV(csv: string) {
        const lines = csv.split('\n').filter(l => l.trim());
        if (lines.length < 2) return;
        const headers = lines[0].split(',').map(h => h.trim().toLowerCase());
        const mapped = lines.slice(1).map(line => {
            const cols = line.split(',');
            const obj: any = {};
            headers.forEach((h, i) => obj[h] = cols[i]?.trim());
            return obj;
        });
        const newEntries = mapped.filter(m => m.symbol && m.price).map(m => ({
            symbol: m.symbol.toUpperCase(),
            type: (m.type || m.side || 'buy').toLowerCase() === 'sell' ? 'sell' : 'buy',
            price: parseFloat(m.price),
            quantity: parseFloat(m.quantity || m.amount || m.qty),
            commission: parseFloat(m.commission || m.fee || 0),
            date: new Date(m.time || m.date || Date.now()).toISOString(),
            notes: 'Imported'
        })) as any[];
        await this.addInvestments(newEntries);
    },
    async addInvestments(investments: Omit<Investment, 'id'>[]) {
        const newEntries = investments.map(inv => ({ ...inv, id: Storage.generateUUID(), notes: inv.notes || '' }));
        this.investments.push(...newEntries);
        await Storage.set('investments', this.investments);
        await this.fetchRealTimePrices();
    }
  },
});
