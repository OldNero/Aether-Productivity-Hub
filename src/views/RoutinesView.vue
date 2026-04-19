<script setup lang="ts">
import { ref, onMounted, computed } from 'vue';
import { useTaskStore, Task } from '@/stores/tasks';
import { formatDistanceToNow } from 'date-fns';
import ConfirmModal from '@/components/ConfirmModal.vue';

const taskStore = useTaskStore();
const activeFilter = ref<'all' | 'active' | 'completed'>('all');
const showAddModal = ref(false);
const bulkMode = ref(false);
const selectedIds = ref<Set<string>>(new Set());

// Modal State
const confirmModal = ref({
    show: false,
    title: '',
    message: '',
    confirmLabel: 'Delete',
    action: null as (() => Promise<void>) | null,
    loading: false,
    variant: 'danger' as 'danger' | 'warning'
});

const newTask = ref({
  title: '',
  priority: 'medium' as 'high' | 'medium' | 'low',
  subtasks: [] as { title: string }[]
});

const filteredTasks = computed(() => {
  if (activeFilter.value === 'active') return taskStore.activeTasks;
  if (activeFilter.value === 'completed') return taskStore.completedTasks;
  return taskStore.tasks;
});

onMounted(async () => {
  await taskStore.fetchTasks();
});

const handleAddTask = async () => {
  if (!newTask.value.title.trim()) return;
  await taskStore.addTask({
    title: newTask.value.title,
    priority: newTask.value.priority,
    subtasks: newTask.value.subtasks.map(s => ({ ...s, id: Math.random().toString(), completed: false }))
  });
  showAddModal.value = false;
  newTask.value = { title: '', priority: 'medium', subtasks: [] };
};

const toggleSelection = (id: string) => {
    if (selectedIds.value.has(id)) selectedIds.value.delete(id);
    else selectedIds.value.add(id);
};

const handleBulkDelete = async () => {
    confirmModal.value = {
        show: true,
        title: 'Bulk Delete Tasks',
        message: `Are you sure you want to delete ${selectedIds.value.size} selected tasks? This action cannot be undone.`,
        confirmLabel: `Delete ${selectedIds.value.size} Tasks`,
        variant: 'danger',
        loading: false,
        action: async () => {
            confirmModal.value.loading = true;
            try {
                await taskStore.batchDelete(Array.from(selectedIds.value));
                selectedIds.value.clear();
                bulkMode.value = false;
                confirmModal.value.show = false;
            } finally {
                confirmModal.value.loading = false;
            }
        }
    };
};

const openDeleteConfirm = (id: string) => {
    const task = taskStore.tasks.find(t => t.id === id);
    confirmModal.value = {
        show: true,
        title: 'Delete Task',
        message: `Remove "${task?.title}"? This will also delete all associated subtasks.`,
        confirmLabel: 'Delete Task',
        variant: 'danger',
        loading: false,
        action: async () => {
            confirmModal.value.loading = true;
            try {
                await taskStore.deleteTask(id);
                confirmModal.value.show = false;
            } finally {
                confirmModal.value.loading = false;
            }
        }
    };
};
</script>

<template>
  <div class="p-6 max-w-screen-2xl mx-auto page-transition">
    <!-- Header -->
    <div class="mb-10 flex flex-col md:flex-row md:items-end justify-between gap-6">
      <div>
        <h1 class="text-4xl md:text-5xl font-bold tracking-tighter text-foreground">Routines</h1>
        <p class="text-base text-muted-foreground mt-2 max-w-2xl">Design your daily flow and track high-impact objectives.</p>
      </div>
      
      <div class="flex items-center gap-3">
        <button 
            @click="bulkMode = !bulkMode" 
            class="btn-secondary"
            :class="{ 'bg-primary text-primary-foreground border-primary': bulkMode }"
        >
            {{ bulkMode ? 'Exit Selection' : 'Bulk Action' }}
        </button>
        <button @click="showAddModal = true" class="btn-primary">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
            New Task
        </button>
      </div>
    </div>

    <!-- Filters & Stats -->
    <div class="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
        <div class="flex items-center gap-1 bg-accent/50 p-1 rounded-xl border border-border w-fit">
            <button v-for="f in ['all', 'active', 'completed']" :key="f" 
                @click="activeFilter = f as any"
                class="px-4 py-1.5 rounded-lg text-xs font-bold capitalize transition-all"
                :class="activeFilter === f ? 'bg-background text-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground'"
            >
                {{ f }}
            </button>
        </div>
        <div class="flex items-center gap-6 px-2">
            <div class="flex flex-col">
                <span class="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">Active</span>
                <span class="text-lg font-bold text-foreground">{{ taskStore.activeCount }}</span>
            </div>
            <div class="h-8 w-px bg-border"></div>
            <div class="flex flex-col">
                <span class="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">Completed</span>
                <span class="text-lg font-bold text-emerald-600 dark:text-emerald-400">{{ taskStore.completedCount }}</span>
            </div>
        </div>
    </div>

    <!-- Task Grid -->
    <div class="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
      <div v-for="task in filteredTasks" :key="task.id" 
        class="task-item group relative"
        :class="{ 'border-primary/40 ring-1 ring-primary/20': selectedIds.has(task.id) }"
        @click="bulkMode ? toggleSelection(task.id) : null"
      >
        <div class="task-item__header">
            <!-- Selection Checkbox -->
            <div v-if="bulkMode" class="mr-2">
                <div class="w-5 h-5 rounded border-2 border-border flex items-center justify-center transition-all" :class="selectedIds.has(task.id) ? 'bg-primary border-primary' : 'bg-transparent'">
                    <svg v-if="selectedIds.has(task.id)" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="4" class="text-primary-foreground"><polyline points="20 6 9 17 4 12"/></svg>
                </div>
            </div>

            <button 
                @click.stop="taskStore.toggleTask(task.id)"
                class="w-5 h-5 rounded-full border-2 flex items-center justify-center transition-all shrink-0"
                :class="task.completed ? 'bg-emerald-500/10 border-emerald-500/50' : 'border-muted-foreground/30 hover:border-primary'"
            >
                <svg v-if="task.completed" width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="5" class="text-emerald-500"><polyline points="20 6 9 17 4 12"/></svg>
            </button>
            
            <div class="flex-1 min-w-0" @click.stop="!bulkMode && taskStore.toggleTask(task.id)">
                <h3 class="task-item__title truncate" :class="{ 'line-through opacity-50': task.completed }">{{ task.title }}</h3>
                <div class="flex items-center gap-2 mt-1">
                    <span class="badge" :class="`badge--${task.priority}`">{{ task.priority }}</span>
                    <span v-if="task.subtasks.length" class="text-[10px] font-bold text-muted-foreground uppercase">
                        {{ task.subtasks.filter(s => s.completed).length }}/{{ task.subtasks.length }} Steps
                    </span>
                </div>
            </div>

            <button v-if="!bulkMode" @click.stop="openDeleteConfirm(task.id)" class="opacity-0 group-hover:opacity-100 p-2 text-muted-foreground hover:text-destructive transition-all">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg>
            </button>
        </div>

        <!-- Subtasks Preview -->
        <div v-if="task.subtasks.length > 0" class="px-5 pb-4 space-y-2">
            <div v-for="sub in task.subtasks.slice(0, 3)" :key="sub.id" class="flex items-center gap-2">
                <div class="w-1 h-1 rounded-full bg-border"></div>
                <span class="text-[11px] text-muted-foreground truncate" :class="{ 'line-through opacity-50': sub.completed }">{{ sub.title }}</span>
            </div>
            <p v-if="task.subtasks.length > 3" class="text-[9px] font-bold text-muted-foreground uppercase pl-3">+ {{ task.subtasks.length - 3 }} more steps</p>
        </div>
        
        <div class="px-5 py-3 border-t border-border/50 bg-muted/5 flex items-center justify-between">
            <span class="text-[10px] font-medium text-muted-foreground italic">Created {{ formatDistanceToNow(new Date(task.created_at)) }} ago</span>
            <div class="flex -space-x-2">
                <div class="w-5 h-5 rounded-full border border-background bg-accent flex items-center justify-center text-[8px] font-bold">A</div>
            </div>
        </div>
      </div>

      <!-- Empty State -->
      <div v-if="filteredTasks.length === 0" class="col-span-full py-20 flex flex-col items-center justify-center text-center opacity-50">
        <div class="w-16 h-16 rounded-full bg-accent flex items-center justify-center mb-4">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M9 11l3 3L22 4"/><path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11"/></svg>
        </div>
        <h3 class="font-bold text-foreground">No tasks found</h3>
        <p class="text-sm text-muted-foreground">Change your filter or create a new high-impact task.</p>
      </div>
    </div>

    <!-- Bulk Action Bar -->
    <transition name="bulk">
        <div v-if="bulkMode && selectedIds.size > 0" class="fixed bottom-8 left-1/2 -translate-x-1/2 z-50 bg-foreground text-background px-6 py-3 rounded-full shadow-2xl flex items-center gap-6">
            <span class="text-sm font-bold">{{ selectedIds.size }} Tasks Selected</span>
            <div class="w-px h-4 bg-background/20"></div>
            <div class="flex items-center gap-2">
                <button @click="handleBulkDelete" class="text-sm font-bold hover:text-destructive-foreground hover:bg-destructive px-3 py-1 rounded-lg transition-all">Delete All</button>
            </div>
        </div>
    </transition>

    <!-- New Task Modal -->
    <div v-if="showAddModal" class="fixed inset-0 z-[100] flex items-start justify-center pt-[15vh]" @click.self="showAddModal = false">
      <div class="modal-box p-8">
        <h2 class="text-2xl font-bold tracking-tight text-foreground mb-8">New Task</h2>
        <form @submit.prevent="handleAddTask" class="space-y-6">
          <div>
            <label class="label">Objective</label>
            <input v-model="newTask.title" type="text" class="input" placeholder="What needs to be done?" required autofocus />
          </div>
          
          <div>
            <label class="label">Priority</label>
            <div class="grid grid-cols-3 gap-2">
                <button 
                    v-for="p in ['low', 'medium', 'high']" :key="p"
                    type="button"
                    @click="newTask.priority = p as any"
                    class="py-2 rounded-lg border text-xs font-bold capitalize transition-all"
                    :class="newTask.priority === p ? 'bg-primary text-primary-foreground border-primary shadow-lg' : 'border-border text-muted-foreground hover:border-muted-foreground'"
                >
                    {{ p }}
                </button>
            </div>
          </div>

          <div class="flex justify-end gap-3 pt-4">
            <button type="button" @click="showAddModal = false" class="btn-secondary px-6">Cancel</button>
            <button type="submit" class="btn-primary px-8">Create Task</button>
          </div>
        </form>
      </div>
    </div>

    <!-- Confirmation Modal -->
    <ConfirmModal 
        :show="confirmModal.show"
        :title="confirmModal.title"
        :message="confirmModal.message"
        :confirm-label="confirmModal.confirmLabel"
        :loading="confirmModal.loading"
        :variant="confirmModal.variant"
        @close="confirmModal.show = false" 
        @confirm="confirmModal.action?.()" 
    />
  </div>
</template>

<style scoped>
.modal-box {
  width: 32rem !important;
  max-width: calc(100vw - 2rem) !important;
}

.bulk-enter-active, .bulk-leave-active {
  transition: all 0.4s cubic-bezier(0.16, 1, 0.3, 1);
}
.bulk-enter-from, .bulk-leave-to {
  opacity: 0;
  transform: translate(-50%, 20px);
}
</style>
