<script setup lang="ts">
import { ref, onMounted, onUnmounted } from 'vue';
import { useRouter } from 'vue-router';

const router = useRouter();
const isOpen = ref(false);
const searchQuery = ref('');

const close = () => {
  isOpen.value = false;
  searchQuery.value = '';
};

const handleKeydown = (e: KeyboardEvent) => {
  if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
    e.preventDefault();
    isOpen.value = !isOpen.value;
  }
  if (e.key === 'Escape' && isOpen.value) {
    close();
  }
};

const navigateTo = (path: string) => {
  router.push(path);
  close();
};

onMounted(() => {
  window.addEventListener('keydown', handleKeydown);
  window.addEventListener('open-search-palette', () => {
    isOpen.value = true;
  });
});

onUnmounted(() => {
  window.removeEventListener('keydown', handleKeydown);
});
</script>

<template>
  <div
    class="modal-overlay"
    :class="{ open: isOpen }"
    @click.self="close"
    style="align-items: start; padding-top: 10vh;"
  >
    <div class="modal-box max-w-2xl bg-zinc-950/80 backdrop-blur-2xl border-white/5 shadow-[0_0_50px_-12px_rgba(0,0,0,0.5)] overflow-hidden flex flex-col">
      <!-- Search Input Header -->
      <div class="flex items-center px-4 py-4 border-b border-white/5 relative">
        <svg class="text-zinc-500 mr-3 shrink-0" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
        <input
          v-model="searchQuery"
          type="text"
          class="w-full bg-transparent border-none text-lg text-zinc-100 placeholder-zinc-500 focus:outline-none focus:ring-0 p-0"
          placeholder="Search tasks, investments, or type a command..."
          autocomplete="off"
          spellcheck="false"
          autofocus
        />
        <div class="flex items-center gap-2 ml-3 shrink-0">
          <span class="text-[10px] font-semibold text-zinc-600 bg-white/5 px-2 py-1 rounded">ESC</span>
        </div>
      </div>

      <!-- Search Results Area (Placeholder for now) -->
      <div v-if="searchQuery" class="max-h-[60vh] overflow-y-auto p-2 scroll-smooth">
        <div class="p-4 text-center text-muted text-sm">Searching for "{{ searchQuery }}"...</div>
      </div>

      <!-- Default State / Suggestions -->
      <div v-else class="p-6">
          <p class="text-[10px] font-bold text-muted uppercase tracking-widest mb-3 px-2">Quick Navigation</p>
          <div class="space-y-1">
              <button
                class="w-full text-left flex items-center justify-between px-3 py-2.5 rounded-lg hover:bg-white/5 transition-colors group"
                @click="navigateTo('/')"
              >
                  <div class="flex items-center gap-3">
                      <div class="w-6 h-6 rounded bg-zinc-800/50 flex items-center justify-center text-muted group-hover:text-zinc-300">
                          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/><rect x="14" y="14" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/></svg>
                      </div>
                      <span class="text-sm font-medium text-zinc-400 group-hover:text-zinc-200">Go to Dashboard</span>
                  </div>
                  <span class="text-[10px] text-zinc-600 font-mono">G D</span>
              </button>
              <button
                class="w-full text-left flex items-center justify-between px-3 py-2.5 rounded-lg hover:bg-white/5 transition-colors group"
                @click="navigateTo('/routines')"
              >
                  <div class="flex items-center gap-3">
                      <div class="w-6 h-6 rounded bg-zinc-800/50 flex items-center justify-center text-muted group-hover:text-zinc-300">
                          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="9 11 12 14 22 4"/><path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11"/></svg>
                      </div>
                      <span class="text-sm font-medium text-zinc-400 group-hover:text-zinc-200">Go to Routines</span>
                  </div>
              </button>
              <button
                class="w-full text-left flex items-center justify-between px-3 py-2.5 rounded-lg hover:bg-white/5 transition-colors group"
                @click="navigateTo('/investments')"
              >
                  <div class="flex items-center gap-3">
                      <div class="w-6 h-6 rounded bg-zinc-800/50 flex items-center justify-center text-muted group-hover:text-zinc-300">
                          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="12" y1="1" x2="12" y2="23"/><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/></svg>
                      </div>
                      <span class="text-sm font-medium text-zinc-400 group-hover:text-zinc-200">Go to Portfolio</span>
                  </div>
              </button>
          </div>
      </div>

      <!-- Palette Footer -->
      <div class="px-4 py-3 border-t border-white/5 bg-black/20 flex items-center justify-between">
          <div class="flex flex-wrap items-center gap-4 text-[10px] text-zinc-500 font-medium">
              <span class="flex items-center gap-1.5"><strong class="bg-white/5 px-1.5 py-0.5 rounded text-zinc-400">&uarr;&darr;</strong> to navigate</span>
              <span class="flex items-center gap-1.5"><strong class="bg-white/5 px-1.5 py-0.5 rounded text-zinc-400">&crarr;</strong> to select</span>
          </div>
          <div class="text-[10px] font-bold text-zinc-600 uppercase tracking-widest">
              Aether Search
          </div>
      </div>
    </div>
  </div>
</template>
