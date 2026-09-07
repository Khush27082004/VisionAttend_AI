# 🚀 100% Free Production Deployment Guide

Follow this guide to deploy your entire **VisionAttend-AI** system for **$0 / month** using modern free cloud platforms.

---

## 🗺️ Deployment Overview

| Service | Technology | Free Platform | Free Specs |
| :--- | :--- | :--- | :--- |
| **1. Database** | PostgreSQL | **[Neon.tech](https://neon.tech)** | 0.5 GB Serverless Postgres (Zero Maintenance) |
| **2. AI Service** | Python + InsightFace | **[Hugging Face Spaces](https://huggingface.co/spaces)** or **[Render](https://render.com)** | **16 GB RAM / 2 vCPU** (Free on Hugging Face!) |
| **3. Backend** | Node.js + Express + Prisma | **[Render.com](https://render.com)** | 512 MB RAM Web Service (Free) |
| **4. Frontend** | Angular 17+ SPA | **[Vercel](https://vercel.com)** | Unlimited Bandwidth Global CDN (Free) |

---

## Step 1: Deploy Free PostgreSQL Database (Neon.tech)

1. Go to **[Neon.tech](https://neon.tech)** and sign up with GitHub.
2. Click **"New Project"** (e.g. `visionattend-db`).
3. Neon will display your **Connection String**:
   ```
   postgresql://alex:Abc123xyz@ep-cool-fog-123456.us-east-2.aws.neon.tech/neondb?sslmode=require
   ```
4. Save this URL — this is your `DATABASE_URL`.

---

## Step 2: Deploy Free AI Service (Hugging Face Spaces - Recommended)

> 💡 **Why Hugging Face Spaces?** It gives **16 GB of RAM + 2 vCPU completely free**, which makes InsightFace face recognition lightning fast!

1. Go to **[Hugging Face](https://huggingface.co)** and create a free account.
2. Click **Profile (top right) → New Space**.
3. Fill in the details:
   - **Space name**: `visionattend-ai`
   - **License**: `MIT`
   - **Select the Space SDK**: Choose **Docker** → **Blank**
   - **Space hardware**: Choose **CPU basic • 2 vCPU • 16 GB • Free**
4. Clone or upload the contents of the `ai-service/` folder (`Dockerfile`, `requirements.txt`, `app.py`) to this Space repository.
5. Hugging Face will automatically build and start your container.
6. Once running, copy your Public Space URL (e.g. `https://yourusername-visionattend-ai.hf.space`).

*(Alternative: You can also deploy `ai-service` as a **Web Service (Docker)** on [Render.com](https://render.com)).*

---

## Step 3: Deploy Free Backend (Render.com)

1. Go to **[Render.com](https://render.com)** and log in with GitHub.
2. Click **"New +" → "Web Service"**.
3. Select your GitHub repository (`VisionAttend_AI`).
4. Configure the settings:
   - **Name**: `visionattend-backend`
   - **Region**: Closest to you (e.g. Singapore or Frankfurt)
   - **Root Directory**: `backend`
   - **Runtime**: `Node`
   - **Build Command**: `npm install && npx prisma generate && npm run build`
   - **Start Command**: `npx prisma db push && node dist/index.js`
   - **Plan**: `Free`
5. Under **Environment Variables**, add:
   - `DATABASE_URL`: *(Your Neon PostgreSQL connection string from Step 1)*
   - `JWT_SECRET`: `super-secret-visionattend-jwt-key-2026`
   - `PORT`: `5000`
   - `NODE_ENV`: `production`
6. Click **"Create Web Service"**.
7. Once deployed, copy your backend URL (e.g. `https://visionattend-backend.onrender.com`).

---

## Step 4: Deploy Free Frontend (Vercel)

1. Go to **[Vercel.com](https://vercel.com)** and log in with GitHub.
2. Click **"Add New..." → "Project"** and import `VisionAttend_AI`.
3. Configure the settings:
   - **Framework Preset**: `Angular`
   - **Root Directory**: Click *Edit* and select `frontend`
   - **Build Command**: `npm run build`
   - **Output Directory**: `dist/frontend/browser`
4. Click **"Deploy"**.
5. Your frontend is instantly live with a free custom SSL domain (e.g. `https://visionattend-ai.vercel.app`)!

---

## ⚡ Connecting URLs

Before finalizing your frontend deployment on Vercel:
- Replace `http://localhost:5000` with your Render Backend URL (`https://visionattend-backend.onrender.com`).
- Replace `http://127.0.0.1:8000` in `frontend/src/app/services/ai.ts` with your Hugging Face Space URL (`https://yourusername-visionattend-ai.hf.space`).
