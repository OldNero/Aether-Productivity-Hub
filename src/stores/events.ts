import { defineStore } from 'pinia';
import { supabase } from '@/utils/supabase';
import { useAuthStore } from './auth';

export interface CalendarEvent {
  id: string;
  title: string;
  description: string;
  start_time: string;
  end_time: string;
  location: string;
  color: string;
  user_id?: string;
  import_id?: string;
}

export interface CalendarImport {
  id: string;
  filename: string;
  event_count: number;
  content_hash: string;
  created_at: string;
  user_id: string;
}

export const useEventStore = defineStore('events', {
  state: () => ({
    events: [] as CalendarEvent[],
    imports: [] as CalendarImport[],
    isLoaded: false,
    isFetching: false,
  }),
  actions: {
    async fetchEvents() {
      const auth = useAuthStore();
      if (!auth.session?.user) {
        this.events = [];
        this.isLoaded = true;
        return;
      }
      
      if (this.isFetching) return;
      this.isFetching = true;
      try {
        const { data, error } = await supabase
          .from('calendar')
          .select('*')
          .eq('user_id', auth.session.user.id)
          .order('start_time', { ascending: true });

        if (error) throw error;
        this.events = data || [];
        this.isLoaded = true;
      } catch (err) {
        console.error('Failed to fetch events:', err);
      } finally {
        this.isFetching = false;
      }
    },

    async fetchImports() {
      const auth = useAuthStore();
      if (!auth.session?.user) {
        this.imports = [];
        return;
      }

      try {
        const { data, error } = await supabase
          .from('calendar_imports')
          .select('*')
          .eq('user_id', auth.session.user.id)
          .order('created_at', { ascending: false });

        if (error) throw error;
        this.imports = data || [];
      } catch (err) {
        console.error('Failed to fetch imports:', err);
      }
    },

    async addEvent(event: Omit<CalendarEvent, 'id'>) {
      const auth = useAuthStore();
      try {
        const { data: newEvent, error } = await supabase
          .from('calendar')
          .insert({
            ...event,
            user_id: auth.session?.user?.id
          })
          .select()
          .single();

        if (error) throw error;
        if (newEvent) {
          this.events.push(newEvent);
        }
        return newEvent;
      } catch (err) {
        console.error('Failed to add event:', err);
        throw err;
      }
    },

    async importEvents(filename: string, events: Omit<CalendarEvent, 'id' | 'import_id'>[], hash?: string) {
      const auth = useAuthStore();
      try {
        // 0. Check for existing hash if provided
        if (hash) {
            const { data: existing } = await supabase
                .from('calendar_imports')
                .select('id')
                .eq('user_id', auth.session?.user?.id)
                .eq('content_hash', hash)
                .limit(1);
            
            if (existing && existing.length > 0) {
                throw new Error('DUPLICATE_IMPORT');
            }
        }

        // 1. Create the import record
        const { data: importRecord, error: importError } = await supabase
          .from('calendar_imports')
          .insert({
            filename,
            event_count: events.length,
            content_hash: hash || null,
            user_id: auth.session?.user?.id
          })
          .select()
          .single();

        if (importError) throw importError;

        // 2. Insert the events with the import_id
        const eventsWithMetadata = events.map(e => ({
          ...e,
          user_id: auth.session?.user?.id,
          import_id: importRecord.id
        }));
        
        const { error: eventsError } = await supabase
          .from('calendar')
          .insert(eventsWithMetadata);

        if (eventsError) throw eventsError;

        // 3. Refresh state
        await Promise.all([
          this.fetchEvents(),
          this.fetchImports()
        ]);
        
        return true;
      } catch (err) {
        console.error('Failed to import events:', err);
        throw err;
      }
    },

    async deleteEvent(id: string) {
      try {
        const { error } = await supabase.from('calendar').delete().eq('id', id);
        if (error) throw error;
        this.events = this.events.filter(e => e.id !== id);
      } catch (err) {
        console.error('Failed to delete event:', err);
      }
    },

    async deleteImport(importId: string) {
      try {
        const { error } = await supabase
          .from('calendar_imports')
          .delete()
          .eq('id', importId);

        if (error) throw error;
        
        this.events = this.events.filter(e => e.import_id !== importId);
        this.imports = this.imports.filter(i => i.id !== importId);
      } catch (err) {
        console.error('Failed to delete import:', err);
        throw err;
      }
    }
  }
});
