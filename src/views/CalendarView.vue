<script setup lang="ts">
import { ref, computed, onMounted } from 'vue';
import { useTaskStore } from '@/stores/tasks';
import { useTimerStore } from '@/stores/timer';
import { 
  format, 
  startOfMonth, 
  endOfMonth, 
  startOfWeek, 
  endOfWeek, 
  eachDayOfInterval, 
  isSameMonth, 
  isSameDay, 
  addMonths, 
  subMonths,
  isToday,
  parseISO
} from 'date-fns';

const taskStore = useTaskStore();
const timerStore = useTimerStore();

const currentMonth = ref(new Date());
const selectedDate = ref(new Date());

const calendarDays = computed(() => {
  const start = startOfWeek(startOfMonth(currentMonth.value));
  const end = endOfWeek(endOfMonth(currentMonth.value));
  
  return eachDayOfInterval({ start, end }).map(day => {
    const tasks = taskStore.tasks.filter(t => isSameDay(parseISO(t.created_at), day));
    const sessions = timerStore.sessions.filter(s => isSameDay(parseISO(s.startTime), day));
    
    return {
      date: day,
      isCurrentMonth: isSameMonth(day, currentMonth.value),
      isToday: isToday(day),
      tasks,
      sessions,
      hasActivity: tasks.length > 0 || sessions.length > 0
    };
  });
});

const selectedDateActivity = computed(() => {
  const tasks = taskStore.tasks.filter(t => isSameDay(parseISO(t.created_at), selectedDate.value));
  const sessions = timerStore.sessions.filter(s => isSameDay(parseISO(s.startTime), selectedDate.value));
  return { tasks, sessions };
});

const nextMonth = () => {
  currentMonth.value = addMonths(currentMonth.value, 1);
};

const prevMonth = () => {
  currentMonth.value = subMonths(currentMonth.value, 1);
};

onMounted(async () => {
  await taskStore.fetchTasks();
  await timerStore.init();
});

const formatDuration = (seconds: number) => {
  const mins = Math.floor(seconds / 60);
  return `${mins}m`;
};
</script>

<template>
  <div class="p-6 max-w-screen-2xl mx-auto page-transition">
    <div class="mb-10 flex flex-col md:flex-row md:items-end justify-between gap-6">
      <div>
        <h1 class="text-4xl md:text-5xl font-bold tracking-tighter text-zinc-100">Calendar</h1>
        <p class="text-base text-muted mt-2 max-w-2xl">A temporal view of your productivity and milestones.</p>
      </div>
      
      <div class="flex items-center gap-4 bg-zinc-900/50 p-1 rounded-xl border border-white/5">
        <button @click="prevMonth" class="p-2 hover:bg-white/5 rounded-lg text-muted transition-colors">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="15 18 9 12 15 6"/></svg>
        </button>
        <span class="text-sm font-bold text-zinc-100 min-w-[120px] text-center">
            {{ format(currentMonth, 'MMMM yyyy') }}
        </span>
        <button @click="nextMonth" class="p-2 hover:bg-white/5 rounded-lg text-muted transition-colors">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="9 18 15 12 9 6"/></svg>
        </button>
      </div>
    </div>

    <div class="grid grid-cols-1 lg:grid-cols-4 gap-6">
      <!-- Calendar Grid -->
      <div class="lg:col-span-3 card p-0 overflow-hidden border-white/5">
        <div class="grid grid-cols-7 border-b border-white/5 bg-white/[0.02]">
          <div v-for="day in ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']" :key="day" class="py-3 text-center text-[10px] font-bold text-muted uppercase tracking-widest">
            {{ day }}
          </div>
        </div>
        
        <div class="grid grid-cols-7">
          <div 
            v-for="day in calendarDays" 
            :key="day.date.toISOString()"
            @click="selectedDate = day.date"
            class="min-h-[100px] md:min-h-[140px] p-2 border-r border-b border-white/5 transition-all cursor-pointer group hover:bg-white/[0.02]"
            :class="[
                !day.isCurrentMonth ? 'opacity-20' : '',
                isSameDay(day.date, selectedDate) ? 'bg-white/[0.04]' : ''
            ]"
          >
            <div class="flex justify-between items-start mb-2">
                <span 
                    class="text-xs font-bold w-6 h-6 flex items-center justify-center rounded-full"
                    :class="day.isToday ? 'bg-zinc-100 text-zinc-950' : 'text-zinc-500'"
                >
                    {{ format(day.date, 'd') }}
                </span>
                <div v-if="day.hasActivity" class="flex gap-1">
                    <span v-if="day.tasks.length" class="w-1 h-1 rounded-full bg-emerald-500"></span>
                    <span v-if="day.sessions.length" class="w-1 h-1 rounded-full bg-violet-500"></span>
                </div>
            </div>

            <div class="space-y-1">
                <div v-for="task in day.tasks.slice(0, 2)" :key="task.id" class="px-1.5 py-0.5 rounded bg-emerald-500/10 text-[9px] font-bold text-emerald-400 truncate border border-emerald-500/10">
                    {{ task.title }}
                </div>
                <div v-for="session in day.sessions.slice(0, 2)" :key="session.id" class="px-1.5 py-0.5 rounded bg-violet-500/10 text-[9px] font-bold text-violet-400 truncate border border-violet-500/10">
                    {{ formatDuration(session.duration) }} Focus
                </div>
                <div v-if="day.tasks.length + day.sessions.length > 4" class="text-[9px] text-muted font-bold pl-1">
                    +{{ day.tasks.length + day.sessions.length - 4 }} more
                </div>
            </div>
          </div>
        </div>
      </div>

      <!-- Detail Sidebar -->
      <div class="flex flex-col gap-6">
        <div class="card h-full">
            <h3 class="font-bold text-zinc-100 mb-1">{{ format(selectedDate, 'EEEE') }}</h3>
            <p class="text-[10px] font-bold text-muted uppercase tracking-widest mb-6">{{ format(selectedDate, 'MMMM d, yyyy') }}</p>

            <div class="space-y-6">
                <!-- Daily Tasks -->
                <div>
                    <h4 class="text-[10px] font-bold text-muted uppercase tracking-widest mb-3 flex items-center gap-2">
                        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="20 6 9 17 4 12"/></svg>
                        Tasks Created
                    </h4>
                    <div class="space-y-2">
                        <div v-for="task in selectedDateActivity.tasks" :key="task.id" class="p-3 rounded-xl bg-white/[0.03] border border-white/5">
                            <p class="text-xs font-bold text-zinc-100">{{ task.title }}</p>
                            <span class="text-[9px] px-1.5 py-0.5 rounded bg-zinc-800 text-zinc-400 font-bold uppercase mt-2 inline-block">{{ task.priority }}</span>
                        </div>
                        <p v-if="selectedDateActivity.tasks.length === 0" class="text-xs text-zinc-600 italic">No tasks created.</p>
                    </div>
                </div>

                <!-- Daily Sessions -->
                <div>
                    <h4 class="text-[10px] font-bold text-muted uppercase tracking-widest mb-3 flex items-center gap-2">
                        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><circle cx="12" cy="12" r="10"/><path d="M12 8v4l3 3"/></svg>
                        Focus Sessions
                    </h4>
                    <div class="space-y-2">
                        <div v-for="session in selectedDateActivity.sessions" :key="session.id" class="p-3 rounded-xl bg-white/[0.03] border border-white/5 flex items-center justify-between">
                            <div>
                                <p class="text-xs font-bold text-zinc-100 capitalize">{{ session.mode.replace('_', ' ') }}</p>
                                <p class="text-[9px] text-muted uppercase mt-1">{{ format(parseISO(session.startTime), 'h:mm a') }}</p>
                            </div>
                            <span class="text-xs font-mono font-bold text-violet-400">{{ formatDuration(session.duration) }}</span>
                        </div>
                        <p v-if="selectedDateActivity.sessions.length === 0" class="text-xs text-zinc-600 italic">No sessions recorded.</p>
                    </div>
                </div>
            </div>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.calendar-grid {
    display: grid;
    grid-template-columns: repeat(7, 1fr);
}
</style>
