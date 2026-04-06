<p align="center">
  <img src="https://img.shields.io/badge/Status-In%20Progress-blueviolet?style=for-the-badge" />
  <img src="https://img.shields.io/badge/Pure-HTML%20%7C%20CSS%20%7C%20JS-f7df1e?style=for-the-badge&logo=javascript&logoColor=black" />
  <img src="https://img.shields.io/badge/Purpose-Learning-10b981?style=for-the-badge" />
</p>

<h1 align="center">✦ Aether Productivity Hub</h1>

<p align="center">
  <em>A centralized productivity dashboard built from scratch with vanilla JavaScript.</em><br/>
  <em>No frameworks. No libraries. Just the raw language.</em>
</p>

---

> 📚 **This is a personal learning project.** Built to master core JavaScript concepts through hands-on practice — from DOM manipulation to async APIs. Not intended for production use.

---

## 🖼️ Preview

| Dashboard | Timer |
|-----------|-------|
| Dark glassmorphism UI with stat cards, task list, exchange rate widget | Circular SVG progress ring with session history |

## ✨ Features

### 📋 Task Management
- Create, edit, delete, and complete tasks
- Priority levels — 🔴 High · 🟡 Medium · 🟢 Low
- Filter by status (All / Active / Completed)
- Search tasks in real-time

### 💰 Investment Tracker
- Track ETF holdings in SAR (🇸🇦) and USD (🇺🇸)
- Live currency conversion with exchange rate API
- Portfolio summary with total value calculations

### ⏱️ Coding Timer
- Stopwatch with start / pause / reset controls
- Circular SVG progress ring animation
- Session history log with timestamps

### ⚡ Extras
- 🔍 Command palette (`Ctrl + K`) for quick navigation
- 💬 Quote of the Day via public API
- 💾 LocalStorage persistence — data survives refresh
- 🌙 Dark glassmorphism design with indigo-violet accents
- 📱 Fully responsive (desktop → tablet → mobile)
- ⌨️ Keyboard shortcuts throughout

## 🧠 JS Concepts Practiced

This project is structured in phases to progressively cover JavaScript fundamentals:

| Phase | Concepts | Where It Shows Up |
|-------|----------|-------------------|
| **1 — Core Engine** | `let`/`const`, objects, arrays, arrow functions, destructuring, spread operator, template literals | `store.js`, `settings.js`, `utils.js` |
| **2 — Interface** | `createElement`, event listeners, event delegation, form validation, keyboard events, modals | `app.js`, `tasks.js`, `investments.js` |
| **3 — Advanced** | `fetch`, `async/await`, Promises, `try/catch`, `localStorage`, `.map()`, `.filter()`, `.reduce()` | `api.js`, `store.js`, `tasks.js` |

## 🏗️ Project Structure

```
Aether-Productivity-Hub/
├── index.html          # Single-page app shell (5 views, 3 modals, command palette)
├── css/
│   └── styles.css      # Full design system (~900 lines, 60+ CSS variables)
├── js/
│   ├── app.js          # Bootstrap, router, keyboard shortcuts
│   ├── store.js        # LocalStorage persistence layer
│   ├── settings.js     # User preferences (name, currency, theme)
│   ├── tasks.js        # Task CRUD + filtering + rendering
│   ├── investments.js  # ETF tracker + currency conversion
│   ├── timer.js        # Stopwatch + session history
│   ├── api.js          # Fetch wrappers (currency rate + quotes)
│   └── utils.js        # Shared helpers (time, currency, IDs)
└── README.md
```

## 🚀 Getting Started

```bash
# Clone the repo
git clone https://github.com/OldNero/Aether-Productivity-Hub.git
cd Aether-Productivity-Hub

# Serve locally (any static server works)
npx http-server . -p 8080

# Open in browser
# → http://localhost:8080
```

## 🎨 Design System

| Token | Value |
|-------|-------|
| Background | `#090b10` → `#0f1219` → `#161b27` |
| Accent | `#6366f1` (indigo) → `#8b5cf6` (violet) |
| Cards | Glassmorphism — `backdrop-filter: blur(12px)` |
| Font (UI) | [Inter](https://fonts.google.com/specimen/Inter) |
| Font (Mono) | [JetBrains Mono](https://fonts.google.com/specimen/JetBrains+Mono) |

---

<p align="center">
  Built with ☕ and curiosity by <a href="https://github.com/OldNero">@OldNero</a>
</p>
