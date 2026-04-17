<script setup lang="ts">
import { computed, ref, onMounted, onUnmounted } from 'vue';
import { useRoute } from 'vue-router';
import { useThemeStore, type ThemeMode } from '@/stores/theme';

const route = useRoute();
const themeStore = useThemeStore();
const emit = defineEmits(['toggle-sidebar']);

const isThemeMenuOpen = ref(false);
const themeMenuRef = ref<HTMLElement | null>(null);

const viewTitle = computed(() => {
  const name = route.name as string;
  if (!name) return '';
  return name.charAt(0).toUpperCase() + name.slice(1);
});

const openSearch = () => {
  window.dispatchEvent(new CustomEvent('open-search-palette'));
};

const toggleThemeMenu = () => {
    isThemeMenuOpen.value = !isThemeMenuOpen.value;
};

const closeThemeMenu = (e: MouseEvent) => {
    if (themeMenuRef.value && !themeMenuRef.value.contains(e.target as Node)) {
        isThemeMenuOpen.value = false;
    }
};

onMounted(() => {
    window.addEventListener('click', closeThemeMenu);
});

onUnmounted(() => {
    window.removeEventListener('click', closeThemeMenu);
});

const themes: { id: ThemeMode; label: string; icon: string }[] = [
    { id: 'light', label: 'Light', icon: 'M12 3v1m0 16v1m9-9h-1M4 12H3m15.364-6.364l-.707.707M6.343 17.657l-.707.707m12.728 0l-.707-.707M6.343 6.343l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z' },
    { id: 'dark', label: 'Dark', icon: 'M21 12.79A9 9 0 1111.21 3 7 7 0 0021 12.79z' },
    { id: 'system', label: 'System', icon: 'M9 17.25v1.007a3 3 0 01-.879 2.122L7.5 21h9l-.621-.621A3 3 0 0115 18.257V17.25m6-12V15a2.25 2.25 0 01-2.25 2.25H5.25A2.25 2.25 0 013 15V5.25m18 0A2.25 2.25 0 0018.75 3H5.25A2.25 2.25 0 003 5.25m18 0V12a2.25 2.25 0 01-2.25 2.25H5.25A2.25 2.25 0 013 12V5.25' }
];
</script>

<template>
  <header
    class="h-14 flex items-center justify-between px-6 border-b border-border bg-background/80 backdrop-blur-md shrink-0 z-20"
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
        <p id="header-view-title" class="text-[10px] font-bold uppercase tracking-[0.2em] text-muted-foreground leading-none mb-1">
          {{ viewTitle }}
        </p>
        <p class="text-lg font-bold text-foreground leading-tight tracking-tight">Aether Hub</p>
      </div>
    </div>

    <!-- Global Search Bar -->
    <div class="flex-1 max-w-xl relative mx-6" id="global-search-wrapper" @click="openSearch">
      <div class="relative group cursor-text">
        <svg class="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground group-hover:text-foreground transition-colors" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
        <div
          class="w-full bg-muted/50 border border-border rounded-lg pl-9 pr-16 py-2 text-sm text-muted-foreground transition-all group-hover:bg-muted group-hover:border-muted-foreground/30"
        >
          Search everything…
        </div>
        <kbd class="absolute right-3 top-1/2 -translate-y-1/2 text-[10px] font-bold text-muted-foreground bg-background border border-border px-1.5 py-0.5 rounded pointer-events-none hidden md:inline-block">Ctrl K</kbd>
      </div>
    </div>

    <!-- Theme Toggle -->
    <div class="relative" ref="themeMenuRef">
        <button 
          @click="toggleThemeMenu" 
          class="w-9 h-9 rounded-full flex items-center justify-center border border-border bg-muted/30 text-foreground hover:bg-muted hover:border-muted-foreground/30 transition-all shadow-sm"
        >
            <svg v-if="themeStore.mode === 'light'" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="5"/><line x1="12" y1="1" x2="12" y2="3"/><line x1="12" y1="21" x2="12" y2="23"/><line x1="4.22" y1="4.22" x2="5.64" y2="5.64"/><line x1="18.36" y1="18.36" x2="19.78" y2="19.78"/><line x1="1" y1="12" x2="3" y2="12"/><line x1="21" y1="12" x2="23" y2="12"/><line x1="4.22" y1="19.78" x2="5.64" y2="18.36"/><line x1="18.36" y1="5.64" x2="19.78" y2="4.22"/></svg>
            <svg v-else-if="themeStore.mode === 'dark'" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/></svg>
            <svg v-else width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><rect x="2" y="3" width="20" height="14" rx="2" ry="2"/><line x1="8" y1="21" x2="16" y2="21"/><line x1="12" y1="17" x2="12" y2="21"/></svg>
        </button>

        <transition name="menu">
            <div v-if="isThemeMenuOpen" class="absolute right-0 mt-3 w-40 bg-popover border border-border rounded-xl shadow-2xl overflow-hidden py-1.5 z-50 animate-in">
                <button 
                    v-for="t in themes" 
                    :key="t.id"
                    @click="themeStore.setTheme(t.id); isThemeMenuOpen = false"
                    class="w-full text-left px-4 py-2.5 text-sm font-semibold flex items-center gap-3 transition-colors"
                    :class="themeStore.mode === t.id ? 'bg-accent text-accent-foreground' : 'text-muted-foreground hover:bg-accent/50 hover:text-foreground'"
                >
                    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
                        <path :d="t.icon" />
                    </svg>
                    {{ t.label }}
                </button>
            </div>
        </transition>
    </div>
  </header>
</template>

<style scoped>
.menu-enter-active, .menu-leave-active {
    transition: all 0.2s cubic-bezier(0.16, 1, 0.3, 1);
}
.menu-enter-from, .menu-leave-to {
    opacity: 0;
    transform: translateY(8px) scale(0.95);
}
</style>
