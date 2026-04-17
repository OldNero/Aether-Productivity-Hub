# Cloudflare Pages Deployment Guide

Follow these steps to deploy the Aether Productivity Hub to Cloudflare Pages.

## 1. Connect Repository
- log in to the [Cloudflare Dashboard](https://dash.cloudflare.com/).
- Navigate to **Workers & Pages** > **Create application** > **Pages** > **Connect to Git**.
- Select the repository for this project.

## 2. Configure Build Settings
During the setup process, use the following settings:
- **Project name**: `aether-productivity-hub` (or your choice)
- **Production branch**: `main` (or yours)
- **Framework preset**: `Vite` (if available) or `None`
- **Build command**: `npm run build`
- **Build output directory**: `dist`
- **Root directory**: `/`

## 3. Add Environment Variables
Cloudflare Pages requires environment variables to be explicitly added in the dashboard.
Go to **Settings** > **Environment variables** and add:

| Variable | Description |
| :--- | :--- |
| `VITE_FINNHUB_KEY` | Your API key from Finnhub |
| `VITE_SUPABASE_URL` | Your Supabase Project URL |
| `VITE_SUPABASE_ANON_KEY` | Your Supabase Anon/Public Key |

## 4. Database Setup (Supabase)
The application requires specific tables and Row Level Security (RLS) policies to sync data correctly.
- **Action**: Open [SUPABASE_SETUP.sql](file:///E:/Web-Dev/Aether-Productivity-Hub/SUPABASE_SETUP.sql).
- **Steps**:
    1. Copy the entire content of the script.
    2. Go to your [Supabase Dashboard](https://supabase.com/dashboard).
    3. Select your project and navigate to the **SQL Editor**.
    4. Paste the script and click **Run**.
This will fix 403 (Forbidden) and 406 (Not Acceptable) errors during sync.

## 5. SPA Redirection
A `public/_redirects` file has been added to the project. This ensures that refreshing the page on any route (e.g., `/investments`) doesn't result in a 404 error, by redirecting all requests to `index.html`.

## Option A: Git Deployment (Recommended)
Follow the steps in [Section 1](#1-connect-repository) to link your repository for automatic deployments on every push.

## Option B: CLI Deployment (Manual)
If you prefer to deploy manually from your terminal:

1. **Login**: Run `npx wrangler login` to authenticate with Cloudflare.
2. **Deploy**: Run `npm run deploy`. This will build the project and upload it to Cloudflare Pages.
3. **Project Name**: The first time you run this, it will ask for a project name. The default from `wrangler.toml` is `aether-productivity-hub`.

---

## Troubleshooting Common Failures

### 1. Node.js Version mismatch
If your build fails with "SyntaxError" or "Command not found", Cloudflare is likely using an old Node.js version.
- **The Fix**: I have added a `.node-version` file to the root of the project with the value `20`. This should force Cloudflare to use Node 20.
- **Alternative**: Go to **Settings** > **Environment variables** and add `NODE_VERSION` with the value `20`.

### 2. Case Sensitivity
Linux (Cloudflare) is case-sensitive, unlike Windows. Ensure that all imports in the code match the actual filenames exactly (e.g., `App.vue` vs `app.vue`).

### 3. Missing Environment Variables
Double check that `VITE_FINNHUB_KEY`, `VITE_SUPABASE_URL`, and `VITE_SUPABASE_ANON_KEY` are all present in the **Environment variables** section of the Cloudflare dashboard. Without these, the build might fail during the `vue-tsc` type-checking phase.

