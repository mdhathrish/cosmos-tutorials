# Cosmos — Complete Production Launch Guide

Everything you need to do, in exact order. Estimated time: ~3-4 hours.

---

## Phase 1: Database Migrations (30 min)

Go to **Supabase Dashboard → SQL Editor** and run each file one by one. Copy-paste the full content of each file and click **Run**.

- [ ] **Step 1.1** — Run `14_remove_batch_limit.sql`
- [ ] **Step 1.2** — Run `15_whatsapp_config.sql`
- [ ] **Step 1.3** — Run `16_biometric_support.sql`
- [ ] **Step 1.4** — Run `17_platform_billing.sql`
- [ ] **Step 1.5** — Run `18_fee_enhancements.sql`
- [ ] **Step 1.6** — Run `19_timetable_enhancements.sql`
- [ ] **Step 1.7** — Run `20_ai_weekly_reports.sql`

> ⚠️ Run them in order (14 → 20). If any fails, read the error — it usually means the table already exists (safe to skip) or a referenced table is missing (means you skipped one).

**How to verify:** After running all 7, go to Supabase → Table Editor and confirm you see these new tables:
- `notification_logs`
- `biometric_api_keys`
- `platform_plans` (with 4 rows: free, starter, growth, scale)
- `platform_subscriptions`
- `platform_payments`
- `batch_slots`
- `weekly_reports`

---

## Phase 2: Get API Keys (20 min)

### 2.1 — Gemini API Key (FREE — for AI reports)

- [ ] Go to https://aistudio.google.com/apikey
- [ ] Sign in with Google
- [ ] Click **"Create API Key"**
- [ ] Copy the key (starts with `AIza...`)
- [ ] Save it somewhere — you'll need it in Phase 3

### 2.2 — Interakt API Key (for WhatsApp — free trial)

- [ ] Go to https://www.interakt.shop and sign up
- [ ] Connect your WhatsApp Business number
- [ ] Create **2 message templates**:

**Template 1: `attendance_alert`**
```
Body: ⚠️ {{1}} was marked ABSENT on {{2}}.
```

**Template 2: `weekly_report`**
```
Body: 📊 Weekly Report for {{1}}: {{2}} tests taken, average score {{3}}. From {{4}}.
```

- [ ] Wait for templates to be approved (usually 5-30 min)
- [ ] Go to Settings → Developer → API Keys → Copy your API key

### 2.3 — Generate a CRON_SECRET

Run this in your terminal:
```bash
openssl rand -hex 32
```
Copy the output — this is your cron secret.

### 2.4 — Get Supabase Service Role Key

- [ ] Go to Supabase Dashboard → Settings → API
- [ ] Copy the **service_role** key (the longer one, NOT the anon key)

---

## Phase 3: Configure Vercel Environment (10 min)

Go to **Vercel Dashboard → Your Project → Settings → Environment Variables**

Add these variables for **Production** (and optionally Preview/Development):

| Variable | Value | Where to get it |
|---|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | `https://xxx.supabase.co` | Already set if deployed |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | `eyJ...` | Already set if deployed |
| `SUPABASE_SERVICE_ROLE_KEY` | `eyJ...` (longer key) | Supabase → Settings → API |
| `WHATSAPP_PROVIDER` | `interakt` | Type exactly this |
| `INTERAKT_API_KEY` | Your Interakt API key | Step 2.2 |
| `GEMINI_API_KEY` | `AIza...` | Step 2.1 |
| `CRON_SECRET` | Random hex string | Step 2.3 |

- [ ] All 7 variables added ✓

---

## Phase 4: Set Up Cron Job (5 min)

### 4.1 — Create `vercel.json` in project root

- [ ] Create file at `/Users/temp/Downloads/cosmos-full-apr20/cosmos-admin/vercel.json`:

```json
{
  "crons": [
    {
      "path": "/api/cron/weekly-results",
      "schedule": "30 4 * * 0"
    }
  ]
}
```

> This runs every **Sunday at 4:30 AM UTC** (10:00 AM IST) — perfect timing for parents to read over breakfast.

### 4.2 — Test the cron manually

After deploying, test it with:
```bash
curl -H "Authorization: Bearer YOUR_CRON_SECRET" https://your-app.vercel.app/api/cron/weekly-results
```

You should get: `{"success": true, "reports_generated": 0, ...}`

---

## Phase 5: Deploy to Production (15 min)

### 5.1 — Push code to GitHub

```bash
cd /Users/temp/Downloads/cosmos-full-apr20
git add -A
git commit -m "Production release: AI reports, per-student billing, push-first notifications"
git push origin main
```

### 5.2 — Verify Vercel Build

- [ ] Go to Vercel Dashboard → Deployments
- [ ] Wait for build to complete (should show ✅)
- [ ] Click the deployment URL and test login

### 5.3 — Quick Smoke Test

- [ ] Login as admin → check Dashboard loads
- [ ] Go to Billing page → see 4 plan tiers (Free/Starter/Growth/Scale)
- [ ] Go to Attendance → mark a student absent → verify push notification works
- [ ] Go to Import → verify the import wizard loads
- [ ] Go to Timetable → verify it loads

---

## Phase 6: Parent App (30 min — can do later)

### Option A: Quick Testing (Expo Go)
Parents can scan your Expo QR code to test immediately.

### Option B: Production (Google Play Store)

```bash
cd /Users/temp/Downloads/cosmos-full-apr20/cosmos-parent

# Install EAS CLI if not already
npm install -g eas-cli

# Login to Expo
eas login

# Build Android APK
eas build --platform android --profile production
```

- [ ] Create a **Google Play Console** account ($25 one-time fee)
- [ ] Upload the APK/AAB from EAS build
- [ ] Fill in store listing (name, description, screenshots)
- [ ] Submit for review (takes 1-3 days)

### Option C: iOS (Apple Developer — $99/year)
```bash
eas build --platform ios --profile production
```
Then submit via App Store Connect.

---

## Phase 7: First Customers (Week 1-2)

### 7.1 — Onboard Your First Institute

- [ ] Login as **super_admin**
- [ ] Go to **Institutes → Create New** → add institute name, address, phone
- [ ] Create an **admin account** for the institute owner
- [ ] Share admin login credentials with them
- [ ] They start on **Free tier** (10 students, 1 batch, 90-day Growth trial)

### 7.2 — Import Student Data

- [ ] Go to **Import Data** page
- [ ] Upload their Excel/CSV with student names, parent phones, grades
- [ ] Verify students appear in the Students page
- [ ] Verify parent accounts were auto-created

### 7.3 — Get Parents on the App

- [ ] Share the parent app link/QR code with the institute
- [ ] Institute sends it to parents via their WhatsApp group
- [ ] Parents download → login with phone/email → see their child's data

### 7.4 — Show Value in Week 1

- [ ] Admin marks attendance daily → parents get push notifications
- [ ] Admin creates a test → enters marks → parents see scores
- [ ] On Sunday → AI weekly report auto-generates → parents are impressed

### 7.5 — Convert to Paid (After Trial)

After 90 days (or sooner if they love it):
- [ ] Go to **Billing** → change their plan from Free to **Starter** (₹25/student) or **Growth** (₹35/student)
- [ ] Record their first payment

---

## Summary: Your Weekly Rhythm After Launch

| Day | What Happens |
|---|---|
| **Mon-Sat** | Admin marks attendance → parents get push notifications |
| **Daily** | Admin runs tests, enters marks → parents see scores in app |
| **Saturday** | Admin reviews week's data |
| **Sunday 10 AM** | 🤖 AI generates weekly reports → parents get push + WhatsApp |
| **Monthly** | You check Billing dashboard for MRR, collect payments |

---

## Environment Variables Cheat Sheet

```env
# Already have these (from initial setup)
NEXT_PUBLIC_SUPABASE_URL=https://xxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJ...

# New — add these
SUPABASE_SERVICE_ROLE_KEY=eyJ...
WHATSAPP_PROVIDER=interakt
INTERAKT_API_KEY=your_interakt_key
GEMINI_API_KEY=AIza...
CRON_SECRET=your_random_hex_string
```

---

## Cost Summary (Month 1)

| Item | Cost |
|---|---|
| Supabase (Free tier) | ₹0 |
| Vercel (Hobby) | ₹0 |
| Gemini API (Free tier) | ₹0 |
| Interakt (Free trial) | ₹0 |
| Google Play ($25 one-time) | ~₹2,100 |
| **Total Month 1** | **~₹2,100** (one-time) |
| **Total Month 2+** | **~₹999/mo** (Interakt starter) |

---

> 🎯 **Goal: Get 3 institutes on Free tier in Week 1.** By Week 4, at least 1 should convert to paid. Break-even at 3-4 paying institutes.
