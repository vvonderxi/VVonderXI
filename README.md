# VVonderXI ⚽

**Football Intelligence Platform — Compare careers. Predict greatness.**

A professional player analysis and comparison tool built with Claude AI. Compare players across leagues, seasons, and positions using UEFA coefficient-weighted data, FUT-style era cards, spider charts, and AI-powered scouting analysis.

---

## 🚀 Deploy in 5 Steps

### Step 1 — Set up Supabase (free)
1. Go to [supabase.com](https://supabase.com) and create a free account
2. Create a new project
3. Go to **SQL Editor** → paste the contents of `/supabase/schema.sql` → click Run
4. Go to **Project Settings → API** and copy:
   - Project URL
   - `anon` public key
   - `service_role` secret key

### Step 2 — Set up API-Football (optional, for live player search)
1. Go to [rapidapi.com](https://rapidapi.com/api-sports/api/api-football)
2. Sign up and subscribe to the **free tier** (100 calls/day)
3. Copy your RapidAPI key

### Step 3 — Set up Anthropic (optional, for AI Live analysis)
1. Go to [console.anthropic.com](https://console.anthropic.com)
2. Create an account (comes with $5 free credit)
3. Go to **API Keys** and create a new key

### Step 4 — Push to GitHub
1. Create a new repository on [github.com](https://github.com)
2. Upload all files from this folder to the repo
3. (Recommended) Install [GitHub Desktop](https://desktop.github.com) for easy future updates

### Step 5 — Deploy on Vercel
1. Go to [vercel.com](https://vercel.com) and sign up with GitHub
2. Click **Add New Project** → select your GitHub repo
3. Go to **Settings → Environment Variables** and add:

| Variable | Value | Required |
|---|---|---|
| `ANTHROPIC_API_KEY` | Your Anthropic key | For AI analysis |
| `RAPIDAPI_KEY` | Your RapidAPI key | For live player search |
| `SUPABASE_URL` | Your Supabase project URL | For player cache |
| `SUPABASE_SERVICE_KEY` | Your Supabase service role key | For player cache |
| `SUPABASE_ANON_KEY` | Your Supabase anon key | For player cache |
| `CRON_SECRET` | Any random string | For daily refresh job |

4. Click **Deploy** — your site will be live in ~60 seconds

---

## 🔗 Custom Domain (Squarespace DNS)
1. In Vercel: **Project → Settings → Domains** → add `vvonderxi.com`
2. Vercel will show you DNS records to add
3. In Squarespace: **Domains → DNS Settings** → add:
   - `A record`: `vvonderxi.com` → `76.76.21.21`
   - `CNAME record`: `www` → `cname.vercel-dns.com`
4. Wait 10-30 minutes for DNS to propagate

---

## 📁 Project Structure

```
vvonderxi/
├── index.html              ← The entire app (self-contained)
├── vercel.json             ← Routing + cron job config
├── package.json            ← Dependencies
├── .env.example            ← Copy this to .env and fill in your keys
├── .gitignore              ← Files GitHub should never store
├── README.md               ← This file
│
├── /api                    ← Vercel serverless functions (your secure backend)
│   ├── search-player.js    ← Player search: Supabase cache → API-Football
│   ├── get-seasons.js      ← Get all seasons for a player
│   ├── analyse.js          ← Claude AI proxy (keeps your key secret)
│   └── refresh-players.js  ← Daily cron: refreshes top 20 players
│
└── /supabase
    └── schema.sql          ← Run this once in Supabase SQL Editor
```

---

## 🔄 How to Update the Site

**To change anything (design, features, text):**
1. Describe the change to Claude at [claude.ai](https://claude.ai)
2. Claude edits the file
3. Download the new `index.html`
4. On GitHub: go to your repo → click `index.html` → click the pencil icon → paste new content → commit
5. Vercel auto-deploys in ~60 seconds ✅

**Or with GitHub Desktop:**
1. Replace the file on your computer
2. Open GitHub Desktop → Commit → Push
3. Vercel auto-deploys ✅

---

## 💡 Features

| Feature | Status |
|---|---|
| Player Comparison (205+ players, 3 seasons) | ✅ Live |
| Baller Bio (hypothetical comparisons) | ✅ Live |
| My Pitch (personal match tracker) | ✅ Live |
| Community — The Pub (debates + comments) | ✅ Live |
| FUT-style Era Cards | ✅ Live |
| Spider/Radar performance charts | ✅ Live |
| AI Live analysis (Claude) | ✅ Needs ANTHROPIC_API_KEY |
| Live player search (worldwide) | ✅ Needs RAPIDAPI_KEY |
| Supabase player cache | ✅ Needs SUPABASE keys |
| User accounts + profiles | ✅ Live (localStorage MVP) |
| Google OAuth login | 🔜 Coming soon |
| Player photos + club logos | 🔜 With paid API-Football |
| Advanced metrics (xG, xA) | 🔜 Phase 2 |

---

## 🗄️ How the Cache Works

```
User searches "Haaland"
        ↓
Check Supabase first (free, instant)
        ↓ found → return immediately
        ↓ not found
        ↓
Call API-Football (1 API call)
        ↓
Save full history to Supabase
        ↓
All future searches = free + instant
```

The database grows with every search. API calls drop over time.

---

## ⚠️ Data Notice

Static database: 205+ players · 21/22–23/24 seasons · UEFA coefficient weighting.
Live API data updates in real time when RAPIDAPI_KEY is connected.
Always verify critical decisions against FBref or SofaScore.

---

*Built with Claude AI · Powered by Anthropic*
