# AI-Powered Weekly Student Report — Final Feature

## What We're Building

An AI (Google Gemini) generates a **personalized weekly report** for each student every Sunday. The report is sent to parents via push notification + WhatsApp, and stored for viewing in the parent app.

### Sample Report (what parents see):

> **📊 Weekly Report: Rahul Sharma**
> *Week of April 14–20, 2026 | Cosmos Academy*
>
> **Attendance: 5/6 days (83%)** — Rahul was present for 5 out of 6 scheduled days. He missed Tuesday.
>
> **Tests Taken: 2** — Physics Chapter Test (72%) and Maths Weekly (85%)
>
> **💪 Strengths This Week:**
> - Trigonometry (92%) — consistently strong, up from 88% last week
> - Newton's Laws (80%) — solid improvement from 65% two weeks ago
>
> **📚 Needs Attention:**
> - Wave Optics (45%) — struggled with interference patterns. Recommend revision.
> - Quadratic Equations (52%) — needs more practice on word problems.
>
> **📈 Overall Trend:** Rahul's average score improved from 68% to 76% over the last 3 weeks. He's showing steady progress in Physics. Keep it up!
>
> **🎯 Recommended Focus:** Wave Optics and Quadratic Equations this week.

---

## Data Available for AI

The AI will work with real data from these tables:

| Data Source | What It Provides |
|---|---|
| `attendance_logs` | Present/absent/late per day, check-in/out times |
| `student_scores` | Marks per question per test |
| `test_questions` → `micro_tags` | Which subject/chapter/concept each question tests |
| `tests` | Test name, date, total marks |
| `student_concept_performance` (materialized view) | Aggregated % score per concept (lifetime) |
| Previous `weekly_reports` | Last week's scores for trend comparison |

---

## Proposed Changes

### 1. Database — Store Generated Reports

#### [NEW] `supabase/20_ai_weekly_reports.sql`

```sql
CREATE TABLE IF NOT EXISTS weekly_reports (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  student_id UUID NOT NULL REFERENCES students(id) ON DELETE CASCADE,
  institute_id UUID NOT NULL REFERENCES institutes(id) ON DELETE CASCADE,
  week_start DATE NOT NULL,       -- e.g. 2026-04-14
  week_end DATE NOT NULL,         -- e.g. 2026-04-20
  report_data JSONB NOT NULL,     -- structured data (attendance, scores, concepts)
  ai_summary TEXT NOT NULL,       -- The AI-generated narrative
  overall_score NUMERIC(5,2),     -- Aggregated % for the week
  previous_score NUMERIC(5,2),    -- Last week's % for trend
  generated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(student_id, week_start)
);
```

---

### 2. AI Integration — Gemini API

#### [NEW] `lib/gemini.ts`

A lightweight wrapper for Google Gemini API (`gemini-2.0-flash` — free tier: 15 RPM, 1M tokens/day).

- Takes structured student data (attendance, scores, concepts)
- Returns a personalized English narrative
- Costs: **₹0** (free tier handles ~500 students/run easily)

> [!IMPORTANT]
> **Gemini 2.0 Flash is completely free** for up to 15 requests/minute and 1 million tokens/day. Even at 300 institutes × 100 students = 30,000 reports, the total tokens would be ~3M, which can be spread across ~3 hours with rate limiting. No API cost at all.

#### Environment Variable:
```
GEMINI_API_KEY=your_key_here  # Get free from https://aistudio.google.com/apikey
```

---

### 3. Report Generation Route

#### [MODIFY] `app/api/cron/weekly-results/route.ts`

Enhanced flow:
1. For each student in each institute:
   - Query attendance for the week
   - Query test scores + micro_tags for the week
   - Query previous week's report for comparison
2. Build a structured data payload
3. Send to Gemini API with a carefully crafted prompt
4. Store the AI response in `weekly_reports`
5. Send push notification + WhatsApp to parent

---

### 4. Parent App — View Weekly Report

#### [NEW] Parent app report screen (read-only)

Parents can view the full AI report in the app with:
- Attendance summary bar
- Test score cards
- AI narrative (the main content)
- Week-over-week trend arrow

---

## Open Questions

> [!IMPORTANT]
> **AI Provider Choice:** Gemini 2.0 Flash is recommended (free, fast, good quality). Alternative: OpenAI GPT-4o-mini (~₹0.15/report). Do you want Gemini (free) or OpenAI (paid but slightly better)?

> [!NOTE]
> **Report Frequency:** Currently weekly (Sunday). Should we also offer a monthly summary report?

---

## Verification Plan

### Automated Tests
- Build the cron route, trigger manually with `CRON_SECRET`
- Verify report is generated and stored in `weekly_reports`
- Verify WhatsApp + push notification is sent

### Manual Verification
- Check sample AI-generated report quality
- Verify parent app shows the report correctly
