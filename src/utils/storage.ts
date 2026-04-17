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
        .eq(key === 'profiles' ? 'id' : 'user_id', session.user.id);
      
      if (!error && data) {
        if (key === 'profiles') {
          if (data.length === 0) {
            // Fallback: Create profile if missing
            const newProfile = { 
              id: session.user.id, 
              username: session.user.email?.split('@')[0] || 'User',
              email: session.user.email,
              updated_at: new Date().toISOString()
            };
            await supabase.from('profiles').insert(newProfile);
            return newProfile as unknown as T;
          }
          return data[0] as unknown as T;
        }
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

  async add<T>(key: string, item: T): Promise<void> {
    const { data: { session } } = await supabase.auth.getSession();
    if (session && ['tasks', 'investments', 'sessions', 'rituals'].includes(key)) {
      const payload = { ...(item as any), user_id: session.user.id, updated_at: new Date().toISOString() };
      const { error } = await supabase.from(key).insert(payload);
      if (error) console.error(`Supabase Insert Error [${key}]:`, error);
    }
    
    // For LocalStorage sync, we still need the full array pattern to keep it simple
    const current = await this.get<any[]>(key) || [];
    localStorage.setItem(getPrefixedKey(key), JSON.stringify([...current, item]));
  },

  async addMultiple<T>(key: string, items: T[]): Promise<void> {
    if (items.length === 0) return;
    const { data: { session } } = await supabase.auth.getSession();
    if (session && ['tasks', 'investments', 'sessions', 'rituals'].includes(key)) {
      const payload = items.map(item => ({
          ...(item as any),
          user_id: session.user.id,
          updated_at: new Date().toISOString()
      }));
      const { error } = await supabase.from(key).insert(payload);
      if (error) console.error(`Supabase Batch Insert Error [${key}]:`, error);
    }

    const current = await this.get<any[]>(key) || [];
    localStorage.setItem(getPrefixedKey(key), JSON.stringify([...current, ...items]));
  },

  async remove(key: string, id?: string | string[]): Promise<void> {
    const { data: { session } } = await supabase.auth.getSession();
    if (session && id && ['tasks', 'investments', 'sessions', 'rituals'].includes(key)) {
      let query = supabase.from(key).delete();
      
      const idsToRemove = Array.isArray(id) ? id : [id];
      if (idsToRemove.length === 0) return;

      console.log(`[Storage] Deleting ${idsToRemove.length} rows from ${key}...`);
      
      query = query.in('id', idsToRemove);
      const { error } = await query.eq(key === 'profiles' ? 'id' : 'user_id', session.user.id);
      
      if (error) console.error(`Supabase Delete Error [${key}]:`, error);
    }

    const prefixedKey = getPrefixedKey(key);
    if (id) {
        const current = await this.get<any[]>(key);
        if (Array.isArray(current)) {
            const idsToRemove = Array.isArray(id) ? id : [id];
            const updated = current.filter(i => !idsToRemove.includes(i.id));
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
