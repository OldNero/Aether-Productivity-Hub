import { defineStore } from 'pinia';
import { apiClient } from '@/utils/api';

export interface User {
  id: string;
  email?: string;
  username: string;
  avatar_url?: string;
  finnhubKey?: string;
  alphaKey?: string;
}

export const useAuthStore = defineStore('auth', {
  state: () => ({
    currentUser: null as User | null,
    isInitialized: false,
  }),
  getters: {
    isAuthenticated: (state) => !!state.currentUser,
  },
  actions: {
    async init() {
      try {
        const { user } = await apiClient('/auth/me');
        this.currentUser = user;
      } catch (err) {
        this.currentUser = null;
      }
      this.isInitialized = true;
    },

    async login(email: string, pass: string) {
      const data = await apiClient('/auth/login', {
        method: 'POST',
        body: JSON.stringify({ email, password: pass })
      });
      this.currentUser = data.user;
      return true;
    },

    async register(email: string, pass: string, username?: string) {
      const data = await apiClient('/auth/signup', {
        method: 'POST',
        body: JSON.stringify({ 
          email, 
          password: pass,
          username: username
        })
      });
      this.currentUser = data.user;
      return true;
    },

    async logout() {
      await apiClient('/auth/logout', { method: 'POST' });
      this.currentUser = null;
      window.location.reload();
    },

    async updateProfile(updates: { username?: string, finnhubKey?: string, alphaKey?: string }) {
      if (!this.currentUser) return;
      const data = await apiClient('/auth/profile', {
        method: 'PATCH',
        body: JSON.stringify(updates)
      });
      if (data.success) {
        this.currentUser = { ...this.currentUser, ...updates };
      }
      return data;
    }
  },
});
