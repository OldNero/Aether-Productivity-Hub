<script setup lang="ts">
import { ref, onMounted, computed } from 'vue';
import { useTaskStore, Task } from '@/stores/tasks';
import { formatDistanceToNow } from 'date-fns';

const taskStore = useTaskStore();
const activeFilter = ref<'all' | 'active' | 'completed'>('all');
const isModalOpen = ref(false);
const newTask = ref({ title: '', priority: 'medium' as Task['priority'] });
const selectedTasks = ref<string[]>([]);

const filteredTasks = computed(() => {
  if (activeFilter.value === 'active') return taskStore.activeTasks;
  if (activeFilter.value === 'completed') return taskStore.completedTasks;
  return taskStore.tasks;
});

onMounted(async () => {
  await taskStore.fetchTasks();
});

const openModal = () => (isModalOpen.value = true);
const closeModal = () => {
  isModalOpen.value = false;
  newTask.value = { title: '', priority: 'medium' };
};

const handleAddTask = async () => {
  if (newTask.value.title.trim()) {
    await taskStore.addTask(newTask.value.title, newTask.value.priority);
    closeModal();
  }
};

const toggleTaskSelection = (id: string) => {
  const index = selectedTasks.value.indexOf(id);
  if (index === -1) selectedTasks.value.push(id);
  else selectedTasks.value.splice(index, 1);
};

const batchComplete = async () => {
  await taskStore.batchComplete(selectedTasks.value);
  selectedTasks.value = [];
};

const batchDelete = async () => {
  if (confirm('Delete selected tasks?')) {
    await taskStore.batchDelete(selectedTasks.value);
    selectedTasks.value = [];
  }
};

const timeElapsed = (date: string) => {
  return formatDistanceToNow(new Date(date), { addSuffix: true });
};
</script>

<template>
  <div class="p-6 max-w-screen-2xl mx-auto page-transition">
    <!-- View Header -->
    <div class="flex flex-col md:flex-row md:items-end justify-between gap-6 mb-10">
      <div>
        <h1 class="text-4xl md:text-5xl font-bold tracking-tighter text-zinc-100">Focus List</h1>
        <p class="text-base text-muted mt-2 max-w-xl">
          Deep work starts here. Manage your high-impact activities.
        </p>
      </div>
      <button @click="openModal" class="btn-primary">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" /></svg>
        New Task
      </button>
    </div>

    <!-- Filters & Stats -->
    <div class="flex flex-col md:flex-row items-center justify-between gap-4 mb-6">
      <div class="flex items-center gap-1 bg-zinc-900/40 p-1 rounded-lg border border-white/5">
        <button
          v-for="f in (['all', 'active', 'completed'] as const)"
          :key="f"
          @click="activeFilter = f"
          class="filter-btn capitalize"
          :class="{ active: activeFilter === f }"
        >
          {{ f }}
        </button>
      </div>
      
      <div class="flex items-center gap-6">
        <div class="flex flex-col items-end">
          <span class="text-[10px] font-bold text-muted uppercase tracking-widest">Active</span>
          <span class="text-xl font-bold text-zinc-100">{{ taskStore.activeCount }}</span>
        </div>
        <div class="w-px h-8 bg-white/5"></div>
        <div class="flex flex-col items-end">
          <span class="text-[10px] font-bold text-muted uppercase tracking-widest">Completed</span>
          <span class="text-xl font-bold text-zinc-100">{{ taskStore.completedCount }}</span>
        </div>
      </div>
    </div>

    <!-- Task List -->
    <div class="space-y-3">
      <div
        v-for="task in filteredTasks"
        :key="task.id"
        class="task-item group"
        :class="{ 'task-item--completed': task.status === 'completed' }"
      >
        <div class="task-item__header">
          <label class="task-item__checkbox">
            <input
              type="checkbox"
              :checked="task.status === 'completed'"
              @change="taskStore.toggleTask(task.id)"
              class="w-5 h-5 rounded bg-zinc-800 border-white/10 text-emerald-500 focus:ring-0 cursor-pointer"
            />
          </label>
          <div class="task-item__content" @click="toggleTaskSelection(task.id)">
            <span class="task-item__title">{{ task.title }}</span>
            <div class="flex items-center gap-2 mt-1">
              <span class="task-item__meta">{{ timeElapsed(task.created_at) }}</span>
            </div>
          </div>
          <span class="badge" :class="`badge--${task.priority}`">{{ task.priority }}</span>
          <div class="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
            <button @click="taskStore.deleteTask(task.id)" class="p-1.5 hover:bg-rose-500/10 rounded text-muted hover:text-rose-400 transition-colors">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/>
              </svg>
            </button>
          </div>
        </div>
      </div>
      
      <!-- Empty State -->
      <div v-if="filteredTasks.length === 0" class="text-center py-20 border-2 border-dashed border-white/5 rounded-2xl">
        <p class="text-muted">No tasks found in this view.</p>
      </div>
    </div>

    <!-- Bulk Actions Bar -->
    <transition name="bulk">
      <div v-if="selectedTasks.length > 0" class="fixed bottom-8 left-1/2 -translate-x-1/2 z-50 flex items-center gap-4 bg-zinc-900/90 backdrop-blur-xl border border-white/10 px-6 py-4 rounded-2xl shadow-2xl">
        <span class="text-sm font-bold text-zinc-100">{{ selectedTasks.length }} Selected</span>
        <div class="w-px h-6 bg-white/10"></div>
        <button @click="batchComplete" class="text-xs font-bold text-emerald-400 hover:text-emerald-300 transition-colors">Mark Complete</button>
        <button @click="batchDelete" class="text-xs font-bold text-rose-400 hover:text-rose-300 transition-colors">Delete</button>
        <button @click="selectedTasks = []" class="p-1.5 hover:bg-white/10 rounded-lg text-muted">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
        </button>
      </div>
    </transition>

    <div v-if="isModalOpen" class="modal-overlay open" @click.self="closeModal">
      <div class="modal-box p-8">
        <h2 class="text-2xl font-bold text-zinc-100 mb-6">Create New Task</h2>
        <form @submit.prevent="handleAddTask" class="space-y-4">
          <div>
            <label class="label">Task Title</label>
            <input v-model="newTask.title" type="text" class="input" placeholder="What needs to be done?" required autofocus />
          </div>
          <div>
            <label class="label">Priority Level</label>
            <select v-model="newTask.priority" class="select">
              <option value="low">Low Priority</option>
              <option value="medium">Medium Priority</option>
              <option value="high">High Priority</option>
            </select>
          </div>
          <div class="flex items-center justify-end gap-3 mt-8">
            <button type="button" @click="closeModal" class="btn-secondary">Cancel</button>
            <button type="submit" class="btn-primary">Initialize Task</button>
          </div>
        </form>
      </div>
    </div>
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
