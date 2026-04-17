import { supabase } from './supabase';

export const getPrefixedKey = (key: string): string => {
  const currentUserStr = localStorage.getItem('auth'); // Pinia store persist usually
  if (!currentUserStr) return key;
  try {
    const state = JSON.parse(currentUserStr);
    const userId = state.currentUser?.id;
    if (!userId) return key;
    return `${userId}_${key}`;
  } catch {
    return key;
  }
};

export const Storage = {
  async get<T>(key: string): Promise<T | null> {
    // 1. Check Supabase if authenticated
    const { data: { session } } = await supabase.auth.getSession();
    if (session && ['tasks', 'investments', 'profiles', 'rituals', 'sessions'].includes(key)) {
      const { data, error } = await supabase
        .from(key)
        .select('*')
        .eq('user_id', session.user.id);
      
      if (!error && data) {
        if (key === 'profiles') return data[0] as unknown as T;
        return data as unknown as T;
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
    const { data: { session } } = await supabase.auth.getSession();
    if (session && ['tasks', 'investments', 'profiles', 'sessions', 'rituals'].includes(key)) {
      const uid = session.user.id;
      
      if (Array.isArray(value)) {
          // For lists, we usually want to sync the whole state
          // To simplify for this hub, we'll upsert everything
          const payload = value.map(item => ({
              ...item,
              user_id: uid,
              updated_at: new Date().toISOString()
          }));

          const { error } = await supabase
            .from(key)
            .upsert(payload, { onConflict: 'id' });
          
          if (error) console.error(`Supabase Upsert Error [${key}]:`, error);
      } else {
          const payload = { ...(value as any), user_id: uid, updated_at: new Date().toISOString() };
          const { error } = await supabase
            .from(key)
            .upsert(payload, { onConflict: key === 'profiles' ? 'id' : 'id' });
          
          if (error) console.error(`Supabase Single Upsert Error [${key}]:`, error);
      }
    }

    const prefixedKey = getPrefixedKey(key);
    localStorage.setItem(prefixedKey, JSON.stringify(value));
  },

  async remove(key: string, id?: string): Promise<void> {
    const { data: { session } } = await supabase.auth.getSession();
    if (session && id && ['tasks', 'investments', 'sessions', 'rituals'].includes(key)) {
      const { error } = await supabase
        .from(key)
        .delete()
        .eq('id', id)
        .eq('user_id', session.user.id);
      
      if (error) console.error(`Supabase Delete Error [${key}]:`, error);
    }

    const prefixedKey = getPrefixedKey(key);
    if (id) {
        const current = await this.get<any[]>(key);
        if (Array.isArray(current)) {
            const updated = current.filter(i => i.id !== id);
            localStorage.setItem(prefixedKey, JSON.stringify(updated));
            return;
        }
    }
    localStorage.removeItem(prefixedKey);
  },

  generateUUID(): string {
    return crypto.randomUUID();
  }
};
