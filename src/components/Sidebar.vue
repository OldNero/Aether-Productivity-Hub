<script setup lang="ts">
import { ref, computed } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { useAuthStore } from '@/stores/auth';

defineProps<{
  isOpen: boolean;
}>();

const emit = defineEmits(['close']);

const route = useRoute();
const router = useRouter();
const authStore = useAuthStore();

const isRoutinesExpanded = ref(false);

const navItems = [
  { id: 'dashboard', label: 'Dashboard', path: '/', icon: 'dashboard' },
  { id: 'investments', label: 'Portfolio', path: '/investments', icon: 'investments' },
  { id: 'timer', label: 'Timer', path: '/timer', icon: 'timer' },
];

const routineItems = [
  { id: 'calendar', label: 'Calendar', path: '/calendar', icon: 'calendar' },
  { id: 'analytics', label: 'Analytics', path: '/analytics', icon: 'analytics' },
];

const toggleRoutines = () => {
  isRoutinesExpanded.value = !isRoutinesExpanded.value;
};

const handleLogout = async () => {
  await authStore.logout();
};

const userInitial = computed(() => {
  return authStore.currentUser?.username?.charAt(0).toUpperCase() || 'U';
});

const isRouteActive = (path: string) => {
  if (path === '/' && route.path === '/') return true;
  if (path !== '/' && route.path.startsWith(path)) return true;
  return false;
};
</script>

<template>
  <aside
    id="sidebar"
    class="w-60 shrink-0 flex flex-col h-screen bg-[#0d0d0f] border-r border-border px-4 py-6 z-30 fixed inset-y-0 left-0 transition-transform duration-300 md:relative md:translate-x-0"
    :class="isOpen ? 'translate-x-0' : '-translate-x-full'"
  >
    <!-- Logo -->
    <div class="flex items-center gap-2.5 px-2 mb-8" id="site-logo">
      <div class="w-7 h-7 rounded-lg overflow-hidden shrink-0">
        <img src="/favicon.svg" alt="Aether" class="w-full h-full object-contain" />
      </div>
      <span class="font-semibold text-zinc-100 tracking-tight">Aether</span>
    </div>

    <!-- Navigation -->
    <nav id="sidebar-nav" class="flex flex-col gap-1 flex-1">
      <router-link
        v-for="item in navItems"
        :key="item.id"
        :to="item.path"
        class="nav-item sidebar__link"
        :class="{ active: isRouteActive(item.path) }"
        @click="emit('close')"
      >
        <template v-if="item.id === 'dashboard'">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <rect x="3" y="3" width="7" height="7" rx="1" />
            <rect x="14" y="3" width="7" height="7" rx="1" />
            <rect x="14" y="14" width="7" height="7" rx="1" />
            <rect x="3" y="14" width="7" height="7" rx="1" />
          </svg>
        </template>
        <template v-else-if="item.id === 'investments'">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <polyline points="22 7 13.5 15.5 8.5 10.5 2 17" />
            <polyline points="16 7 22 7 22 13" />
          </svg>
        </template>
        <template v-else-if="item.id === 'timer'">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <circle cx="12" cy="12" r="10" />
            <polyline points="12 6 12 12 16 14" />
          </svg>
        </template>
        {{ item.label }}
      </router-link>

      <div class="flex flex-col gap-1">
        <button
          class="nav-item sidebar__link flex items-center justify-between group/routines"
          :class="{ active: isRouteActive('/routines') || isRouteActive('/calendar') || isRouteActive('/analytics') }"
          @click="toggleRoutines"
        >
          <div class="flex items-center gap-2">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <polyline points="9 11 12 14 22 4"/><path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11"/>
            </svg>
            Routines
          </div>
          <svg
            class="w-3 h-3 text-muted group-hover/routines:text-zinc-300 transition-transform duration-200"
            :style="{ transform: isRoutinesExpanded ? 'rotate(180deg)' : 'rotate(0deg)' }"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            stroke-width="3"
            stroke-linecap="round"
            stroke-linejoin="round"
          >
            <path d="m6 9 6 6 6-6"/>
          </svg>
        </button>
        
        <!-- Sub-menu -->
        <div
          v-if="isRoutinesExpanded"
          class="flex flex-col gap-1 pl-4 mt-1 overflow-hidden transition-all duration-300"
        >
          <router-link
            to="/routines"
            class="nav-item sidebar__link py-1.5 text-xs opacity-70 hover:opacity-100"
            :class="{ active: isRouteActive('/routines') }"
            @click="emit('close')"
          >
            Tasks
          </router-link>
          <router-link
            v-for="sub in routineItems"
            :key="sub.id"
            :to="sub.path"
            class="nav-item sidebar__link py-1.5 text-xs opacity-70 hover:opacity-100"
            :class="{ active: isRouteActive(sub.path) }"
            @click="emit('close')"
          >
            {{ sub.label }}
          </router-link>
        </div>
      </div>
    </nav>

    <!-- Sidebar Bottom -->
    <div class="mt-auto flex flex-col gap-1 pt-4 border-t border-border">
      <div class="px-3 py-3 mb-2 flex items-center gap-3 bg-zinc-900/40 rounded-xl border border-white/5 mx-2">
        <div class="w-9 h-9 rounded-lg bg-zinc-100 text-zinc-950 flex items-center justify-center font-bold text-sm">
          {{ userInitial }}
        </div>
        <div class="flex-1 min-w-0">
          <p class="text-sm font-bold text-zinc-100 truncate italic">{{ authStore.currentUser?.username || 'Guest' }}</p>
          <p class="text-[10px] text-muted uppercase tracking-tighter">Profile</p>
        </div>
        <button
          @click="handleLogout"
          class="p-1.5 text-zinc-500 hover:text-rose-400 hover:bg-rose-500/10 rounded-lg transition-colors"
          title="Sign Out"
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/>
          </svg>
        </button>
      </div>
    </div>
  </aside>
</template>
