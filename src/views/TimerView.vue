<script setup lang="ts">
import { ref, onMounted, computed } from 'vue';
import { useTimerStore, type TimerMode } from '@/stores/timer';
import { useTaskStore } from '@/stores/tasks';
import { formatDistanceToNow } from 'date-fns';

const timerStore = useTimerStore();
const taskStore = useTaskStore();

const isZenMode = ref(false);

onMounted(async () => {
  await timerStore.init();
  await taskStore.fetchTasks();
  
  if (Notification.permission === "default") {
    Notification.requestPermission();
  }
});

const modes: { id: TimerMode; label: string }[] = [
  { id: 'stopwatch', label: 'Stopwatch' },
  { id: 'focus', label: 'Focus' },
  { id: 'short_break', label: 'Short Break' },
  { id: 'long_break', label: 'Long Break' },
];

const toggleZen = () => {
  isZenMode.value = !isZenMode.value;
};

const formatDuration = (seconds: number) => {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m}m ${s}s`;
};

const getTaskTitle = (id?: string) => {
  if (!id) return 'General Session';
  return taskStore.tasks.find(t => t.id === id)?.title || 'Unknown Task';
};
</script>

<template>
  <div class="p-6 max-w-screen-2xl mx-auto page-transition" :class="{ 'zen-active': isZenMode }">
    <div class="mb-10 flex items-end justify-between transition-all duration-500" :class="{ 'opacity-0 pointer-events-none translate-y-[-20px]': isZenMode }">
      <div>
        <h1 class="text-4xl md:text-5xl font-bold tracking-tighter text-zinc-100">
          Deep Work
        </h1>
        <p class="text-base text-muted mt-2 max-w-2xl">
          Block out distractions and build consistent momentum.
        </p>
      </div>
      <button @click="toggleZen" class="btn-secondary group">
        <svg class="group-hover:rotate-12 transition-transform" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M12 3a6 6 0 0 0 9 9 9 9 0 1 1-9-9Z"/>
        </svg>
        Zen Mode
      </button>
    </div>

    <div class="grid grid-cols-1 lg:grid-cols-2 gap-6 transition-all duration-700">
      <!-- Timer Card -->
      <div 
        class="card flex flex-col items-center justify-center gap-8 py-16 relative overflow-hidden transition-all duration-700"
        :class="{ 'fixed inset-0 z-[100] border-0 bg-zinc-950 rounded-none py-0': isZenMode }"
      >
        <!-- Zen Mode Exit -->
        <button v-if="isZenMode" @click="toggleZen" class="absolute top-8 right-8 btn-ghost text-zinc-500 hover:text-white">
            Exit Zen
        </button>

        <!-- Task Labeling -->
        <div class="w-full max-w-sm transition-all duration-500" :class="{ 'opacity-0 translate-y-4': isZenMode }">
          <label class="label mb-2 flex items-center gap-2">
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M12 2L2 7l10 5 10-5-10-5z"/><path d="M2 17l10 5 10-5"/><path d="M2 12l10 5 10-5"/></svg>
              Tag Task for Focus
          </label>
          <select v-model="timerStore.linkedTaskId" class="select text-xs bg-zinc-900/50" :disabled="timerStore.isActive">
              <option :value="null">No task linked (Stopwatch mode)</option>
              <option v-for="task in taskStore.activeTasks" :key="task.id" :value="task.id">
                {{ task.title }}
              </option>
          </select>
        </div>

        <!-- Mode Selector Pills -->
        <div class="flex flex-wrap items-center justify-center gap-2 transition-all duration-500" :class="{ 'opacity-0': isZenMode }">
          <button 
            v-for="mode in modes" 
            :key="mode.id" 
            @click="timerStore.setMode(mode.id)" 
            class="mode-pill" 
            :class="{ 'mode-pill--active': timerStore.mode === mode.id }"
            :disabled="timerStore.isActive"
          >
            {{ mode.label }}
          </button>
        </div>

        <!-- Timer Visual -->
        <div class="relative w-64 h-64 md:w-80 md:h-80 flex items-center justify-center group">
          <!-- Outer Breathing Ring (Zen Mode only) -->
          <div v-if="isZenMode && timerStore.isActive" class="absolute inset-0 rounded-full border-2 border-white/5 animate-ping opacity-20"></div>
          
          <svg class="absolute inset-0 w-full h-full -rotate-90 scale-110 md:scale-125 transition-transform duration-700" viewBox="0 0 240 240">
            <circle class="text-zinc-900" stroke-width="4" stroke="currentColor" fill="none" r="105" cx="120" cy="120" />
            <circle 
                class="transition-all duration-500 ease-out" 
                stroke-width="4" 
                :stroke-dasharray="659.7" 
                :stroke-dashoffset="timerStore.dashOffset" 
                stroke-linecap="round" 
                stroke="white" 
                fill="none" 
                r="105" cx="120" cy="120" 
            />
          </svg>
          
          <div class="text-center z-10">
            <p class="text-6xl md:text-7xl font-bold font-mono tracking-tighter text-zinc-100 transition-all duration-500" :class="{ 'scale-110': timerStore.isActive }">
                {{ timerStore.formattedTime }}
            </p>
            <p class="text-[11px] font-bold uppercase tracking-[0.2em] text-muted mt-4">
                {{ timerStore.isActive ? (timerStore.mode === 'stopwatch' ? 'Recording' : 'Focusing') : 'Ready' }}
            </p>
          </div>
        </div>

        <!-- Controls -->
        <div class="flex items-center gap-6 z-10">
          <button 
            @click="timerStore.reset" 
            class="btn-icon w-12 h-12 rounded-full hover:bg-rose-500/10 hover:text-rose-400 transition-all"
            :class="{ 'opacity-0 translate-y-4': isZenMode && !timerStore.isActive }"
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8"/><polyline points="3 3 3 8 8 8" />
            </svg>
          </button>
          
          <button 
            @click="timerStore.isActive ? timerStore.pause() : timerStore.start()"
            class="w-20 h-20 rounded-full flex items-center justify-center transition-all duration-300 shadow-2xl active:scale-95"
            :class="timerStore.isActive ? 'bg-zinc-100 text-zinc-950 hover:bg-white' : 'bg-white text-zinc-950 hover:scale-105 shadow-white/10'"
          >
            <svg v-if="!timerStore.isActive" width="28" height="28" viewBox="0 0 24 24" fill="currentColor">
              <polygon points="5 3 19 12 5 21 5 3" />
            </svg>
            <svg v-else width="28" height="28" viewBox="0 0 24 24" fill="currentColor">
              <rect x="6" y="4" width="4" height="16" /><rect x="14" y="4" width="4" height="16" />
            </svg>
          </button>

          <button 
            @click="timerStore.completeSession"
            class="btn-icon w-12 h-12 rounded-full hover:bg-emerald-500/10 hover:text-emerald-400 transition-all"
            :class="{ 'opacity-0 translate-y-4': isZenMode && !timerStore.isActive }"
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
              <polyline points="20 6 9 17 4 12" />
            </svg>
          </button>
        </div>
      </div>

      <!-- History Column -->
      <div class="flex flex-col gap-6 transition-all duration-500" :class="{ 'opacity-0 translate-x-10 pointer-events-none': isZenMode }">
        <div class="card flex flex-col flex-1 min-h-[500px]">
          <div class="flex items-center justify-between mb-8">
            <h3 class="font-bold text-zinc-100 tracking-tight flex items-center gap-2">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 8v4l3 3"/><circle cx="12" cy="12" r="10"/></svg>
                Session History
            </h3>
            <span class="text-[10px] font-bold text-muted uppercase tracking-widest">{{ timerStore.sessions.length }} Total</span>
          </div>

          <div class="space-y-3 overflow-y-auto pr-2 max-h-[600px] custom-scrollbar">
            <div 
                v-for="session in timerStore.sessions" 
                :key="session.id"
                class="flex items-center justify-between p-4 rounded-xl bg-white/[0.03] border border-white/5 group hover:border-white/10 transition-all"
            >
                <div class="flex items-center gap-4">
                    <div 
                        class="w-10 h-10 rounded-lg flex items-center justify-center text-xs font-bold uppercase"
                        :class="{
                            'bg-violet-500/10 text-violet-400': session.mode === 'focus',
                            'bg-emerald-500/10 text-emerald-400': session.mode.includes('break'),
                            'bg-zinc-500/10 text-zinc-400': session.mode === 'stopwatch'
                        }"
                    >
                        {{ session.mode.charAt(0) }}
                    </div>
                    <div>
                        <p class="text-sm font-bold text-zinc-100">{{ getTaskTitle(session.taskId) }}</p>
                        <p class="text-[10px] text-muted uppercase mt-0.5">{{ formatDistanceToNow(new Date(session.startTime), { addSuffix: true }) }}</p>
                    </div>
                </div>
                <div class="text-right flex items-center gap-4">
                    <div>
                        <p class="text-sm font-mono font-bold text-zinc-100">{{ formatDuration(session.duration) }}</p>
                        <p class="text-[9px] text-muted uppercase tracking-tighter">{{ session.mode.replace('_', ' ') }}</p>
                    </div>
                    <button @click="timerStore.deleteSession(session.id)" class="p-2 opacity-0 group-hover:opacity-100 text-zinc-600 hover:text-rose-400 transition-all">
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg>
                    </button>
                </div>
            </div>

            <div v-if="timerStore.sessions.length === 0" class="flex-1 flex flex-col items-center justify-center text-center py-20 opacity-40">
                <svg class="mb-4 text-zinc-600" width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><circle cx="12" cy="12" r="10"/><path d="M12 8v4l3 3"/></svg>
                <p class="text-sm">No recorded sessions yet.</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
@reference "../assets/main.css";

.mode-pill {
  @apply px-4 py-1.5 rounded-full text-xs font-bold text-muted border border-white/5 hover:text-white hover:bg-white/5 transition-all disabled:opacity-50;
}
.mode-pill--active {
  @apply bg-white/10 text-white border-white/10 shadow-lg;
}

.zen-active {
    cursor: none;
}

.custom-scrollbar::-webkit-scrollbar {
  width: 4px;
}
.custom-scrollbar::-webkit-scrollbar-track {
  background: transparent;
}
.custom-scrollbar::-webkit-scrollbar-thumb {
  background: rgba(255, 255, 255, 0.05);
  border-radius: 10px;
}
</style>
