"use strict";

/**
 * Authentication & Profile System
 */
const Auth = {
  isAuthenticated() {
    return !!localStorage.getItem("currentUser");
  },

  getCurrentUser() {
    try {
      return JSON.parse(localStorage.getItem("currentUser"));
    } catch {
      return null;
    }
  },

  /**
   * Securely hash a password using SHA-256
   */
  async hashPassword(password) {
    const msgUint8 = new TextEncoder().encode(password);
    const hashBuffer = await crypto.subtle.digest('SHA-256', msgUint8);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
  },

  async register(username, password) {
    const users = Store.get("users") || [];
    if (users.find((u) => u.username.toLowerCase() === username.toLowerCase())) {
      throw new Error("Username already taken");
    }

    const hashedPassword = await this.hashPassword(password);

    const newUser = {
      id: "user_" + Date.now(),
      username,
      password: hashedPassword, // Store SHA-256 hash
      createdAt: Date.now(),
    };

    users.push(newUser);
    Store.set("users", users);
    return await this.login(username, password);
  },

  async login(username, password) {
    const users = Store.get("users") || [];
    const hashedPassword = await this.hashPassword(password);
    
    // Find user by username
    const userIndex = users.findIndex(u => u.username.toLowerCase() === username.toLowerCase());
    if (userIndex === -1) throw new Error("Invalid username or password");
    
    const user = users[userIndex];

    // 1. Check if hashed passwords match (Current Standard)
    if (user.password === hashedPassword) {
      return this._createSession(user);
    }

    // 2. LAZY MIGRATION: Check if plain-text password matches (Legacy)
    if (user.password === password) {
      console.warn("Aether: Legacy plain-text password detected. Migrating to SHA-256...");
      user.password = hashedPassword;
      users[userIndex] = user;
      Store.set("users", users); // Commit the hashed version
      return this._createSession(user);
    }

    throw new Error("Invalid username or password");
  },

  _createSession(user) {
    const session = {
      id: user.id,
      username: user.username,
    };
    localStorage.setItem("currentUser", JSON.stringify(session));
    return session;
  },

  logout() {
    localStorage.removeItem("currentUser");
    window.location.href = window.location.pathname; // Hard redirect to clear all JS state
  },

  init() {
    if (!this.isAuthenticated()) {
      document.body.classList.add("auth-required");
      this.showAuthOverlay();
    } else {
      document.body.classList.remove("auth-required");
      document.getElementById("auth-overlay")?.classList.remove("open");
      this.updateProfileUI();
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

  updateProfileUI() {
    const user = this.getCurrentUser();
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
