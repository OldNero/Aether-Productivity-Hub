import { defineStore } from 'pinia';
import { supabase } from '@/utils/supabase';
import { parseTradingViewCSV } from '@/utils/csvParser';
import { useAuthStore } from './auth';

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
  import_id?: string;
}

export interface InvestmentImport {
  id: string;
  filename: string;
  content_hash: string;
  transaction_count: number;
  created_at: string;
  user_id: string;
}

export interface RealTimePrice {
  price: number;
  change: number;
  changePercent: string;
  previousClose: number;
  timestamp: number;
}

let isProcessingQueue = false;
const fetchQueue: Array<{ symbol: string, resolve: (val: any) => void, reject: (err: any) => void }> = [];
const CACHE_DURATION = 60000; 

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
        await new Promise(r => setTimeout(r, 1100)); 
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
  imports: InvestmentImport[];
  isLoaded: boolean;
  realTimePrices: Record<string, RealTimePrice>;
  isFetchingPrices: boolean;
}

export const useInvestmentStore = defineStore('investments', {
  state: (): InvestmentStoreState => ({
    investments: [],
    imports: [],
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
      const auth = useAuthStore();

      // Wait for auth to finish initializing before checking session.
      // Without this guard, the function bails out with [] on first load
      // because auth.init() is async and may not have resolved yet.
      if (!auth.isInitialized) {
        await new Promise<void>(resolve => {
          const unwatch = setInterval(() => {
            if (auth.isInitialized) {
              clearInterval(unwatch);
              resolve();
            }
          }, 50);
        });
      }

      if (!auth.session?.user) {
        this.investments = [];
        this.isLoaded = true;
        return;
      }
      
      const { data, error } = await supabase
        .from('investments')
        .select('*')
        .eq('user_id', auth.session.user.id)
        .order('date', { ascending: false });

      if (error) {
        console.error('Error fetching investments:', error);
        this.investments = [];
      } else {
        this.investments = data || [];
      }
      this.isLoaded = true;
      await this.fetchRealTimePrices();
    },

    async fetchImports() {
      const auth = useAuthStore();

      // Same auth-init guard as fetchInvestments
      if (!auth.isInitialized) {
        await new Promise<void>(resolve => {
          const unwatch = setInterval(() => {
            if (auth.isInitialized) {
              clearInterval(unwatch);
              resolve();
            }
          }, 50);
        });
      }

      if (!auth.session?.user) {
        this.imports = [];
        return;
      }

      try {
        const { data, error } = await supabase
          .from('investment_imports')
          .select('*')
          .eq('user_id', auth.session.user.id)
          .order('created_at', { ascending: false });

        if (error) throw error;
        this.imports = data || [];
      } catch (err) {
        console.error('Failed to fetch investment imports:', err);
      }
    },

    async fetchRealTimePrices() {
        if (this.isFetchingPrices) return;
        
        const authStore = useAuthStore();
        const finnhubKey = authStore.currentUser?.finnhub_key;
        
        if (!finnhubKey) return;
        
        const userSymbols = Object.keys(this.totalHoldings).filter(s => s !== 'CASH');
        const now = Date.now();
        const staleSymbols = userSymbols.filter(s => !this.realTimePrices[s] || (now - this.realTimePrices[s].timestamp > CACHE_DURATION));
        if (staleSymbols.length === 0) return;
        
        this.isFetchingPrices = true;
        
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
        
        this.isFetchingPrices = false;
    },
    async addInvestment(investment: Omit<Investment, 'id'>) {
      const auth = useAuthStore();
      const { data: newInv, error } = await supabase
        .from('investments')
        .insert({
          ...investment,
          user_id: auth.session?.user?.id
        })
        .select()
        .single();

      if (error) throw error;
      if (newInv) {
        this.investments.push(newInv);
      }
      await this.fetchRealTimePrices();
    },
    async deleteInvestment(id: string) {
      const { error } = await supabase.from('investments').delete().eq('id', id);
      if (error) throw error;
      this.investments = this.investments.filter(i => i.id !== id);
    },
    async batchDelete(ids: string[]) {
      if (ids.length === 0) return;
      const { error } = await supabase.from('investments').delete().in('id', ids);
      if (error) throw error;
      this.investments = this.investments.filter(i => !ids.includes(i.id));
    },
    async deleteAsset(symbol: string) {
      const targetSymbol = symbol.trim().toUpperCase();
      const { error } = await supabase
        .from('investments')
        .delete()
        .eq('symbol', targetSymbol);
      
      if (error) throw error;
      this.investments = this.investments.filter(i => i.symbol.trim().toUpperCase() !== targetSymbol);
    },
    async updateInvestment(id: string, updates: Partial<Investment>) {
      const { error } = await supabase
        .from('investments')
        .update(updates)
        .eq('id', id);

      if (error) throw error;
      
      const idx = this.investments.findIndex(i => i.id === id);
      if (idx !== -1) {
        this.investments[idx] = { ...this.investments[idx], ...updates };
      }
      await this.fetchRealTimePrices();
    },

    async importTradingViewCSV(filename: string, csv: string, hash?: string) {
        const auth = useAuthStore();
        try {
            // 0. Duplicate check
            if (hash) {
                const { data: existing } = await supabase
                    .from('investment_imports')
                    .select('id')
                    .eq('user_id', auth.session?.user?.id)
                    .eq('content_hash', hash)
                    .limit(1);
                
                if (existing && existing.length > 0) {
                    throw new Error('DUPLICATE_IMPORT');
                }
            }

            const transactions = parseTradingViewCSV(csv);
            if (transactions.length === 0) return 0;

            // DEBUG: log first parsed row so we can verify payload against DB schema
            console.log('[Investment Import] Parsed transactions count:', transactions.length);
            console.log('[Investment Import] Sample row:', JSON.stringify(transactions[0], null, 2));
            console.log('[Investment Import] user_id:', auth.session?.user?.id);

            // 1. Create import record
            const { data: importRecord, error: importError } = await supabase
                .from('investment_imports')
                .insert({
                    filename,
                    content_hash: hash || null,
                    transaction_count: transactions.length,
                    user_id: auth.session?.user?.id
                })
                .select()
                .single();

            if (importError) throw importError;

            // 2. Add transactions with import_id
            const inserts = transactions.map(inv => ({
                ...inv,
                user_id: auth.session?.user?.id,
                import_id: importRecord.id
            }));

            console.log('[Investment Import] Inserting into investments table...');
            const { data, error } = await supabase
                .from('investments')
                .insert(inserts)
                .select();

            if (error) {
                // Rollback: delete the orphaned import record so DB stays clean
                console.error('[Investment Import] Insert failed, rolling back import record:', error);
                await supabase.from('investment_imports').delete().eq('id', importRecord.id);
                
                // Throw a descriptive error so the UI shows the real cause
                const detail = error.message || error.details || JSON.stringify(error);
                throw new Error(`SUPABASE_ERROR: ${detail}`);
            }

            if (data) {
                console.log('[Investment Import] Successfully inserted', data.length, 'rows');
                this.investments.push(...data);
            }

            await Promise.all([
                this.fetchRealTimePrices(),
                this.fetchImports()
            ]);

            return transactions.length;
        } catch (err) {
            console.error('CSV Import Error:', err);
            throw err;
        }
    },


    async deleteImport(importId: string) {
      try {
        const { error } = await supabase
          .from('investment_imports')
          .delete()
          .eq('id', importId);

        if (error) throw error;
        
        this.investments = this.investments.filter(i => i.import_id !== importId);
        this.imports = this.imports.filter(i => i.id !== importId);
      } catch (err) {
        console.error('Failed to delete investment import:', err);
        throw err;
      }
    }
  },
});
