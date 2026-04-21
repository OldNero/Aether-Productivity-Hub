import { defineStore } from 'pinia';
import { supabase } from '@/utils/supabase';
import { useAuthStore } from './auth';

export interface Subtask {
  id: string;
  title: string;
  completed: boolean;
}

export interface Task {
  id: string;
  title: string;
  priority: 'low' | 'medium' | 'high';
  completed: boolean;
  created_at: string;
  user_id: string;
  subtasks: Subtask[];
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
      const auth = useAuthStore();
      if (!auth.session?.user) return;

      const { data, error } = await supabase
        .from('tasks')
        .select('*')
        .eq('user_id', auth.session.user.id)
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Error fetching tasks:', error);
        this.tasks = [];
      } else {
        this.tasks = (data || []).map(task => ({
          ...task,
          subtasks: task.subtasks || []
        }));
      }
      this.isLoaded = true;
    },

    async addTask(data: { title: string; priority?: Task['priority'] }) {
      const auth = useAuthStore();
      if (!auth.session?.user) throw new Error('Not authenticated');

      const { data: newTask, error } = await supabase
        .from('tasks')
        .insert({
          title: data.title,
          priority: data.priority || 'medium',
          completed: false,
          user_id: auth.session.user.id
        })
        .select()
        .single();

      if (error) throw error;
      if (newTask) {
        const taskWithSubtasks = {
          ...newTask,
          subtasks: newTask.subtasks || []
        };
        this.tasks.unshift(taskWithSubtasks);
        return taskWithSubtasks;
      }
    },

    async completeTask(id: string) {
      const task = this.tasks.find((t: Task) => t.id === id);
      if (!task || task.completed) return;

      const { error } = await supabase
        .from('tasks')
        .update({ completed: true })
        .eq('id', id);

      if (error) throw error;
      task.completed = true;
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