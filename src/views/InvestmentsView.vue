<script setup lang="ts">
import { onMounted, ref } from 'vue';

const investments = ref<any[]>([]);
const isModalOpen = ref(false);

onMounted(async () => {
  // Logic to fetch investments will go here
});

const openModal = () => (isModalOpen.value = true);
const closeModal = () => (isModalOpen.value = false);
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
          <div class="flex items-center gap-2 px-3 py-1.5 rounded-full bg-zinc-900/50 border border-border self-end mb-1">
            <span class="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
            <span class="text-[10px] font-bold text-zinc-400 uppercase tracking-wider">Live</span>
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

    <!-- Stats Row -->
    <div class="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4 mb-6">
      <div v-for="label in ['Net Worth', 'Realized Gain', 'Unrealized Gain', 'Day Change', 'Total Return', 'Positions']" :key="label" class="card flex flex-col gap-1">
        <p class="label">{{ label }}</p>
        <p class="text-2xl font-bold font-mono text-zinc-100">$0.00</p>
      </div>
    </div>

    <!-- Main Grid -->
    <div class="grid grid-cols-1 lg:grid-cols-3 gap-4">
      <!-- Ledger -->
      <div class="card lg:col-span-2 relative overflow-hidden group min-h-[400px]">
        <h3 class="font-semibold text-zinc-100 mb-4">Asset Ledger</h3>
        <div class="py-16 text-center">
          <p class="text-sm text-muted">
            No assets yet. Click <strong class="text-zinc-400">Add Asset</strong> to start tracking.
          </p>
        </div>
      </div>

      <!-- Market Movers Placeholder -->
      <div class="card">
        <h3 class="font-semibold text-zinc-100 mb-4 flex items-center gap-2">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <polyline points="22 7 13.5 15.5 8.5 10.5 2 17" /><polyline points="16 7 22 7 22 13" />
          </svg>
          Market Movers
        </h3>
        <div class="space-y-4">
          <div v-for="i in 4" :key="i" class="flex items-center justify-between group">
            <div class="flex items-center gap-3">
              <div class="skeleton w-8 h-8 rounded-lg"></div>
              <div>
                <div class="skeleton w-12 h-4 mb-1"></div>
                <div class="skeleton w-20 h-2"></div>
              </div>
            </div>
            <div class="text-right">
              <div class="skeleton w-10 h-4 mb-1 ml-auto"></div>
              <div class="skeleton w-14 h-2 ml-auto"></div>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- Modal Placeholder -->
    <div v-if="isModalOpen" class="modal-overlay open" @click.self="closeModal">
      <div class="modal-box max-w-lg p-8">
        <h2 class="text-2xl font-bold text-zinc-100 mb-6">Add Asset</h2>
        <p class="text-muted mb-8">Asset tracking logic is being migrated...</p>
        <div class="flex justify-end">
          <button @click="closeModal" class="btn-primary">Close</button>
        </div>
      </div>
    </div>
  </div>
</template>
