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
}

export const useEventStore = defineStore('events', {
  state: () => ({
    events: [] as CalendarEvent[],
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

    async importEvents(events: Omit<CalendarEvent, 'id'>[]) {
      const auth = useAuthStore();
      try {
        const eventsWithUser = events.map(e => ({
          ...e,
          user_id: auth.session?.user?.id
        }));
        
        const { error } = await supabase
          .from('calendar')
          .insert(eventsWithUser);

        if (error) throw error;
        await this.fetchEvents();
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
    }
  }
});
