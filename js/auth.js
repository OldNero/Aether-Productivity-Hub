"use strict";

/**
 * Authentication & Profile System
 */
const Auth = {
  /**
   * Check if a Supabase session exists
   */
  async isAuthenticated() {
    if (!supabase) return !!localStorage.getItem("currentUser");
    const { data: { session } } = await supabase.auth.getSession();
    return !!session;
  },

  async getCurrentUser() {
    if (!supabase) {
        try { return JSON.parse(localStorage.getItem("currentUser")); } catch { return null; }
    }
    const { data: { user } } = await supabase.auth.getUser();
    return user ? { id: user.id, username: user.user_metadata.username || user.email.split('@')[0] } : null;
  },

  /**
   * Transitionary helper to use usernames as Supabase identifiers
   */
  _toEmail(username) {
    return `${username.toLowerCase()}@aether.local`;
  },

  async register(username, password) {
    if (!supabase) {
        throw new Error("Supabase not configured. Please add keys to config.js.");
    }

    const { data, error } = await supabase.auth.signUp({
      email: this._toEmail(username),
      password: password,
      options: {
        data: { username: username }
      }
    });

    if (error) throw error;
    return data.user;
  },

  async login(username, password) {
    if (!supabase) {
        // Legacy fallback for development before keys are added
        const users = await Store.get("users") || [];
        const user = users.find(u => u.username.toLowerCase() === username.toLowerCase());
        if (user && user.password === password) { // Simple check for legacy
            const session = { id: user.id, username: user.username };
            localStorage.setItem("currentUser", JSON.stringify(session));
            return session;
        }
        throw new Error("Legacy login failed. Please configure Supabase.");
    }

    const { data, error } = await supabase.auth.signInWithPassword({
      email: this._toEmail(username),
      password: password,
    });

    if (error) throw error;
    
    const session = {
      id: data.user.id,
      username: data.user.user_metadata.username || username,
    };
    localStorage.setItem("currentUser", JSON.stringify(session));
    return session;
  },

  async signInWithGoogle() {
    if (!supabase) throw new Error("Supabase not configured.");
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: window.location.origin
      }
    });
    if (error) throw error;
  },

  async logout() {
    if (supabase) await supabase.auth.signOut();
    localStorage.removeItem("currentUser");
    window.location.href = window.location.pathname;
  },

  async init() {
    const isAuth = await this.isAuthenticated();
    if (!isAuth) {
      document.body.classList.add("auth-required");
      this.showAuthOverlay();
    } else {
      document.body.classList.remove("auth-required");
      document.getElementById("auth-overlay")?.classList.remove("open");
      await this.updateProfileUI();
    }
  },

  showAuthOverlay() {
    const overlay = document.getElementById("auth-overlay");
    if (overlay) {
      overlay.classList.add("open");
      overlay.style.opacity = "1";
      overlay.style.pointerEvents = "auto";
    }
  },

  async updateProfileUI() {
    const user = await this.getCurrentUser();
    if (!user) return;

    // Header Display
    const display = document.getElementById("user-name-display");
    if (display) display.textContent = `Welcome back, ${user.username}`;
    
    // Sidebar Display
    const sidebarDisplay = document.getElementById("user-name-display-sidebar");
    if (sidebarDisplay) {
        sidebarDisplay.textContent = user.username;
        sidebarDisplay.classList.remove('italic');
    }

    // Dashboard Greeting Card
    const dashName = document.getElementById("dash-user-name");
    if (dashName) dashName.textContent = user.username;
    
    // Avatar
    const avatar = document.getElementById("sidebar-user-avatar");
    if (avatar) avatar.textContent = user.username.charAt(0).toUpperCase();
  }
};
