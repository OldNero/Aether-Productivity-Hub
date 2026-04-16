<script setup lang="ts">
import { ref, onMounted } from 'vue';
import { useTaskStore } from '@/stores/tasks';

const taskStore = useTaskStore();
const selectedTaskId = ref('');
const timerMode = ref<'stopwatch' | 'focus' | 'short_break' | 'long_break'>('stopwatch');

onMounted(async () => {
  await taskStore.fetchTasks();
});
</script>

<template>
  <div class="p-6 max-w-screen-2xl mx-auto page-transition">
    <div class="mb-10">
      <h1 class="text-4xl md:text-5xl font-bold tracking-tighter text-zinc-100">
        Deep Work
      </h1>
      <p class="text-base text-muted mt-2 max-w-2xl">
        Block out distractions and build consistent momentum.
      </p>
    </div>

    <div class="grid grid-cols-1 lg:grid-cols-2 gap-6">
      <!-- Timer Card -->
      <div class="card flex flex-col items-center justify-center gap-6 py-12 relative overflow-hidden">
        
        <!-- Task Labeling -->
        <div class="w-full px-12 mb-2">
          <label class="label mb-2 flex items-center gap-2">
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M12 2L2 7l10 5 10-5-10-5z"/><path d="M2 17l10 5 10-5"/><path d="M2 12l10 5 10-5"/></svg>
              Tag Task for Focus
          </label>
          <select v-model="selectedTaskId" class="select text-xs">
              <option value="">No task linked (Stopwatch mode)</option>
              <option v-for="task in taskStore.activeTasks" :key="task.id" :value="task.id">
                {{ task.title }}
              </option>
          </select>
        </div>

        <!-- Mode Selector Pills -->
        <div class="flex flex-wrap items-center justify-center gap-2 mb-2">
          <button v-for="mode in ['stopwatch', 'focus', 'short_break', 'long_break']" :key="mode" @click="timerMode = mode as any" class="mode-pill capitalize" :class="{ 'mode-pill--active': timerMode === mode }">
            {{ mode.replace('_', ' ') }}
          </button>
        </div>

        <!-- Ring -->
        <div class="relative w-56 h-56 flex items-center justify-center">
          <svg class="absolute inset-0 w-full h-full -rotate-90" viewBox="0 0 240 240">
            <circle class="text-zinc-800" stroke-width="8" stroke="currentColor" fill="none" r="105" cx="120" cy="120" />
            <circle class="transition-all duration-300" stroke-width="8" stroke-dasharray="659.7" stroke-dashoffset="659.7" stroke-linecap="round" stroke="#e4e4e7" fill="none" r="105" cx="120" cy="120" />
          </svg>
          <div class="text-center">
            <p class="text-4xl font-bold font-mono tracking-tighter text-zinc-100">00:00:00</p>
            <p class="text-[11px] font-semibold uppercase tracking-widest text-muted mt-2">Ready</p>
          </div>
        </div>

        <!-- Controls -->
        <div class="flex items-center gap-4">
          <button class="btn-icon p-3" title="Reset">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8"/><polyline points="3 3 3 8 8 8" />
            </svg>
          </button>
          <button class="btn-primary w-16 h-16 rounded-full text-lg shadow-lg">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
              <polygon points="5 3 19 12 5 21 5 3" />
            </svg>
          </button>
          <button class="btn-icon p-3" title="Save lap">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
              <line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" />
            </svg>
          </button>
        </div>
      </div>

      <!-- Right Column Placeholder -->
      <div class="flex flex-col gap-6">
        <div class="card flex flex-col flex-1 min-h-[400px]">
          <h3 class="font-semibold text-zinc-100 mb-5">Session History</h3>
          <div class="py-16 text-center text-muted text-sm">Timer logic is being migrated...</div>
        </div>
      </div>
    </div>
  </div>
</template>
