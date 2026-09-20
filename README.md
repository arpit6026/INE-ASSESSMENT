# INE Product Price Tracker (Web Scraping & Audit System)

> Full-stack web application designed for the **INE Software Engineer Intern Assignment**.  
> Features scheduled automated web scraping with Playwright, anti-bot challenge fulfillment, honest audit logging, interactive Recharts price history visualization, and observable headed execution with video recording.

---

## 🌐 Live Deployment Links & Submission Info

- **Frontend Live URL (Vercel):** `https://ine-price-tracker.vercel.app` *(or your deployed Vercel URL)*
- **Backend Live URL (Render):** `https://ine-price-tracker-backend.onrender.com` *(or your deployed Render URL)*
- **Target Mock Storefront:** `https://demo.inelabteamdev.com/`
- **Submission Email:** `sstephen@ine.com` (cc: `ssingh@ine.com`)
- **Subject:** `First Round: Software Engineer Intern Assignment - <Your Name>`
- **Deadline:** September 20, 2026 - 11:59 PM IST

---

## ⚡ Key Highlights & Engineering Features

1. **Anti-Scraping Behavioral Challenge Solver (`Ar`):**
   - Automatically satisfies the mock store's human interaction requirement (`minMoves: 8`, `minDwellMs: 600`) via smooth mouse trajectory emulation.
   - Triggers trusted browser clicks (`e.nativeEvent.isTrusted === true`) to unlock the dynamic "Reveal price" state machine.
2. **Decoy & Honeypot Immune Parser:**
   - Detects and filters out hidden decoy prices (`<span class="price-value" style="display: none;">` and `<span data-price="true">`).
   - Normalizes fullwidth Unicode numbers (`０-９`), strips zero-width spaces (`\u200B`), non-breaking spaces (`\u00A0`), and trailing `/ -` formats with 100% precision.
3. **Honest Audit Trail & Error Recovery:**
   - Observes the storefront's internal retry states (`Loading…` -> `Retrying (attempt t/6)... Store responded with "upstream 503"`).
   - Records every attempt, HTTP code, latency, and error message in `scrape_logs`. Never overwrites historical price data with corrupted or empty values.
4. **Hybrid Scraping Architecture:**
   - Instant HTTP catalog browsing for 1,000 products (`/api/catalog`) without heavy browser overhead.
   - Uses Playwright only where genuine client-side JavaScript execution and interaction are required.
5. **Observable Headed Mode & Screen Recording:**
   - Headed demo script (`scripts/run_headed_demo.js`) launches a visible browser with real-time on-screen status banners.
   - Records high-definition video of the run into `recordings/headed_scraper_demo.webm`.
6. **Dual Persistence Support:**
   - **Production:** Supabase (PostgreSQL) with Row Level Security.
   - **Local Dev / Offline:** Automatic local JSON file persistence (`data/storage.json`) ensuring the app runs immediately out-of-the-box.
7. **Free-Tier Scheduling Resilience:**
   - Secured endpoint `POST /api/cron/scrape` protected with a Bearer secret token for **cron-job.org**.
   - Keep-alive endpoint `GET /api/cron/health` to prevent Render instance sleep.

---

## 🛠️ Tech Stack

- **Frontend:** React.js, Vite, Recharts, Lucide Icons, Vanilla CSS Design System with Glassmorphism
- **Backend:** Node.js, Express, Playwright (Chromium), CORS, Dotenv
- **Database:** Supabase (PostgreSQL Cloud) + Local JSON/File Storage fallback
- **Scheduling:** cron-job.org / Scheduled HTTP Webhook
- **Hosting:** Vercel (Frontend), Render.com (Backend)

---

## 📋 Environment Variables

Create a `.env` file in `backend/.env` (or copy `.env.example`):

```bash
# Server Port
PORT=5001

# Mock Storefront Target URL
MOCK_STORE_URL=https://demo.inelabteamdev.com

# Supabase Credentials (Optional for local running, required for cloud persistence)
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_ANON_KEY=your-supabase-anon-key

# Cron Job Secret Token (Use when configuring cron-job.org)
CRON_SECRET=ine_cron_secret_key_2026

# Observable Headed Run Flag
ENABLE_HEADED_BROWSER=false
```

---

## 🚀 Quick Start (Local Setup)

### 1. Clone Repository & Install Dependencies

```bash
# Clone the repository
git clone <your-repo-url>
cd ine

# Install Backend dependencies and Playwright Chromium
cd backend
npm install
npx playwright install chromium

# Install Frontend dependencies
cd ../frontend
npm install
```

### 2. Start Backend & Frontend

In terminal 1 (Backend):
```bash
cd backend
npm run dev
# Server will run on http://localhost:5001
```

In terminal 2 (Frontend):
```bash
cd frontend
npm run dev
# App will open at http://localhost:3000
```

---

## 🎥 Running the Headed Scraper & Generating Video Recording

To run the scraper in **headed (visible) mode** and produce the video recording:

```bash
node scripts/run_headed_demo.js
```

This will:
1. Open a visible Chromium browser window on your desktop.
2. Navigate to test products on `https://demo.inelabteamdev.com`.
3. Display real-time on-screen status overlays demonstrating mouse movement, button unlocking, and retry resolution.
4. Automatically save the recorded session video to:
   ```
   recordings/headed_scraper_demo.webm
   ```

---

## ⏰ Scraping Schedule Configuration (cron-job.org)

Free-tier backends (such as Render) automatically idle/sleep when inactive. To guarantee scheduled scraping every 2 hours:

1. Create a free account at [cron-job.org](https://cron-job.org).
2. Create a new cron job with the following settings:
   - **URL:** `https://your-backend.onrender.com/api/cron/scrape`
   - **Schedule:** Every 2 hours (`0 */2 * * *`)
   - **Request Method:** `POST`
   - **HTTP Headers:**
     ```
     Authorization: Bearer ine_cron_secret_key_2026
     Content-Type: application/json
     ```
3. *(Optional)* Add a second 10-minute keep-alive ping job to `https://your-backend.onrender.com/api/cron/health` (`GET`) to keep the Render free-tier instance warm.

---

## 🗄️ Supabase PostgreSQL Setup

To connect to Supabase:
1. Create a project at [supabase.com](https://supabase.com).
2. Navigate to **SQL Editor** in your Supabase dashboard.
3. Paste and run the contents of [`backend/src/db/schema.sql`](backend/src/db/schema.sql).
4. Copy your project's **URL** and **anon key** from **Project Settings > API** into `backend/.env`.

---

## 🚀 Cloud Deployment Guide

### Deploying Backend on Render.com
1. Create a **New Web Service** connected to your GitHub repository.
2. Set **Root Directory** to `backend`.
3. Set **Build Command** to:
   ```bash
   npm install && npx playwright install chromium
   ```
4. Set **Start Command** to:
   ```bash
   node src/server.js
   ```
5. Add Environment Variables (`SUPABASE_URL`, `SUPABASE_ANON_KEY`, `CRON_SECRET`, `NODE_ENV=production`).

### Deploying Frontend on Vercel
1. Import your GitHub repository into Vercel.
2. Set **Root Directory** to `frontend`.
3. Framework Preset: **Vite**.
4. In `frontend/vercel.json`, update the destination URL with your live Render backend URL:
   ```json
   {
     "source": "/api/(.*)",
     "destination": "https://your-backend.onrender.com/api/$1"
   }
   ```
5. Click **Deploy**.

---

## 📑 Repository Structure

```
├── backend/
│   ├── src/
│   │   ├── server.js               # Express application entry
│   │   ├── db/
│   │   │   ├── storage.js          # Unified storage with Supabase & local fallback
│   │   │   ├── localDb.js          # Atomic local JSON persistence
│   │   │   └── schema.sql          # Supabase PostgreSQL schema
│   │   ├── scraper/
│   │   │   ├── playwrightScraper.js# Headless & headed Playwright scraper engine
│   │   │   ├── catalogService.js   # Fast HTTP catalog caching & search
│   │   │   └── parser.js           # NFKD Unicode & zero-width price/stock normalizer
│   │   └── routes/
│   │       ├── catalog.js          # Search across 1,000 store products
│   │       ├── products.js         # Tracked inventory & on-demand scraping
│   │       ├── history.js          # Time-series price history & KPI analytics
│   │       ├── logs.js             # Per-product honest audit logs
│   │       ├── cron.js             # External cron webhook & health ping
│   │       ├── alerts.js           # Price-drop and restock notifications
│   │       └── demo.js             # Observable headed run API
├── frontend/
│   ├── src/
│   │   ├── App.jsx                 # Central dashboard controller
│   │   ├── index.css               # Glassmorphic responsive design system
│   │   ├── components/
│   │   │   ├── Navbar.jsx          # Top header with live status badges
│   │   │   ├── StatsCards.jsx      # Summary KPIs (average price, drops, inventory)
│   │   │   ├── TrackedProductsList.jsx # Tracked inventory table with live actions
│   │   │   ├── ProductSearch.jsx   # Live catalog search & 1-click tracking
│   │   │   ├── PriceChart.jsx      # Interactive Recharts price & stock timeline
│   │   │   ├── ScrapeLogsTable.jsx # Honest scrape audit trail with filters
│   │   │   ├── ProductDetailModal.jsx # Specs, reviews, and per-item history
│   │   │   ├── ObservableRunnerModal.jsx # Headed run demonstration & video player
│   │   │   └── AlertsDrawer.jsx    # Price drop & restock notifications drawer
│   │   └── services/
│   │       └── api.js              # REST client wrapper
├── scripts/
│   └── run_headed_demo.js          # Headed scraper runner with video recording
├── recordings/
│   └── headed_scraper_demo.webm    # Captured headed demonstration recording
├── DESIGN_NOTE.md                  # Detailed engineering design note
├── render.yaml                     # Render deployment blueprint
├── .env.example                    # Environment variable template
└── README.md                       # Documentation & setup guide
```

---

## 🎯 Evaluation Criteria Fulfillment

| Criteria | Fulfillment in this Project |
|---|---|
| **Scraping Reliability** | Handles slow responses, transient 503 errors, and up to 6 retry phases with exponential backoff. |
| **Correctness under Difficulty** | Normalizes fullwidth Unicode numbers, zero-width spaces, and ignores decoy/honeypot prices. |
| **Honest History & Logging** | Full audit trail (`scrape_logs`) recording each attempt, outcome, latency, and error message. Never stores blank or corrupt prices. |
| **Judgment** | Fast lightweight HTTP indexing for the 1,000 products; headless Playwright browser reserved only for dynamic price revelation. |
| **Observable Headed Run** | Includes high-resolution video recording (`recordings/headed_scraper_demo.webm`) with live visual cues and on-screen explanation banners. |
| **Deployment Ready** | Production-ready with Vercel and Render configurations, Supabase cloud schema, and `cron-job.org` webhook integration. |

---

## 📄 License

MIT License. Developed for the INE Software Engineer Intern Assessment.
