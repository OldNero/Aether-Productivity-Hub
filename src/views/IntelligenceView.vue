<script setup lang="ts">
import { onMounted, computed, ref } from 'vue';
import { useIntelligenceStore } from '@/stores/intelligence';
import { useTimerStore } from '@/stores/timer';
import { useTaskStore } from '@/stores/tasks';
import { Chart, BarController, BarElement, LineController, LineElement, PointElement, LinearScale, CategoryScale, Tooltip, Filler } from 'chart.js';
import { eachDayOfInterval, subDays, format, isSameDay } from 'date-fns';

Chart.register(BarController, BarElement, LineController, LineElement, PointElement, LinearScale, CategoryScale, Tooltip, Filler);

const intelligenceStore = useIntelligenceStore();
const timerStore = useTimerStore();
const taskStore = useTaskStore();

const bestDayChartRef = ref<HTMLCanvasElement | null>(null);
let bestDayChart: Chart | null = null;

// --- Momentum Score ring ---
const ringCircumference = 339.3; // 2 * π * 54
const ringOffset = computed(() => {
  return ringCircumference - (intelligenceStore.momentumScore / 100) * ringCircumference;
});

// --- Streak grid (last 30 days) ---
const streakGrid = computed(() => {
  const now = new Date();
  return Array.from({ length: 30 }, (_, i) => {
    const day = subDays(now, 29 - i);
    const active = timerStore.sessions.some(
      s => s.mode === 'focus' && isSameDay(new Date(s.start_time), day)
    );
    return { date: format(day, 'MMM d'), active };
  });
});

// --- Category icon map ---
const categoryIcon = (cat: string) => {
  const icons: Record<string, string> = {
    focus: `<path d="M12 20V10"/><path d="M18 20V4"/><path d="M6 20v-4"/>`,
    productivity: `<path d="M9 11l3 3L22 4"/><path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11"/>`,
    portfolio: `<line x1="12" y1="1" x2="12" y2="23"/><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/>`,
    balance: `<line x1="12" y1="2" x2="12" y2="22"/><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/>`,
    streak: `<polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/>`,
  };
  return icons[cat] || icons.focus;
};

const categoryColor = (cat: string) => {
  const colors: Record<string, string> = {
    focus: 'bg-violet-500/10 text-violet-500 border-violet-500/20',
    productivity: 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20',
    portfolio: 'bg-sky-500/10 text-sky-500 border-sky-500/20',
    balance: 'bg-amber-500/10 text-amber-500 border-amber-500/20',
    streak: 'bg-rose-500/10 text-rose-500 border-rose-500/20',
  };
  return colors[cat] || colors.focus;
};

// --- Best day of week chart ---
const initBestDayChart = () => {
  if (!bestDayChartRef.value) return;
  const existing = Chart.getChart(bestDayChartRef.value);
  if (existing) existing.destroy();

  const days = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
  const data = days.map(day =>
    timerStore.sessions
      .filter(s => s.mode === 'focus' && format(new Date(s.start_time), 'EEEE') === day)
      .reduce((acc, s) => acc + s.duration / 60, 0)
  );

  const maxVal = Math.max(...data);
  const colors = data.map(v => v === maxVal && v > 0 ? '#8b5cf6' : 'rgba(139, 92, 246, 0.3)');

  bestDayChart = new Chart(bestDayChartRef.value, {
    type: 'bar',
    data: {
      labels: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'],
      datasets: [{
        label: 'Focus Minutes',
        data,
        backgroundColor: colors,
        borderRadius: 8,
        borderSkipped: false,
      }],
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: { display: false },
        tooltip: {
          backgroundColor: 'rgba(24,24,27,0.95)',
          titleColor: '#f4f4f5',
          bodyColor: '#a1a1aa',
          padding: 12,
          borderWidth: 0,
          callbacks: { label: ctx => `${Math.round(ctx.parsed.y ?? 0)} min` },
        },
      },
      scales: {
        x: { grid: { display: false }, ticks: { color: '#71717a', font: { size: 11 } } },
        y: { grid: { color: 'rgba(255,255,255,0.04)' }, ticks: { color: '#71717a', font: { size: 11 } }, beginAtZero: true },
      },
    },
  });
};

onMounted(async () => {
  await intelligenceStore.generateInsights();
  initBestDayChart();
});
</script>

<template>
  <div class="intelligence-view-container">
    <div class="p-6 max-w-screen-2xl mx-auto page-transition">
      <!-- Header -->
      <div class="mb-10 flex flex-col md:flex-row md:items-end justify-between gap-6">
        <div>
          <div class="flex items-center gap-3 mb-2">
            <div class="w-8 h-8 rounded-xl bg-violet-500/15 flex items-center justify-center">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#8b5cf6" stroke-width="2">
                <path d="M12 2a2 2 0 0 1 2 2c0 .74-.4 1.39-1 1.73V7h1a7 7 0 0 1 7 7h1a1 1 0 0 1 1 1v3a1 1 0 0 1-1 1h-1v1a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-1H2a1 1 0 0 1-1-1v-3a1 1 0 0 1 1-1h1a7 7 0 0 1 7-7h1V5.73c-.6-.34-1-.99-1-1.73a2 2 0 0 1 2-2z"/>
              </svg>
            </div>
            <span class="text-xs font-bold text-violet-500 uppercase tracking-widest">Aether Intelligence</span>
          </div>
          <h1 class="text-4xl md:text-5xl font-bold tracking-tighter text-foreground">Intelligence</h1>
          <p class="text-base text-muted-foreground mt-2">AI-powered insights from your behavioral patterns.</p>
        </div>

        <button
          @click="intelligenceStore.generateInsights()"
          :disabled="intelligenceStore.isLoading"
          class="btn-primary flex items-center gap-2 px-6"
        >
          <svg v-if="intelligenceStore.isLoading" class="animate-spin" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3">
            <path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83"/>
          </svg>
          <svg v-else width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/>
          </svg>
          {{ intelligenceStore.isLoading ? 'Analyzing...' : 'Refresh Insights' }}
        </button>
      </div>

      <!-- Top Row: Momentum Score + Insights -->
      <div class="grid grid-cols-1 lg:grid-cols-4 gap-6 mb-6">

        <!-- Momentum Score Card -->
        <div class="card lg:col-span-1 flex flex-col items-center justify-center gap-4 relative overflow-hidden py-8">
          <div class="absolute inset-0 opacity-30 pointer-events-none" :style="`background: radial-gradient(circle at 50% 50%, ${intelligenceStore.momentumColor}40 0%, transparent 70%)`"></div>

          <p class="label text-center">Momentum Score</p>

          <div class="relative w-40 h-40 flex items-center justify-center">
            <svg class="-rotate-90 absolute inset-0 w-full h-full" viewBox="0 0 120 120">
              <circle cx="60" cy="60" r="54" fill="none" stroke="currentColor" stroke-width="8" class="text-muted/20"/>
              <circle
                cx="60" cy="60" r="54"
                fill="none" stroke-width="8" stroke-linecap="round"
                :stroke="intelligenceStore.momentumColor"
                :stroke-dasharray="ringCircumference"
                :stroke-dashoffset="ringOffset"
                style="transition: stroke-dashoffset 1.2s cubic-bezier(0.16,1,0.3,1)"
              />
            </svg>
            <div class="flex flex-col items-center z-10">
              <span class="text-5xl font-bold tracking-tighter text-foreground">{{ intelligenceStore.momentumScore }}</span>
              <span class="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">/ 100</span>
            </div>
          </div>

          <div class="text-center">
            <p class="font-bold text-foreground">{{ intelligenceStore.momentumLabel }}</p>
            <p v-if="intelligenceStore.streakDays > 0" class="text-xs text-muted-foreground mt-1">
              🔥 {{ intelligenceStore.streakDays }}-day streak
            </p>
            <p v-if="intelligenceStore.lastUpdated" class="text-[10px] text-muted-foreground mt-2 opacity-60">
              Updated {{ intelligenceStore.lastUpdated.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) }}
            </p>
          </div>
        </div>

        <!-- AI Insight Cards -->
        <div class="lg:col-span-3 grid grid-cols-1 sm:grid-cols-2 gap-4">
          <!-- Loading skeleton -->
          <template v-if="intelligenceStore.isLoading">
            <div v-for="i in 4" :key="i" class="card animate-pulse">
              <div class="h-4 w-20 bg-muted rounded mb-3"></div>
              <div class="h-3 w-full bg-muted rounded mb-2 opacity-50"></div>
              <div class="h-3 w-3/4 bg-muted rounded opacity-30"></div>
            </div>
          </template>

          <!-- Error state -->
          <div v-else-if="intelligenceStore.error && intelligenceStore.insights.length === 0" class="sm:col-span-2 card flex items-center gap-4 border-rose-500/20">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#f43f5e" stroke-width="2"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
            <p class="text-sm text-muted-foreground">{{ intelligenceStore.error }}</p>
          </div>

          <!-- Insight cards -->
          <div
            v-for="insight in intelligenceStore.insights"
            :key="insight.id"
            class="card flex flex-col gap-3 hover:border-border/80 transition-all duration-300 group"
          >
            <div class="flex items-center gap-2">
              <div :class="`w-7 h-7 rounded-lg flex items-center justify-center border ${categoryColor(insight.category)}`">
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" v-html="categoryIcon(insight.category)"></svg>
              </div>
              <span :class="`text-[10px] font-bold uppercase tracking-widest ${categoryColor(insight.category).split(' ').find(c => c.startsWith('text-'))}`">
                {{ insight.category }}
              </span>
            </div>
            <p class="font-bold text-foreground text-sm leading-snug group-hover:text-foreground transition-colors">{{ insight.title }}</p>
            <p class="text-xs text-muted-foreground leading-relaxed">{{ insight.body }}</p>
          </div>

          <!-- Empty state -->
          <div v-if="!intelligenceStore.isLoading && intelligenceStore.insights.length === 0" class="sm:col-span-2 card text-center py-12">
            <p class="text-muted-foreground text-sm">No insights yet. Click <strong>Refresh Insights</strong> to begin analysis.</p>
          </div>
        </div>
      </div>

      <!-- Bottom Row: Charts -->
      <div class="grid grid-cols-1 lg:grid-cols-3 gap-6">

        <!-- Best Day of Week -->
        <div class="card flex flex-col">
          <h3 class="font-bold text-foreground mb-1 flex items-center gap-2">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>
            Peak Performance Day
          </h3>
          <p class="text-xs text-muted-foreground mb-6">Average focus output by day of week</p>
          <div class="flex-1 min-h-[200px]">
            <canvas ref="bestDayChartRef"></canvas>
          </div>
        </div>

        <!-- 30-Day Streak Grid -->
        <div class="card lg:col-span-2 flex flex-col">
          <h3 class="font-bold text-foreground mb-1 flex items-center gap-2">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/></svg>
            30-Day Activity Streak
          </h3>
          <p class="text-xs text-muted-foreground mb-6">Days with at least one focus session logged</p>

          <div class="grid gap-1.5" style="grid-template-columns: repeat(15, 1fr)">
            <div
              v-for="(day, i) in streakGrid"
              :key="i"
              :title="day.date"
              class="h-5 rounded-sm transition-all duration-200 cursor-default"
              :class="day.active ? 'bg-violet-500 opacity-90 hover:opacity-100' : 'bg-muted/40 hover:bg-muted/60'"
            ></div>
          </div>

          <div class="flex items-center gap-4 mt-6">
            <div class="flex items-center gap-1.5">
              <div class="w-3 h-3 rounded-sm bg-violet-500 opacity-90"></div>
              <span class="text-[10px] text-muted-foreground font-medium">Active</span>
            </div>
            <div class="flex items-center gap-1.5">
              <div class="w-3 h-3 rounded-sm bg-muted/40"></div>
              <span class="text-[10px] text-muted-foreground font-medium">Inactive</span>
            </div>
            <div class="ml-auto">
              <span class="text-xs font-bold text-foreground">{{ streakGrid.filter(d => d.active).length }}</span>
              <span class="text-xs text-muted-foreground"> / 30 days active</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>
