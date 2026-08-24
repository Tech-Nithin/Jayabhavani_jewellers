# ⚡ JBJ Standalone EOD Daily Closing & Opening Microservice

This standalone microservice runs independently to process the **11:55 PM IST EOD Daily Closing Record** and automatically populate **Tomorrow's Opening Record** in Supabase (`daily_opening_records`).

---

## 🛠️ Features

1. **Option 2 Webhook Endpoint**: Exposes `POST /api/trigger-eod-cron?secret=jbj_eod_cron_secret_2026` ready for external 11:55 PM IST pings.
2. **Calculates EOD Balances**:
   - 💵 **Cash Closing**: Reads `current_cash` directly from `cash_history` table for today.
   - 🥇 **Gold Closing**: Showcase Ready Gold Stock + Worker Gold Balance.
   - 🥈 **Silver Closing**: Showcase Ready Silver Stock + Worker Silver Balance.
3. **Dual Table Upsert**:
   - Writes today's snapshot into `daily_closing_records` (`record_date = Today`).
   - Writes tomorrow's starting record into `daily_opening_records` (`record_date = Tomorrow`).

---

## 🚀 Local Setup & Testing

1. **Install Dependencies**:
   ```bash
   cd cron-service
   npm install
   ```

2. **Run in Development Mode**:
   ```bash
   npm run dev
   ```

3. **Test Trigger Locally**:
   Open browser or Postman and visit:
   ```text
   http://localhost:4000/api/trigger-eod-cron?secret=jbj_eod_cron_secret_2026
   ```

---

## 🌐 Deploying & Configuring Cron (cron-job.org)

1. **Deploy to Cloud** (e.g. Render / Vercel / Railway / Render Web Service):
   - Environment Variables:
     - `SUPABASE_URL`: `https://wdlbeiqwbwnjywpqcfbq.supabase.co`
     - `SUPABASE_KEY`: *(Your Supabase Service Role Key)*
     - `CRON_SECRET_KEY`: `jbj_eod_cron_secret_2026`

2. **Configure cron-job.org**:
   - Go to [cron-job.org](https://cron-job.org) (Free account).
   - Create a **New Cron Job**:
     - **Title**: `JBJ Nightly 11:55 PM EOD Trigger`
     - **URL**: `https://your-deployed-cron-service.onrender.com/api/trigger-eod-cron?secret=jbj_eod_cron_secret_2026`
     - **Execution Schedule**: Every day at **23:55 (11:55 PM IST)**.
     - **HTTP Method**: `POST` (or `GET`).

3. That's it! Every night at 11:55 PM IST, cron-job.org will ping your microservice, calculating today's EOD closing and preparing tomorrow's opening records automatically!
