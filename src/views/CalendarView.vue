<script setup lang="ts">
import { ref, computed, onMounted } from 'vue';
import { useTaskStore } from '@/stores/tasks';
import { useTimerStore } from '@/stores/timer';
import { useEventStore } from '@/stores/events';
import { parseICS } from '@/utils/icsParser';
import { useUIStore } from '@/stores/ui';
import { calculateHash } from '@/utils/hashing';
import BaseModal from '@/components/BaseModal.vue';
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
const eventStore = useEventStore();
const uiStore = useUIStore();

const currentMonth = ref(new Date());
const selectedDate = ref(new Date());
const fileLoader = ref<HTMLInputElement | null>(null);
const isImporting = ref(false);
const showImportHistory = ref(false);
const confirmingDeleteId = ref<string | null>(null);

const calendarDays = computed(() => {
  const start = startOfWeek(startOfMonth(currentMonth.value));
  const end = endOfWeek(endOfMonth(currentMonth.value));
  
  return eachDayOfInterval({ start, end }).map(day => {
    const tasks = taskStore.tasks.filter(t => isSameDay(parseISO(t.created_at), day));
    const sessions = timerStore.sessions.filter(s => isSameDay(parseISO(s.start_time), day));
    const events = eventStore.events.filter(e => isSameDay(parseISO(e.start_time), day));
    
    return {
      date: day,
      isCurrentMonth: isSameMonth(day, currentMonth.value),
      isToday: isToday(day),
      tasks,
      sessions,
      events,
      hasActivity: tasks.length > 0 || sessions.length > 0 || events.length > 0
    };
  });
});

const selectedDateActivity = computed(() => {
  const tasks = taskStore.tasks.filter(t => isSameDay(parseISO(t.created_at), selectedDate.value));
  const sessions = timerStore.sessions.filter(s => isSameDay(parseISO(s.start_time), selectedDate.value));
  const events = eventStore.events.filter(e => isSameDay(parseISO(e.start_time), selectedDate.value));
  return { tasks, sessions, events };
});

const nextMonth = () => {
  currentMonth.value = addMonths(currentMonth.value, 1);
};

const prevMonth = () => {
  currentMonth.value = subMonths(currentMonth.value, 1);
};

onMounted(async () => {
  await Promise.all([
    taskStore.fetchTasks(),
    timerStore.init(),
    eventStore.fetchEvents(),
    eventStore.fetchImports()
  ]);
});

const triggerImport = () => {
    fileLoader.value?.click();
};

const handleFileImport = async (e: Event) => {
    const file = (e.target as HTMLInputElement).files?.[0];
    if (!file) return;

    isImporting.value = true;
    try {
        const text = await file.text();
        const hash = await calculateHash(text);
        
        const parsedEvents = parseICS(text);
        if (parsedEvents.length > 0) {
            await eventStore.importEvents(file.name, parsedEvents.map(ev => ({
                ...ev,
                color: '#3498db' // Google Blue
            })), hash);
            uiStore.showAlert('Import Successful', `Successfully imported ${parsedEvents.length} events!`, 'success');
        } else {
            uiStore.showAlert('Empty File', 'No valid events found in this calendar file.', 'warning');
        }
    } catch (err: any) {
        if (err.message === 'DUPLICATE_IMPORT') {
            uiStore.showAlert('Duplicate Detected', 'This exact file has already been imported before.', 'warning');
        } else {
            console.error('Import failed:', err);
            uiStore.showAlert('Import Failed', 'Failed to parse the calendar file. Please ensure it is a valid .ics file.', 'error');
        }
    } finally {
        isImporting.value = false;
        if (fileLoader.value) fileLoader.value.value = '';
    }
};

const formatDuration = (seconds: number) => {
  const mins = Math.floor(seconds / 60);
  return `${mins}m`;
};

const deleteImport = async (id: string) => {
    try {
        await eventStore.deleteImport(id);
        confirmingDeleteId.value = null;
    } catch (err) {
        console.error('Failed to delete import:', err);
    }
};
</script>

<template>
  <div class="p-6 max-w-screen-2xl mx-auto page-transition">
    <!-- Hidden Input for Import -->
    <input 
        type="file" 
        ref="fileLoader" 
        class="hidden" 
        accept=".ics" 
        @change="handleFileImport" 
    />

    <div class="mb-10 flex flex-col md:flex-row md:items-end justify-between gap-6">
      <div>
        <h1 class="text-4xl md:text-5xl font-bold tracking-tighter text-foreground">Calendar</h1>
        <p class="text-base text-muted-foreground mt-2 max-w-2xl">Integrate focus, habits, and Google Calendar events in one view.</p>
      </div>
      
      <div class="flex items-center gap-3">
        <button 
            @click="triggerImport" 
            class="btn-primary flex items-center gap-2"
            :disabled="isImporting"
        >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/></svg>
            {{ isImporting ? 'Importing...' : 'Import ICS' }}
        </button>

        <button 
            @click="showImportHistory = true" 
            class="btn-secondary flex items-center gap-2"
        >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 20h9"/><path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z"/></svg>
            Import Logs
        </button>

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
                !day.isCurrentMonth ? 'opacity-20 ' : '',
                isSameDay(day.date, selectedDate) ? 'bg-accent/50 box-shadow-inner' : ''
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
                    <span v-if="day.events.length" class="w-1.5 h-1.5 rounded-full bg-blue-500"></span>
                    <span v-if="day.tasks.length" class="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
                    <span v-if="day.sessions.length" class="w-1.5 h-1.5 rounded-full bg-violet-500"></span>
                </div>
            </div>

            <div class="space-y-1">
                <!-- Events (Imported) -->
                <div v-for="event in day.events.slice(0, 2)" :key="event.id" 
                    class="px-1.5 py-0.5 rounded bg-blue-500/10 text-[9px] font-bold text-blue-600 dark:text-blue-400 truncate border border-blue-500/20">
                    {{ event.title }}
                </div>
                <!-- Tasks -->
                <div v-for="task in day.tasks.slice(0, 1)" :key="task.id" class="px-1.5 py-0.5 rounded bg-emerald-500/10 text-[9px] font-bold text-emerald-600 dark:text-emerald-400 truncate border border-emerald-500/20">
                    {{ task.title }}
                </div>
                <!-- Focus Sessions -->
                <div v-for="session in day.sessions.slice(0, 1)" :key="session.id" class="px-1.5 py-0.5 rounded bg-violet-500/10 text-[9px] font-bold text-violet-600 dark:text-violet-400 truncate border border-violet-500/20">
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
            <p class="text-[10px] font-bold text-muted-foreground uppercase tracking-widest mb-6 border-b border-border pb-2">{{ format(selectedDate, 'MMMM d, yyyy') }}</p>

            <div class="space-y-6">
                <!-- Events Section -->
                <div v-if="selectedDateActivity.events.length">
                    <h4 class="text-[10px] font-bold text-muted-foreground uppercase tracking-widest mb-3 flex items-center gap-2">
                        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>
                        Calendar Events
                    </h4>
                    <div class="space-y-2">
                        <div v-for="event in selectedDateActivity.events" :key="event.id" class="p-3 rounded-xl bg-blue-500/5 border border-blue-500/10 group relative">
                            <p class="text-xs font-bold text-foreground">{{ event.title }}</p>
                            <p v-if="event.start_time" class="text-[9px] text-blue-600 dark:text-blue-400 font-bold mt-1 uppercase">
                                {{ format(parseISO(event.start_time), 'h:mm a') }} 
                                <span v-if="event.location" class="text-muted-foreground normal-case ml-1">• {{ event.location }}</span>
                            </p>
                            <button @click="eventStore.deleteEvent(event.id)" class="absolute top-2 right-2 opacity-0 group-hover:opacity-100 p-1 text-muted-foreground hover:text-destructive transition-all">
                                <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
                            </button>
                        </div>
                    </div>
                </div>

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
                                <p class="text-[9px] text-muted-foreground uppercase mt-1">{{ format(parseISO(session.start_time), 'h:mm a') }}</p>
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

  <!-- Import History Modal -->
  <BaseModal :show="showImportHistory" @close="showImportHistory = false" max-width="36rem">
    <div class="p-8">
        <div class="flex items-center justify-between mb-8">
            <h2 class="text-2xl font-bold tracking-tight text-foreground">Import Logs</h2>
            <button @click="showImportHistory = false" class="text-muted-foreground hover:text-foreground transition-colors">
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
            </button>
        </div>

        <div v-if="eventStore.imports.length === 0" class="py-12 text-center">
            <div class="w-16 h-16 rounded-full bg-accent/30 flex items-center justify-center mx-auto mb-4 text-muted-foreground">
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/></svg>
            </div>
            <p class="text-sm text-muted-foreground">No imports logged yet.</p>
        </div>

        <div v-else class="space-y-3 max-h-[60vh] overflow-y-auto pr-2">
            <div 
                v-for="imp in eventStore.imports" 
                :key="imp.id" 
                class="group p-4 rounded-2xl bg-accent/20 border border-border hover:border-primary/30 transition-all flex items-center justify-between min-h-[80px]"
            >
                <div v-if="confirmingDeleteId !== imp.id">
                    <p class="text-sm font-bold text-foreground truncate max-w-[200px]">{{ imp.filename }}</p>
                    <p class="text-[10px] text-muted-foreground mt-1 lowercase font-medium">
                        {{ format(new Date(imp.created_at), 'MMM d, yyyy • h:mm a') }} • 
                        <span class="text-primary/70">{{ imp.event_count }} events</span>
                    </p>
                </div>
                
                <div v-else class="flex flex-col gap-2">
                    <p class="text-xs font-bold text-destructive">Remove all events from this file?</p>
                    <div class="flex items-center gap-2">
                        <button @click="deleteImport(imp.id)" class="text-[10px] font-bold px-3 py-1 bg-destructive text-white rounded-md hover:bg-destructive/90 transition-colors">Yes, Remove</button>
                        <button @click="confirmingDeleteId = null" class="text-[10px] font-bold px-3 py-1 bg-accent rounded-md hover:bg-accent/80 transition-colors">Cancel</button>
                    </div>
                </div>

                <button 
                    v-if="confirmingDeleteId !== imp.id"
                    @click="confirmingDeleteId = imp.id" 
                    class="p-2 text-muted-foreground hover:text-destructive hover:bg-destructive/10 rounded-lg transition-all opacity-0 group-hover:opacity-100"
                    title="Remove all events from this import"
                >
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg>
                </button>
            </div>
        </div>
    </div>
  </BaseModal>
</template>

