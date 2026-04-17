<script setup lang="ts">
import { ref, onMounted, onUnmounted, computed } from 'vue';
import { useRouter } from 'vue-router';
import { useTaskStore } from '@/stores/tasks';
import { useInvestmentStore } from '@/stores/investments';

const router = useRouter();
const taskStore = useTaskStore();
const investmentStore = useInvestmentStore();

const isOpen = ref(false);
const query = ref('');
const selectedIndex = ref(0);

const results = computed(() => {
  if (!query.value) return [];
  const q = query.value.toLowerCase();
  
  const matches = [
    ...taskStore.tasks.map(t => ({ id: t.id, title: t.title, type: 'Task', path: '/routines' })),
    ...investmentStore.holdings.map((h: any) => ({ id: h.symbol, title: h.symbol, type: 'Investment', path: '/investments' })),
    { id: 'dash', title: 'Dashboard', type: 'Page', path: '/' },
    { id: 'port', title: 'Portfolio', type: 'Page', path: '/investments' },
    { id: 'time', title: 'Timer', type: 'Page', path: '/timer' },
    { id: 'cal', title: 'Calendar', type: 'Page', path: '/calendar' },
    { id: 'ana', title: 'Analytics', type: 'Page', path: '/analytics' },
  ];

  return matches.filter(m => m.title.toLowerCase().includes(q)).slice(0, 8);
});

const handleKeyDown = (e: KeyboardEvent) => {
  if (e.key === 'k' && (e.metaKey || e.ctrlKey)) {
    e.preventDefault();
    isOpen.value = !isOpen.value;
  }
  if (e.key === 'Escape') isOpen.value = false;
  
  if (isOpen.value) {
    if (e.key === 'ArrowDown') {
        e.preventDefault();
        selectedIndex.value = (selectedIndex.value + 1) % results.value.length;
    }
    if (e.key === 'ArrowUp') {
        e.preventDefault();
        selectedIndex.value = (selectedIndex.value - 1 + results.value.length) % results.value.length;
    }
    if (e.key === 'Enter' && results.value[selectedIndex.value]) {
        navigate(results.value[selectedIndex.value].path);
    }
  }
};

const navigate = (path: string) => {
    router.push(path);
    isOpen.value = false;
    query.value = '';
};

onMounted(() => {
  window.addEventListener('keydown', handleKeyDown);
  window.addEventListener('open-search-palette', () => isOpen.value = true);
});

onUnmounted(() => {
  window.removeEventListener('keydown', handleKeyDown);
});
</script>

<template>
  <div v-if="isOpen" class="fixed inset-0 z-[100] flex items-start justify-center pt-[15vh] px-4">
    <div class="fixed inset-0 bg-background/80 backdrop-blur-sm" @click="isOpen = false"></div>
    
    <div class="w-full max-w-xl bg-card border border-border rounded-xl shadow-2xl overflow-hidden relative z-10 animate-in">
        <div class="flex items-center px-4 py-3 border-b border-border">
            <svg class="text-muted-foreground mr-3" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
            <input 
                v-model="query"
                type="text" 
                placeholder="Search everything..." 
                class="flex-1 bg-transparent border-none outline-none text-foreground text-sm placeholder:text-muted-foreground"
                autofocus
            />
            <div class="flex items-center gap-1">
                <kbd class="text-[10px] font-bold text-muted-foreground bg-accent px-1.5 py-0.5 rounded border border-border">ESC</kbd>
            </div>
        </div>

        <div class="max-h-[400px] overflow-y-auto p-2">
            <div v-if="results.length > 0" class="space-y-1">
                <button 
                    v-for="(res, index) in results" 
                    :key="index"
                    @click="navigate(res.path)"
                    class="w-full text-left px-3 py-2.5 rounded-lg flex items-center justify-between transition-colors group"
                    :class="selectedIndex === index ? 'bg-primary text-primary-foreground' : 'hover:bg-accent text-foreground'"
                >
                    <div class="flex items-center gap-3">
                        <div class="w-8 h-8 rounded-lg bg-accent/50 flex items-center justify-center text-muted-foreground group-hover:text-foreground" :class="{ 'bg-primary-foreground/10 text-primary-foreground': selectedIndex === index }">
                            <svg v-if="res.type === 'Task'" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="20 6 9 17 4 12"/></svg>
                            <svg v-else-if="res.type === 'Investment'" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="22 7 13.5 15.5 8.5 10.5 2 17"/><polyline points="16 7 22 7 22 13"/></svg>
                            <svg v-else width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></svg>
                        </div>
                        <span class="text-sm font-medium">{{ res.title }}</span>
                    </div>
                    <span class="text-[10px] font-bold uppercase tracking-widest opacity-60">{{ res.type }}</span>
                </button>
            </div>
            <div v-else-if="query" class="py-12 text-center text-muted-foreground">
                <p class="text-sm">No results found for "<span class="text-foreground font-bold">{{ query }}</span>"</p>
            </div>
            <div v-else class="py-8 px-4">
                <p class="text-[10px] font-bold text-muted-foreground uppercase tracking-widest mb-4">Quick Links</p>
                <div class="grid grid-cols-2 gap-2">
                    <button @click="navigate('/')" class="p-3 rounded-xl border border-border hover:bg-accent text-left transition-colors">
                        <p class="text-xs font-bold text-foreground">Dashboard</p>
                        <p class="text-[10px] text-muted-foreground">Overview</p>
                    </button>
                    <button @click="navigate('/timer')" class="p-3 rounded-xl border border-border hover:bg-accent text-left transition-colors">
                        <p class="text-xs font-bold text-foreground">Timer</p>
                        <p class="text-[10px] text-muted-foreground">Deep Work</p>
                    </button>
                </div>
            </div>
        </div>
    </div>
  </div>
</template>
