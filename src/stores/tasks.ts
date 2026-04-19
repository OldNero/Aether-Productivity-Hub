import { defineStore } from 'pinia';
import { supabase } from '@/utils/supabase';

export interface Task {
  id: string;
  title: string;
  priority: 'low' | 'medium' | 'high';
  completed: boolean;
  created_at: string;
  user_id: string;
}

export const useTaskStore = defineStore('tasks', {
  state: () => ({
    tasks: [] as Task[],
    isLoaded: false,
  }),
  getters: {
    activeTasks: (state) => state.tasks.filter((t: Task) => !t.completed),
    completedTasks: (state) => state.tasks.filter((t: Task) => t.completed),
    totalCount: (state) => state.tasks.length,
    activeCount: (state) => state.tasks.filter((t: Task) => !t.completed).length,
    completedCount: (state) => state.tasks.filter((t: Task) => t.completed).length,
  },
  actions: {
    async fetchTasks() {
      const { data, error } = await supabase
        .from('tasks')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Error fetching tasks:', error);
        this.tasks = [];
      } else {
        this.tasks = data || [];
      }
      this.isLoaded = true;
    },

    async addTask(data: { title: string; priority?: Task['priority'] }) {
      const { data: newTask, error } = await supabase
        .from('tasks')
        .insert({
          title: data.title,
          priority: data.priority || 'medium',
          completed: false,
        })
        .select()
        .single();

      if (error) throw error;
      if (newTask) {
        this.tasks.unshift(newTask);
      }
      return newTask;
    },

    async toggleTask(id: string) {
      const task = this.tasks.find((t: Task) => t.id === id);
      if (!task) return;

      const newCompleted = !task.completed;
      const { error } = await supabase
        .from('tasks')
        .update({ completed: newCompleted })
        .eq('id', id);

      if (error) throw error;
      task.completed = newCompleted;
    },

    async deleteTask(id: string) {
      const { error } = await supabase.from('tasks').delete().eq('id', id);
      if (error) throw error;
      this.tasks = this.tasks.filter((t: Task) => t.id !== id);
    },

    async batchComplete(ids: string[]) {
      const { error } = await supabase
        .from('tasks')
        .update({ completed: true })
        .in('id', ids);

      if (error) throw error;
      this.tasks.forEach((t: Task) => {
        if (ids.includes(t.id)) {
          t.completed = true;
        }
      });
    },

    async batchDelete(ids: string[]) {
      const { error } = await supabase.from('tasks').delete().in('id', ids);
      if (error) throw error;
      this.tasks = this.tasks.filter((t: Task) => !ids.includes(t.id));
    },
  },
});