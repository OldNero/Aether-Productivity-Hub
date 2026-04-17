import { defineStore } from 'pinia';
import { Storage } from '@/utils/storage';

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
      const tasks = await Storage.get<Task[]>('tasks');
      this.tasks = tasks || [];
      this.isLoaded = true;
    },
    async addTask(data: { title: string, priority: Task['priority'], subtasks?: any[], project_id?: string }) {
      const newTask: Task = {
        id: Storage.generateUUID(),
        title: data.title,
        priority: data.priority,
        status: 'active',
        subtasks: data.subtasks || [],
        project_id: data.project_id || 'inbox',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };
      this.tasks.push(newTask);
      await Storage.set('tasks', this.tasks);
      return newTask;
    },
    async toggleTask(id: string) {
      const task = this.tasks.find((t) => t.id === id);
      if (task) {
        task.status = task.status === 'active' ? 'completed' : 'active';
        task.updated_at = new Date().toISOString();
        if (task.status === 'completed' && task.subtasks) {
          task.subtasks.forEach((s) => (s.completed = true));
        }
        await Storage.set('tasks', this.tasks);
      }
    },
    async deleteTask(id: string) {
      this.tasks = this.tasks.filter((t) => t.id !== id);
      await Storage.remove('tasks', id);
    },
    async addSubtask(taskId: string, title: string) {
      const task = this.tasks.find((t) => t.id === taskId);
      if (task && title.trim()) {
        if (!task.subtasks) task.subtasks = [];
        task.subtasks.push({
          id: Storage.generateUUID(),
          title: title.trim(),
          completed: false,
        });
        task.updated_at = new Date().toISOString();
        await Storage.set('tasks', this.tasks);
      }
    },
    async toggleSubtask(taskId: string, subtaskId: string) {
      const task = this.tasks.find((t) => t.id === taskId);
      if (task && task.subtasks) {
        const sub = task.subtasks.find((s) => s.id === subtaskId);
        if (sub) {
          sub.completed = !sub.completed;
          task.updated_at = new Date().toISOString();
          await Storage.set('tasks', this.tasks);
        }
      }
    },
    async batchComplete(ids: string[]) {
      this.tasks.forEach((t) => {
        if (ids.includes(t.id)) {
          t.status = 'completed';
          t.subtasks.forEach((s) => (s.completed = true));
        }
      });
      await Storage.set('tasks', this.tasks);
    },
    async batchDelete(ids: string[]) {
      this.tasks = this.tasks.filter((t) => !ids.includes(t.id));
      await Storage.set('tasks', this.tasks);
    }
  },
});
