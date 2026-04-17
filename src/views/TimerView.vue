<script setup lang="ts">
import { ref, onMounted, computed, onUnmounted } from 'vue';
import { useTimerStore, type TimerMode } from '@/stores/timer';
import { useTaskStore } from '@/stores/tasks';
import { formatDistanceToNow } from 'date-fns';

const timerStore = useTimerStore();
const taskStore = useTaskStore();

const showControls = ref(true);
let controlTimer: number | null = null;

const handleFullscreenChange = () => {
  if (!document.fullscreenElement) {
    timerStore.isZenMode = false;
  }
};

onMounted(async () => {
  await timerStore.init();
  await taskStore.fetchTasks();
  
  if (Notification.permission === "default") {
    Notification.requestPermission();
  }

  window.addEventListener('mousemove', handleMouseMove);
  document.addEventListener('fullscreenchange', handleFullscreenChange);
});

onUnmounted(() => {
    window.removeEventListener('mousemove', handleMouseMove);
    document.removeEventListener('fullscreenchange', handleFullscreenChange);
});

const handleMouseMove = () => {
    if (!timerStore.isZenMode) return;
    showControls.value = true;
    if (controlTimer) clearTimeout(controlTimer);
    controlTimer = window.setTimeout(() => {
        showControls.value = false;
    }, 3000);
};

const modes: { id: TimerMode; label: string }[] = [
  { id: 'stopwatch', label: 'Stopwatch' },
  { id: 'focus', label: 'Focus' },
  { id: 'short_break', label: 'Short Break' },
  { id: 'long_break', label: 'Long Break' },
];

const toggleZen = async () => {
  if (!timerStore.isZenMode) {
    try {
      if (document.documentElement.requestFullscreen) {
          await document.documentElement.requestFullscreen();
      }
      timerStore.isZenMode = true;
      showControls.value = false;
    } catch (err) {
      console.error("Fullscreen failed", err);
      timerStore.isZenMode = true;
    }
  } else {
    if (document.fullscreenElement) {
      await document.exitFullscreen();
    }
    timerStore.isZenMode = false;
  }
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
  <div :class="[timerStore.isZenMode ? '' : 'p-6 max-w-screen-2xl mx-auto page-transition']">
    <!-- Header -->
    <div v-if="!timerStore.isZenMode" class="mb-10 flex items-end justify-between transition-all duration-700">
      <div>
        <h1 class="text-4xl md:text-5xl font-bold tracking-tighter text-foreground">
          Deep Work
        </h1>
        <p class="text-base text-muted-foreground mt-2 max-w-2xl">
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

    <div class="grid grid-cols-1 lg:grid-cols-2 gap-6">
      <!-- Timer Card -->
      <div 
        class="card flex flex-col items-center justify-center gap-12 py-16 relative overflow-hidden transition-all duration-700 ease-[cubic-bezier(0.23,1,0.32,1)]"
        :class="{ 'shadow-sm': !timerStore.isZenMode }"
      >
        <!-- Standard Visual -->
        <template v-if="!timerStore.isZenMode">
            <!-- Task Labeling -->
            <div class="w-full max-w-sm z-10">
                <label class="label mb-2 flex items-center gap-2 justify-center">
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M12 2L2 7l10 5 10-5-10-5z"/><path d="M2 17l10 5 10-5"/><path d="M2 12l10 5 10-5"/></svg>
                    Tag Task for Focus
                </label>
                <select v-model="timerStore.linkedTaskId" class="select text-xs font-bold" :disabled="timerStore.isActive">
                    <option :value="null">No task linked (Stopwatch mode)</option>
                    <option v-for="task in taskStore.activeTasks" :key="task.id" :value="task.id">
                        {{ task.title }}
                    </option>
                </select>
            </div>

            <!-- Mode Selector Pills -->
            <div class="flex flex-wrap items-center justify-center gap-2 z-10">
                <button 
                    v-for="mode in modes" 
                    :key="mode.id" 
                    @click="timerStore.setMode(mode.id)" 
                    class="px-4 py-1.5 rounded-full text-xs font-bold border transition-all" 
                    :class="timerStore.mode === mode.id ? 'bg-primary text-primary-foreground border-primary shadow-sm' : 'bg-accent/50 text-muted-foreground border-border hover:text-foreground hover:bg-accent'"
                    :disabled="timerStore.isActive"
                >
                    {{ mode.label }}
                </button>
            </div>

            <!-- Timer Visual -->
            <div class="relative w-64 h-64 md:w-80 md:h-80 flex items-center justify-center group z-10">
                <svg class="absolute inset-0 w-full h-full -rotate-90" viewBox="0 0 240 240">
                    <circle class="text-muted/50" stroke-width="1.5" stroke="currentColor" fill="none" r="110" cx="120" cy="120" />
                    <circle 
                        class="transition-all duration-1000 ease-out text-primary" 
                        stroke-width="1.5" 
                        :stroke-dasharray="691.15" 
                        :stroke-dashoffset="timerStore.dashOffset * 1.047" 
                        stroke-linecap="round" 
                        stroke="currentColor" 
                        fill="none" 
                        r="110" cx="120" cy="120" 
                    />
                </svg>
                <div class="text-center z-10">
                    <p class="text-5xl md:text-7xl font-bold font-mono tracking-tighter text-foreground">{{ timerStore.formattedTime }}</p>
                    <p class="text-[10px] font-bold uppercase tracking-[0.4em] text-muted-foreground mt-4">Ready</p>
                </div>
            </div>

            <!-- Controls -->
            <div class="flex items-center gap-8 z-10">
                <button @click="timerStore.reset" class="btn-icon w-12 h-12 rounded-full hover:bg-destructive/10 hover:text-destructive transition-all">
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8"/><polyline points="3 3 3 8 8 8" /></svg>
                </button>
                <button @click="timerStore.isActive ? timerStore.pause() : timerStore.start()" class="w-20 h-20 rounded-full flex items-center justify-center bg-primary text-primary-foreground hover:scale-105 transition-all shadow-sm hover:shadow-primary/20">
                    <svg v-if="!timerStore.isActive" width="28" height="28" viewBox="0 0 24 24" fill="currentColor"><polygon points="5 3 19 12 5 21 5 3" /></svg>
                    <svg v-else width="28" height="28" viewBox="0 0 24 24" fill="currentColor"><rect x="6" y="4" width="4" height="16" /><rect x="14" y="4" width="4" height="16" /></svg>
                </button>
                <button @click="timerStore.completeSession" class="btn-icon w-12 h-12 rounded-full hover:bg-emerald-500/10 hover:text-emerald-600 dark:hover:text-emerald-400 transition-all">
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="20 6 9 17 4 12" /></svg>
                </button>
            </div>
        </template>
      </div>

      <!-- History Column -->
      <div v-if="!timerStore.isZenMode" class="flex flex-col gap-6">
        <div class="card flex flex-col flex-1 min-h-[500px]">
          <div class="flex items-center justify-between mb-8">
            <h3 class="font-bold text-foreground tracking-tight flex items-center gap-2">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 8v4l3 3"/><circle cx="12" cy="12" r="10"/></svg>
                Session History
            </h3>
            <span class="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">{{ timerStore.sessions.length }} Total</span>
          </div>

          <div class="space-y-3 overflow-y-auto pr-2 max-h-[600px] custom-scrollbar">
            <div 
                v-for="session in timerStore.sessions" 
                :key="session.id"
                class="flex items-center justify-between p-4 rounded-xl bg-accent/30 border border-border group hover:border-primary/20 transition-all"
            >
                <div class="flex items-center gap-4">
                    <div 
                        class="w-10 h-10 rounded-lg flex items-center justify-center text-xs font-bold uppercase border"
                        :class="{
                            'bg-violet-500/10 text-violet-600 dark:text-violet-400 border-violet-500/20': session.mode === 'focus',
                            'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20': session.mode.includes('break'),
                            'bg-muted text-muted-foreground border-border': session.mode === 'stopwatch'
                        }"
                    >
                        {{ session.mode.charAt(0) }}
                    </div>
                    <div>
                        <p class="text-sm font-bold text-foreground">{{ getTaskTitle(session.taskId) }}</p>
                        <p class="text-[10px] text-muted-foreground uppercase mt-0.5">{{ formatDistanceToNow(new Date(session.startTime), { addSuffix: true }) }}</p>
                    </div>
                </div>
                <div class="text-right flex items-center gap-4">
                    <div>
                        <p class="text-sm font-mono font-bold text-foreground">{{ formatDuration(session.duration) }}</p>
                        <p class="text-[9px] text-muted-foreground uppercase tracking-tighter">{{ session.mode.replace('_', ' ') }}</p>
                    </div>
                    <button @click="timerStore.deleteSession(session.id)" class="p-2 opacity-0 group-hover:opacity-100 text-muted-foreground hover:text-destructive transition-all">
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg>
                    </button>
                </div>
            </div>

            <div v-if="timerStore.sessions.length === 0" class="flex-1 flex flex-col items-center justify-center text-center py-20 opacity-40">
                <svg class="mb-4 text-muted-foreground" width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><circle cx="12" cy="12" r="10"/><path d="M12 8v4l3 3"/></svg>
                <p class="text-sm text-foreground">No recorded sessions yet.</p>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- ═══ ZEN OVERLAY (TELEPORTED) ═══ -->
    <Teleport to="body">
      <div 
        v-if="timerStore.isZenMode"
        class="fixed inset-0 z-[9999] bg-background flex flex-col items-center justify-center overflow-hidden"
      >
        <!-- Animated Aether Background -->
        <div class="absolute inset-0 pointer-events-none opacity-40">
            <div class="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-violet-600/10 rounded-full blur-[120px] animate-pulse"></div>
            <div class="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-emerald-600/5 rounded-full blur-[120px] animate-pulse" style="animation-delay: 2s"></div>
            <div class="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-full h-full bg-[radial-gradient(circle_at_center,var(--color-primary)/0.02_0%,transparent_70%)]"></div>
        </div>

        <!-- Exit Button -->
        <button 
            @click="toggleZen" 
            class="absolute top-12 right-12 inline-flex items-center gap-2 px-3 py-1.5 rounded-md text-muted-foreground hover:text-foreground transition-all duration-500 z-[110]"
            :class="{ 'opacity-0 translate-y-[-10px] pointer-events-none': !showControls }"
        >
            Exit Zen
        </button>

        <!-- Status & Mode -->
        <div class="absolute top-24 transition-all duration-500 z-10" :class="{ 'opacity-0 translate-y-[-10px] pointer-events-none': !showControls }">
            <label class="block text-[11px] font-semibold uppercase tracking-wider text-muted-foreground mb-2 flex items-center gap-2 justify-center">
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M12 2L2 7l10 5 10-5-10-5z"/><path d="M2 17l10 5 10-5"/><path d="M2 12l10 5 10-5"/></svg>
                Focusing on
            </label>
            <div class="text-center font-bold text-foreground text-lg tracking-tight">
                {{ getTaskTitle(timerStore.linkedTaskId) }}
            </div>
        </div>

        <div class="absolute top-48 flex flex-wrap items-center justify-center gap-2 transition-all duration-500 z-10" :class="{ 'opacity-0 translate-y-[-10px] pointer-events-none': !showControls }">
            <button v-for="mode in modes" :key="mode.id" @click="timerStore.setMode(mode.id)" class="px-4 py-1.5 rounded-full text-xs font-bold border transition-all" :class="timerStore.mode === mode.id ? 'bg-primary text-primary-foreground border-primary shadow-sm' : 'bg-accent/50 text-muted-foreground border-border hover:text-foreground hover:bg-accent'" :disabled="timerStore.isActive">
                {{ mode.label }}
            </button>
        </div>

        <!-- Main Timer (Centered) -->
        <div class="relative w-64 h-64 md:w-80 md:h-80 flex items-center justify-center z-10 transition-all duration-1000">
            <div v-if="timerStore.isActive" class="absolute inset-[-10%] rounded-full border border-primary/20 animate-pulse opacity-20"></div>
            <svg class="absolute inset-0 w-full h-full -rotate-90" viewBox="0 0 240 240">
                <circle class="text-muted/30" stroke-width="1.5" stroke="currentColor" fill="none" r="110" cx="120" cy="120" />
                <circle class="transition-all duration-1000 ease-out text-primary" stroke-width="1.5" :stroke-dasharray="691.15" :stroke-dashoffset="timerStore.dashOffset * 1.047" stroke-linecap="round" stroke="currentColor" fill="none" r="110" cx="120" cy="120" />
            </svg>
            <div class="text-center">
                <p class="text-6xl md:text-8xl font-bold font-mono tracking-tighter text-foreground">{{ timerStore.formattedTime }}</p>
                <p class="text-[10px] font-bold uppercase tracking-[0.4em] text-muted-foreground mt-4 transition-all duration-500" :class="{ 'opacity-0': !showControls }">
                    {{ timerStore.isActive ? (timerStore.mode === 'stopwatch' ? 'Recording' : 'Focusing') : 'Ready' }}
                </p>
            </div>
        </div>

        <!-- Bottom Controls -->
        <div class="absolute bottom-24 flex items-center gap-8 z-10 transition-all duration-500" :class="{ 'opacity-0 translate-y-12 pointer-events-none': !showControls }">
            <button @click="timerStore.reset" class="inline-flex items-center justify-center w-12 h-12 rounded-full border border-border text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-all"><svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8"/><polyline points="3 3 3 8 8 8" /></svg></button>
            <button @click="timerStore.isActive ? timerStore.pause() : timerStore.start()" class="w-24 h-24 rounded-full flex items-center justify-center bg-primary text-primary-foreground hover:scale-105 transition-all shadow-sm hover:shadow-primary/20"><svg v-if="!timerStore.isActive" width="32" height="32" viewBox="0 0 24 24" fill="currentColor"><polygon points="5 3 19 12 5 21 5 3" /></svg><svg v-else width="32" height="32" viewBox="0 0 24 24" fill="currentColor"><rect x="6" y="4" width="4" height="16" /><rect x="14" y="4" width="4" height="16" /></svg></button>
            <button @click="timerStore.completeSession" class="inline-flex items-center justify-center w-12 h-12 rounded-full border border-border text-muted-foreground hover:text-emerald-600 dark:hover:text-emerald-400 hover:bg-emerald-500/10 transition-all"><svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="20 6 9 17 4 12" /></svg></button>
        </div>
      </div>
    </Teleport>
  </div>
</template>

<style scoped>
@reference "../assets/main.css";

.custom-scrollbar::-webkit-scrollbar {
  width: 4px;
}
.custom-scrollbar::-webkit-scrollbar-track {
  background: transparent;
}
.custom-scrollbar::-webkit-scrollbar-thumb {
  @apply bg-border rounded-full;
}
</style>
