<script setup lang="ts">
import { onMounted, onUnmounted, ref, computed } from 'vue';
import { getUSMarketStatus, type MarketInfo } from '@/utils/marketTimer';
import { useInvestmentStore, type Investment } from '@/stores/investments';
import { format } from 'date-fns';
import ConfirmModal from '@/components/ConfirmModal.vue';
import AlertModal from '@/components/AlertModal.vue';

const investmentStore = useInvestmentStore();
const marketStatus = ref<MarketInfo>(getUSMarketStatus());
let statusInterval: number;

const showAddModal = ref(false);
const expandedSymbol = ref<string | null>(null);
const editingTransactionId = ref<string | null>(null);
const renameSymbol = ref('');
const activeTab = ref<'allocation' | 'ledger'>('allocation');
const selectedIds = ref(new Set<string>());

const toggleSelectAll = () => {
    if (selectedIds.value.size === investmentStore.investments.length) {
        selectedIds.value.clear();
    } else {
        investmentStore.investments.forEach(i => selectedIds.value.add(i.id));
    }
};

const toggleSelect = (id: string) => {
    if (selectedIds.value.has(id)) selectedIds.value.delete(id);
    else selectedIds.value.add(id);
};

// Modal State
const confirmModal = ref({
    show: false,
    title: '',
    message: '',
    confirmLabel: 'Delete',
    action: null as (() => Promise<void>) | null,
    loading: false,
    variant: 'danger' as 'danger' | 'warning'
});

const alertModal = ref({
    show: false,
    title: '',
    message: '',
    type: 'success' as 'success' | 'error'
});

const newInvestment = ref({
  symbol: '',
  type: 'buy' as 'buy' | 'sell',
  price: 0,
  quantity: 0,
  commission: 0,
  date: format(new Date(), "yyyy-MM-dd'T'HH:mm")
});

onMounted(async () => {
  await investmentStore.fetchInvestments();
  statusInterval = window.setInterval(() => {
    marketStatus.value = getUSMarketStatus();
  }, 1000);
});

onUnmounted(() => {
  clearInterval(statusInterval);
});

const formatCurrency = (val: number) => {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', minimumFractionDigits: 2 }).format(val);
};

const formatPercent = (val: number) => {
  if (val === undefined || isNaN(val)) return '0.00%';
  return `${val >= 0 ? '+' : ''}${val.toFixed(2)}%`;
};

const openAddModal = () => {
    editingTransactionId.value = null;
    newInvestment.value = { symbol: '', type: 'buy', price: 0, quantity: 0, commission: 0, date: format(new Date(), "yyyy-MM-dd'T'HH:mm") };
    showAddModal.value = true;
};

const handleAddInvestment = async () => {
  if (!newInvestment.value.symbol || newInvestment.value.price <= 0) return;
  const payload = {
    ...newInvestment.value,
    symbol: newInvestment.value.symbol.toUpperCase(),
    notes: '',
    date: new Date(newInvestment.value.date).toISOString()
  };
  if (editingTransactionId.value) {
      await investmentStore.updateInvestment(editingTransactionId.value, payload as any);
  } else {
      await investmentStore.addInvestment(payload as any);
  }
  showAddModal.value = false;
  editingTransactionId.value = null;
};

const toggleExpand = (symbol: string) => {
    if (expandedSymbol.value === symbol) expandedSymbol.value = null;
    else {
        expandedSymbol.value = symbol;
        renameSymbol.value = symbol;
    }
};

const handleRenameAsset = async () => {
    if (!expandedSymbol.value || !renameSymbol.value) return;
    const newSym = renameSymbol.value.toUpperCase();
    if (newSym === expandedSymbol.value) return;

    confirmModal.value = {
        show: true,
        title: 'Rename Asset',
        message: `This will update all transactions for ${expandedSymbol.value} to ${newSym}. Continue?`,
        confirmLabel: 'Update Symbol',
        variant: 'warning',
        loading: false,
        action: async () => {
            confirmModal.value.loading = true;
            try {
                const transactions = investmentStore.investments.filter(i => i.symbol === expandedSymbol.value);
                for (const tx of transactions) {
                    await investmentStore.updateInvestment(tx.id, { symbol: newSym });
                }
                expandedSymbol.value = newSym;
                confirmModal.value.show = false;
            } finally {
                confirmModal.value.loading = false;
            }
        }
    };
};

const editTransaction = (tx: Investment) => {
    editingTransactionId.value = tx.id;
    newInvestment.value = {
        symbol: tx.symbol,
        type: tx.type,
        price: tx.price,
        quantity: tx.quantity,
        commission: tx.commission || 0,
        date: format(new Date(tx.date), "yyyy-MM-dd'T'HH:mm")
    };
    showAddModal.value = true;
};

const deleteAsset = async (symbol: string) => {
    confirmModal.value = {
        show: true,
        title: 'Delete Asset',
        message: `Are you sure you want to remove all data for ${symbol}? This action cannot be undone.`,
        confirmLabel: 'Delete All Records',
        variant: 'danger',
        loading: false,
        action: async () => {
            confirmModal.value.loading = true;
            try {
                await investmentStore.deleteAsset(symbol);
                if (expandedSymbol.value === symbol) expandedSymbol.value = null;
                confirmModal.value.show = false;
            } finally {
                confirmModal.value.loading = false;
            }
        }
    };
};

const deleteTransaction = async (id: string) => {
    confirmModal.value = {
        show: true,
        title: 'Delete Transaction',
        message: 'Are you sure you want to remove this transaction record?',
        confirmLabel: 'Delete Record',
        variant: 'danger',
        loading: false,
        action: async () => {
            confirmModal.value.loading = true;
            try {
                await investmentStore.deleteInvestment(id);
                confirmModal.value.show = false;
            } finally {
                confirmModal.value.loading = false;
            }
        }
    };
};

const deleteSelected = async () => {
    if (selectedIds.value.size === 0) return;
    const ids = Array.from(selectedIds.value);
    
    confirmModal.value = {
        show: true,
        title: 'Delete Selected Transactions',
        message: `Are you sure you want to remove ${ids.length} selected transaction records? This action cannot be undone.`,
        confirmLabel: 'Delete All Selected',
        variant: 'danger',
        loading: false,
        action: async () => {
            confirmModal.value.loading = true;
            try {
                await investmentStore.batchDelete(ids);
                selectedIds.value.clear();
                confirmModal.value.show = false;
            } finally {
                confirmModal.value.loading = false;
            }
        }
    };
};

const handleFileUpload = async (event: Event) => {
  const target = event.target as HTMLInputElement;
  const file = target.files?.[0];
  if (!file) return;
  const reader = new FileReader();
  reader.onload = async (e) => {
    const text = e.target?.result as string;
    const count = await investmentStore.importTradingViewCSV(text);
    if (count > 0) {
        activeTab.value = 'ledger'; // Switch to ledger to show the new rows one-by-one
        alertModal.value = {
            show: true,
            title: 'Import Successful',
            message: `Successfully imported ${count} transactions. You can now see them in the Ledger tab.`,
            type: 'success'
        };
    } else {
        alertModal.value = {
            show: true,
            title: 'Import Failed',
            message: 'No valid transactions found in the CSV. Please check the file format.',
            type: 'error'
        };
    }
    target.value = ''; 
  };
  reader.readAsText(file);
};
</script>

<template>
  <div class="p-6 max-w-screen-2xl mx-auto page-transition">
    <!-- Header -->
    <div class="mb-10 flex flex-col md:flex-row md:items-end justify-between gap-6">
      <div>
        <div class="flex items-center gap-3 mb-2">
            <h1 class="text-4xl md:text-5xl font-bold tracking-tighter text-foreground">Portfolio</h1>
            <!-- Market Status Indicator -->
            <div class="group relative inline-flex mt-2">
                <div class="flex items-center gap-2 px-2 py-1 rounded-full bg-accent/50 border border-border cursor-help">
                    <div class="w-1.5 h-1.5 rounded-full" :class="marketStatus.status === 'open' ? 'bg-emerald-500 animate-pulse' : 'bg-rose-500'"></div>
                    <span class="text-[10px] font-bold text-foreground uppercase tracking-tight">{{ marketStatus.label }}</span>
                </div>
                <!-- Tooltip Content -->
                <div class="absolute left-full ml-3 top-1/2 -translate-y-1/2 w-48 p-4 bg-popover border border-border rounded-xl shadow-2xl opacity-0 translate-x-2 pointer-events-none group-hover:opacity-100 group-hover:translate-x-0 transition-all z-[60]">
                    <p class="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider mb-1">{{ marketStatus.label }}</p>
                    <p class="text-sm font-medium text-foreground mb-3">{{ marketStatus.remainingTime }}</p>
                    <div class="pt-3 border-t border-border">
                        <p class="text-[10px] text-muted-foreground">{{ marketStatus.nextEvent }}</p>
                    </div>
                    <div class="absolute left-[-6px] top-1/2 -translate-y-1/2 w-3 h-3 bg-popover border-l border-b border-border rotate-45"></div>
                </div>
            </div>
        </div>
        <p class="text-base text-muted-foreground max-w-2xl">High-performance tracking aligned with TradingView metrics.</p>
      </div>
    </div>

    <!-- Metrics Grid -->
    <div class="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-4 gap-4 mb-8">
        <!-- Col 1: Core Value -->
        <div class="card flex flex-col justify-between min-h-[140px]">
            <p class="label">Portfolio Value</p>
            <div>
                <p class="text-3xl font-bold text-foreground tracking-tight">{{ formatCurrency(investmentStore.portfolioValue) }}</p>
                <div class="flex items-center gap-2 mt-1">
                    <span class="text-xs font-bold" :class="investmentStore.totalGain >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-destructive'">
                        {{ formatPercent(investmentStore.totalGainPercent) }}
                    </span>
                    <span class="text-[10px] text-muted-foreground uppercase font-bold">Total Gain</span>
                </div>
            </div>
        </div>

        <!-- Col 2: Liquidity & Unrealized -->
        <div class="card flex flex-col justify-between min-h-[140px]">
            <p class="label">Cash & Unrealized</p>
            <div>
                <div class="flex items-center justify-between mb-1">
                    <span class="text-lg font-bold text-foreground">{{ formatCurrency(investmentStore.cashBalance) }}</span>
                    <span class="text-[9px] text-muted-foreground uppercase font-bold">Cash</span>
                </div>
                <div class="flex items-center justify-between">
                    <span class="text-lg font-bold" :class="investmentStore.unrealizedGain >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-destructive'">
                        {{ formatCurrency(investmentStore.unrealizedGain) }}
                    </span>
                    <span class="text-[9px] text-muted-foreground uppercase font-bold">Unrealized</span>
                </div>
            </div>
        </div>

        <!-- Col 3: Performance -->
        <div class="card flex flex-col justify-between min-h-[140px]">
            <p class="label">Realized & Day Change</p>
            <div>
                <div class="flex items-center justify-between mb-1">
                    <span class="text-lg font-bold text-foreground">{{ formatCurrency(investmentStore.realizedGain) }}</span>
                    <span class="text-[9px] text-muted-foreground uppercase font-bold">Realized</span>
                </div>
                <div class="flex items-center justify-between">
                    <span class="text-lg font-bold" :class="investmentStore.dayChange.value >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-destructive'">
                        {{ formatPercent(investmentStore.dayChange.percent) }}
                    </span>
                    <span class="text-[9px] text-muted-foreground uppercase font-bold">Last Day</span>
                </div>
            </div>
        </div>

        <!-- Col 4: TradingView Sync (RESTORED EXACTLY) -->
        <div class="card relative flex flex-col justify-center items-center text-center gap-4 bg-accent/30 border-dashed border-2 border-border hover:border-primary/50 transition-all group">
            <div class="w-10 h-10 rounded-full bg-background border border-border flex items-center justify-center group-hover:text-primary transition-colors shadow-sm">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/></svg>
            </div>
            <div>
                <p class="text-sm font-bold text-foreground">TradingView Sync</p>
                <p class="text-[10px] text-muted-foreground uppercase tracking-wider font-bold">Import CSV Export</p>
            </div>
            <label class="absolute inset-0 cursor-pointer">
                <input type="file" class="hidden" accept=".csv" @change="handleFileUpload" />
            </label>
        </div>
    </div>

    <!-- Main Content Tabs -->
    <div class="mb-6 flex gap-1 p-1 bg-accent/20 border border-border rounded-2xl w-fit">
        <button 
            @click="activeTab = 'allocation'" 
            class="px-8 py-2.5 rounded-xl text-xs font-bold uppercase tracking-widest transition-all"
            :class="activeTab === 'allocation' ? 'bg-background text-foreground shadow-lg' : 'text-muted-foreground hover:text-foreground'"
        >
            Asset Allocation
        </button>
        <button 
            @click="activeTab = 'ledger'" 
            class="px-8 py-2.5 rounded-xl text-xs font-bold uppercase tracking-widest transition-all"
            :class="activeTab === 'ledger' ? 'bg-background text-foreground shadow-lg' : 'text-muted-foreground hover:text-foreground'"
        >
            Transaction Ledger
        </button>
    </div>

    <!-- Main Content Grid -->
    <div class="grid grid-cols-1 gap-6">
        <!-- Allocation Table -->
        <div v-if="activeTab === 'allocation'" class="card p-0 overflow-hidden flex flex-col page-transition">
            <div class="p-6 border-b border-border flex items-center justify-between bg-muted/30">
                <h3 class="font-bold text-foreground flex items-center gap-2">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21.21 15.89A10 10 0 1 1 8 2.83"/><path d="M22 12A10 10 0 0 0 12 2v10z"/></svg>
                    Asset Allocation
                </h3>
                <button @click="openAddModal" class="btn-primary py-1.5 px-4 text-xs">Record Transaction</button>
            </div>
            <div class="overflow-x-auto flex-1">
                <table class="w-full text-left">
                    <thead>
                        <tr class="border-b border-border bg-muted/10">
                            <th class="px-6 py-4 text-[10px] font-bold text-muted-foreground uppercase tracking-widest">Ticker / Asset</th>
                            <th class="px-6 py-4 text-[10px] font-bold text-muted-foreground uppercase tracking-widest">Holdings</th>
                            <th class="px-6 py-4 text-[10px] font-bold text-muted-foreground uppercase tracking-widest">Cost Basis</th>
                            <th class="px-6 py-4 text-[10px] font-bold text-muted-foreground uppercase tracking-widest">Market Price</th>
                            <th class="px-6 py-4 text-[10px] font-bold text-muted-foreground uppercase tracking-widest">Total Return</th>
                            <th class="px-6 py-4 text-[10px] font-bold text-muted-foreground uppercase tracking-widest">YTD</th>
                            <th class="px-6 py-4 text-[10px] font-bold text-muted-foreground uppercase tracking-widest text-right">Actions</th>
                        </tr>
                    </thead>
                    <tbody class="divide-y divide-border">
                        <template v-for="holding in investmentStore.holdings" :key="holding.symbol">
                            <tr class="group hover:bg-accent/30 transition-colors" :class="{ 'bg-accent/20': expandedSymbol === holding.symbol }">
                                <td class="px-6 py-5">
                                    <div class="flex items-center gap-3">
                                        <div class="w-8 h-8 rounded-lg bg-accent flex items-center justify-center font-bold text-xs text-foreground">{{ holding.symbol.charAt(0) }}</div>
                                        <div>
                                            <p class="font-bold text-foreground">{{ holding.symbol }}</p>
                                            <p class="text-[10px] text-muted-foreground font-bold">SHARES</p>
                                        </div>
                                    </div>
                                </td>
                                <td class="px-6 py-5 font-mono text-sm text-foreground/80">{{ holding.quantity }}</td>
                                <td class="px-6 py-5 font-mono text-sm text-foreground/80">{{ formatCurrency(holding.avgPrice) }}</td>
                                <td class="px-6 py-5">
                                    <p class="font-mono text-sm font-bold text-foreground">{{ formatCurrency(holding.currentPrice) }}</p>
                                </td>
                                <td class="px-6 py-5">
                                    <p class="font-mono text-sm font-bold" :class="holding.pl >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-destructive'">{{ formatCurrency(holding.pl) }}</p>
                                    <p class="text-[10px] font-bold opacity-60 uppercase" :class="holding.pl >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-destructive'">{{ formatPercent(holding.plPercent) }}</p>
                                </td>
                                <td class="px-6 py-5">
                                    <span class="font-mono text-sm font-bold" :class="holding.ytd >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-destructive'">{{ formatPercent(holding.ytd) }}</span>
                                </td>
                                <td class="px-6 py-5 text-right">
                                    <div class="flex items-center justify-end gap-2">
                                        <button @click="toggleExpand(holding.symbol)" class="p-2 text-muted-foreground hover:text-foreground hover:bg-accent rounded-lg transition-all" :title="expandedSymbol === holding.symbol ? 'Close Ledger' : 'Edit Asset & Transactions'">
                                            <svg v-if="expandedSymbol !== holding.symbol" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
                                            <svg v-else width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M18 6L6 18M6 6l12 12"/></svg>
                                        </button>
                                        <button @click="deleteAsset(holding.symbol)" class="p-2 text-muted-foreground hover:text-destructive hover:bg-destructive/10 rounded-lg transition-all" title="Delete Asset">
                                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg>
                                        </button>
                                    </div>
                                </td>
                            </tr>
                            <!-- Expanded Ledger View -->
                            <tr v-if="expandedSymbol === holding.symbol">
                                <td colspan="7" class="bg-muted/10 p-0 border-b border-border">
                                    <div class="p-8 space-y-6">
                                        <div class="flex items-end justify-between gap-8 border-b border-border pb-6">
                                            <div class="flex-1 max-w-xs">
                                                <label class="label">Rename Symbol</label>
                                                <div class="flex gap-2">
                                                    <input v-model="renameSymbol" type="text" class="input uppercase font-bold" />
                                                    <button @click="handleRenameAsset" class="btn-secondary px-4 py-2 text-xs">Update</button>
                                                </div>
                                            </div>
                                            <div class="text-right">
                                                <p class="text-[10px] font-bold text-muted-foreground uppercase tracking-widest mb-1">Transaction History</p>
                                                <p class="text-sm font-bold text-foreground">{{ investmentStore.investments.filter(i => i.symbol === holding.symbol).length }} Records</p>
                                            </div>
                                        </div>

                                        <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
                                            <div v-for="tx in investmentStore.investments.filter(i => i.symbol === holding.symbol).sort((a,b) => new Date(b.date).getTime() - new Date(a.date).getTime())" :key="tx.id" class="p-4 rounded-xl bg-card border border-border flex items-center justify-between group shadow-sm">
                                                <div class="flex items-center gap-4">
                                                    <div class="w-10 h-10 rounded-lg flex items-center justify-center font-bold text-xs" :class="tx.type === 'buy' ? 'bg-emerald-500/10 text-emerald-600' : 'bg-rose-500/10 text-rose-600'">
                                                        {{ tx.type.toUpperCase() }}
                                                    </div>
                                                    <div>
                                                        <p class="text-sm font-bold text-foreground">{{ tx.quantity }} @ {{ formatCurrency(tx.price) }}</p>
                                                        <p class="text-[10px] text-muted-foreground font-medium">{{ format(new Date(tx.date), 'MMM d, yyyy') }}</p>
                                                    </div>
                                                </div>
                                                <div class="flex items-center gap-2">
                                                    <p class="text-sm font-mono font-bold text-foreground mr-3">{{ formatCurrency(tx.quantity * tx.price) }}</p>
                                                    <button @click="editTransaction(tx)" class="p-2 text-muted-foreground hover:text-foreground hover:bg-accent rounded-lg transition-all"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg></button>
                                                    <button @click="deleteTransaction(tx.id)" class="p-2 text-muted-foreground hover:text-destructive hover:bg-destructive/10 rounded-lg transition-all"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg></button>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                </td>
                            </tr>
                        </template>
                        <tr v-if="investmentStore.holdings.length === 0">
                            <td colspan="7" class="px-6 py-20 text-center text-muted-foreground text-sm italic">Your portfolio is currently empty.</td>
                        </tr>
                    </tbody>
                </table>
            </div>
        </div>

        <!-- Transaction Ledger Table (ONE BY ONE) -->
        <div v-if="activeTab === 'ledger'" class="card p-0 overflow-hidden flex flex-col page-transition">
            <div class="p-6 border-b border-border flex items-center justify-between bg-muted/30">
                <h3 class="font-bold text-foreground flex items-center gap-2">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/><polyline points="10 9 9 9 8 9"/></svg>
                    Full History (One-by-One)
                </h3>
                <div class="flex items-center gap-4">
                    <button v-if="selectedIds.size > 0" @click="deleteSelected" class="px-4 py-1.5 rounded-lg bg-destructive/10 hover:bg-destructive/20 text-destructive text-[10px] font-bold uppercase transition-all flex items-center gap-2">
                        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg>
                        Delete Selected ({{ selectedIds.size }})
                    </button>
                    <p class="text-[10px] text-muted-foreground font-bold uppercase tracking-widest">{{ investmentStore.investments.length }} Total Records</p>
                </div>
            </div>
            <div class="overflow-x-auto flex-1">
                <table class="w-full text-left">
                    <thead>
                        <tr class="border-b border-border bg-muted/10">
                            <th class="px-6 py-4 w-10">
                                <input 
                                    type="checkbox" 
                                    class="checkbox-custom" 
                                    :checked="selectedIds.size === investmentStore.investments.length && investmentStore.investments.length > 0"
                                    @change="toggleSelectAll"
                                />
                            </th>
                            <th class="px-6 py-4 text-[10px] font-bold text-muted-foreground uppercase tracking-widest">Date</th>
                            <th class="px-6 py-4 text-[10px] font-bold text-muted-foreground uppercase tracking-widest">Ticker</th>
                            <th class="px-6 py-4 text-[10px] font-bold text-muted-foreground uppercase tracking-widest">Type</th>
                            <th class="px-6 py-4 text-[10px] font-bold text-muted-foreground uppercase tracking-widest text-right">Qty</th>
                            <th class="px-6 py-4 text-[10px] font-bold text-muted-foreground uppercase tracking-widest text-right">Price</th>
                            <th class="px-6 py-4 text-[10px] font-bold text-muted-foreground uppercase tracking-widest text-right">Total</th>
                            <th class="px-6 py-4 text-[10px] font-bold text-muted-foreground uppercase tracking-widest text-right">Actions</th>
                        </tr>
                    </thead>
                    <tbody class="divide-y divide-border">
                        <tr v-for="tx in investmentStore.sortedInvestments" :key="tx.id" class="group hover:bg-accent/30 transition-colors" :class="{ 'bg-primary/5': selectedIds.has(tx.id) }">
                            <td class="px-6 py-4">
                                <input 
                                    type="checkbox" 
                                    class="checkbox-custom" 
                                    :checked="selectedIds.has(tx.id)"
                                    @change="toggleSelect(tx.id)"
                                />
                            </td>
                            <td class="px-6 py-4 text-[11px] font-mono text-muted-foreground">{{ format(new Date(tx.date), 'MMM d, yyyy') }}</td>
                            <td class="px-6 py-4 font-bold text-foreground">{{ tx.symbol }}</td>
                            <td class="px-6 py-4">
                                <span class="px-2 py-0.5 rounded-md text-[9px] font-bold uppercase tracking-tighter" :class="tx.type === 'buy' ? 'bg-emerald-500/10 text-emerald-600' : 'bg-rose-500/10 text-rose-600'">
                                    {{ tx.type }}
                                </span>
                            </td>
                            <td class="px-6 py-4 text-right font-mono text-sm text-foreground/80">{{ tx.quantity }}</td>
                            <td class="px-6 py-4 text-right font-mono text-sm text-foreground/80">{{ formatCurrency(tx.price) }}</td>
                            <td class="px-6 py-4 text-right font-mono text-sm font-bold text-foreground">{{ formatCurrency(tx.quantity * tx.price) }}</td>
                            <td class="px-6 py-4 text-right">
                                <div class="flex items-center justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                    <button @click="editTransaction(tx)" class="p-1.5 text-muted-foreground hover:text-foreground rounded-md hover:bg-white/5 transition-all"><svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg></button>
                                    <button @click="deleteTransaction(tx.id)" class="p-1.5 text-muted-foreground hover:text-destructive rounded-md hover:bg-destructive/5 transition-all"><svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg></button>
                                </div>
                            </td>
                        </tr>
                        <tr v-if="investmentStore.investments.length === 0">
                            <td colspan="7" class="px-6 py-20 text-center text-muted-foreground text-sm italic">No transaction records found.</td>
                        </tr>
                    </tbody>
                </table>
            </div>
        </div>
    </div>

    <!-- Edit/Add Modal -->
    <div v-if="showAddModal" class="fixed inset-0 z-[100] flex items-start justify-center pt-[15vh]" @click.self="showAddModal = false">
      <div class="modal-box p-8">
        <div class="flex items-center justify-between mb-8">
          <h2 class="text-2xl font-bold tracking-tight text-foreground">{{ editingTransactionId ? 'Edit' : 'Record' }} Transaction</h2>
          <button @click="showAddModal = false" class="text-muted-foreground hover:text-foreground transition-colors">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
          </button>
        </div>

        <form @submit.prevent="handleAddInvestment" class="space-y-6">
          <div class="flex p-1 bg-muted rounded-xl border border-border">
              <button type="button" @click="newInvestment.type = 'buy'" class="flex-1 py-3 rounded-lg text-sm font-bold transition-all" :class="newInvestment.type === 'buy' ? 'bg-background text-emerald-600 shadow-sm border border-border' : 'text-muted-foreground hover:text-foreground'">BUY</button>
              <button type="button" @click="newInvestment.type = 'sell'" class="flex-1 py-3 rounded-lg text-sm font-bold transition-all" :class="newInvestment.type === 'sell' ? 'bg-background text-rose-600 shadow-sm border border-border' : 'text-muted-foreground hover:text-foreground'">SELL</button>
          </div>

          <div class="grid grid-cols-2 gap-4">
            <div class="col-span-2">
              <label class="label">Ticker Symbol</label>
              <input v-model="newInvestment.symbol" type="text" class="input uppercase font-bold" placeholder="e.g. AAPL" required />
            </div>
            <div class="col-span-2">
              <label class="label">Date & Time</label>
              <input v-model="newInvestment.date" type="datetime-local" class="input text-xs" required />
            </div>
            <div>
              <label class="label">Unit Price ($)</label>
              <input v-model="newInvestment.price" type="number" step="0.01" class="input font-mono" placeholder="0.00" required />
            </div>
            <div>
              <label class="label">Quantity</label>
              <input v-model="newInvestment.quantity" type="number" step="0.0001" class="input font-mono" placeholder="0.00" required />
            </div>
            <div class="col-span-2">
              <label class="label">Commission / Fees ($)</label>
              <input v-model="newInvestment.commission" type="number" step="0.01" class="input font-mono" placeholder="0.00" />
            </div>
          </div>

          <div class="flex justify-end gap-3 pt-4">
            <button type="button" @click="showAddModal = false" class="btn-secondary px-6">Cancel</button>
            <button type="submit" class="btn-primary px-8">{{ editingTransactionId ? 'Save Changes' : 'Confirm Entry' }}</button>
          </div>
        </form>
      </div>
    </div>

    <!-- Modals -->
    <ConfirmModal 
        v-bind="confirmModal" 
        @close="confirmModal.show = false" 
        @confirm="confirmModal.action?.()" 
    />

    <AlertModal 
        v-bind="alertModal" 
        @close="alertModal.show = false" 
    />
  </div>
</template>

<style scoped>
.modal-box {
  width: 32rem !important;
  max-width: calc(100vw - 2rem) !important;
}
</style>
