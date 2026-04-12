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

  register(username, password) {
    const users = Store.get("users") || [];
    if (users.find((u) => u.username.toLowerCase() === username.toLowerCase())) {
      throw new Error("Username already taken");
    }

    const newUser = {
      id: "user_" + Date.now(),
      username,
      password,
      createdAt: Date.now(),
    };

    users.push(newUser);
    Store.set("users", users);
    return this.login(username, password);
  },

  login(username, password) {
    const users = Store.get("users") || [];
    const user = users.find(
      (u) =>
        u.username.toLowerCase() === username.toLowerCase() &&
        u.password === password
    );

    if (!user) throw new Error("Invalid username or password");

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
