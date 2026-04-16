import { createClient, SupabaseClient } from '@supabase/supabase-js';

// Configuration interface (matching the original CONFIG pattern if needed, or using env)
const SUPABASE_URL = (import.meta.env.VITE_SUPABASE_URL as string) || '';
const SUPABASE_ANON_KEY = (import.meta.env.VITE_SUPABASE_ANON_KEY as string) || '';

let supabase: SupabaseClient | null = null;

if (SUPABASE_URL && SUPABASE_ANON_KEY && !SUPABASE_URL.includes('PLACEHOLDER')) {
  supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
}

export const getPrefixedKey = (key: string): string => {
  const currentUser = localStorage.getItem('currentUser');
  if (!currentUser) return key;
  try {
    const user = JSON.parse(currentUser);
    const globalKeys = ['users', 'currentUser'];
    if (globalKeys.includes(key)) return key;
    return `${user.id}_${key}`;
  } catch {
    return key;
  }
};

export const Storage = {
  async get<T>(key: string): Promise<T | null> {
    // 1. Check Supabase if authenticated
    if (supabase) {
      const { data: { session } } = await supabase.auth.getSession();
      if (session && ['tasks', 'investments', 'profiles', 'rituals', 'sessions'].includes(key)) {
        const { data, error } = await supabase.from(key).select('*');
        if (!error && data) {
          if (['profiles'].includes(key)) return data[0] as unknown as T;
          return data as unknown as T;
        }
      }
    }

    // 2. Fallback to LocalStorage
    const prefixedKey = getPrefixedKey(key);
    const localData = localStorage.getItem(prefixedKey);
    try {
      return localData ? JSON.parse(localData) : null;
    } catch {
      return localData as unknown as T;
    }
  },

  async set<T>(key: string, value: T): Promise<void> {
    if (supabase) {
      const { data: { session } } = await supabase.auth.getSession();
      if (session && ['tasks', 'investments', 'profiles', 'sessions', 'rituals'].includes(key)) {
        const uid = session.user.id;
        const prepareRow = (row: any) => ({ ...row, user_id: uid });
        const payload = Array.isArray(value) ? value.map(prepareRow) : prepareRow(value);

        const { error } = await supabase
          .from(key)
          .upsert(payload, key === 'profiles' ? { onConflict: 'user_id' } : {});
        
        if (!error) return;
        console.error(`Supabase Upsert Error [${key}]:`, error);
      }
    }

    const prefixedKey = getPrefixedKey(key);
    localStorage.setItem(prefixedKey, JSON.stringify(value));
  },

  async remove(key: string, id?: string): Promise<void> {
    if (supabase && id && ['tasks', 'investments', 'sessions', 'rituals'].includes(key)) {
      const { error } = await supabase.from(key).delete().eq('id', id);
      if (error) console.error(`Supabase Delete Error [${key}]:`, error);
    }

    const prefixedKey = getPrefixedKey(key);
    if (id && ['tasks', 'investments', 'sessions', 'rituals'].includes(key)) {
      const current = await this.get<any[]>(key);
      if (Array.isArray(current)) {
        const updated = current.filter((item) => item.id !== id);
        localStorage.setItem(prefixedKey, JSON.stringify(updated));
        return;
      }
    }
    localStorage.removeItem(prefixedKey);
  },

  generateUUID(): string {
    if (typeof crypto !== 'undefined' && crypto.randomUUID) {
      return crypto.randomUUID();
    }
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
      const r = (Math.random() * 16) | 0;
      const v = c === 'x' ? r : (r & 0x3) | 0x8;
      return v.toString(16);
    });
  },
  
  supabase
};
