'use strict';

/**
 * Aether SPA Foundation - View Manager & Application Bootstrapping
 */

const ViewManager = {
  currentView: null,
  viewShell: null,

  init() {
    this.viewShell = document.getElementById('view-shell');
    this.initNavigation();
    console.log('Aether: ViewManager initialized.');
  },

  initNavigation() {
    const links = document.querySelectorAll('.sidebar__link');
    links.forEach((link) => {
      link.onclick = (e) => {
        const view = link.dataset.view;
        if (view) this.loadView(view);
      };
    });
  },

  async loadView(viewId) {
    console.log(`Aether: Loading view [${viewId}]...`);

    try {
      // 1. Fetch Fragment
      const response = await fetch(`./views/${viewId}.html`);
      if (!response.ok) throw new Error(`View not found: ${viewId}`);
      const html = await response.text();

      // 2. Inject HTML
      this.viewShell.innerHTML = html;
      this.currentView = viewId;

      // 3. Update Sidebar & Header Activity
      document.querySelectorAll('.sidebar__link').forEach((l) => {
        l.classList.toggle('active', l.dataset.view === viewId);
      });
      const headerTitle = document.getElementById('header-view-title');
      if (headerTitle) headerTitle.textContent = viewId.charAt(0).toUpperCase() + viewId.slice(1);

      // 4. Initialize View-Specific Logic
      this.bootstrapView(viewId);
    } catch (err) {
      console.error('View Loader Error:', err);
      this.viewShell.innerHTML = `<div class="p-10 text-center"><p class="text-rose-400">Failed to load ${viewId}. Please try again.</p></div>`;
    }
  },

  bootstrapView(viewId) {
    // Map of view IDs to their respective init functions
    const initMap = {
      dashboard: () => {
        if (typeof updateQuote === 'function') updateQuote();
        if (typeof renderDashboardTasks === 'function') renderDashboardTasks();
        if (typeof initDashboardTimer === 'function')
          window.initDashboardTimer();
        if (typeof updateSummary === 'function') updateSummary();
        
        // Update Greeting Card
        const greetingText = typeof getGreeting === 'function' ? getGreeting() : "Welcome";
        const dashGreeting = document.getElementById('dash-greeting-text');
        if (dashGreeting) dashGreeting.textContent = greetingText;

        // Dynamic Styling for Card Glow based on time
        const hour = new Date().getHours();
        const glow = document.getElementById('greeting-card-glow');
        if (glow) {
            if (hour >= 5 && hour < 17) {
                glow.className = "absolute top-0 right-0 w-24 h-24 bg-amber-500/10 rounded-full blur-2xl -translate-y-1/2 translate-x-1/2";
            } else {
                glow.className = "absolute top-0 right-0 w-24 h-24 bg-indigo-500/20 rounded-full blur-2xl -translate-y-1/2 translate-x-1/2";
            }
        }
        
        // Update profile UI to show real username
        if (
          typeof Auth !== 'undefined' &&
          typeof Auth.updateProfileUI === 'function'
        )
          Auth.updateProfileUI();
        // Add "View All" listener back after injection
        const viewAllBtn = document.getElementById('dash-view-all-tasks');
        if (viewAllBtn) viewAllBtn.onclick = () => this.loadView('tasks');
      },
      tasks: () => {
        if (typeof window.initTasks === 'function') window.initTasks();
      },
      investments: () => {
        if (typeof window.initInvestments === 'function')
          window.initInvestments();
      },
      timer: () => {
        if (typeof window.initTimer === 'function') window.initTimer();
      },
      habits: () => {
        if (typeof window.initHabits === 'function') window.initHabits();
      },
      settings: () => {
        if (typeof window.initSettings === 'function') window.initSettings();
      },
    };

    if (initMap[viewId]) initMap[viewId]();
  },
};

document.addEventListener('DOMContentLoaded', async () => {
  console.log('Aether Hub: Booting security layer...');

  // 1. Initialize Auth (Now Async)
  initAuthEventListeners();
  await Auth.init();

  // 2. Initialize UI & View Layer
  ViewManager.init();
  if (typeof window.loadProfileSettings === 'function')
    window.loadProfileSettings();

  // 3. Load Initial View
  const isAuth = await Auth.isAuthenticated();
  if (isAuth) {
    ViewManager.loadView('dashboard');
  }
});

/**
 * Global Keyboard Listeners (Ctrl+K palette, Esc)
 */
document.addEventListener('keydown', (e) => {
  if (e.ctrlKey && e.key === 'k') {
    e.preventDefault();
    console.log('Command Palette: Opening...');
  }

  // Close modals with ESC key
  if (e.key === 'Escape') {
    const modals = document.querySelectorAll('.modal-overlay.open');
    modals.forEach((modal) => {
      modal.classList.remove('open');
    });
  }
});

/**
 * Authentication & Identity Logic (Shell-persistent)
 */
function initAuthEventListeners() {
  const navLoginBtn = document.getElementById('nav-login-btn');
  const navRegisterBtn = document.getElementById('nav-register-btn');
  const loginForm = document.getElementById('login-form');
  const registerForm = document.getElementById('register-form');
  const authHeader = document.getElementById('auth-context-header');

  function showAuthTab(type) {
    if (type === 'register') {
      loginForm?.classList.add('hidden');
      registerForm?.classList.remove('hidden');
      navRegisterBtn?.classList.add('bg-white', 'text-zinc-950', 'shadow-lg');
      navLoginBtn?.classList.remove('bg-white', 'text-zinc-950', 'shadow-lg');
      if (authHeader)
        authHeader.innerHTML = `
                <h2 class="text-3xl font-bold text-zinc-100 tracking-tight">Join Aether</h2>
                <p class="text-base text-muted mt-2">Create your private local workspace</p>
            `;
    } else {
      registerForm?.classList.add('hidden');
      loginForm?.classList.remove('hidden');
      navLoginBtn?.classList.add('bg-white', 'text-zinc-950', 'shadow-lg');
      navRegisterBtn?.classList.remove(
        'bg-white',
        'text-zinc-950',
        'shadow-lg'
      );
      if (authHeader)
        authHeader.innerHTML = `
                <h2 class="text-3xl font-bold text-zinc-100 tracking-tight">Welcome Back</h2>
                <p class="text-base text-muted mt-2">Sign in to your productivity hub</p>
            `;
    }
  }

  navLoginBtn?.addEventListener('click', () => showAuthTab('login'));
  navRegisterBtn?.addEventListener('click', () => showAuthTab('register'));

  // Social Login Triggers
  document.getElementById('google-login-btn')?.addEventListener('click', async () => {
    try {
        await Auth.signInWithGoogle();
    } catch (err) {
        alert("Google Login failed: " + err.message);
    }
  });

  loginForm?.addEventListener('submit', async (e) => {
    e.preventDefault();
    const user = document.getElementById('login-username').value;
    const pass = document.getElementById('login-password').value;
    try {
      await Auth.login(user, pass);
      window.location.reload();
    } catch (err) {
      alert(err.message);
    }
  });

  registerForm?.addEventListener('submit', async (e) => {
    e.preventDefault();
    const user = document.getElementById('register-username').value;
    const pass = document.getElementById('register-password').value;
    try {
      await Auth.register(user, pass);
      window.location.reload();
    } catch (err) {
      alert(err.message);
    }
  });

  const logoutBtn = document.getElementById('logout-btn');
  if (logoutBtn) {
    logoutBtn.onclick = () => {
      if (confirm('Are you sure you want to logout?')) Auth.logout();
    };
  }
}
