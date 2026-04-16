<script setup lang="ts">
import { onMounted, ref, computed } from 'vue';
import { useAuthStore } from '@/stores/auth';
import { useTaskStore } from '@/stores/tasks';

const authStore = useAuthStore();
const taskStore = useTaskStore();

const quote = ref({ text: 'The only way to do great work is to love what you do.', author: 'Steve Jobs' });
const insight = ref('Analyzing your productivity rhythm...');

const greeting = computed(() => {
  const hour = new Date().getHours();
  if (hour < 12) return 'Good morning';
  if (hour < 18) return 'Good afternoon';
  return 'Good evening';
});

const glowClass = computed(() => {
  const hour = new Date().getHours();
  if (hour >= 5 && hour < 17) {
    return "absolute top-0 right-0 w-24 h-24 bg-amber-500/10 rounded-full blur-2xl -translate-y-1/2 translate-x-1/2";
  } else {
    return "absolute top-0 right-0 w-24 h-24 bg-indigo-500/20 rounded-full blur-2xl -translate-y-1/2 translate-x-1/2";
  }
});

onMounted(async () => {
  await taskStore.fetchTasks();
  
  // Fetch Quote (Mocking the API for now, would use a utility)
  try {
    const response = await fetch('https://quoteslate.vercel.app/api/quotes/random');
    if (response.ok) {
        const data = await response.json();
        quote.value = { text: data.quote, author: data.author };
    }
  } catch (err) {
    console.warn("Quote fetch failed, using default.");
  }

  // Set Insight (Mock logic)
  insight.value = taskStore.activeCount > 3 
    ? "You have a busy day ahead. Focus on high-priority tasks first."
    : "Consistency is key. You're making great progress!";
});
</script>

<template>
  <div class="p-6 max-w-screen-2xl mx-auto page-transition">
    <!-- Dashboard Header -->
    <div class="mb-10">
      <h1 class="text-4xl md:text-5xl font-bold tracking-tighter text-zinc-100">
        Dashboard
      </h1>
      <p class="text-base text-muted mt-2 max-w-2xl">
        Your high-level overview of productivity and performance.
      </p>
    </div>

    <!-- Bento Grid -->
    <div class="grid grid-cols-4 gap-4" style="grid-auto-rows: minmax(160px, auto)">
      <!-- Greeting Card -->
      <div class="card col-span-4 md:col-span-1 flex flex-col justify-between bg-gradient-to-br from-zinc-900 to-zinc-950 border-white/5 relative overflow-hidden">
        <div :class="glowClass" id="greeting-card-glow"></div>
        <div class="p-2 w-9 h-9 rounded-lg bg-zinc-800/60 flex items-center justify-center text-amber-400 mb-2 relative z-10">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
            <circle cx="12" cy="12" r="5" />
            <path d="M12 1v2M12 21v2M4.22 4.22l1.42 1.42M18.36 18.36l1.42 1.42M1 12h2M21 12h2M4.22 19.78l1.42-1.42M18.36 5.64l1.42-1.42" />
          </svg>
        </div>
        <div class="relative z-10">
          <p class="label">{{ greeting }}</p>
          <p class="text-2xl font-bold tracking-tight text-zinc-100 truncate">
            {{ authStore.currentUser?.username || 'Guest' }}
          </p>
        </div>
      </div>

      <!-- Aether Pulse Insight -->
      <div class="card col-span-4 md:col-span-1 flex flex-col justify-between border-emerald-500/20 relative overflow-hidden group">
        <div class="absolute top-0 right-0 p-3 opacity-20 group-hover:opacity-40 transition-opacity">
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M22 12h-4l-3 9L9 3l-3 9H2"/>
          </svg>
        </div>
        <div>
          <p class="label mb-1">Aether Pulse</p>
          <p class="text-sm font-medium text-zinc-100 leading-snug">
            {{ insight }}
          </p>
        </div>
        <div class="flex items-center gap-2 mt-4">
          <div class="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></div>
          <p class="text-[10px] text-muted uppercase tracking-widest font-bold">Insight Engine Active</p>
        </div>
      </div>

      <!-- Quote Card -->
      <div class="card col-span-4 md:col-span-2 flex flex-col justify-end min-h-[180px] relative overflow-hidden">
        <div class="absolute top-0 right-0 w-72 h-72 bg-zinc-800/10 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2 pointer-events-none"></div>
        <blockquote class="text-xl font-semibold text-zinc-100 max-w-2xl leading-snug mb-3 relative z-10">
          "{{ quote.text }}"
        </blockquote>
        <cite class="text-[11px] font-semibold uppercase tracking-widest text-muted not-italic font-mono relative z-10">
          — {{ quote.author }}
        </cite>
      </div>

      <!-- Stats -->
      <div class="card col-span-4 md:col-span-1 flex flex-col justify-between">
        <div class="p-2 w-9 h-9 rounded-lg bg-zinc-800/60 flex items-center justify-center text-zinc-400">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M9 11l3 3L22 4" /><path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11" />
          </svg>
        </div>
        <div>
          <p class="label">Total Tasks</p>
          <p class="text-4xl font-bold tracking-tight text-zinc-100">{{ taskStore.totalCount }}</p>
        </div>
      </div>

      <div class="card col-span-2 md:col-span-1 flex flex-col justify-between">
        <div class="p-2 w-9 h-9 rounded-lg bg-amber-500/10 flex items-center justify-center text-amber-400">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <circle cx="12" cy="12" r="10" /><polyline points="12 6 12 12 16 14" />
          </svg>
        </div>
        <div>
          <p class="label">Active</p>
          <p class="text-4xl font-bold tracking-tight text-zinc-100">{{ taskStore.activeCount }}</p>
        </div>
      </div>

      <div class="card col-span-2 md:col-span-1 flex flex-col justify-between">
        <div class="p-2 w-9 h-9 rounded-lg bg-emerald-500/10 flex items-center justify-center text-emerald-400">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" /><polyline points="22 4 12 14.01 9 11.01" />
          </svg>
        </div>
        <div>
          <p class="label">Completed</p>
          <p class="text-4xl font-bold tracking-tight text-zinc-100">{{ taskStore.completedCount }}</p>
        </div>
      </div>

      <div class="card col-span-2 md:col-span-1 flex flex-col justify-between">
        <div class="p-2 w-9 h-9 rounded-lg bg-violet-500/10 flex items-center justify-center text-violet-400">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <line x1="12" y1="1" x2="12" y2="23" /><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6" />
          </svg>
        </div>
        <div>
          <p class="label">Portfolio (USD)</p>
          <p class="text-2xl font-bold tracking-tight text-zinc-100 truncate">$0.00</p>
        </div>
      </div>

      <!-- Focus List Preview -->
      <div class="card col-span-4 md:col-span-2 row-span-2 flex flex-col" style="min-height: 340px">
        <div class="flex items-center justify-between mb-5">
          <h3 class="font-semibold text-zinc-100">Focus List</h3>
          <router-link to="/routines" class="btn-ghost text-xs">View all →</router-link>
        </div>
        <div class="flex-1 space-y-2 overflow-y-auto pr-1">
          <div v-for="task in taskStore.activeTasks.slice(0, 5)" :key="task.id" class="flex items-center gap-3 py-2 border-b border-white/5 last:border-0">
            <div class="w-1.5 h-1.5 rounded-full bg-zinc-500"></div>
            <span class="text-sm text-zinc-300 flex-1 truncate">{{ task.title }}</span>
            <span class="badge scale-90Origin" :class="`badge--${task.priority}`">{{ task.priority }}</span>
          </div>
          <p v-if="taskStore.activeCount === 0" class="text-xs text-muted py-4">No active tasks. Time to focus?</p>
        </div>
      </div>

      <!-- Timer Widget -->
      <div class="card col-span-4 md:col-span-2 row-span-2 flex flex-col items-center justify-center text-center gap-6" style="min-height: 340px">
        <div class="relative w-44 h-44 flex items-center justify-center">
          <svg class="absolute inset-0 w-full h-full -rotate-90" viewBox="0 0 112 112">
            <circle class="text-zinc-800" stroke-width="6" stroke="currentColor" fill="none" r="52" cx="56" cy="56" />
            <circle class="text-zinc-100 transition-all duration-300" stroke-width="6" stroke-dasharray="326.73" stroke-dashoffset="326.73" stroke-linecap="round" stroke="currentColor" fill="none" r="52" cx="56" cy="56" />
          </svg>
          <span class="text-2xl font-bold font-mono tracking-tighter text-zinc-100">00:00:00</span>
        </div>
        <div>
          <p class="label mb-3">Ready to focus</p>
          <button class="btn-primary px-8 py-2.5">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
              <polygon points="5 3 19 12 5 21 5 3" />
            </svg>
            Start Session
          </button>
        </div>
      </div>
    </div>
  </div>
</template>
