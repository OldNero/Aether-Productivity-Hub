import { defineStore } from 'pinia';
import { supabase } from '@/utils/supabase';
import { useAuthStore } from './auth';

export type TimerMode = 'stopwatch' | 'focus' | 'short_break' | 'long_break';

export interface TimerSession {
  id: string;
  mode: TimerMode;
  start_time: string;
  duration: number; // in seconds
  task_id?: string;
  notes?: string;
}

export const useTimerStore = defineStore('timer', {
  state: () => ({
    mode: 'focus' as TimerMode,
    secondsElapsed: 0,
    isActive: false,
    isZenMode: false,
    timerInterval: null as number | null,
    targetSeconds: 25 * 60, // Default 25m for focus
    linkedTaskId: null as string | null,
    sessions: [] as TimerSession[],
    lastTickTimestamp: null as number | null,
  }),

  getters: {
    formattedTime(): string {
      const displaySeconds = this.mode === 'stopwatch' 
        ? this.secondsElapsed 
        : Math.max(0, this.targetSeconds - this.secondsElapsed);
      
      const hrs = Math.floor(displaySeconds / 3600);
      const mins = Math.floor((displaySeconds % 3600) / 60);
      const secs = displaySeconds % 60;
      return `${hrs > 0 ? hrs.toString().padStart(2, '0') + ':' : ''}${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    },
    progress(): number {
      if (this.mode === 'stopwatch') return 0;
      return Math.min(100, (this.secondsElapsed / this.targetSeconds) * 100);
    },
    dashOffset(): number {
      // SVG Circle circumference for r=105 is ~659.7
      const circumference = 659.7;
      if (this.mode === 'stopwatch') return circumference;
      const p = this.secondsElapsed / this.targetSeconds;
      return circumference * (1 - p);
    }
  },

  actions: {
    async init() {
      const auth = useAuthStore();
      if (!auth.session?.user) {
        this.sessions = [];
        return;
      }
      
      const { data, error } = await supabase
        .from('sessions')
        .select('*')
        .eq('user_id', auth.session.user.id)
        .order('start_time', { ascending: false })
        .limit(50);

      if (error) {
        console.error('Error fetching sessions:', error.message, error.details);
        this.sessions = [];
      } else {
        this.sessions = data || [];
      }
      
      // Handle background persistence check
      const lastActive = localStorage.getItem('timer_active_state');
      if (lastActive) {
        const state = JSON.parse(lastActive);
        if (state.isActive) {
          const now = Date.now();
          const diff = Math.floor((now - state.timestamp) / 1000);
          this.secondsElapsed = state.secondsElapsed + diff;
          this.mode = state.mode;
          this.targetSeconds = state.targetSeconds;
          this.linkedTaskId = state.linkedTaskId;
          this.start();
        }
      }
    },

    setMode(newMode: TimerMode) {
      if (this.isActive) return;
      this.mode = newMode;
      this.secondsElapsed = 0;
      switch (newMode) {
        case 'focus': this.targetSeconds = 25 * 60; break;
        case 'short_break': this.targetSeconds = 5 * 60; break;
        case 'long_break': this.targetSeconds = 15 * 60; break;
        case 'stopwatch': this.targetSeconds = 0; break;
      }
    },

    start() {
      if (this.isActive) return;
      this.isActive = true;
      this.lastTickTimestamp = Date.now();
      
      this.timerInterval = window.setInterval(() => {
        this.tick();
      }, 1000);
    },

    pause() {
      this.isActive = false;
      if (this.timerInterval) {
        clearInterval(this.timerInterval);
        this.timerInterval = null;
      }
      this.saveState();
    },

    reset() {
      this.pause();
      this.secondsElapsed = 0;
      this.saveState();
    },

    tick() {
      this.secondsElapsed++;
      
      // Auto-save state for background persistence
      if (this.secondsElapsed % 5 === 0) {
        this.saveState();
      }

      // Check if finished (Countdown modes only)
      if (this.mode !== 'stopwatch' && this.secondsElapsed >= this.targetSeconds) {
        this.completeSession();
      }
    },

    async completeSession() {
      const auth = useAuthStore();
      
      if (!auth.session?.user) {
        console.warn('Cannot save session: not authenticated');
        this.reset();
        return;
      }
      
      const sessionData = {
        mode: this.mode,
        start_time: new Date(Date.now() - this.secondsElapsed * 1000).toISOString(),
        duration: this.secondsElapsed,
        task_id: this.linkedTaskId || null,
        user_id: auth.session.user.id
      };

      const { data: session, error } = await supabase
        .from('sessions')
        .insert(sessionData)
        .select()
        .single();

      if (error) {
        console.error('Failed to save session:', error.message, error.details);
      } else if (session) {
        this.sessions.unshift(session);
      }
      
      // Notification
      if (Notification.permission === "granted") {
        new Notification("Aether Timer", { body: `${this.mode.replace('_', ' ')} session complete!` });
      }

      this.reset();
    },

    saveState() {
      localStorage.setItem('timer_active_state', JSON.stringify({
        isActive: this.isActive,
        secondsElapsed: this.secondsElapsed,
        mode: this.mode,
        targetSeconds: this.targetSeconds,
        linkedTaskId: this.linkedTaskId,
        timestamp: Date.now()
      }));
    },

    async deleteSession(id: string) {
      const { error } = await supabase.from('sessions').delete().eq('id', id);
      if (error) {
        console.error('Failed to delete session:', error);
      } else {
        this.sessions = this.sessions.filter(s => s.id !== id);
      }
    }
  }
});
