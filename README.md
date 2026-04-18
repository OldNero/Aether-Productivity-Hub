<p align="center">
  <img src="https://img.shields.io/badge/Stack-Vue%203%20%7C%20Hono%20%7C%20D1-6366f1?style=for-the-badge" />
  <img src="https://img.shields.io/badge/Runtime-Cloudflare%20Workers-f38020?style=for-the-badge&logo=cloudflare&logoColor=white" />
  <img src="https://img.shields.io/badge/License-PolyForm%20Noncommercial-blue?style=for-the-badge" />
</p>

<h1 align="center">✦ Aether Productivity Hub</h1>

<p align="center">
  <em>A high-performance, cloud-synced productivity engine built with Vue 3 and Cloudflare Edge.</em><br/>
  <em>Designed for privacy, speed, and deep work. No trackers. No fluff.</em>
</p>

---

Aether is a unified productivity dashboard that consolidates task management, portfolio tracking, and focus analytics into a single, glassmorphism-inspired interface. Originally a vanilla JS learning project, it has evolved into a robust full-stack application leveraging the power of the Cloudflare Edge.

## 🏗️ Architecture

```mermaid
graph TD
    User((User))
    
    subgraph "Frontend (Cloudflare Pages)"
        Vue[Vue 3 + Vite]
        Pinia[Pinia Store]
        Tailwind[Tailwind CSS 4]
    end
    
    subgraph "Backend (Cloudflare Workers)"
        Hono[Hono API Framework]
        Lucia[Lucia Auth]
        D1[(Cloudflare D1 SQL)]
    end
    
    User <--> Vue
    Vue <--> Pinia
    Pinia <--> Hono
    Hono <--> Lucia
    Hono <--> D1
```

## ✨ Core Pillars

### 📋 Routines (Tasks & Habits)
- **Unified Flow**: Manage one-off tasks and recurring daily rituals in a single view.
- **Priority Matrix**: Visual indicators for 🔴 High, 🟡 Medium, and 🟢 Low impact work.
- **Cloud Sync**: Real-time synchronization across all devices via D1 SQL.

### 💰 Portfolio (Investment Tracker)
- **Real-Time Quotes**: Live market data integrated via Finnhub and Alpha Vantage.
- **Visual Analytics**: Interactive area charts powered by **Chart.js**.
- **Privacy First**: API keys are stored in your encrypted user profile, not tracked by the platform.

### 📅 Chronos (Calendar Integration)
- **Unified Schedule**: Manage local events and import external schedules.
- **.ics Support**: Lightweight parser to import Google Calendar or Outlook events directly.
- **Visual Heatmap**: Quick overview of your upcoming week at a glance.

### ⏱️ Deep Work (Focus Timer)
- **Pomodoro Engine**: Customizable focus and rest cycles.
- **Focus Analytics**: Automatically logs sessions to track your "Flow" over time.
- **Circular Progress**: Sleek SVG-based timer widget on the dashboard.

## 🛠️ Tech Stack

- **Frontend**: Vue 3 (Composition API) + Vite + Pinia
- **Backend**: Hono (TypeScript) + Cloudflare Workers
- **Database**: Cloudflare D1 (SQLite)
- **Authentication**: Lucia Auth (Session-based)
- **Styling**: Tailwind CSS 4 + Headless UI + Glassmorphism components
- **Charting**: Chart.js 4

## 🚀 Getting Started

### Backend Setup (Workers)
```bash
cd backend
npm install
# Initialize D1 database locally
npm run db:init
# Start local development server
npm run dev
```

### Frontend Setup (Vite)
```bash
# From the root directory
npm install
# Create environment file
cp .env.example .env
# Start development server
npm run dev
```

> [!IMPORTANT]
> **API Keys Required**: To enable market data, you must provide your own API keys for Finnhub and Alpha Vantage in the **Settings** page within the app.

## ⚖️ License & Privacy

This project is licensed under the **PolyForm Noncommercial License 1.0.0**. It is free for personal use but requires consent for commercial monetization. 

Aether is built with privacy as a core principle. Your data stays in your dedicated D1 instance, and your API keys are encrypted at rest.

---

<p align="center">
  Built with ☕ and curiosity by <a href="https://github.com/OldNero">@OldNero</a>
</p>
