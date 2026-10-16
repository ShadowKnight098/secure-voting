# Deployment Guide: Secure Voting System (Render + Supabase + Vercel)

This guide walks you through deploying the **Secure Electronic Voting System** for free with a centralized cloud database:
- **Central Database:** [Supabase](https://supabase.com) (PostgreSQL)
- **Backend API:** [Render](https://render.com) (Node.js Web Service)
- **Frontend Client:** [Vercel](https://vercel.com) or [Render Static Site](https://render.com) (Vite + React SPA)

---

## Part 1: Deploy Backend to Render

1. Log in to your [Render Dashboard](https://dashboard.render.com).
2. Click **New +** (top right) > **Web Service**.
3. Choose **Build and deploy from a Git repository** and connect your GitHub repository:
   `https://github.com/ShadowKnight098/secure-voting`
4. Configure the Web Service settings:
   - **Name:** `secure-voting-api` (or any name you like)
   - **Region:** Choose closest region (e.g. Frankfurt, Singapore, Oregon)
   - **Branch:** `main`
   - **Root Directory:** `server`
   - **Runtime:** `Node`
   - **Build Command:** `npm install`
   - **Start Command:** `node server.js`
   - **Instance Type:** `Free`
5. Scroll down to **Environment Variables** and add the following:

   | Key | Value | Notes |
   |---|---|---|
   | `NODE_ENV` | `production` | Enables production optimizations |
   | `PORT` | `10000` | Render standard port |
   | `JWT_SECRET` | `voting-system-super-secure-production-key-2024` | Or any random string |
   | `SUPABASE_URL` | `https://lwxqeeiadhqmimrtwyjm.supabase.co` | Your Supabase Project URL |
   | `SUPABASE_KEY` | `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imx3eHFlZWlhZGhxbWltcnR3eWptIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc5MjE1ODg1NCwiZXhwIjoyMTA3NzM0ODU0fQ.rB37a3Aw4Hjo7ptHJSGgeTuVXZzsxDKC3FlZWRqEfKQ` | Your Supabase `service_role` secret |

6. Click **Deploy Web Service** (or **Create Web Service**).
7. Wait 2-3 minutes for the build to complete. Render will display:
   ```
   [Supabase] Centralized cloud database configured successfully.
   Server running on port 10000
   ==> Your service is live 🎉
   ```
8. Copy your Render backend URL (e.g., `https://secure-voting-api.onrender.com`).
   - Test it by visiting: `https://secure-voting-api.onrender.com/api/health`
   - Response: `{"status":"ok","message":"Secure Voting API is running"}`

---

## Part 2: Deploy Frontend

You can deploy the frontend on either **Vercel** or **Render Static Site**.

### Option A: Deploy on Vercel (Recommended - Fastest)
1. Log in to [Vercel Dashboard](https://vercel.com).
2. Click **Add New...** > **Project**.
3. Import `https://github.com/ShadowKnight098/secure-voting`.
4. Configure settings:
   - **Framework Preset:** `Vite`
   - **Root Directory:** Click **Edit** and choose `client`
   - **Build Command:** `npm run build`
   - **Output Directory:** `dist`
5. Under **Environment Variables**:
   - **Key:** `VITE_API_URL`
   - **Value:** Your Render backend URL (e.g. `https://secure-voting-api.onrender.com`)
6. Click **Deploy**.

### Option B: Deploy on Render as a Static Site
1. On [Render Dashboard](https://dashboard.render.com), click **New +** > **Static Site**.
2. Connect `https://github.com/ShadowKnight098/secure-voting`.
3. Configure settings:
   - **Name:** `secure-voting-client`
   - **Branch:** `main`
   - **Root Directory:** `client`
   - **Build Command:** `npm run build`
   - **Publish Directory:** `dist`
4. Under **Environment Variables**:
   - `VITE_API_URL`: Your Render backend URL from Part 1.
5. In **Redirects / Rewrites** tab:
   - Add a rewrite: `/*` -> `/index.html` (Rule type: `Rewrite`) to support SPA client routing.
6. Click **Create Static Site**.

---

## Part 3: Verify Your Production Deployment

1. **SSL / HTTPS Camera Access:**
   - Both Vercel and Render provide automatic HTTPS/SSL certificates, which is required by modern browsers to allow webcam access for facial recognition.
2. **Admin Portal:**
   - Visit `https://<your-frontend-domain>/login`
   - Sign in with `admin` / `admin123`.
   - Manage elections, political parties, and candidates.
3. **Voter Registration & Deduplication:**
   - Go to `https://<your-frontend-domain>/voter/register`
   - Capture facial biometric scan via webcam.
   - Verify that trying to register a duplicate email or a duplicate face triggers instant rejection.
4. **Voter Voting & Receipt:**
   - Log in at `https://<your-frontend-domain>/voter/login`
   - Complete facial verification and cast ballot.
   - Download cryptographic receipt and verify on public audit ledger.
