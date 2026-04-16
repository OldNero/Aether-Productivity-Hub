<script setup lang="ts">
import { onMounted, onUnmounted, ref, computed } from 'vue';
import { getUSMarketStatus, type MarketInfo } from '@/utils/marketTimer';
import { useInvestmentStore, MARKET_MOVERS_SYMBOLS } from '@/stores/investments';
import { POPULAR_SYMBOLS, type SymbolInfo } from '@/utils/symbols';
import { parseTradingViewCSV } from '@/utils/csvParser';

const investmentStore = useInvestmentStore();
const isModalOpen = ref(false);
const marketInfo = ref<MarketInfo>(getUSMarketStatus());
let statusTimer: number | null = null;

// Form State
const newInvestment = ref({
  symbol: '',
  type: 'buy' as 'buy' | 'sell',
  price: 0,
  quantity: 0,
  commission: 0,
  date: new Date().toISOString().split('T')[0],
  notes: ''
});

// CSV State
const fileInput = ref<HTMLInputElement | null>(null);
const isDragging = ref(false);

// Autocomplete State
const symbolSearch = ref('');
const isDropdownOpen = ref(false);
const filteredSymbols = computed(() => {
  if (!symbolSearch.value) return [];
  const query = symbolSearch.value.toUpperCase();
  return POPULAR_SYMBOLS.filter(s => 
    s.symbol.includes(query) || s.name.toUpperCase().includes(query)
  ).slice(0, 6);
});

// Real-time calculation
const totalValue = computed(() => {
  const principal = newInvestment.value.price * newInvestment.value.quantity;
  if (newInvestment.value.type === 'buy') {
    return principal + newInvestment.value.commission;
  }
  return principal - newInvestment.value.commission;
});

onMounted(async () => {
  await investmentStore.fetchInvestments();
  statusTimer = window.setInterval(() => {
    marketInfo.value = getUSMarketStatus();
  }, 10000);
});

onUnmounted(() => {
  if (statusTimer) clearInterval(statusTimer);
});

const openModal = () => (isModalOpen.value = true);
const closeModal = () => {
  isModalOpen.value = false;
  symbolSearch.value = '';
  newInvestment.value = {
    symbol: '',
    type: 'buy',
    price: 0,
    quantity: 0,
    commission: 0,
    date: new Date().toISOString().split('T')[0],
    notes: ''
  };
};

const selectSymbol = (s: SymbolInfo) => {
  newInvestment.value.symbol = s.symbol;
  symbolSearch.value = s.symbol;
  isDropdownOpen.value = false;
};

const handleAddInvestment = async () => {
  if (newInvestment.value.symbol && newInvestment.value.price > 0 && newInvestment.value.quantity > 0) {
    await investmentStore.addInvestment({
      ...newInvestment.value,
      symbol: newInvestment.value.symbol.toUpperCase()
    });
    closeModal();
  }
};

const handleFileUpload = async (event: Event) => {
  const file = (event.target as HTMLInputElement).files?.[0];
  if (!file) return;
  processFile(file);
};

const handleDrop = (event: DragEvent) => {
  isDragging.value = false;
  const file = event.dataTransfer?.files[0];
  if (file) processFile(file);
};

const processFile = (file: File) => {
  if (!file.name.endsWith('.csv')) {
    alert('Please upload a valid CSV file.');
    return;
  }
  const reader = new FileReader();
  reader.onload = async (e) => {
    const text = e.target?.result as string;
    const transactions = parseTradingViewCSV(text);
    if (transactions.length > 0) {
      await investmentStore.addInvestments(transactions);
    } else {
      alert('No valid transactions found in CSV.');
    }
  };
  reader.readAsText(file);
};

const totalHoldingsCount = computed(() => Object.keys(investmentStore.totalHoldings).length);

const formatCurrency = (val: number) => {
    return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(val);
};

const formattedNetWorth = computed(() => formatCurrency(investmentStore.netWorth));
const formattedCash = computed(() => formatCurrency(investmentStore.cashBalance));
const formattedInvested = computed(() => formatCurrency(investmentStore.investedValue));
const formattedPL = computed(() => formatCurrency(investmentStore.totalPL));
const dayChangeValue = computed(() => formatCurrency(investmentStore.dayChange.value));
const dayChangePercent = computed(() => investmentStore.dayChange.percent.toFixed(2) + '%');
</script>

<template>
  <div class="p-6 max-w-screen-2xl mx-auto page-transition">
    <!-- Header -->
    <div class="mb-10 flex items-center justify-between">
      <div>
        <div class="flex items-center gap-4">
          <h1 class="text-4xl md:text-5xl font-bold tracking-tighter text-zinc-100">
            Portfolio
          </h1>
          
          <!-- US Market Status Badge -->
          <div class="group relative flex items-center gap-2 px-3 py-1.5 rounded-full bg-zinc-900/50 border border-border cursor-pointer self-end mb-1 transition-all hover:bg-zinc-800">
            <span class="w-2 h-2 rounded-full animate-pulse" :class="marketInfo.color"></span>
            <span class="text-[10px] font-bold text-zinc-400 uppercase tracking-wider">{{ marketInfo.label }}</span>
            <!-- US Market Status Tooltip (Positioned below to clear header) -->
            <div class="absolute top-full left-0 mt-2 w-max px-3 py-2 bg-zinc-900 border border-white/10 text-zinc-200 text-[10px] font-medium rounded-lg opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all whitespace-nowrap shadow-2xl z-[999] backdrop-blur-xl">
              <div class="flex flex-col gap-1">
                <span class="text-zinc-100 font-bold uppercase tracking-widest text-[9px]">{{ marketInfo.nextEvent }}</span>
                <span class="text-muted">{{ marketInfo.remainingTime }}</span>
              </div>
            </div>
          </div>
        </div>
        <p class="text-base text-muted mt-2 max-w-2xl">
          A real-time overview of your global asset positions.
        </p>
      </div>
      <button @click="openModal" class="btn-primary">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
          <line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" />
        </svg>
        Add Asset
      </button>
    </div>

    <!-- Import & Stats -->
    <div class="mb-6 grid grid-cols-1 lg:grid-cols-3 gap-4">
      <!-- Net Worth Card -->
      <div class="card flex flex-col justify-center order-first">
        <div class="flex items-center justify-between mb-2">
            <p class="text-[10px] font-bold text-muted uppercase tracking-[0.2em]">Net Worth</p>
            <div class="flex items-center gap-2">
                <span class="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
                <p class="text-[10px] text-emerald-400 font-bold uppercase tracking-widest">Live Sync</p>
            </div>
        </div>
        <p class="text-3xl font-bold font-mono text-zinc-100 tracking-tighter">{{ formattedNetWorth }}</p>
      </div>

      <!-- CSV Import Dropzone -->
      <div class="lg:col-span-2">
        <div 
          @dragover.prevent="isDragging = true"
          @dragleave.prevent="isDragging = false"
          @drop.prevent="handleDrop"
          @click="fileInput?.click()"
          class="h-32 border-2 border-dashed rounded-2xl flex flex-col items-center justify-center bg-white/[0.02] hover:bg-white/[0.04] transition-all cursor-pointer group"
          :class="isDragging ? 'border-emerald-500/50 bg-emerald-500/5' : 'border-white/10'"
        >
          <div class="flex items-center gap-3 text-muted group-hover:text-emerald-400 transition-colors">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/>
              </svg>
              <p class="text-sm font-semibold tracking-tight">Drop TradingView CSV or click to import</p>
          </div>
          <p class="text-[10px] text-zinc-500 mt-1 uppercase tracking-widest">Symbol, Side, Qty, Fill Price, Commission...</p>
          <input type="file" ref="fileInput" @change="handleFileUpload" class="hidden" accept=".csv" />
        </div>
      </div>
    </div>

    <!-- Stats Grid -->
    <div class="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4 mb-6">
      <div class="card flex flex-col gap-1 border-indigo-500/20">
        <p class="label">Cash Balance</p>
        <p class="text-2xl font-bold font-mono text-indigo-400">{{ formattedCash }}</p>
      </div>
      <div class="card flex flex-col gap-1">
        <p class="label">Invested</p>
        <p class="text-2xl font-bold font-mono text-zinc-100">{{ formattedInvested }}</p>
      </div>
      <div class="card flex flex-col gap-1">
        <p class="label">Total P/L</p>
        <p class="text-2xl font-bold font-mono" :class="investmentStore.totalPL >= 0 ? 'text-emerald-400' : 'text-rose-400'">
          {{ formattedPL }}
        </p>
      </div>
      <div class="card flex flex-col gap-1">
        <p class="label">Day Change</p>
        <p class="text-xl font-bold font-mono" :class="investmentStore.dayChange.value >= 0 ? 'text-emerald-400' : 'text-rose-400'">
          {{ dayChangeValue }} ({{ dayChangePercent }})
        </p>
      </div>
      <div class="card flex flex-col gap-1">
        <p class="label">Positions</p>
        <p class="text-2xl font-bold text-zinc-100">{{ totalHoldingsCount }}</p>
      </div>
      <div class="card flex flex-col gap-1">
        <p class="label">Efficiency</p>
        <p class="text-2xl font-bold text-zinc-100">100%</p>
      </div>
    </div>

    <!-- Ledger & Market -->
    <div class="grid grid-cols-1 lg:grid-cols-3 gap-4">
      <div class="card lg:col-span-2 relative overflow-hidden group min-h-[400px]">
        <h3 class="font-semibold text-zinc-100 mb-4">Asset Ledger</h3>
        <div class="space-y-3" v-if="investmentStore.investments.length > 0">
           <div v-for="inv in investmentStore.investments" :key="inv.id" class="flex items-center justify-between p-4 bg-white/5 rounded-xl border border-white/5 group/item">
              <div class="flex items-center gap-4">
                <div class="w-10 h-10 rounded-lg bg-zinc-800 flex items-center justify-center font-bold text-xs">{{ inv.symbol }}</div>
                <div>
                   <p class="text-sm font-bold text-zinc-100 capitalize">{{ inv.type }} {{ inv.quantity }} shares</p>
                   <p class="text-[10px] text-muted uppercase">{{ inv.date }}</p>
                </div>
              </div>
              <div class="text-right flex items-center gap-4">
                 <div>
                   <p class="text-sm font-bold text-zinc-100">${{ (inv.price * inv.quantity).toFixed(2) }}</p>
                   <p class="text-[10px] text-muted">@ ${{ inv.price.toFixed(2) }}</p>
                 </div>
                 <button @click="investmentStore.deleteInvestment(inv.id)" class="p-2 opacity-0 group-hover/item:opacity-100 text-rose-500 hover:bg-rose-500/10 rounded-lg transition-all">
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg>
                 </button>
              </div>
           </div>
        </div>
        <div v-else class="py-16 text-center">
          <p class="text-sm text-muted">
            No assets yet. Click <strong class="text-zinc-400">Add Asset</strong> to start tracking.
          </p>
        </div>
      </div>

      <!-- Market Movers -->
      <div class="card">
        <h3 class="font-semibold text-zinc-100 mb-4 flex items-center gap-2">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <polyline points="22 7 13.5 15.5 8.5 10.5 2 17" /><polyline points="16 7 22 7 22 13" />
          </svg>
          Market Movers
        </h3>
        <div class="space-y-4">
          <p class="text-xs text-muted" v-if="investmentStore.isFetchingPrices && Object.keys(investmentStore.realTimePrices).length === 0">
             Fetching real-time data...
          </p>
          <div v-else class="space-y-3">
             <div v-for="symbol in MARKET_MOVERS_SYMBOLS" :key="symbol" class="flex items-center justify-between">
                <div class="flex-1 min-w-0">
                   <p class="text-sm font-bold text-zinc-100 truncate">{{ symbol.includes(':') ? symbol.split(':')[1].replace('USDT', '') : symbol }}</p>
                   <p class="text-[10px] text-muted truncate">
                      {{ symbol === 'SPY' ? 'S&P 500' : symbol === 'DIA' ? 'Dow Jones' : symbol === 'GLD' ? 'Gold' : symbol === 'USO' ? 'US Oil' : symbol.includes('BTC') ? 'Bitcoin' : POPULAR_SYMBOLS.find(s => s.symbol === symbol)?.name || '' }}
                   </p>
                </div>
                <div class="text-right ml-4">
                   <template v-if="investmentStore.realTimePrices[symbol]">
                      <p class="text-sm font-bold text-zinc-100">
                         ${{ investmentStore.realTimePrices[symbol].price.toFixed(2) }}
                      </p>
                      <p class="text-[10px] font-bold" :class="investmentStore.realTimePrices[symbol].change >= 0 ? 'text-emerald-400' : 'text-rose-400'">
                         {{ investmentStore.realTimePrices[symbol].change >= 0 ? '+' : '' }}{{ investmentStore.realTimePrices[symbol].changePercent }}
                      </p>
                   </template>
                   <div v-else class="skeleton h-8 w-16 ml-auto rounded"></div>
                </div>
             </div>
          </div>
        </div>
      </div>
    </div>

    <!-- Add Asset Modal -->
    <div v-if="isModalOpen" class="modal-overlay open" @click.self="closeModal">
      <div class="modal-box p-8">
        <h2 class="text-2xl font-bold text-zinc-100 mb-6">Record Transaction</h2>
        <form @submit.prevent="handleAddInvestment" class="space-y-6">
          <div class="flex p-1 bg-zinc-950/50 border border-white/5 rounded-xl gap-1">
            <button 
              type="button" 
              @click="newInvestment.type = 'buy'"
              class="flex-1 py-3 rounded-lg text-xs font-bold transition-all"
              :class="newInvestment.type === 'buy' ? 'bg-emerald-500 text-white shadow-lg shadow-emerald-500/20' : 'text-muted hover:text-zinc-300'"
            >BUY</button>
            <button 
              type="button" 
              @click="newInvestment.type = 'sell'"
              class="flex-1 py-3 rounded-lg text-xs font-bold transition-all"
              :class="newInvestment.type === 'sell' ? 'bg-rose-500 text-white shadow-lg shadow-rose-500/20' : 'text-muted hover:text-zinc-300'"
            >SELL</button>
          </div>

          <div class="grid grid-cols-2 gap-4">
            <div class="col-span-2 relative">
              <label class="label">Symbol / Asset Name</label>
              <input 
                v-model="symbolSearch" 
                @focus="isDropdownOpen = true"
                type="text" 
                class="input uppercase" 
                placeholder="Search Stocks or ETFs..." 
                required 
              />
              <div v-if="isDropdownOpen && filteredSymbols.length > 0" class="absolute left-0 right-0 top-full mt-1 bg-zinc-900 border border-white/10 rounded-xl shadow-2xl z-50 overflow-hidden">
                <button 
                  v-for="s in filteredSymbols" 
                  :key="s.symbol"
                  type="button"
                  @click="selectSymbol(s)"
                  class="w-full text-left px-4 py-3 hover:bg-white/5 flex items-center justify-between border-b border-white/5 last:border-0"
                >
                  <div>
                    <span class="font-bold text-zinc-100">{{ s.symbol }}</span>
                    <span class="text-[10px] text-muted ml-2">{{ s.name }}</span>
                  </div>
                  <span class="text-[9px] px-1.5 py-0.5 rounded bg-zinc-800 text-zinc-400 font-bold uppercase">{{ s.type }}</span>
                </button>
              </div>
            </div>

            <div>
              <label class="label">Price per Share</label>
              <div class="relative">
                <span class="absolute left-4 top-1/2 -translate-y-1/2 text-muted text-sm">$</span>
                <input v-model="newInvestment.price" type="number" step="0.01" class="input pl-8" required />
              </div>
            </div>
            <div>
              <label class="label">Quantity</label>
              <input v-model="newInvestment.quantity" type="number" step="0.01" class="input" required />
            </div>
            <div class="col-span-2">
              <label class="label">Commission / Fees</label>
              <div class="relative">
                <span class="absolute left-4 top-1/2 -translate-y-1/2 text-muted text-sm">$</span>
                <input v-model="newInvestment.commission" type="number" step="0.01" class="input pl-8" />
              </div>
            </div>
          </div>

          <div class="p-4 bg-emerald-500/5 border border-emerald-500/10 rounded-xl flex items-center justify-between">
            <p class="text-[10px] font-bold text-muted uppercase tracking-widest">Total Transaction Value</p>
            <p class="text-xl font-bold font-mono text-zinc-100">${{ totalValue.toFixed(2) }}</p>
          </div>

          <div class="flex justify-end gap-3 mt-8">
            <button type="button" @click="closeModal" class="btn-secondary">Cancel</button>
            <button type="submit" class="btn-primary">Record Transaction</button>
          </div>
        </form>
      </div>
    </div>
  </div>
</template>

<style scoped>
.modal-box {
  width: 32rem !important;
  max-width: calc(100vw - 2rem) !important;
}
</style>
