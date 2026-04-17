<script setup lang="ts">
import { onMounted, computed, ref } from 'vue';
import { useAuthStore } from '@/stores/auth';
import { useTimerStore } from '@/stores/timer';
import { useRoute } from 'vue-router';
import Sidebar from '@/components/Sidebar.vue';
import Header from '@/components/Header.vue';
import AuthOverlay from '@/components/AuthOverlay.vue';
import SearchPalette from '@/components/SearchPalette.vue';

const authStore = useAuthStore();
const timerStore = useTimerStore();
const route = useRoute();
const isSidebarOpen = ref(false);

const isAuthRequired = computed(() => !authStore.isAuthenticated);

onMounted(async () => {
  await authStore.init();
});

const toggleSidebar = () => {
  isSidebarOpen.value = !isSidebarOpen.value;
};

const closeSidebar = () => {
  isSidebarOpen.value = false;
};
</script>

<template>
  <div class="bg-background text-foreground flex h-screen overflow-hidden antialiased" :class="{ 'auth-required': isAuthRequired }">
    
    <!-- Zen Mode Layout: Pure Fullscreen -->
    <template v-if="timerStore.isZenMode">
      <main class="fixed inset-0 z-[100] bg-background">
        <router-view v-slot="{ Component }">
          <component :is="Component" :key="route.path" />
        </router-view>
      </main>
    </template>

    <!-- Standard Layout: Sidebar + Header + Content -->
    <template v-else>
      <Sidebar :is-open="isSidebarOpen" @close="closeSidebar" />

      <!-- Mobile Overlay -->
      <div
        v-if="isSidebarOpen"
        class="fixed inset-0 bg-background/80 backdrop-blur-sm z-20 md:hidden"
        @click="closeSidebar"
      ></div>

      <div class="flex-1 flex flex-col min-w-0 overflow-hidden relative">
        <Header @toggle-sidebar="toggleSidebar" />

        <main id="view-shell" class="flex-1 overflow-y-auto">
          <router-view v-slot="{ Component }">
            <transition name="page" mode="out-in">
              <component :is="Component" :key="route.path" />
            </transition>
          </router-view>
        </main>
      </div>
    </template>

    <!-- ═══ MODALS ═══ -->
    <AuthOverlay v-if="isAuthRequired" />
    <SearchPalette />
    
    <div id="toast-container" class="fixed bottom-6 right-6 z-[200] flex flex-col gap-3"></div>
  </div>
</template>

<style>
.page-enter-active,
.page-leave-active {
  transition: all 0.3s cubic-bezier(0.16, 1, 0.3, 1);
}

.page-enter-from {
  opacity: 0;
  transform: translateY(15px);
}

.page-leave-to {
  opacity: 0;
  transform: translateY(-15px);
}

body.auth-required main,
body.auth-required aside,
body.auth-required header {
  filter: blur(20px) grayscale(100%);
  pointer-events: none !important;
  opacity: 0.3 !important;
}
</style>
