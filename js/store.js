// Initialize Supabase Client (avoiding collision with global 'supabase' library namespace)
let supabaseClient = null;
try {
    const isPlaceholder = !CONFIG || (CONFIG.keys.SUPABASE_URL && CONFIG.keys.SUPABASE_URL.includes('PLACEHOLDER'));
    const isDefault = !CONFIG || CONFIG.keys.SUPABASE_URL === 'YOUR_SUPABASE_URL';

    if (typeof supabase !== 'undefined' && !isPlaceholder && !isDefault) {
        const { createClient } = supabase;
        supabaseClient = createClient(CONFIG.keys.SUPABASE_URL, CONFIG.keys.SUPABASE_ANON_KEY);
    }
} catch (err) {
    console.warn('Aether: Supabase client could not initialize. Local-only mode active.', err);
}
window.supabase = supabaseClient; // Legacy exposure for other modules (renamed internally for clarity)

const Store = {
    /**
     * Professional UUID Generator
     */
    generateUUID() {
        if (typeof crypto !== 'undefined' && crypto.randomUUID) {
            return crypto.randomUUID();
        }
        // Fallback for older browsers
        return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
            const r = Math.random() * 16 | 0, v = c == 'x' ? r : (r & 0x3 | 0x8);
            return v.toString(16);
        });
    },

    /**
     * Helper to get user-prefixed key for local storage
     */
    _getPrefixedKey(key) {
        const currentUser = localStorage.getItem("currentUser");
        if (!currentUser) return key;
        try {
            const user = JSON.parse(currentUser);
            const globalKeys = ["users", "currentUser"];
            if (globalKeys.includes(key)) return key;
            return `${user.id}_${key}`;
        } catch {
            return key;
        }
    },

    /**
     * Async GET: Fetches from Supabase if authenticated, else LocalStorage
     */
    async get(key) {
        // 1. Check for Supabase Cloud Path
        const { data: { session } } = supabaseClient ? await supabaseClient.auth.getSession() : { data: { session: null } };
        
        if (session && ["tasks", "investments", "profiles"].includes(key)) {
            const { data, error } = await supabaseClient
                .from(key)
                .select('*');
            if (!error) {
                // Return first item for single-record tables
                if (["profiles"].includes(key)) return data[0] || null;
                return data;
            }
            console.error(`Supabase Fetch Error [${key}]:`, error);
        }

        // 2. Fallback to LocalStorage
        const prefixedKey = this._getPrefixedKey(key);
        const localData = localStorage.getItem(prefixedKey);
        try {
            return localData ? JSON.parse(localData) : null;
        } catch {
            return localData;
        }
    },

    /**
     * Async SET: Persists to Supabase if authenticated, else LocalStorage
     */
    async set(key, value) {
        // 1. Check for Supabase Cloud Path
        const { data: { session } } = supabaseClient ? await supabaseClient.auth.getSession() : { data: { session: null } };
        
        if (session && ["tasks", "investments", "profiles", "sessions"].includes(key)) {
            // Whitelist of valid database columns to prevent "Unknown Column" errors
            const SCHEMA = {
                tasks: ["id", "user_id", "title", "priority", "status", "subtasks", "project_id", "created_at", "updated_at"],
                sessions: ["id", "user_id", "duration", "mode", "task_id", "task_title", "created_at"],
                investments: ["id", "user_id", "symbol", "price", "quantity", "commission", "date", "notes", "type", "total", "created_at"],
                profiles: ["id", "user_id", "username", "avatar_url", "updated_at"]
            };

            const uid = session.user.id;
            const allowed = SCHEMA[key];
            
            const prepareRow = (row) => {
                const clean = { ...row, user_id: uid };
                if (allowed) {
                    for (let prop in clean) {
                        if (!allowed.includes(prop)) delete clean[prop];
                    }
                }
                return clean;
            };

            const payload = Array.isArray(value) ? value.map(prepareRow) : prepareRow(value);

            const { error } = await supabaseClient
                .from(key)
                .upsert(payload, ["profiles"].includes(key) ? { onConflict: 'user_id' } : {});
            
            if (error) {
                console.error(`Supabase Upsert Error [${key}]:`, error);
            } else {
                return; // Successfully persisted to cloud
            }
        }

        // 2. Fallback to LocalStorage
        const prefixedKey = this._getPrefixedKey(key);
        const stringValue = JSON.stringify(value);
        localStorage.setItem(prefixedKey, stringValue);
    },

    /**
     * Async REMOVE: Deletes from Supabase if authenticated, else LocalStorage
     */
    async remove(key, id = null) {
        // 1. Check for Supabase Cloud Path
        const { data: { session } } = supabaseClient ? await supabaseClient.auth.getSession() : { data: { session: null } };
        
        if (session && id && ["tasks", "investments", "sessions"].includes(key)) {
            const { error } = await supabaseClient
                .from(key)
                .delete()
                .eq('id', id);
            
            if (error) {
                console.error(`Supabase Delete Error [${key}]:`, error);
            }
        }

        // 2. Local Hygiene (Focus on array-based collections)
        const prefixedKey = this._getPrefixedKey(key);
        if (id && ["tasks", "investments", "sessions"].includes(key)) {
            const current = await this.get(key); // Use this.get() for consistent prefixed decryption
            if (Array.isArray(current)) {
                const updated = current.filter(item => item.id !== id);
                localStorage.setItem(prefixedKey, JSON.stringify(updated));
                return;
            }
        }

        // Fallback for non-array items or global removal
        localStorage.removeItem(prefixedKey);
    },

    clear() {
        return localStorage.clear();
    }
};
