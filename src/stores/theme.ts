import { defineStore } from 'pinia';

export type ThemeMode = 'light' | 'dark' | 'system';

export const useThemeStore = defineStore('theme', {
  state: () => ({
    mode: (localStorage.getItem('theme-preference') as ThemeMode) || 'system',
  }),
  actions: {
    setTheme(newMode: ThemeMode) {
      this.mode = newMode;
      localStorage.setItem('theme-preference', newMode);
      this.applyTheme();
    },
    applyTheme() {
      const html = document.documentElement;
      const isDark = 
        this.mode === 'dark' || 
        (this.mode === 'system' && window.matchMedia('(prefers-color-scheme: dark)').matches);
      
      if (isDark) {
        html.classList.add('dark');
        html.classList.remove('light');
        html.style.colorScheme = 'dark';
      } else {
        html.classList.add('light');
        html.classList.remove('dark');
        html.style.colorScheme = 'light';
      }
    },
    init() {
      this.applyTheme();
      // Listen for system changes
      window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', () => {
        if (this.mode === 'system') this.applyTheme();
      });
    }
  }
});
