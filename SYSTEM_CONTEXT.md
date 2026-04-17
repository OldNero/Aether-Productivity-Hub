# Aether Productivity Hub: Technical & Functional Specification

This document provides a comprehensive overview of the **Aether Productivity Hub** architecture, features, and design philosophy for use in cross-tool development and AI context loading.

---

## 🏗️ Core Architecture (Self-Hosted Cloudflare)

Aether is built using a modern, serverless, full-stack architecture optimized for low-latency and high security.

### 1. Frontend: Vue 3 Single Page Application (SPA)
- **Framework**: Vue 3 (Composition API) with Vite.
- **State Management**: Pinia (Reactive store architecture).
- **Routing**: Vue Router for modular navigation.
- **Design System**: Pure Vanilla CSS implementation using CSS Variables for a "Glassmorphism" design system. No external UI libraries (like Tailwind or Bootstrap) are used to allow maximum performance and design control.

### 2. Backend API: Hono on Cloudflare Workers
- **Runtime**: Cloudflare Workers (Edge computing).
- **API Framework**: Hono v4 (Minimalist, typed web framework).
- **Security**: Lucia Auth v3 for session-based authentication.
- **Cryptography**: Custom Worker-safe implementation utilizing standard `WebCrypto` (PBKDF2) for password hashing, ensuring zero dependencies on native Node.js binaries.

### 3. Database: Cloudflare D1 (Serverless SQLite)
- **Engine**: SQLite / Cloudflare D1.
- **Schema Management**: Relational schema with Foreign Key integrity across users and all data modules.

---

## 🎨 Design Philosophy & UX
- **Theme**: "Aether" (Deep Slate #030712 background).
- **Visual Style**: Premium Glassmorphism. High use of `backdrop-filter: blur()`, vibrant HSL-curated gradients, and subtle borders.
- **Interaction**: Micro-animations for feedback, smooth page transitions, and a focus on "Visual Excellence."

---

## 🧩 Functional Modules

### 1. Unified Routines System (`/routines`)
- **Focus List**: A sophisticated task manager with priority mapping (High, Medium, Low).
- **Consistency Canvas**: A rituals/habits tracker that monitors streaks and completion over time.
- **Interconnect**: Tasks can be linked to focus sessions for granular time-tracking.

### 2. Investment Ledger (`/investments`)
- **Portfolio Tracker**: Detailed management of diversified holdings (Stocks, Crypto, etc.).
- **Data Points**: Tracks symbol, purchase price, quantity, commission fees, and acquisition dates.
- **Analytics**: Calculates live snapshots and historical growth.

### 3. Focus Timer (`/timer`)
- **Pomodoro Engine**: Customizable durations for focus and break intervals.
- **Task Binding**: Select a specific task from your Focus List to attribute time spent.
- **Statistics**: Automatically logs focus sessions into the D1 database for analytics.

### 4. Dashboards & Analytics
- **Dashboard (`/`)**: A high-level view showing the current status of all major modules in one glance.
- **Analytics (`/analytics`)**: Detailed charts and data insights using modern visualization techniques to track habits, tasks, and portfolio performance.

---

## 🔐 Authentication & Data Privacy
- **Lucia Auth**: Handles standard email/password registration and login.
- **Session-Based**: Secure, rotating session cookies (`SameSite: None; Secure`) configured for cross-origin communication between the Workers and Pages domains.
- **Schema Safety**: Cascading deletions and strict relational constraints ensure data integrity across all user-owned records.

---

## 🏁 Technical Metadata for AI Routing
- **Primary Source Path**: `/src` (Frontend) and `/backend` (API/Workers).
- **Configuration**: `wrangler.toml` for backend/infrastructure; `.env` for vite build-time variables.
- **Dependencies**: Lucia, Hono, D1, Vue 3, Pinia.
