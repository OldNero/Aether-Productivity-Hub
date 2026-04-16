<script setup lang="ts">
import { computed } from 'vue';
import { useRoute } from 'vue-router';

const route = useRoute();
const emit = defineEmits(['toggle-sidebar']);

const viewTitle = computed(() => {
  const name = route.name as string;
  if (!name) return '';
  return name.charAt(0).toUpperCase() + name.slice(1);
});

const openSearch = () => {
  window.dispatchEvent(new CustomEvent('open-search-palette'));
};
</script>

<template>
  <header
    class="h-14 flex items-center justify-between px-6 border-b border-border bg-[#0d0d0f]/80 backdrop-blur-md shrink-0 z-20"
    id="header"
  >
    <div class="flex items-center gap-4">
      <!-- Mobile Menu -->
      <button
        id="sidebar-toggle"
        class="md:hidden btn-icon"
        @click="emit('toggle-sidebar')"
      >
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <line x1="3" y1="6" x2="21" y2="6" /><line x1="3" y1="12" x2="15" y2="12" /><line x1="3" y1="18" x2="18" y2="18" />
        </svg>
      </button>
      
      <div class="flex flex-col">
        <p id="header-view-title" class="text-xs font-semibold uppercase tracking-widest text-muted leading-none mb-1">
          {{ viewTitle }}
        </p>
        <p class="text-lg font-bold text-zinc-100 leading-tight">Aether Hub</p>
      </div>
    </div>

    <!-- Global Search Bar -->
    <div class="flex-1 max-w-xl relative" id="global-search-wrapper" @click="openSearch">
      <div class="relative group cursor-text">
        <svg class="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500 pointer-events-none group-hover:text-zinc-400" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
        <div
          class="w-full bg-zinc-900/60 border border-white/5 rounded-lg pl-9 pr-16 py-2 text-sm text-zinc-500 transition-all group-hover:bg-zinc-900 group-hover:border-zinc-600"
        >
          Search everything…
        </div>
        <kbd class="absolute right-3 top-1/2 -translate-y-1/2 text-[10px] font-semibold text-zinc-600 bg-white/5 border border-white/5 px-1.5 py-0.5 rounded pointer-events-none hidden md:inline-block">Ctrl K</kbd>
      </div>
    </div>
  </header>
</template>
