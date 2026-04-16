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
}

export const MARKET_MOVERS_SYMBOLS = [
  'AAPL', 'MSFT', 'AMZN', 'NVDA', 'GOOGL',
  'SPY', 'DIA', 'GLD', 'USO', 'BINANCE:BTCUSDT'
];

export const useInvestmentStore = defineStore('investments', {
  state: () => ({
    investments: [] as Investment[],
    isLoaded: false,
    realTimePrices: {} as Record<string, RealTimePrice>,
    isFetchingPrices: false,
  }),
  getters: {
    totalHoldings: (state) => {
        const holdings: Record<string, { qty: number, totalCost: number }> = {};
        state.investments.forEach(inv => {
            if (inv.symbol === 'CASH') return;
            if (!holdings[inv.symbol]) holdings[inv.symbol] = { qty: 0, totalCost: 0 };
            
            const qty = Number(inv.quantity) || 0;
            const price = Number(inv.price) || 0;
            const commission = Number(inv.commission) || 0;
            
            const multiplier = inv.type === 'buy' ? 1 : -1;
            const prevQty = holdings[inv.symbol].qty;
            holdings[inv.symbol].qty += qty * multiplier;
            
            if (inv.type === 'buy') {
                holdings[inv.symbol].totalCost += (price * qty) + commission;
            } else {
                const divisor = (prevQty);
                const avgCost = divisor > 0 ? holdings[inv.symbol].totalCost / divisor : 0;
                holdings[inv.symbol].totalCost -= (avgCost * qty);
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
    investedValue: (state) => {
        let total = 0;
        const holdings = useInvestmentStore().totalHoldings;
        Object.entries(holdings).forEach(([symbol, data]) => {
            const currentPrice = Number(state.realTimePrices[symbol]?.price) || 0;
            const price = currentPrice || (state.investments.filter(i => i.symbol === symbol).slice(-1)[0]?.price || 0);
            total += (Number(data.qty) || 0) * (Number(price) || 0);
        });
        return total;
    },
    netWorth: (state) => {
        return useInvestmentStore().cashBalance + useInvestmentStore().investedValue;
    },
    totalPL: (state) => {
        let pl = 0;
        const holdings = useInvestmentStore().totalHoldings;
        Object.entries(holdings).forEach(([symbol, data]) => {
            const currentPrice = Number(state.realTimePrices[symbol]?.price) || 0;
            if (currentPrice > 0 && data.qty > 0) {
                pl += (currentPrice * data.qty) - (Number(data.totalCost) || 0);
            }
        });
        return pl;
    },
    dayChange: (state) => {
        let totalChange = 0;
        let totalValue = 0;
        const holdings = useInvestmentStore().totalHoldings;
        Object.entries(holdings).forEach(([symbol, data]) => {
            const priceInfo = state.realTimePrices[symbol];
            if (priceInfo && data.qty > 0) {
                const currentVal = priceInfo.price * data.qty;
                totalValue += currentVal;
                totalChange += priceInfo.change * data.qty;
            }
        });
        return {
            value: totalChange,
            percent: totalValue > 0 ? (totalChange / (totalValue - totalChange)) * 100 : 0
        };
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
        const userSymbols = Object.keys(this.totalHoldings).filter(s => s !== 'CASH');
        const allSymbols = Array.from(new Set([...MARKET_MOVERS_SYMBOLS, ...userSymbols]));
        
        const apiKey = import.meta.env.VITE_FINNHUB_KEY;
        if (!apiKey) return;

        this.isFetchingPrices = true;
        const results: Record<string, RealTimePrice> = {};

        const fetchSymbol = async (symbol: string, index: number) => {
            try {
                await new Promise(r => setTimeout(r, index * 150));
                const response = await fetch(`https://finnhub.io/api/v1/quote?symbol=${symbol}&token=${apiKey}`);
                const data = await response.json();
                
                if (data && data.c) {
                    results[symbol] = {
                        price: data.c,
                        change: data.d,
                        changePercent: data.dp + '%',
                        previousClose: data.pc
                    };
                }
            } catch (err) {
                console.error(`Fetch failed for ${symbol}`);
            }
        };

        await Promise.all(allSymbols.map((s, i) => fetchSymbol(s, i)));
        this.realTimePrices = { ...this.realTimePrices, ...results };
        this.isFetchingPrices = false;
    },
    async addInvestment(investment: Omit<Investment, 'id'>) {
      const newInvestment: Investment = { ...investment, id: Storage.generateUUID() };
      this.investments.push(newInvestment);
      await Storage.set('investments', this.investments);
      await this.fetchRealTimePrices();
      return newInvestment;
    },
    async addInvestments(investments: Omit<Investment, 'id'>[]) {
      const newEntries = investments.map(inv => ({ ...inv, id: Storage.generateUUID() }));
      this.investments.push(...newEntries);
      await Storage.set('investments', this.investments);
      await this.fetchRealTimePrices();
    },
    async deleteInvestment(id: string) {
      this.investments = this.investments.filter(i => i.id !== id);
      await Storage.remove('investments', id);
    }
  },
});
