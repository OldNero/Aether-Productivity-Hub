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
        const profile = await this.fetchProfile(user.id);
        
        if (!profile) {
            // Create profile if missing (common for fresh OAuth sign-ins)
            const metadata = user.user_metadata;
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