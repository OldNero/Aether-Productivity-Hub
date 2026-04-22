import { defineStore } from 'pinia';

export type ThemeMode = 'light' | 'dark' | 'system' | 'tones';

export const useThemeStore = defineStore('theme', {
  state: () => ({
    mode: (localStorage.getItem('theme-preference') as ThemeMode) || 'system',
  }),
  getters: {
    logoUrl(state): string {
      const base = import.meta.env.BASE_URL;
      if (state.mode === 'tones') return `${base}favicon-tones.png`;
      if (state.mode === 'light') return `${base}favicon-light.png`;
      if (state.mode === 'system') {
        const isDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
        return isDark ? `${base}favicon.png` : `${base}favicon-light.png`;
      }
      return `${base}favicon.png`;
    }
  },
  actions: {
    setTheme(newMode: ThemeMode) {
      this.mode = newMode;
      localStorage.setItem('theme-preference', newMode);
      this.applyTheme();
    },
    applyTheme() {
      const html = document.documentElement;
      html.classList.remove('light', 'dark', 'tones');

      if (this.mode === 'tones') {
        html.classList.add('tones');
        html.style.colorScheme = 'light';
        return;
      }

      const isDark = 
        this.mode === 'dark' || 
        (this.mode === 'system' && window.matchMedia('(prefers-color-scheme: dark)').matches);
      
      if (isDark) {
        html.classList.add('dark');
        html.style.colorScheme = 'dark';
      } else {
        html.classList.add('light');
        html.style.colorScheme = 'light';
      }

      this.updateFavicon();
    },
    updateFavicon() {
      const link = document.querySelector("link[rel~='icon']") as HTMLLinkElement;
      if (link) {
        link.href = this.logoUrl;
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
