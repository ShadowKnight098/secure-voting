# Deployment Guide: Secure Voting System (Vercel + Render)

This guide walks you through deploying the **Secure Electronic Voting System** for free using:
- **Backend API & Database:** [Render](https://render.com) (Node.js + SQLite Web Service)
- **Frontend Client:** [Vercel](https://vercel.com) (Vite + React SPA)

---

## Part 1: Deploy Backend to Render

1. Log in to [Render Dashboard](https://dashboard.render.com).
2. Click **New +** > **Web Service**.
3. Choose **Build and deploy from a Git repository** and connect your GitHub repo:
   `https://github.com/ShadowKnight098/secure-voting`
4. Configure the Web Service settings:
   - **Name:** `secure-voting-api` (or your choice)
   - **Root Directory:** `server`
   - **Runtime:** `Node`
   - **Build Command:** `npm install`
   - **Start Command:** `node server.js`
   - **Instance Type:** `Free`
5. Under **Environment Variables**, add:
   - `NODE_ENV`: `production`
   - `JWT_SECRET`: `voting-system-super-secure-production-key-2024` (or any random string)
   - `PORT`: `10000` (or leave default, Render sets this automatically)
6. Click **Deploy Web Service**.
7. Once deployed, note down your Render service URL (e.g., `https://secure-voting-api.onrender.com`).
   - Test it by visiting: `https://secure-voting-api.onrender.com/api/health`
   - You should see: `{"status":"ok","message":"Secure Voting API is running"}`

> [!NOTE]
> The database automatically initializes on startup with an initial super-admin account:
> - **Username:** `admin`
> - **Password:** `admin123`

---

## Part 2: Deploy Frontend to Vercel

1. Log in to [Vercel Dashboard](https://vercel.com).
2. Click **Add New...** > **Project**.
3. Import your GitHub repository:
   `https://github.com/ShadowKnight098/secure-voting`
4. Configure project settings:
   - **Framework Preset:** `Vite`
   - **Root Directory:** Click **Edit** and select `client`
   - **Build Command:** `npm run build`
   - **Output Directory:** `dist`
5. Under **Environment Variables**, add:
   - **Key:** `VITE_API_URL`
   - **Value:** Your Render backend URL from Part 1 (e.g., `https://secure-voting-api.onrender.com`)
6. Click **Deploy**.
7. Once deployment finishes, Vercel gives you your production URL (e.g., `https://secure-voting.vercel.app`).

---

## Part 3: Test Your Production Deployment

1. **Camera Permissions:** Open your Vercel URL on mobile or desktop. Modern browsers require HTTPS for camera biometric access, which Vercel provides automatically with SSL.
2. **Admin Portal:**
   - Go to `https://<your-vercel-domain>/login`
   - Sign in with `admin` / `admin123`.
   - Create elections, set dates, add parties, and register candidates with photo uploads.
3. **Voter Registration & Biometrics:**
   - Go to `https://<your-vercel-domain>/voter/register`
   - Enter voter information and capture live face scan.
4. **Voter Casting Ballot:**
   - Log in to Voter Portal: `https://<your-vercel-domain>/voter/login`
   - Cast your ballot after completing the instant biometric facial authentication!
