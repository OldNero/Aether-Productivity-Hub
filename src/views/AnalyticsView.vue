<script setup lang="ts">
import { onMounted, ref, computed, watch } from 'vue';
import { useTaskStore } from '@/stores/tasks';
import { useTimerStore } from '@/stores/timer';
import { useInvestmentStore } from '@/stores/investments';
import { 
  Chart, 
  DoughnutController, 
  ArcElement, 
  LineController, 
  LineElement, 
  PointElement, 
  LinearScale, 
  CategoryScale, 
  Tooltip, 
  Legend,
  Filler
} from 'chart.js';
import { startOfDay, endOfDay, eachDayOfInterval, subDays, format, isSameDay } from 'date-fns';

Chart.register(
  DoughnutController, ArcElement, 
  LineController, LineElement, PointElement, 
  LinearScale, CategoryScale, 
  Tooltip, Legend, Filler
);

const taskStore = useTaskStore();
const timerStore = useTimerStore();
const investmentStore = useInvestmentStore();

const taskChartRef = ref<HTMLCanvasElement | null>(null);
const focusChartRef = ref<HTMLCanvasElement | null>(null);
let taskChart: Chart | null = null;
let focusChart: Chart | null = null;

const stats = computed(() => {
  const totalFocusSeconds = timerStore.sessions
    .filter(s => s.mode === 'focus')
    .reduce((acc, s) => acc + s.duration, 0);
  
  const completionRate = taskStore.totalCount > 0 
    ? Math.round((taskStore.completedCount / taskStore.totalCount) * 100) 
    : 0;

  return {
    focusHours: (totalFocusSeconds / 3600).toFixed(1),
    sessions: timerStore.sessions.length,
    completionRate: `${completionRate}%`,
    avgSession: timerStore.sessions.length > 0 
      ? Math.round((totalFocusSeconds / 60) / timerStore.sessions.filter(s => s.mode === 'focus').length || 1)
      : 0
  };
});

const initTaskChart = () => {
  if (!taskChartRef.value) return;
  
  const data = {
    labels: ['High', 'Medium', 'Low'],
    datasets: [{
      data: [
        taskStore.tasks.filter(t => t.priority === 'high').length,
        taskStore.tasks.filter(t => t.priority === 'medium').length,
        taskStore.tasks.filter(t => t.priority === 'low').length,
      ],
      backgroundColor: ['#fb7185', '#fbbf24', '#38bdf8'],
      borderWidth: 0,
      hoverOffset: 4
    }]
  };

  taskChart = new Chart(taskChartRef.value, {
    type: 'doughnut',
    data,
    options: {
      cutout: '70%',
      plugins: {
        legend: { display: false },
        tooltip: {
          backgroundColor: '#18181b',
          titleFont: { size: 12, weight: 'bold' },
          bodyFont: { size: 12 },
          padding: 12,
          displayColors: false
        }
      }
    }
  });
};

const initFocusChart = () => {
  if (!focusChartRef.value) return;

  const last7Days = eachDayOfInterval({
    start: subDays(new Date(), 6),
    end: new Date()
  });

  const focusData = last7Days.map(day => {
    return timerStore.sessions
      .filter(s => s.mode === 'focus' && isSameDay(new Date(s.startTime), day))
      .reduce((acc, s) => acc + (s.duration / 60), 0);
  });

  const data = {
    labels: last7Days.map(d => format(d, 'EEE')),
    datasets: [{
      label: 'Focus Minutes',
      data: focusData,
      borderColor: '#f4f4f5',
      backgroundColor: 'rgba(255, 255, 255, 0.05)',
      fill: true,
      tension: 0.4,
      pointRadius: 4,
      pointBackgroundColor: '#fff'
    }]
  };

  focusChart = new Chart(focusChartRef.value, {
    type: 'line',
    data,
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: { display: false },
        tooltip: {
          mode: 'index',
          intersect: false,
          backgroundColor: '#18181b',
          padding: 12
        }
      },
      scales: {
        x: { 
            grid: { display: false },
            ticks: { color: '#71717a', font: { size: 10 } }
        },
        y: { 
            grid: { color: 'rgba(255,255,255,0.05)' },
            ticks: { color: '#71717a', font: { size: 10 } },
            beginAtZero: true
        }
      }
    }
  });
};

onMounted(async () => {
  await Promise.all([
    taskStore.fetchTasks(),
    timerStore.init(),
    investmentStore.fetchInvestments()
  ]);
  
  initTaskChart();
  initFocusChart();
});

// Re-render charts if data changes
watch(() => taskStore.tasks, () => {
  if (taskChart) {
    taskChart.destroy();
    initTaskChart();
  }
}, { deep: true });
</script>

<template>
  <div class="p-6 max-w-screen-2xl mx-auto page-transition">
    <div class="mb-10">
      <h1 class="text-4xl md:text-5xl font-bold tracking-tighter text-zinc-100">Analytics</h1>
      <p class="text-base text-muted mt-2 max-w-2xl">Visualizing your deep work cycles and task velocity.</p>
    </div>

    <!-- Quick Stats -->
    <div class="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
      <div class="card flex flex-col gap-1">
        <p class="label">Focus Time</p>
        <p class="text-3xl font-bold text-zinc-100">{{ stats.focusHours }}<span class="text-sm font-normal text-muted ml-1">hrs</span></p>
      </div>
      <div class="card flex flex-col gap-1">
        <p class="label">Total Sessions</p>
        <p class="text-3xl font-bold text-zinc-100">{{ stats.sessions }}</p>
      </div>
      <div class="card flex flex-col gap-1">
        <p class="label">Completion Rate</p>
        <p class="text-3xl font-bold text-emerald-400">{{ stats.completionRate }}</p>
      </div>
      <div class="card flex flex-col gap-1">
        <p class="label">Avg Focus</p>
        <p class="text-3xl font-bold text-zinc-100">{{ stats.avgSession }}<span class="text-sm font-normal text-muted ml-1">min</span></p>
      </div>
    </div>

    <div class="grid grid-cols-1 lg:grid-cols-3 gap-6">
      <!-- Task Distribution -->
      <div class="card flex flex-col">
        <h3 class="font-bold text-zinc-100 mb-6 flex items-center gap-2">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21.21 15.89A10 10 0 1 1 8 2.83"/><path d="M22 12A10 10 0 0 0 12 2v10z"/></svg>
            Task Priority Distribution
        </h3>
        <div class="relative flex-1 flex items-center justify-center min-h-[250px]">
          <canvas ref="taskChartRef"></canvas>
          <div class="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
            <p class="text-4xl font-bold text-zinc-100">{{ taskStore.totalCount }}</p>
            <p class="text-[10px] font-bold text-muted uppercase tracking-widest">Total Tasks</p>
          </div>
        </div>
        <div class="mt-8 flex justify-center gap-6">
            <div class="flex items-center gap-2">
                <span class="w-2 h-2 rounded-full bg-rose-500"></span>
                <span class="text-xs text-muted">High</span>
            </div>
            <div class="flex items-center gap-2">
                <span class="w-2 h-2 rounded-full bg-amber-400"></span>
                <span class="text-xs text-muted">Medium</span>
            </div>
            <div class="flex items-center gap-2">
                <span class="w-2 h-2 rounded-full bg-sky-400"></span>
                <span class="text-xs text-muted">Low</span>
            </div>
        </div>
      </div>

      <!-- Focus Trends -->
      <div class="card lg:col-span-2 flex flex-col">
        <h3 class="font-bold text-zinc-100 mb-6 flex items-center gap-2">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 20V10"/><path d="M18 20V4"/><path d="M6 20v-4"/></svg>
            Focus Intensity (Last 7 Days)
        </h3>
        <div class="flex-1 min-h-[300px]">
          <canvas ref="focusChartRef"></canvas>
        </div>
      </div>

      <!-- Recent Efficiency Table -->
      <div class="card lg:col-span-3">
        <h3 class="font-bold text-zinc-100 mb-6">Recent Focus Sessions</h3>
        <div class="overflow-x-auto">
          <table class="w-full text-left">
            <thead>
              <tr class="border-b border-white/5">
                <th class="pb-4 text-[10px] font-bold text-muted uppercase tracking-widest">Date</th>
                <th class="pb-4 text-[10px] font-bold text-muted uppercase tracking-widest">Type</th>
                <th class="pb-4 text-[10px] font-bold text-muted uppercase tracking-widest">Duration</th>
                <th class="pb-4 text-[10px] font-bold text-muted uppercase tracking-widest">Project/Task</th>
                <th class="pb-4 text-[10px] font-bold text-muted uppercase tracking-widest text-right">Status</th>
              </tr>
            </thead>
            <tbody class="divide-y divide-white/5">
              <tr v-for="session in timerStore.sessions.slice(0, 5)" :key="session.id" class="group">
                <td class="py-4 text-sm text-zinc-400">{{ format(new Date(session.startTime), 'MMM d, h:mm a') }}</td>
                <td class="py-4">
                  <span 
                    class="px-2 py-0.5 rounded text-[10px] font-bold uppercase"
                    :class="session.mode === 'focus' ? 'bg-violet-500/10 text-violet-400' : 'bg-emerald-500/10 text-emerald-400'"
                  >
                    {{ session.mode }}
                  </span>
                </td>
                <td class="py-4 text-sm font-mono text-zinc-100">{{ Math.floor(session.duration / 60) }}m {{ session.duration % 60 }}s</td>
                <td class="py-4 text-sm text-zinc-400">{{ session.taskId ? taskStore.tasks.find(t => t.id === session.taskId)?.title : 'General' }}</td>
                <td class="py-4 text-right">
                    <span class="w-1.5 h-1.5 rounded-full bg-emerald-500 inline-block"></span>
                </td>
              </tr>
              <tr v-if="timerStore.sessions.length === 0">
                <td colspan="5" class="py-12 text-center text-muted text-sm italic">No focus sessions recorded yet.</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
canvas {
    width: 100% !important;
}
</style>
