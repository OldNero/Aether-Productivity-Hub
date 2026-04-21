import { createRouter, createWebHistory } from 'vue-router';
import { useAuthStore } from '@/stores/auth';

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes: [
    {
      path: '/',
      name: 'dashboard',
      component: () => import('@/views/DashboardView.vue'),
    },
    {
      path: '/intelligence',
      name: 'intelligence',
      component: () => import('@/views/IntelligenceView.vue'),
    },
    {
      path: '/investments',
      name: 'investments',
      component: () => import('@/views/InvestmentsView.vue'),
    },
    {
      path: '/timer',
      name: 'timer',
      component: () => import('@/views/TimerView.vue'),
    },
    {
      path: '/routines',
      name: 'routines',
      component: () => import('@/views/RoutinesView.vue'),
    },
    {
      path: '/calendar',
      name: 'calendar',
      component: () => import('@/views/CalendarView.vue'),
    },
    {
      path: '/analytics',
      name: 'analytics',
      component: () => import('@/views/AnalyticsView.vue'),
    },
    {
      path: '/settings',
      name: 'settings',
      component: () => import('@/views/SettingsView.vue'),
    },
  ],
});

router.beforeEach(async (to, from, next) => {
  const authStore = useAuthStore();
  
  if (!authStore.isInitialized) {
    await authStore.init();
  }

  // Handle Supabase OAuth fragments (like #access_token=...)
  if (to.hash.includes('access_token=') || to.hash.includes('type=recovery')) {
    // Supabase JS handles the token extraction automatically.
    // We clear the hash immediately to prevent stale session warnings on refresh.
    window.history.replaceState(null, '', window.location.pathname + window.location.search);
    
    // Land on the dashboard
    if (to.path === '/') {
        next();
    } else {
        next({ path: '/', replace: true });
    }
    return;
  }

  next();
});

export default router;
