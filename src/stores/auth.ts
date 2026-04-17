import { defineStore } from 'pinia';
import { supabase } from '@/utils/supabase';

export interface User {
  id: string;
  email?: string;
  username: string;
  avatar_url?: string;
}

export const useAuthStore = defineStore('auth', {
  state: () => ({
    currentUser: null as User | null,
    isInitialized: false,
    session: null as any,
  }),
  getters: {
    isAuthenticated: (state) => !!state.currentUser,
  },
  actions: {
    async init() {
      const { data: { session } } = await supabase.auth.getSession();
      this.session = session;
      
      if (session?.user) {
        // Try to get profile
        const { data: profile } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', session.user.id)
          .single();

        this.currentUser = {
          id: session.user.id,
          email: session.user.email,
          username: profile?.username || session.user.email?.split('@')[0] || 'User',
          avatar_url: profile?.avatar_url
        };
      } else {
        this.currentUser = null;
      }

      // Listen for auth changes
      supabase.auth.onAuthStateChange((_event, session) => {
        this.session = session;
        if (!session) {
            this.currentUser = null;
        } else {
            // Re-init or handle updates if needed
        }
      });

      this.isInitialized = true;
    },

    async login(email: string, pass: string) {
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password: pass,
      });

      if (error) throw error;
      
      if (data.user) {
        const { data: profile } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', data.user.id)
          .single();

        this.currentUser = {
          id: data.user.id,
          email: data.user.email,
          username: profile?.username || data.user.email?.split('@')[0] || 'User',
          avatar_url: profile?.avatar_url
        };
      }
      return true;
    },

    async register(email: string, pass: string) {
      const { data, error } = await supabase.auth.signUp({
        email,
        password: pass,
      });

      if (error) throw error;

      if (data.user) {
          // Create profile
          await supabase.from('profiles').insert({
              id: data.user.id,
              username: email.split('@')[0],
              updated_at: new Date().toISOString()
          });

          this.currentUser = {
            id: data.user.id,
            email: data.user.email,
            username: email.split('@')[0]
          };
      }
      return true;
    },

    async logout() {
      await supabase.auth.signOut();
      this.currentUser = null;
      this.session = null;
      window.location.reload();
    },

    async signInWithGoogle() {
      const { error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: window.location.origin,
        },
      });
      if (error) throw error;
    }
  },
});
