import { defineStore } from 'pinia';
import { Storage } from '@/utils/storage';

export interface User {
  id: string;
  username: string;
  avatar_url?: string;
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
      const user = await Storage.get<User>('currentUser');
      if (user) {
        this.currentUser = user;
      }
      this.isInitialized = true;
    },
    async login(username: string, pass: string) {
      // Original logic: Find user in "users" array
      const users = (await Storage.get<any[]>('users')) || [];
      const user = users.find((u) => u.username === username && u.password === pass);

      if (user) {
        this.currentUser = { id: user.id, username: user.username };
        await Storage.set('currentUser', this.currentUser);
        return true;
      } else {
        throw new Error('Invalid credentials');
      }
    },
    async register(username: string, pass: string) {
      const users = (await Storage.get<any[]>('users')) || [];
      if (users.find((u: any) => u.username === username)) {
        throw new Error('Username already exists');
      }

      const newUser = { id: Storage.generateUUID(), username, password: pass };
      users.push(newUser);
      await Storage.set('users', users);

      this.currentUser = { id: newUser.id, username: newUser.username };
      await Storage.set('currentUser', this.currentUser);
      return true;
    },
    async logout() {
      this.currentUser = null;
      await Storage.remove('currentUser');
      window.location.reload();
    },
    async signInWithGoogle() {
      if (Storage.supabase) {
        const { error } = await Storage.supabase.auth.signInWithOAuth({
          provider: 'google',
        });
        if (error) throw error;
      } else {
        throw new Error('Supabase not configured');
      }
    }
  },
});
