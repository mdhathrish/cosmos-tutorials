# Cosmos Platform — Final Production Walkthrough

## Summary

Phase 2 adds 8 major features to make Cosmos an indispensable platform for coaching institutes. The final feature — AI-powered weekly reports via Gemini — makes this a killer product.

---

## Key Decisions Applied

| Decision | Choice |
|---|---|
| WhatsApp API | **Interakt** (recommended) — simple API key, no Meta Business hassle. Meta direct also supported. |
| Biometric Brand | **ZKTeco K40 Pro** recommended — WiFi, ₹5-8K, ADMS push support |
| Billing Model | **Per-student pricing** — Free/Starter ₹25/Growth ₹35/Scale ₹30 per student/mo |
| Timetable | Students **view only** (admin manages via batches) |
| Data Import | **All formats**: .xlsx, .csv, Google Sheets, manual entry |
| Weekly Results | **Toggleable** per institute. If OFF → admin gets Sunday push reminder. If ON → auto WhatsApp. |
| WhatsApp Language | **English only** |

---

## WhatsApp Setup Guide (Interakt — Recommended)

> [!TIP]
> **Interakt is the simplest path.** No need to create a Meta Business account yourself — Interakt handles all Meta verification on their end.

### Steps:
1. Sign up at [interakt.shop](https://www.interakt.shop) (free trial available)
2. Connect your WhatsApp Business number in their dashboard
3. Create these **2 templates** (check-in/check-out now use FREE push notifications):

| Template Name | Body Text | When Sent |
|---|---|---|
| `attendance_alert` | `⚠️ {{1}} was marked ABSENT on {{2}}.` | Student absent |
| `weekly_report` | `📊 Weekly Report for {{1}}: {{2}} tests taken, average score {{3}}. From {{4}}.` | Sunday auto-cron |

> [!TIP]
> **Push-first strategy saves ~75% on WhatsApp costs.** Check-in/check-out/biometric events use FREE Expo push notifications. WhatsApp is reserved for absent alerts and weekly reports only.

4. Go to Settings → Developer → API Keys → copy your API key
5. Add to `.env.local`:
```
WHATSAPP_PROVIDER=interakt
INTERAKT_API_KEY=your_api_key_here
```

### Alternative (Meta Direct):
If you later want more control, switch to Meta Cloud API:
```
WHATSAPP_PROVIDER=meta
WHATSAPP_PHONE_ID=your_phone_id
WHATSAPP_TOKEN=your_access_token
```

The [lib/whatsapp.ts](file:///Users/temp/Downloads/cosmos-full-apr20/cosmos-admin/lib/whatsapp.ts) auto-detects which provider to use from `WHATSAPP_PROVIDER`.

---

## Biometric Device Recommendation

> [!TIP]
> **For a startup, go with the ZKTeco K40 Pro.**

| Model | Price | Why |
|---|---|---|
| **ZKTeco K40 Pro** | ₹5,000–8,000 | WiFi, battery backup, ADMS push, reliable. Best bang-for-buck. |
| ZKTeco MB160 | ₹8,000–12,000 | Face + Fingerprint + RFID. Upgrade path if hygiene matters. |
| eSSL F22 | ₹6,000–9,000 | Slim design, SilkID sensor. More aesthetic. |

### Setup Steps:
1. Buy from an **authorized vendor** (ask them to enable ADMS/push)
2. Connect device to WiFi
3. In device settings → Server URL: `https://your-domain.com/api/biometric-webhook`
4. Generate an API key from the Cosmos institute settings page
5. Configure the API key in the device's authentication headers
6. Enroll students with a `student_code` (matching what's in Cosmos)

The [biometric-webhook](file:///Users/temp/Downloads/cosmos-full-apr20/cosmos-admin/app/api/biometric-webhook/route.ts) accepts multiple payload formats from different vendors.

---

## Platform Billing (Per-Student Pricing)

Four plans configured in [17_platform_billing.sql](file:///Users/temp/Downloads/cosmos-full-apr20/supabase/17_platform_billing.sql):

| Plan | Per Student/Mo | Minimum | Students | Batches | WhatsApp | Biometric |
|---|---|---|---|---|---|---|
| **Free** | ₹0 | — | 10 | 1 | ❌ | ❌ |
| **Starter** | ₹25 | ₹499/mo | 50 | 5 | ❌ | ❌ |
| **Growth** | ₹35 | ₹1,499/mo | 200 | 20 | ✅ | ❌ |
| **Scale** | ₹30 | ₹4,999/mo | 999 | 100 | ✅ | ✅ |

> [!TIP]
> **Free tier includes a 90-day trial of Growth features (WhatsApp, import).** After trial, WhatsApp stops — creating natural upgrade pressure. Revenue grows automatically as institutes add students (NRR > 100%).

The [billing page](file:///Users/temp/Downloads/cosmos-full-apr20/cosmos-admin/app/billing/page.tsx) shows live student counts, estimated monthly bills (students × rate), trial countdowns for free users, and plan change modals.

---

## Data Import — All Formats

The [import page](file:///Users/temp/Downloads/cosmos-full-apr20/cosmos-admin/app/import/page.tsx) supports:

1. **Excel (.xlsx)** — Drag & drop, auto-column detection
2. **CSV (.csv)** — Same upload flow
3. **Google Sheets** — Paste the sheet URL, app converts to CSV and imports. Sheet must be shared publicly.
4. **Manual Entry** — Spreadsheet-like grid for typing data directly

All flows go through the same 4-step wizard: Upload → Map Columns → Preview → Import.

---

## Weekly Results Toggle

Each institute has an `auto_weekly_results` setting:

- **ON**: Cron runs Sunday morning → sends WhatsApp templates to all parents with weekly scores
- **OFF**: Cron runs Sunday morning → sends a **push notification** to the admin saying "Weekly results are ready, send them from the Results page"

Admin can set this toggle in institute settings. The cron route is [api/cron/weekly-results](file:///Users/temp/Downloads/cosmos-full-apr20/cosmos-admin/app/api/cron/weekly-results/route.ts).

Vercel Cron config (add to `vercel.json`):
```json
{
  "crons": [
    {
      "path": "/api/cron/weekly-results",
      "schedule": "30 1 * * 0"
    }
  ]
}
```
*That's 7:00 AM IST every Sunday (01:30 UTC).*

---

## All New Files Created

| File | Purpose |
|---|---|
| `lib/whatsapp.ts` | Dual-provider WhatsApp client (Interakt + Meta) |
| `api/send-whatsapp/route.ts` | Auth'd WhatsApp send endpoint |
| `api/cron/weekly-results/route.ts` | Weekly results cron with toggle |
| `api/biometric-webhook/route.ts` | Vendor-agnostic biometric receiver |
| `api/import-students/route.ts` | Bulk student import API |
| `billing/page.tsx` | Super-admin billing dashboard |
| `timetable/page.tsx` | Visual weekly timetable |
| `import/page.tsx` | Import wizard (Excel/CSV/Sheets/Manual) |

## Migrations (run in order)

| # | File | Purpose |
|---|---|---|
| 14 | `14_remove_batch_limit.sql` | Capacity 1–500 |
| 15 | `15_whatsapp_config.sql` | WhatsApp + auto_weekly_results + notification_logs |
| 16 | `16_biometric_support.sql` | API keys + student_code |
| 17 | `17_platform_billing.sql` | Per-student plans + subscriptions + payments |
| 18 | `18_fee_enhancements.sql` | Advance payment columns |
| 19 | `19_timetable_enhancements.sql` | batch_slots table |
| 20 | `20_ai_weekly_reports.sql` | AI weekly reports storage + RLS |

## New Environment Variables

# WhatsApp (choose one provider)
WHATSAPP_PROVIDER=interakt          # 'interakt' or 'meta'
INTERAKT_API_KEY=your_key_here      # if using Interakt

# OR for Meta direct:
# WHATSAPP_PHONE_ID=your_phone_id
# WHATSAPP_TOKEN=your_token

# AI Reports (FREE — get key at https://aistudio.google.com/apikey)
GEMINI_API_KEY=your_gemini_key_here

# Cron Security
CRON_SECRET=your_random_secret_here
```

---

## AI-Powered Weekly Reports (Final Feature)

The crown jewel — every Sunday, Gemini AI generates a personalized narrative report for each student.

### What It Does

1. **Gathers data** — attendance, test scores, micro_tag concepts, previous week comparison
2. **Feeds to Gemini 2.0 Flash** — with a carefully crafted prompt
3. **Stores report** — in `weekly_reports` table (JSON + AI text)
4. **Notifies parent** — push notification + WhatsApp message
5. **Parent views full report** — in the app via "AI Reports" button

### Files

| File | Purpose |
|---|---|
| [gemini.ts](file:///Users/temp/Downloads/cosmos-full-apr20/cosmos-admin/lib/gemini.ts) | Gemini API client + prompt builder |
| [weekly-results/route.ts](file:///Users/temp/Downloads/cosmos-full-apr20/cosmos-admin/app/api/cron/weekly-results/route.ts) | Cron handler — collects data, generates AI report, notifies |
| [weekly-report/route.ts](file:///Users/temp/Downloads/cosmos-full-apr20/cosmos-admin/app/api/weekly-report/route.ts) | API for fetching reports by student_id |
| [weekly-reports.tsx](file:///Users/temp/Downloads/cosmos-full-apr20/cosmos-parent/app/weekly-reports.tsx) | Parent app — expandable report cards with trend indicators |
| [20_ai_weekly_reports.sql](file:///Users/temp/Downloads/cosmos-full-apr20/supabase/20_ai_weekly_reports.sql) | Database table + RLS |

### Cost

**₹0/month** — Gemini 2.0 Flash free tier: 15 RPM, 1M tokens/day. Enough for ~500 students per run.

If Gemini is unavailable, a built-in fallback generates a structured text report without AI.
