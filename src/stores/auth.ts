import { defineStore } from 'pinia';
import { supabase } from '@/utils/supabase';

export interface Profile {
  id: string;
  username: string;
  email?: string;
  avatar_url?: string;
  finnhub_key?: string;
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
      // If we are in an OAuth redirect flow, wait a bit for Supabase JS to settle the hash
      if (window.location.hash.includes('access_token=')) {
        await new Promise(resolve => setTimeout(resolve, 200));
      }

      const { data: { session } } = await supabase.auth.getSession();
      this.session = session;
      
      // We rely on onAuthStateChange below for the initial profile sync 
      // to avoid double-calling syncProfile if the listener fires immediately.
      
      supabase.auth.onAuthStateChange(async (event, session) => {
        this.session = session;
        if (session?.user) {
          await this.syncProfile(session.user);
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
        return data;
      }
      return null;
    },

    /**
     * Ensures a profile exists for the user, especially for OAuth logins.
     */
    async syncProfile(user: any) {
        if (!user?.id) return;

        try {
            const profile = await this.fetchProfile(user.id);
            
            if (!profile) {
                // Create profile if missing (common for fresh OAuth sign-ins)
                const metadata = user.user_metadata || {};
                const newProfile: Partial<Profile> = {
                    id: user.id,
                    username: metadata.full_name || metadata.name || user.email?.split('@')[0] || 'User',
                    avatar_url: metadata.avatar_url || metadata.picture || null,
                };

                const { data, error } = await supabase
                    .from('profiles')
                    .insert([newProfile])
                    .select()
                    .single();

                if (!error && data) {
                    this.currentUser = data;
                }
            }
        } catch (err) {
            console.warn('Profile synchronization delayed or failed:', err);
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
        await this.syncProfile(data.user);
      }
      return true;
    },

    async signInWithGoogle() {
        const { error } = await supabase.auth.signInWithOAuth({
            provider: 'google',
            options: {
                redirectTo: `${window.location.origin}${import.meta.env.BASE_URL}`,
            }
        });
        if (error) throw error;
    },

    async logout() {
      try {
        await supabase.auth.signOut();
        this.currentUser = null;
        this.session = null;
        
        // Force a full page reload to clear all Pinia stores and memory
        window.location.href = '/';
      } catch (err) {
        console.error('Logout error:', err);
        // Even if supabase fails, we should clear local state
        this.currentUser = null;
        this.session = null;
        window.location.href = '/';
      }
    },

    async login(email: string, pass: string) {
      return this.signIn(email, pass);
    },

    async register(email: string, pass: string, username?: string) {
      return this.signUp(email, pass, username);
    },

    async updateProfile(updates: Partial<Profile>) {
      const userId = this.currentUser?.id || this.session?.user?.id;
      if (!userId) {
        console.error('Cannot update profile: No user ID found');
        return null;
      }

      const { data, error } = await supabase
        .from('profiles')
        .update(updates)
        .eq('id', userId)
        .select()
        .single();

      if (error) {
        console.error('Supabase profile update error:', error);
        throw error;
      }
      
      if (data) {
        this.currentUser = data;
      }
      return data;
    },
  },
});