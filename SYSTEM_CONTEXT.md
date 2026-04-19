# Aether Productivity Hub: Technical & Functional Specification

This document provides a comprehensive overview of the **Aether Productivity Hub** architecture, features, and design philosophy for use in cross-tool development and AI context loading.

---

## 🏗️ Core Architecture (Supabase + GitHub Pages)

Aether is built using a modern, serverless, full-stack architecture optimized for low-latency, high security, and ease of deployment.

### 1. Frontend: Vue 3 Single Page Application (SPA)
- **Framework**: Vue 3 (Composition API) with Vite.
- **State Management**: Pinia (Reactive store architecture).
- **Routing**: Vue Router for modular navigation.
- **Design System**: Pure Vanilla CSS implementation using CSS Variables for a "Glassmorphism" design system. No external UI frameworks (except for limited Tailwind utility usage) are used to allow maximum performance and design control.

### 2. Backend & Auth: Supabase
- **Runtime**: Supabase Edge Functions & Direct SDK coupling.
- **Authentication**: Supabase Auth (JWT-based).
- **Security**: Row Level Security (RLS) ensures that users can only access their own data at the database level.

### 3. Database: Supabase (PostgreSQL)
- **Engine**: PostgreSQL.
- **Schema Management**: Relational schema with Foreign Key integrity and RLS policies across all data modules.

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
- **Statistics**: Automatically logs focus sessions into the Supabase database for analytics.

### 4. Dashboards & Analytics
- **Dashboard (`/`)**: A high-level view showing the current status of all major modules in one glance.
- **Analytics (`/analytics`)**: Detailed charts and data insights using modern visualization techniques to track habits, tasks, and portfolio performance.

---

## 🔐 Authentication & Data Privacy
- **Supabase Auth**: Handles registration, login, and session management.
- **JWT-Based**: Secure tokens stored in local storage/cookies, utilizing RLS to protect data queries.
- **Schema Safety**: Cascading deletions and strict relational constraints ensure data integrity across all user-owned records.

---

## 🏁 Technical Metadata for AI Routing
- **Primary Source Path**: `/src` (Vite SPA).
- **Configuration**: `.env` for vite build-time variables; `.github/workflows/deploy.yml` for CI/CD.
- **Dependencies**: Supabase SDK, Vue 3, Pinia.
