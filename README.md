<p align="center">
  <img src="https://img.shields.io/badge/Status-Cloud%20Ready-10b981?style=for-the-badge" />
  <img src="https://img.shields.io/badge/Stack-HTML%20%7C%20CSS%20%7C%20JS%20%7C%20Supabase-6366f1?style=for-the-badge&logo=supabase&logoColor=white" />
  <img src="https://img.shields.io/badge/Auth-Google%20OAuth-4285F4?style=for-the-badge&logo=google&logoColor=white" />
  <img src="https://img.shields.io/badge/Purpose-Learning-f7df1e?style=for-the-badge" />
</p>

<h1 align="center">✦ Aether Productivity Hub</h1>

<p align="center">
  <em>A cloud-backed productivity dashboard built from scratch with vanilla JavaScript.</em><br/>
  <em>No frontend frameworks. Powered by Supabase + Google OAuth.</em>
</p>

---

> 📚 **This is a personal learning project.** Built to master core JavaScript concepts through hands-on practice — from DOM manipulation to async cloud APIs. Evolved from a local-only prototype to a fully cloud-synchronized application.

---

## 🖼️ Preview

| Dashboard | Portfolio |
|-----------|-----------|
| Dark glassmorphism UI with stat cards, task list, timer widget | Real-time stock tracking with market movers & area chart |

## ✨ Features

### 🔐 Authentication
- **Google OAuth** — One-tap social login via Supabase Auth
- **Email/Password** — Traditional registration with Supabase identity
- Row Level Security (RLS) — strict per-user data isolation

### 📋 Task Management (Focus List)
- Create, edit, delete, and complete tasks
- Priority levels — 🔴 High · 🟡 Medium · 🟢 Low
- Filter by status (All / Active / Completed)
- Cloud-synced via Supabase with UUID identifiers

### 💰 Investment Tracker (Portfolio)
- Track stock positions with buy/sell transactions
- Live market prices via Alpha Vantage API (12-hour cache)
- Market Movers — top gainers & losers via batch endpoint (1 API call/day)
- Portfolio area chart with real-time gain/loss calculations
- Commission tracking and realized/unrealized P&L

### ⏱️ Focus Timer
- Stopwatch with start / pause / reset controls
- Circular SVG progress ring animation
- Session history persisted to cloud

### ⚡ Extras
- 🔍 Command palette (`Ctrl + K`) for quick navigation
- 💬 Quote of the Day via API Ninjas
- ☁️ Hybrid storage — Supabase when authenticated, localStorage fallback
- 🌙 Dark glassmorphism design with Geist typography
- 📱 Fully responsive (desktop → tablet → mobile)
- 💀 Skeleton loading states for async data

## 🧠 JS Concepts Practiced

| Phase | Concepts | Where It Shows Up |
|-------|----------|-------------------|
| **1 — Core Engine** | `let`/`const`, objects, arrays, arrow functions, destructuring, spread operator, template literals | `store.js`, `settings.js`, `utils.js` |
| **2 — Interface** | `createElement`, event listeners, event delegation, form validation, keyboard events, modals | `app.js`, `tasks.js`, `investments.js` |
| **3 — Async & APIs** | `fetch`, `async/await`, Promises, `Promise.all`, `try/catch`, REST APIs, caching strategies | `api.js`, `store.js`, `tasks.js` |
| **4 — Cloud & Auth** | Supabase SDK, OAuth 2.0, JWT sessions, Row Level Security, UUID generation, hybrid persistence | `store.js`, `auth.js`, `config.js` |

## 🏗️ Project Structure

```
Aether-Productivity-Hub/
├── index.html            # SPA shell (auth overlay, sidebar, modals)
├── css/
│   ├── input.css         # Tailwind source + custom components
│   └── output.css        # Compiled CSS
├── js/
│   ├── app.js            # Bootstrap, view router, auth listeners
│   ├── store.js          # Hybrid storage (Supabase ↔ localStorage)
│   ├── auth.js           # Supabase Auth + Google OAuth
│   ├── config.js         # API keys & Supabase credentials (git-ignored)
│   ├── tasks.js          # Task CRUD + cloud sync
│   ├── investments.js    # Portfolio tracker + market movers
│   ├── timer.js          # Focus timer + session persistence
│   ├── api.js            # Alpha Vantage & API Ninjas wrappers
│   ├── settings.js       # User preferences (cloud-backed)
│   └── utils.js          # Shared helpers (time, currency, IDs)
├── views/
│   ├── dashboard.html    # Bento grid with stats & widgets
│   ├── tasks.html        # Focus list view
│   ├── investments.html  # Portfolio & market movers
│   ├── timer.html        # Deep work timer
│   └── settings.html     # Profile & preferences
└── README.md
```

## 🚀 Getting Started

### Prerequisites
- A free [Supabase](https://supabase.com) project
- A free [Alpha Vantage](https://www.alphavantage.co/support/#api-key) API key
- A free [API Ninjas](https://api-ninjas.com) API key

### Setup

```bash
# Clone the repo
git clone https://github.com/OldNero/Aether-Productivity-Hub.git
cd Aether-Productivity-Hub

# Install dependencies (Tailwind CLI)
npm install

# Create your config file
cp js/config.example.js js/config.js
# Then fill in your API keys and Supabase credentials

# Serve locally
npx http-server . -p 8080

# Open → http://localhost:8080
```

### Supabase Setup
1. Create a new Supabase project
2. Run the SQL from `supabase_setup.sql` in the SQL Editor
3. Enable **Google** under Authentication → Providers
4. Set Site URL to `http://localhost:8080` under Authentication → URL Configuration

## 🎨 Design System

| Token | Value |
|-------|-------|
| Background | `#09090b` (zinc-950) |
| Cards | `#111113` with `border-border` |
| Accent | White primary buttons on dark |
| Font (UI) | [Geist](https://vercel.com/font) |
| Font (Mono) | [Geist Mono](https://vercel.com/font) |
| Style | Glassmorphism + subtle gradients |

## 🔒 Security

- API keys stored in `js/config.js` (excluded via `.gitignore`)
- Supabase Row Level Security ensures data isolation per user
- Auth sessions managed by Supabase JWT — no manual token handling
- All database operations require authenticated session

---

<p align="center">
  Built with ☕ and curiosity by <a href="https://github.com/OldNero">@OldNero</a>
</p>
