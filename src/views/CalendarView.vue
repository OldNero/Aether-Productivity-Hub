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
        <h1 class="text-4xl md:text-5xl font-bold tracking-tighter text-foreground">Calendar</h1>
        <p class="text-base text-muted-foreground mt-2 max-w-2xl">A temporal view of your productivity and milestones.</p>
      </div>
      
      <div class="flex items-center gap-4 bg-accent/50 p-1 rounded-xl border border-border">
        <button @click="prevMonth" class="p-2 hover:bg-accent rounded-lg text-muted-foreground transition-colors">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="15 18 9 12 15 6"/></svg>
        </button>
        <span class="text-sm font-bold text-foreground min-w-[120px] text-center">
            {{ format(currentMonth, 'MMMM yyyy') }}
        </span>
        <button @click="nextMonth" class="p-2 hover:bg-accent rounded-lg text-muted-foreground transition-colors">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="9 18 15 12 9 6"/></svg>
        </button>
      </div>
    </div>

    <div class="grid grid-cols-1 lg:grid-cols-4 gap-6">
      <!-- Calendar Grid -->
      <div class="lg:col-span-3 card p-0 overflow-hidden border-border bg-card">
        <div class="grid grid-cols-7 border-b border-border bg-muted/30">
          <div v-for="day in ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']" :key="day" class="py-3 text-center text-[10px] font-bold text-muted-foreground uppercase tracking-widest border-r border-border last:border-0">
            {{ day }}
          </div>
        </div>
        
        <div class="grid grid-cols-7">
          <div 
            v-for="day in calendarDays" 
            :key="day.date.toISOString()"
            @click="selectedDate = day.date"
            class="min-h-[100px] md:min-h-[140px] p-2 border-r border-b border-border transition-all cursor-pointer group hover:bg-accent/30"
            :class="[
                !day.isCurrentMonth ? 'opacity-20' : '',
                isSameDay(day.date, selectedDate) ? 'bg-accent/50' : ''
            ]"
          >
            <div class="flex justify-between items-start mb-2">
                <span 
                    class="text-xs font-bold w-6 h-6 flex items-center justify-center rounded-full"
                    :class="day.isToday ? 'bg-primary text-primary-foreground' : 'text-muted-foreground'"
                >
                    {{ format(day.date, 'd') }}
                </span>
                <div v-if="day.hasActivity" class="flex gap-1">
                    <span v-if="day.tasks.length" class="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
                    <span v-if="day.sessions.length" class="w-1.5 h-1.5 rounded-full bg-violet-500"></span>
                </div>
            </div>

            <div class="space-y-1">
                <div v-for="task in day.tasks.slice(0, 2)" :key="task.id" class="px-1.5 py-0.5 rounded bg-emerald-500/10 text-[9px] font-bold text-emerald-600 dark:text-emerald-400 truncate border border-emerald-500/20">
                    {{ task.title }}
                </div>
                <div v-for="session in day.sessions.slice(0, 2)" :key="session.id" class="px-1.5 py-0.5 rounded bg-violet-500/10 text-[9px] font-bold text-violet-600 dark:text-violet-400 truncate border border-violet-500/20">
                    {{ formatDuration(session.duration) }} Focus
                </div>
            </div>
          </div>
        </div>
      </div>

      <!-- Detail Sidebar -->
      <div class="flex flex-col gap-6">
        <div class="card h-full">
            <h3 class="font-bold text-foreground mb-1">{{ format(selectedDate, 'EEEE') }}</h3>
            <p class="text-[10px] font-bold text-muted-foreground uppercase tracking-widest mb-6">{{ format(selectedDate, 'MMMM d, yyyy') }}</p>

            <div class="space-y-6">
                <!-- Daily Tasks -->
                <div>
                    <h4 class="text-[10px] font-bold text-muted-foreground uppercase tracking-widest mb-3 flex items-center gap-2">
                        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="20 6 9 17 4 12"/></svg>
                        Tasks Created
                    </h4>
                    <div class="space-y-2">
                        <div v-for="task in selectedDateActivity.tasks" :key="task.id" class="p-3 rounded-xl bg-accent/30 border border-border">
                            <p class="text-xs font-bold text-foreground">{{ task.title }}</p>
                            <span class="badge mt-2" :class="`badge--${task.priority}`">{{ task.priority }}</span>
                        </div>
                        <p v-if="selectedDateActivity.tasks.length === 0" class="text-xs text-muted-foreground italic">No tasks created.</p>
                    </div>
                </div>

                <!-- Daily Sessions -->
                <div>
                    <h4 class="text-[10px] font-bold text-muted-foreground uppercase tracking-widest mb-3 flex items-center gap-2">
                        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><circle cx="12" cy="12" r="10"/><path d="M12 8v4l3 3"/></svg>
                        Focus Sessions
                    </h4>
                    <div class="space-y-2">
                        <div v-for="session in selectedDateActivity.sessions" :key="session.id" class="p-3 rounded-xl bg-accent/30 border border-border flex items-center justify-between">
                            <div>
                                <p class="text-xs font-bold text-foreground capitalize">{{ session.mode.replace('_', ' ') }}</p>
                                <p class="text-[9px] text-muted-foreground uppercase mt-1">{{ format(parseISO(session.startTime), 'h:mm a') }}</p>
                            </div>
                            <span class="text-xs font-mono font-bold text-violet-600 dark:text-violet-400">{{ formatDuration(session.duration) }}</span>
                        </div>
                        <p v-if="selectedDateActivity.sessions.length === 0" class="text-xs text-muted-foreground italic">No sessions recorded.</p>
                    </div>
                </div>
            </div>
        </div>
      </div>
    </div>
  </div>
</template>
