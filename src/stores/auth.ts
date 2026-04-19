import { defineStore } from 'pinia';
import { supabase } from '@/utils/supabase';

export interface Profile {
  id: string;
  username: string;
  email?: string;
  avatar_url?: string;
  finnhub_key?: string;
  alpha_vantage_key?: string;
}

export const useAuthStore = defineStore('auth', {
  state: () => ({
    currentUser: null as Profile | null,
    session: null as any,
    isInitialized: false,
  }),
  getters: {
    isAuthenticated: (state) => !!state.session,
  },
  actions: {
    async init() {
      const { data: { session } } = await supabase.auth.getSession();
      this.session = session;
      
      if (session?.user) {
        await this.fetchProfile(session.user.id);
      }
      
      supabase.auth.onAuthStateChange(async (event, session) => {
        this.session = session;
        if (session?.user) {
          await this.fetchProfile(session.user.id);
        } else {
          this.currentUser = null;
        }
      });
      
      this.isInitialized = true;
    },

    async fetchProfile(userId: string) {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .single();
      
      if (!error && data) {
        this.currentUser = data;
      }
    },

    async signUp(email: string, pass: string, username?: string) {
      const { data, error } = await supabase.auth.signUp({
        email,
        password: pass,
        options: {
          data: { username: username || email.split('@')[0] },
        },
      });
      
      if (error) throw error;
      return data;
    },

    async signIn(email: string, pass: string) {
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password: pass,
      });
      
      if (error) throw error;
      this.session = data.session;
      if (data.user) {
        await this.fetchProfile(data.user.id);
      }
      return true;
    },

    async logout() {
      const { error } = await supabase.auth.signOut();
      if (error) throw error;
      this.currentUser = null;
      this.session = null;
    },

    async login(email: string, pass: string) {
      return this.signIn(email, pass);
    },

    async register(email: string, pass: string, username?: string) {
      return this.signUp(email, pass, username);
    },

    async updateProfile(updates: Partial<Profile>) {
      if (!this.currentUser?.id) return;

      const { data, error } = await supabase
        .from('profiles')
        .update(updates)
        .eq('id', this.currentUser.id)
        .select()
        .single();

      if (error) throw error;
      if (data) {
        this.currentUser = data;
      }
      return data;
    },
  },
});