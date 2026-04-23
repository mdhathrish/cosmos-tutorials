# Cosmos Platform — Business Model & Financial Analysis

## TL;DR at a Glance

| Metric | 5 Institutes | 10 Institutes | 25 Institutes |
|---|---|---|---|
| **Monthly Revenue** | ₹8,500 | ₹19,000 | ₹52,500 |
| **Monthly Burn** | ₹5,800 | ₹7,200 | ₹11,500 |
| **Net Profit** | ₹2,700 | ₹11,800 | ₹41,000 |
| **Margin** | 31% | 62% | 78% |

> [!IMPORTANT]
> You break even at **3-4 institutes**. After that, every new institute is almost pure profit because your infrastructure costs scale very slowly.

---

## Part 1: Monthly Infrastructure Burn (What You Pay)

### Fixed Costs (you pay this regardless of how many clients)

| Service | Plan | Monthly Cost (₹) | Notes |
|---|---|---|---|
| **Supabase** | Pro | ₹2,100 ($25) | 8GB DB, 100K MAUs, daily backups |
| **Vercel** | Pro | ₹1,700 ($20) | 1TB bandwidth, serverless |
| **Domain** | .in/.com | ₹70 (~₹800/yr) | Your platform domain |
| **Apple Developer** | Annual | ₹700 (~$99/yr ÷ 12) | Required for iOS App Store |
| **Google Play** | One-time | ₹0 | $25 one-time (already paid) |
| **Expo EAS** | Free | ₹0 | 15 free builds/mo, enough for a startup |
| | | | |
| **Fixed Total** | | **₹4,570/mo** | |

### Variable Costs (scales with number of institutes & students)

| Service | Unit Cost | Formula | Notes |
|---|---|---|---|
| **Interakt (WhatsApp)** | ₹999/mo platform + per-msg | ₹999 + (msgs × ~₹0.50) | Starter plan. Attendance + weekly reports. |
| **WhatsApp Messages (Meta fee)** | ~₹0.35–0.80/msg (utility) | Included in Interakt cost | Utility templates (attendance alerts) |
| **Supabase Overages** | $0.125/GB storage | Usually ₹0 until 8GB+ | Won't hit this until ~30+ institutes |
| **Vercel Overages** | $0.09/GB bandwidth | Usually ₹0 until 1TB+ | 1TB is massive for a SaaS dashboard |

### WhatsApp Message Volume Estimate

For one institute with **50 students**:

| Event | Msgs/Day | Msgs/Month |
|---|---|---|
| Attendance check-in | 45 | 1,350 |
| Attendance check-out | 45 | 1,350 |
| Absent alerts | 5 | 150 |
| Weekly report (Sunday) | 50 × 4 | 200 |
| **Total per institute** | | **~3,050** |

| Scale | Total Msgs/Mo | Interakt Cost (approx) | Meta Fee (utility ~₹0.35) |
|---|---|---|---|
| 5 institutes | 15,250 | ₹999 platform | ₹5,340 |
| 10 institutes | 30,500 | ₹999 platform | ₹10,675 |
| 25 institutes | 76,250 | ₹2,499 (Growth plan) | ₹26,690 |

> [!WARNING]
> **WhatsApp is your biggest variable cost.** At scale, message fees will dominate your expenses. See the cost-cutting section below for how to control this.

### Total Monthly Burn by Scale

| Category | 5 Institutes | 10 Institutes | 25 Institutes |
|---|---|---|---|
| Fixed infra | ₹4,570 | ₹4,570 | ₹4,570 |
| Interakt platform | ₹999 | ₹999 | ₹2,499 |
| WhatsApp msg fees | ~₹250 | ~₹1,600 | ~₹4,400 |
| **Total Burn** | **₹5,800** | **₹7,200** | **₹11,500** |

*Note: WhatsApp msg fees above assume 1,000 free service conversations/mo from Meta and that most of your messages are utility (attendance/reports), not marketing.*

---

## Part 2: Monthly Revenue (What You Earn)

### Current Tier Pricing

| Plan | Price | Expected Mix |
|---|---|---|
| Basic (₹999) | 50 students, 5 batches | 40% of institutes |
| Pro (₹2,499) | 200 students, 20 batches, WhatsApp | 45% of institutes |
| Enterprise (₹4,999) | 999 students, 100 batches, WhatsApp + Biometric | 15% of institutes |

### Revenue Projections

| Scale | Basic (40%) | Pro (45%) | Enterprise (15%) | **Total MRR** |
|---|---|---|---|---|
| 5 institutes | 2 × ₹999 = ₹1,998 | 2 × ₹2,499 = ₹4,998 | 1 × ₹4,999 = ₹4,999 | **₹11,995** |
| 10 institutes | 4 × ₹999 = ₹3,996 | 5 × ₹2,499 = ₹12,495 | 1 × ₹4,999 = ₹4,999 | **₹21,490** |
| 25 institutes | 10 × ₹999 = ₹9,990 | 11 × ₹2,499 = ₹27,489 | 4 × ₹4,999 = ₹19,996 | **₹57,475** |
| 50 institutes | 20 × ₹999 = ₹19,980 | 23 × ₹2,499 = ₹57,477 | 7 × ₹4,999 = ₹34,993 | **₹112,450** |

### Profit & Loss Summary

| Scale | Revenue | Burn | **Net Profit** | **Margin** |
|---|---|---|---|---|
| 3 institutes | ₹5,500 | ₹5,400 | ₹100 | **~2% (Break-even)** |
| 5 institutes | ₹12,000 | ₹5,800 | **₹6,200** | **52%** |
| 10 institutes | ₹21,500 | ₹7,200 | **₹14,300** | **66%** |
| 25 institutes | ₹57,500 | ₹11,500 | **₹46,000** | **80%** |
| 50 institutes | ₹112,500 | ₹18,000 | **₹94,500** | **84%** |

> [!TIP]
> **SaaS margins are beautiful.** Your infrastructure barely scales while revenue grows linearly. At 50 institutes, you're making ~₹1.1L/month with ₹18K costs.

---

## Part 3: One-Time Setup Costs

| Item | Cost | Notes |
|---|---|---|
| Apple Developer account | ₹8,400 ($99/yr) | Annual, but one-time to start |
| Google Play Console | ₹2,100 ($25) | One-time, lifetime |
| Domain (.com) | ₹800 | Annual |
| Biometric device (demo unit) | ₹6,000 | ZKTeco K40 Pro for your demo/testing |
| SSL certificate | ₹0 | Vercel provides free SSL |
| **Total Initial Investment** | **~₹17,300** | |

---

## Part 4: Cost Optimization Strategies

### 🔴 Critical — WhatsApp Cost Control

WhatsApp will be your #1 variable expense. Here's how to cut it:

| Strategy | Savings | How |
|---|---|---|
| **Batch notifications** | 40-60% | Instead of sending per-event, batch all attendance into a single daily summary at 8pm: "Rahul: ✅ Check-in 4:30pm, Check-out 6:30pm". One message instead of 3. |
| **Push-first, WhatsApp-fallback** | 70-80% | Send push notifications free via Expo. Only send WhatsApp if parent hasn't opened the app in 3+ days (inactive parents). |
| **Skip check-in/check-out WhatsApp** | 60% | Only send WhatsApp for ABSENT alerts (5/day vs 95/day). Use free push for check-in/out. Reserve WhatsApp for important events. |
| **Utility not Marketing** | ~50% cheaper rate | All your templates are "utility" (transactional), not marketing. This means Meta charges ~₹0.35/msg vs ₹0.80/msg. Make sure templates are approved as "utility" category. |

> [!IMPORTANT]
> **Recommended approach:** Send **push notifications** for check-in/check-out (FREE). Send **WhatsApp only** for absent alerts and weekly reports. This cuts your WhatsApp bill by ~75%.

With push-first strategy:

| Scale | WhatsApp Msgs/Mo | WhatsApp Cost | vs. All-WhatsApp |
|---|---|---|---|
| 5 institutes | ~1,750 | ₹1,600 total | Save ₹4,000/mo |
| 10 institutes | ~3,500 | ₹2,200 total | Save ₹9,500/mo |
| 25 institutes | ~8,750 | ₹5,600 total | Save ₹23,500/mo |

### 🟡 Infrastructure Cost Cutting

| Strategy | Savings | When |
|---|---|---|
| **Stay on Supabase Free** | ₹2,100/mo | Until you hit 500MB DB or need daily backups. Free tier gives 500MB DB, 50K MAUs. Works until ~10 institutes. |
| **Stay on Vercel Hobby** | ₹1,700/mo | Until you need more than 100GB bandwidth or team features. Hobby is FREE. |
| **Local builds instead of EAS** | ₹0-1,600/mo | If you have a Mac, build iOS locally. Use EAS only for convenience. |

**Lean Start (₹0-1,000/mo total infra):**

| Service | Plan | Cost |
|---|---|---|
| Supabase | Free | ₹0 |
| Vercel | Hobby | ₹0 |
| Interakt | Starter | ₹999/mo |
| **Total** | | **₹999/mo** |

> You could literally run the platform for ₹999/mo on your first 5-10 clients with free tiers.

---

## Part 5: Revenue Boosters — How to Earn More

### 💰 Upsell Opportunities

| Revenue Stream | Pricing Idea | Potential |
|---|---|---|
| **Setup/Onboarding Fee** | ₹2,000-5,000 one-time per institute | Covers your time importing their data, configuring, and training |
| **Annual Plan Discount** | 10 months price for 12 months | Locks clients in for a year. Improves cash flow. |
| **WhatsApp Message Pack** | ₹199 per 500 extra messages | Pass through your WhatsApp costs with margin |
| **Custom Branding** | ₹500-1,000/mo add-on | Custom logo on parent app, custom domain |
| **SMS Fallback** | ₹0.25/SMS add-on | For parents without WhatsApp |
| **Data/Analytics Reports** | ₹499/mo add-on | Advanced analytics, trend reports, PDF exports |
| **White-Label Reselling** | ₹999-2,499/mo per reseller | Let other developers resell your platform |

### 📈 Pricing Strategy Recommendations

1. **Start with Pro as the default pitch** — Most coaching institutes have 50-150 students. Pro at ₹2,499 is the sweet spot.
2. **Make Basic genuinely limited** — No WhatsApp, only 5 batches. This pushes upgrades.
3. **Offer a 14-day free trial on Pro** — No credit card required. Once they import students + parents download the app, they're locked in.
4. **Annual pricing** — Offer 2 months free (₹24,990 instead of ₹29,988/yr for Pro). Improves retention.

### Revised Pricing Suggestion

| Plan | Current | Suggested | Reasoning |
|---|---|---|---|
| **Basic** | ₹999 | ₹799 | Lower barrier to entry, convert more leads |
| **Pro** | ₹2,499 | ₹1,999 | Psychological pricing, aggressive growth |
| **Enterprise** | ₹4,999 | ₹4,999 | Keep premium pricing for large institutes |
| **Onboarding Fee** | ₹0 | ₹2,999 one-time | Covers setup time, creates commitment |

---

## Part 6: Unit Economics

### Per-Institute Metrics

| Metric | Value |
|---|---|
| **Average Revenue Per Institute (ARPI)** | ₹2,100/mo (weighted avg) |
| **Cost to Serve (infra per institute)** | ₹230-460/mo at 10-25 scale |
| **Gross Margin per Institute** | ₹1,700-1,900 (80-90%) |
| **Customer Acquisition Cost (CAC)** | ₹0 initially (word of mouth + demo) |
| **Lifetime Value (LTV)** | ₹50,400 (ARPI × 24 months avg retention) |
| **LTV:CAC Ratio** | ∞ (if organic) → aim for >10x |
| **Payback Period** | 1 month (they pay on signup) |

---

## Part 7: 12-Month Financial Roadmap

Assuming you start with 2 institutes and add 2-3 per month:

| Month | Institutes | MRR | Burn | Profit | Cumulative |
|---|---|---|---|---|---|
| M1 | 2 | ₹4,000 | ₹5,000 | -₹1,000 | -₹1,000 |
| M2 | 4 | ₹8,000 | ₹5,500 | ₹2,500 | ₹1,500 |
| M3 | 6 | ₹12,000 | ₹5,800 | ₹6,200 | ₹7,700 |
| M4 | 8 | ₹16,000 | ₹6,500 | ₹9,500 | ₹17,200 |
| M5 | 10 | ₹21,000 | ₹7,200 | ₹13,800 | ₹31,000 |
| M6 | 13 | ₹27,000 | ₹8,000 | ₹19,000 | ₹50,000 |
| M9 | 20 | ₹42,000 | ₹10,000 | ₹32,000 | ₹127,000 |
| M12 | 30 | ₹63,000 | ₹13,000 | **₹50,000** | **₹277,000** |

> [!TIP]
> **By month 12, you could be making ₹50,000/month profit with 30 institutes.** The key is that your costs grow ~₹200-300 per new institute while revenue grows ₹2,100+ per institute.

---

## Key Takeaways

1. **Break-even: 3-4 institutes** — Very achievable in month 1-2
2. **Biggest cost: WhatsApp** — Use push-first strategy to cut 75%
3. **Lean start possible at ₹999/mo** — Use all free tiers initially
4. **80%+ margins at scale** — SaaS economics are strongly in your favor
5. **Lock-in is your moat** — Once parents have the app + biometric installed, switching cost is massive
6. **Annual plans improve cash flow** — Offer 2-months-free discount for yearly commitment
