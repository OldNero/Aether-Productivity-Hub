import { defineStore } from 'pinia';
import { Storage } from '@/utils/storage';

export type TimerMode = 'stopwatch' | 'focus' | 'short_break' | 'long_break';

export interface TimerSession {
  id: string;
  mode: TimerMode;
  startTime: string;
  endTime: string;
  duration: number; // in seconds
  taskId?: string;
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
      const data = await Storage.get<TimerSession[]>('sessions');
      this.sessions = data || [];
      
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
      const session: TimerSession = {
        id: Storage.generateUUID(),
        mode: this.mode,
        startTime: new Date(Date.now() - this.secondsElapsed * 1000).toISOString(),
        endTime: new Date().toISOString(),
        duration: this.secondsElapsed,
        taskId: this.linkedTaskId || undefined
      };

      this.sessions.unshift(session);
      await Storage.set('sessions', this.sessions);
      
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
        this.sessions = this.sessions.filter(s => s.id !== id);
        await Storage.remove('sessions', id);
    }
  }
});
