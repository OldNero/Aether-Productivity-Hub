import { defineStore } from 'pinia';
import { apiClient } from '@/utils/api';

export interface Subtask {
  id: string;
  title: string;
  completed: boolean;
}

export interface Task {
  id: string;
  title: string;
  priority: 'low' | 'medium' | 'high';
  status: 'active' | 'completed';
  subtasks: Subtask[];
  project_id: string;
  created_at: string;
  updated_at: string;
}

export const useTaskStore = defineStore('tasks', {
  state: () => ({
    tasks: [] as Task[],
    isLoaded: false,
  }),
  getters: {
    activeTasks: (state) => state.tasks.filter((t) => t.status === 'active'),
    completedTasks: (state) => state.tasks.filter((t) => t.status === 'completed'),
    totalCount: (state) => state.tasks.length,
    activeCount: (state) => state.tasks.filter((t) => t.status === 'active').length,
    completedCount: (state) => state.tasks.filter((t) => t.status === 'completed').length,
  },
  actions: {
    async fetchTasks() {
      try {
        const tasks = await apiClient('/tasks');
        // Parse subtasks since SQLite might return them as JSON strings if we store them that way
        this.tasks = tasks.map((t: any) => ({
          ...t,
          subtasks: typeof t.subtasks === 'string' ? JSON.parse(t.subtasks) : (t.subtasks || [])
        }));
      } catch (err) {
        this.tasks = [];
      }
      this.isLoaded = true;
    },
    async addTask(data: { title: string, priority: Task['priority'], subtasks?: any[], project_id?: string }) {
      const newTask = await apiClient('/tasks', {
        method: 'POST',
        body: JSON.stringify(data)
      });
      this.tasks.unshift({
        ...newTask,
        subtasks: typeof newTask.subtasks === 'string' ? JSON.parse(newTask.subtasks) : (newTask.subtasks || [])
      });
      return newTask;
    },
    async toggleTask(id: string) {
      const result = await apiClient(`/tasks/${id}/toggle`, { method: 'PATCH' });
      const task = this.tasks.find((t) => t.id === id);
      if (task) {
        task.status = result.completed ? 'completed' : 'active';
        task.updated_at = new Date().toISOString();
        if (task.status === 'completed' && task.subtasks) {
          task.subtasks.forEach((s) => (s.completed = true));
        }
      }
    },
    async deleteTask(id: string) {
      await apiClient(`/tasks/${id}`, { method: 'DELETE' });
      this.tasks = this.tasks.filter((t) => t.id !== id);
    },
    async addSubtask(taskId: string, title: string) {
      // Subtasks API would ideally handle this, doing local for now
      const task = this.tasks.find((t) => t.id === taskId);
      if (task && title.trim()) {
        task.subtasks.push({
          id: crypto.randomUUID(),
          title: title.trim(),
          completed: false,
        });
        await apiClient(`/tasks/${taskId}`, { 
          method: 'PATCH', 
          body: JSON.stringify({ subtasks: task.subtasks }) 
        });
      }
    },
    async toggleSubtask(taskId: string, subtaskId: string) {
      const task = this.tasks.find((t) => t.id === taskId);
      if (task && task.subtasks) {
        const sub = task.subtasks.find((s) => s.id === subtaskId);
        if (sub) {
          sub.completed = !sub.completed;
          await apiClient(`/tasks/${taskId}`, { 
            method: 'PATCH', 
            body: JSON.stringify({ subtasks: task.subtasks }) 
          });
        }
      }
    },
    async batchComplete(ids: string[]) {
      await apiClient('/tasks/batch-complete', {
        method: 'POST',
        body: JSON.stringify({ ids })
      });
      this.tasks.forEach((t) => {
        if (ids.includes(t.id)) {
          t.status = 'completed';
          t.subtasks.forEach((s) => (s.completed = true));
        }
      });
    },
    async batchDelete(ids: string[]) {
      await apiClient('/tasks/batch-delete', {
        method: 'POST',
        body: JSON.stringify({ ids })
      });
      this.tasks = this.tasks.filter((t) => !ids.includes(t.id));
    }
  },
});
