import { defineStore } from 'pinia';
import { apiClient } from '@/utils/api';

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
      if (this.isFetching) return;
      this.isFetching = true;
      try {
        const data = await apiClient('/calendar');
        this.events = data || [];
        this.isLoaded = true;
      } catch (err) {
        console.error('Failed to fetch events:', err);
      } finally {
        this.isFetching = false;
      }
    },

    async addEvent(event: Omit<CalendarEvent, 'id'>) {
      try {
        const newEvent = await apiClient('/calendar', {
          method: 'POST',
          body: JSON.stringify(event)
        });
        this.events.push(newEvent);
        return newEvent;
      } catch (err) {
        console.error('Failed to add event:', err);
        throw err;
      }
    },

    async importEvents(events: Omit<CalendarEvent, 'id'>[]) {
      try {
        const result = await apiClient('/calendar/batch', {
          method: 'POST',
          body: JSON.stringify({ events })
        });
        await this.fetchEvents();
        return result;
      } catch (err) {
        console.error('Failed to import events:', err);
        throw err;
      }
    },

    async deleteEvent(id: string) {
      try {
        await apiClient(`/calendar/${id}`, { method: 'DELETE' });
        this.events = this.events.filter(e => e.id !== id);
      } catch (err) {
        console.error('Failed to delete event:', err);
      }
    }
  }
});
