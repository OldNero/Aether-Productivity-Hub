<script setup lang="ts">
import { onMounted, ref, computed } from 'vue';
import { useAuthStore } from '@/stores/auth';
import { useTaskStore } from '@/stores/tasks';
import { useTimerStore } from '@/stores/timer';
import { useInvestmentStore } from '@/stores/investments';
import { useIntelligenceStore } from '@/stores/intelligence';
import { useEventStore } from '@/stores/events';

const authStore = useAuthStore();
const taskStore = useTaskStore();
const timerStore = useTimerStore();
const investmentStore = useInvestmentStore();
const intelligenceStore = useIntelligenceStore();
const eventStore = useEventStore();

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

const formatCurrency = (val: number) => {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(val);
};

const dashOffset = computed(() => {
  // SVG Circle circumference for r=52 is ~326.73
  const circumference = 326.73;
  if (timerStore.mode === 'stopwatch') return circumference;
  const p = timerStore.secondsElapsed / timerStore.targetSeconds;
  return circumference * (1 - p);
});

const nextEvent = computed(() => {
  const now = new Date();
  return eventStore.events
    .filter(e => new Date(e.start_time) > now)
    .sort((a, b) => new Date(a.start_time).getTime() - new Date(b.start_time).getTime())[0] || null;
});

const formatEventTime = (dateStr: string) => {
  const d = new Date(dateStr);
  return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
};

const timeUntilNextEvent = computed(() => {
  if (!nextEvent.value) return '';
  const now = new Date();
  const start = new Date(nextEvent.value.start_time);
  const diffMs = start.getTime() - now.getTime();
  
  if (diffMs <= 0) return 'Starts now';

  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
  const diffHours = Math.floor((diffMs % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
  const diffMins = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));

  if (diffDays > 0) {
    return `Starts in ${diffDays} day${diffDays > 1 ? 's' : ''}`;
  } else if (diffHours > 0) {
    return `starts in ${diffHours}h ${diffMins}m`;
  } else {
    return `starts in ${diffMins}m`;
  }
});

const isNextEventSoon = computed(() => {
  if (!nextEvent.value) return false;
  const now = new Date();
  const start = new Date(nextEvent.value.start_time);
  const diffMs = start.getTime() - now.getTime();
  return diffMs < (1000 * 60 * 60 * 24); // Less than 1 day away
});

onMounted(async () => {
  await Promise.all([
    taskStore.fetchTasks(),
    timerStore.init(),
    investmentStore.fetchInvestments(),
    eventStore.fetchEvents()
  ]);
  
  // Fetch Quote
  try {
    const response = await fetch('https://quoteslate.vercel.app/api/quotes/random');
    if (response.ok) {
        const data = await response.json();
        quote.value = { text: data.quote, author: data.author };
    }
  } catch (err) {
    console.warn("Quote fetch failed, using default.");
  }
  // Run intelligence engine in background (non-blocking)
  intelligenceStore.generateInsights();
});
</script>

<template>
  <div class="p-6 max-w-screen-2xl mx-auto page-transition">
    <!-- Dashboard Header -->
    <div class="mb-10">
      <h1 class="text-4xl md:text-5xl font-bold tracking-tighter text-foreground">
        Dashboard
      </h1>
      <p class="text-base text-muted-foreground mt-2 max-w-2xl">
        Your high-level overview of productivity and performance.
      </p>
    </div>

    <!-- Bento Grid -->
    <div class="grid grid-cols-4 gap-4" style="grid-auto-rows: minmax(160px, auto)">
      <!-- Greeting Card -->
      <div class="card col-span-4 md:col-span-1 flex flex-col justify-between relative overflow-hidden">
        <div :class="glowClass" id="greeting-card-glow"></div>
        <div class="p-2 w-9 h-9 rounded-lg bg-accent flex items-center justify-center text-amber-500 mb-2 relative z-10">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
            <circle cx="12" cy="12" r="5" />
            <path d="M12 1v2M12 21v2M4.22 4.22l1.42 1.42M18.36 18.36l1.42 1.42M1 12h2M21 12h2M4.22 19.78l1.42-1.42M18.36 5.64l1.42-1.42" />
          </svg>
        </div>
        <div class="relative z-10">
          <p class="label">{{ greeting }}</p>
          <div v-if="!authStore.currentUser" class="h-8 w-32 skeleton mt-1"></div>
          <p v-else class="text-2xl font-bold tracking-tight text-foreground truncate">
            {{ authStore.currentUser.username || 'Guest' }}
          </p>
        </div>
      </div>

      <!-- Aether Intelligence Insight -->
      <div class="card col-span-4 md:col-span-1 flex flex-col justify-between border-primary/10 relative overflow-hidden group">
        <div class="absolute top-0 right-0 p-3 opacity-20 group-hover:opacity-40 transition-opacity text-foreground">
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M22 12h-4l-3 9L9 3l-3 9H2"/>
          </svg>
        </div>
        <div>
          <p class="label mb-1">Aether Intelligence</p>
          <!-- Show AI insight if available, else fallback -->
          <p class="text-sm font-medium text-foreground leading-snug">
            {{ intelligenceStore.insights[0]?.body || (taskStore.activeCount > 3 ? 'You have a busy day ahead. Focus on high-priority tasks first.' : 'Consistency is key. You\'re making great progress!') }}
          </p>
        </div>
        <!-- Momentum Score mini ring -->
        <div class="flex items-center gap-3 mt-4">
          <div class="relative w-8 h-8">
            <svg class="-rotate-90 w-full h-full" viewBox="0 0 32 32">
              <circle cx="16" cy="16" r="12" fill="none" stroke="currentColor" stroke-width="3" class="text-muted/20"/>
              <circle
                cx="16" cy="16" r="12"
                fill="none" stroke-width="3" stroke-linecap="round"
                :stroke="intelligenceStore.momentumColor"
                :stroke-dasharray="75.4"
                :stroke-dashoffset="75.4 - (intelligenceStore.momentumScore / 100) * 75.4"
                style="transition: stroke-dashoffset 1.2s cubic-bezier(0.16,1,0.3,1)"
              />
            </svg>
            <span class="absolute inset-0 flex items-center justify-center text-[8px] font-bold text-foreground">{{ intelligenceStore.momentumScore }}</span>
          </div>
          <div>
            <div class="flex items-center gap-1.5">
              <div class="w-1.5 h-1.5 rounded-full animate-pulse" :style="{ backgroundColor: intelligenceStore.momentumColor }"></div>
              <p class="text-[10px] text-muted-foreground uppercase tracking-widest font-bold">{{ intelligenceStore.momentumLabel }}</p>
            </div>
            <router-link to="/intelligence" class="text-[9px] text-muted-foreground hover:text-foreground transition-colors">View full analysis →</router-link>
          </div>
        </div>
      </div>

      <!-- Quote Card -->
      <div class="card col-span-4 md:col-span-2 flex flex-col justify-end min-h-[180px] relative overflow-hidden">
        <div class="absolute top-0 right-0 w-72 h-72 bg-primary/5 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2 pointer-events-none"></div>
        <blockquote class="text-xl font-semibold text-foreground max-w-2xl leading-snug mb-3 relative z-10">
          "{{ quote.text }}"
        </blockquote>
        <cite class="text-[11px] font-semibold uppercase tracking-widest text-muted-foreground not-italic font-mono relative z-10">
          — {{ quote.author }}
        </cite>
      </div>

      <!-- Next Event Card -->
      <div class="card col-span-4 md:col-span-2 flex flex-col justify-between group cursor-pointer hover:border-primary/30 transition-all" @click="$router.push('/calendar')">
        <div class="flex items-center justify-between">
          <div class="p-2 w-9 h-9 rounded-lg bg-sky-500/10 flex items-center justify-center text-sky-600 dark:text-sky-400">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <rect x="3" y="4" width="18" height="18" rx="2" ry="2" /><line x1="16" y1="2" x2="16" y2="6" /><line x1="8" y1="2" x2="8" y2="6" /><line x1="3" y1="10" x2="21" y2="10" />
            </svg>
          </div>
          <div v-if="nextEvent" class="flex items-center gap-1.5 px-3 py-1 rounded-full bg-sky-500/10 text-sky-600 dark:text-sky-400 text-[10px] font-bold uppercase tracking-widest">
            <span class="relative flex h-2 w-2">
              <span class="animate-ping absolute inline-flex h-full w-full rounded-full bg-sky-400 opacity-75"></span>
              <span class="relative inline-flex rounded-full h-2 w-2 bg-sky-500"></span>
            </span>
            Upcoming
          </div>
        </div>
              <div v-if="!eventStore.isLoaded">
          <p class="label mb-1">Next Event</p>
          <div class="flex justify-between items-end gap-4">
             <div class="h-8 w-48 skeleton"></div>
             <div class="h-8 w-20 skeleton"></div>
          </div>
        </div>
        <div v-else-if="nextEvent">
          <p class="label mb-1">Next Event</p>
          <div class="flex flex-col md:flex-row md:items-end justify-between gap-2">
            <div>
              <p class="text-2xl font-bold tracking-tight text-foreground">{{ nextEvent.title }}</p>
              <p class="text-xs font-medium text-muted-foreground mt-1 flex items-center gap-2">
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/></svg>
                {{ nextEvent.location || 'No location specified' }}
              </p>
            </div>
            <div class="text-right">
              <p class="text-xl font-bold text-foreground">{{ formatEventTime(nextEvent.start_time) }}</p>
              <p class="text-[10px] font-bold text-sky-500 uppercase tracking-widest" :class="{ 'animate-pulse': isNextEventSoon }">{{ timeUntilNextEvent }}</p>
            </div>
          </div>
        </div>
        <div v-else>
          <p class="label mb-1">Next Event</p>
          <p class="text-sm font-medium text-muted-foreground italic">Your schedule is clear. Take some time for yourself!</p>
        </div>
      </div>


      <div class="card col-span-4 md:col-span-2 flex flex-col justify-between relative overflow-hidden group">
        <div class="absolute top-0 right-0 p-3 opacity-10 group-hover:opacity-20 transition-opacity text-foreground">
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <line x1="12" y1="1" x2="12" y2="23" /><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6" />
          </svg>
        </div>
        
        <div>
          <p class="label mb-4">Portfolio Performance</p>
          <div v-if="!investmentStore.isLoaded" class="grid grid-cols-2 gap-4">
             <div class="h-10 w-full skeleton"></div>
             <div class="h-10 w-full skeleton border-l border-border pl-4"></div>
          </div>
          <div v-else class="grid grid-cols-2 gap-4">
            <div>
              <p class="text-[10px] font-bold text-muted-foreground uppercase tracking-widest mb-1">Since Inception</p>
              <p class="text-3xl font-bold tracking-tighter transition-colors" :class="investmentStore.totalGain >= 0 ? 'text-emerald-500' : 'text-rose-500'">
                {{ investmentStore.totalGain >= 0 ? '+' : '' }}{{ investmentStore.totalGainPercent.toFixed(2) }}%
              </p>
            </div>
            <div class="border-l border-border pl-4">
              <p class="text-[10px] font-bold text-muted-foreground uppercase tracking-widest mb-1">Daily Change</p>
              <p class="text-3xl font-bold tracking-tighter transition-colors" :class="investmentStore.dayChange.value >= 0 ? 'text-emerald-500' : 'text-rose-500'">
                {{ investmentStore.dayChange.value >= 0 ? '+' : '' }}{{ investmentStore.dayChange.percent.toFixed(2) }}%
              </p>
            </div>
          </div>
        </div>
        
        <div class="mt-4 flex items-center justify-between">
           <div class="flex items-center gap-1.5">
             <div class="w-1.5 h-1.5 rounded-full" :class="investmentStore.dayChange.value >= 0 ? 'bg-emerald-500' : 'bg-rose-500'"></div>
             <p class="text-[9px] text-muted-foreground font-bold uppercase tracking-tight">
               {{ investmentStore.dayChange.value >= 0 ? 'Outperforming' : 'Underperforming' }} vs Yesterday
             </p>
           </div>
           <router-link to="/investments" class="text-[9px] font-bold text-muted-foreground hover:text-foreground transition-colors uppercase tracking-widest">Full Ledger →</router-link>
        </div>
      </div>

      <!-- Focus List Preview -->
      <div class="card col-span-4 md:col-span-2 row-span-2 flex flex-col" style="min-height: 340px">
        <div class="flex items-center justify-between mb-5">
          <h3 class="font-semibold text-foreground">Focus List</h3>
          <router-link to="/routines" class="btn-ghost text-xs">View all →</router-link>
        </div>
        <div class="flex-1 space-y-2 overflow-y-auto pr-1">
          <template v-if="!taskStore.isLoaded">
            <div v-for="i in 5" :key="i" class="flex items-center gap-3 py-3 border-b border-border last:border-0">
               <div class="w-2 h-2 rounded-full skeleton"></div>
               <div class="h-4 flex-1 skeleton"></div>
               <div class="h-4 w-12 rounded-full skeleton"></div>
            </div>
          </template>
          <template v-else>
            <div v-for="task in taskStore.activeTasks.slice(0, 5)" :key="task.id" class="flex items-center gap-3 py-2 border-b border-border last:border-0">
              <div class="w-1.5 h-1.5 rounded-full bg-muted-foreground/30"></div>
              <span class="text-sm text-foreground/80 flex-1 truncate">{{ task.title }}</span>
              <span class="badge" :class="`badge--${task.priority}`">{{ task.priority }}</span>
            </div>
            <p v-if="taskStore.activeCount === 0" class="text-xs text-muted-foreground py-4">No active tasks. Time to focus?</p>
          </template>
        </div>
      </div>

      <!-- Timer Widget -->
      <div class="card col-span-4 md:col-span-2 row-span-2 flex flex-col items-center justify-center text-center gap-6" style="min-height: 340px">
        <div class="relative w-44 h-44 flex items-center justify-center">
          <svg class="absolute inset-0 w-full h-full -rotate-90" viewBox="0 0 112 112">
            <circle class="text-muted/30" stroke-width="6" stroke="currentColor" fill="none" r="52" cx="56" cy="56" />
            <circle 
                class="text-primary transition-all duration-300" 
                stroke-width="6" 
                :stroke-dasharray="326.73" 
                :stroke-dashoffset="dashOffset" 
                stroke-linecap="round" 
                stroke="currentColor" 
                fill="none" 
                r="52" cx="56" cy="56" 
            />
          </svg>
          <span class="text-2xl font-bold font-mono tracking-tighter text-foreground">{{ timerStore.formattedTime }}</span>
        </div>
        <div>
          <p class="label mb-3 capitalize text-muted-foreground">{{ timerStore.isActive ? (timerStore.mode === 'stopwatch' ? 'Recording' : 'Focusing') : 'Ready to focus' }}</p>
          <div class="flex items-center gap-3">
              <button 
                @click="timerStore.isActive ? timerStore.pause() : timerStore.start()" 
                class="btn-primary px-8 py-2.5 min-w-[160px]"
              >
                <template v-if="!timerStore.isActive">
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
                        <polygon points="5 3 19 12 5 21 5 3" />
                    </svg>
                    Start Session
                </template>
                <template v-else>
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
                        <rect x="6" y="4" width="4" height="16" /><rect x="14" y="4" width="4" height="16" />
                    </svg>
                    Pause
                </template>
              </button>
              <button 
                v-if="timerStore.isActive || timerStore.secondsElapsed > 0"
                @click="timerStore.completeSession"
                class="btn-secondary p-2.5 rounded-full"
              >
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="20 6 9 17 4 12"/></svg>
              </button>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>
