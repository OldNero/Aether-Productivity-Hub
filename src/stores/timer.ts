import { defineStore } from 'pinia';
import { supabase } from '@/utils/supabase';
import { useAuthStore } from './auth';
import { useTaskStore } from './tasks';

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
    isLoaded: false,
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
      // 1. Load from LocalStorage first (instant)
      const localSessions = localStorage.getItem('timer_sessions_history');
      if (localSessions) {
        try {
          this.sessions = JSON.parse(localSessions);
        } catch (e) {
          console.error('Failed to parse local sessions');
        }
      }

      const auth = useAuthStore();
      if (auth.session?.user) {
        // 2. Load from Supabase (sync)
        const { data, error } = await supabase
          .from('sessions')
          .select('*')
          .eq('user_id', auth.session.user.id)
          .order('start_time', { ascending: false })
          .limit(100);

        if (!error && data) {
          // Merge logic: avoid duplicates by ID
          const sessionIds = new Set(this.sessions.map(s => s.id));
          data.forEach(s => {
            if (!sessionIds.has(s.id)) {
              this.sessions.push(s);
            }
          });
          // Sort after merge
          this.sessions.sort((a, b) => new Date(b.start_time).getTime() - new Date(a.start_time).getTime());
          this.saveSessionsToLocal();
        }
      }
      
      this.isLoaded = true;

      // Handle background persistence check for active timer
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
      
      // Create local session object immediately
      const newSession: TimerSession = {
        id: crypto.randomUUID(),
        mode: this.mode,
        start_time: new Date(Date.now() - this.secondsElapsed * 1000).toISOString(),
        duration: this.secondsElapsed,
        task_id: this.linkedTaskId || undefined,
      };

      // Add to local state first
      this.sessions.unshift(newSession);
      this.saveSessionsToLocal();

      // Try to save to Supabase if authenticated
      if (auth.session?.user) {
        try {
          const { error } = await supabase
            .from('sessions')
            .insert({
              ...newSession,
              id: undefined, // Let DB generate ID if preferred, or keep ours
              user_id: auth.session.user.id
            });
          
          if (error) console.error('Supabase save failed, kept in local:', error.message);
          
          // --- NEW: Complete linked task if it exists ---
          if (this.linkedTaskId) {
            const taskStore = useTaskStore();
            await taskStore.completeTask(this.linkedTaskId);
          }
        } catch (e) {
          console.error('Network error saving session or updating task');
        }
      }
      
      // Notification
      if (Notification.permission === "granted") {
        new Notification("Aether Timer", { body: `${this.mode.replace('_', ' ')} session complete!` });
      }

      this.reset();
    },

    saveSessionsToLocal() {
      // Keep only last 100 sessions in local storage to prevent bloat
      const history = this.sessions.slice(0, 100);
      localStorage.setItem('timer_sessions_history', JSON.stringify(history));
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
