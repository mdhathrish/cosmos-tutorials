# 🔭 Cosmos Tutorials — Full Setup Guide (Mac)

> Admin Portal (Next.js) + Parent App (Expo) + Supabase backend  
> IIT Foundation Coaching Management System

---

## 📋 Table of Contents
1. [Prerequisites — Mac Setup](#1-prerequisites--mac-setup)
2. [Supabase Database Setup](#2-supabase-database-setup)
3. [Admin Portal Setup](#3-admin-portal-setup-nextjs)
4. [Parent App Setup](#4-parent-app-setup-expo)
5. [Push GitHub for the First Time](#5-push-to-github-mac)
6. [Deploy to Vercel](#6-deploy-admin-to-vercel)
7. [14-Day Sprint Checklist](#7-14-day-sprint-checklist)

---

## 1. Prerequisites — Mac Setup

Open **Terminal** (Cmd+Space → "Terminal") and run each command:

### Install Homebrew (Mac package manager)
```bash
/bin/bash -c "$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)"
```

### Install Node.js (v20 LTS)
```bash
brew install node@20
echo 'export PATH="/opt/homebrew/opt/node@20/bin:$PATH"' >> ~/.zshrc
source ~/.zshrc
node --version   # Should print v20.x.x
```

### Install Git
```bash
brew install git
git --version   # Should print git version 2.x.x
```

### Install GitHub CLI (push without passwords)
```bash
brew install gh
gh auth login   # Follow prompts → choose GitHub.com → HTTPS → Login with browser
```

### Install Expo CLI
```bash
npm install -g expo-cli eas-cli
expo --version
```

### Install Supabase CLI
```bash
brew install supabase/tap/supabase
supabase --version
```

---

## 2. Supabase Database Setup

### Step 1 — Create a Supabase project
1. Go to [supabase.com](https://supabase.com) → Sign up free
2. Click **New Project**
3. Name: `cosmos-tutorials`
4. Database password: save this somewhere safe
5. Region: **South Asia (ap-south-1)** — closest to Hyderabad
6. Click **Create New Project** and wait ~2 minutes

### Step 2 — Run the schema
1. In Supabase Dashboard → **SQL Editor** → **New Query**
2. Open `schema.sql` from this repo
3. Paste the entire contents → Click **Run** (Ctrl+Enter)
4. You should see "Success. No rows returned"

### Step 3 — Run the webhook setup
1. **SQL Editor** → **New Query**
2. Open `supabase/webhooks-setup.sql`
3. Run the index creation commands at the bottom

### Step 4 — Get your API keys
1. Supabase Dashboard → **Settings** → **API**
2. Copy:
   - **Project URL** → looks like `https://abcdefg.supabase.co`
   - **anon public key** → long JWT string

### Step 5 — Enable Phone Auth (for parent OTP login)
1. Supabase Dashboard → **Authentication** → **Providers**
2. Enable **Phone**
3. Configure SMS provider (Twilio recommended — free trial available)
   - Or use **Email OTP** as a simpler alternative during dev

---

## 3. Admin Portal Setup (Next.js)

```bash
# Navigate to the admin folder
cd cosmos-tutorials/cosmos-admin

# Install dependencies
npm install

# Set up environment variables
cp .env.local.example .env.local
# Open .env.local in any editor and fill in your Supabase URL + anon key
nano .env.local

# Run the development server
npm run dev
# Open http://localhost:3000 in your browser
```

### Admin Portal Routes
| Route | Purpose |
|-------|---------|
| `/dashboard` | Overview stats, quick actions |
| `/marks-entry` | ⌨️ Keyboard-first marks entry (Tab to navigate) |
| `/attendance` | Check-in / Check-out with timestamps |
| `/students` | CRUD — add, edit, deactivate students |
| `/batches` | Manage batches (max 10 capacity enforced) |
| `/micro-tags` | Manage concept tags |
| `/homework` | Assign homework to batches |

### Keyboard Shortcuts in Marks Entry
| Key | Action |
|-----|--------|
| `Tab` | Next cell (right → wrap to next row) |
| `Shift+Tab` | Previous cell |
| `Enter` | Same as Tab (next cell) |
| `Ctrl+S` | Save all scores |
| `Esc` | Cancel / close modal |

---

## 4. Parent App Setup (Expo)

```bash
# Navigate to parent app folder
cd cosmos-tutorials/cosmos-parent

# Install dependencies
npm install

# Set up environment variables
cp .env.example .env
# Fill in your Supabase URL + anon key
nano .env

# Start Expo
npx expo start
```

### Running on your phone (recommended)
1. Install **Expo Go** from App Store / Google Play on your phone
2. Run `npx expo start` in terminal
3. Scan the QR code with your phone camera (iOS) or Expo Go app (Android)

### Running on simulator
```bash
# iOS Simulator (Mac only — requires Xcode)
npx expo start --ios

# Android Emulator (requires Android Studio)
npx expo start --android
```

### Parent App Screens
| Screen | Feature |
|--------|---------|
| Login | Phone OTP authentication |
| Home (🏠) | Student card, today's attendance, 7-day streak |
| Skills (🧠) | Color-coded concept heatmap by subject/chapter |
| Attendance (📍) | Full 30-day history with check-in/out times |
| Homework (📚) | Pending and completed assignments |

---

## 5. Push to GitHub (Mac)

### First time setup (do this once)

```bash
# 1. Navigate to the project root
cd cosmos-tutorials

# 2. Initialize git
git init

# 3. Create a .gitignore file
cat > .gitignore << 'EOF'
# Dependencies
node_modules/
.expo/

# Environment variables (NEVER commit these)
.env
.env.local
.env.production

# Build output
.next/
dist/
build/

# OS files
.DS_Store
*.log

# Supabase local
supabase/.temp/
EOF

# 4. Stage all files
git add .

# 5. First commit
git commit -m "🚀 Initial commit — Cosmos Tutorials full stack"

# 6. Create repo on GitHub (gh CLI does this automatically)
gh repo create cosmos-tutorials --private --source=. --remote=origin --push

# Done! Your code is on GitHub.
```

### Every time you make changes
```bash
# See what changed
git status

# Stage all changes
git add .

# Commit with a message
git commit -m "feat: add batch capacity validation"

# Push to GitHub
git push
```

### Useful Git commands
```bash
git log --oneline          # See commit history
git diff                   # See uncommitted changes
git checkout -b new-branch # Create a new branch
git pull                   # Pull latest from GitHub
```

---

## 6. Deploy Admin to Vercel

```bash
# Install Vercel CLI
npm install -g vercel

# Login to Vercel
vercel login

# Deploy from cosmos-admin folder
cd cosmos-admin
vercel

# Follow prompts:
# - Set up and deploy? Y
# - Which scope? (your account)
# - Link to existing project? N
# - Project name: cosmos-admin
# - Directory: ./
# - Override settings? N
```

Then set environment variables in Vercel Dashboard:
1. Go to [vercel.com](https://vercel.com) → Your project → **Settings** → **Environment Variables**
2. Add:
   - `NEXT_PUBLIC_SUPABASE_URL` = your Supabase URL
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY` = your anon key
3. Click **Redeploy**

---

## 7. 14-Day Sprint Checklist

### Days 1–3: Backend ✅
- [ ] Create Supabase project (ap-south-1)
- [ ] Run `schema.sql` in SQL Editor
- [ ] Verify RLS policies are active
- [ ] Run `webhooks-setup.sql` for indexes
- [ ] Test: insert a batch, student, micro_tag manually
- [ ] Enable Phone Auth in Supabase

### Days 4–7: Admin Portal
- [ ] `npm install` in `cosmos-admin/`
- [ ] Fill in `.env.local` with Supabase keys
- [ ] Test `npm run dev` → Dashboard loads
- [ ] Create 2–3 test batches
- [ ] Add test students
- [ ] Create a test with questions linked to micro_tags
- [ ] Enter marks via keyboard (Tab navigation)
- [ ] Mark attendance for test students
- [ ] Deploy to Vercel

### Days 8–11: Parent App
- [ ] `npm install` in `cosmos-parent/`
- [ ] Fill in `.env` with Supabase keys
- [ ] Test login with parent phone number
- [ ] Verify heatmap loads with real scores
- [ ] Verify attendance history shows real data
- [ ] Test homework screen
- [ ] Test on physical device via Expo Go

### Days 12–14: Integration & QA
- [ ] Deploy Edge Function: `supabase functions deploy attendance-notify`
- [ ] Set up Supabase Webhook on `attendance_logs`
- [ ] Test full flow: Admin checks in → Parent gets notification
- [ ] Test RLS: Parent can't see other children's data
- [ ] Check batch capacity enforcement (try adding 11th student)
- [ ] Test marks validation (marks > max_marks should fail)
- [ ] Submit Expo build: `eas build --platform all`

---

## 🎯 Quick Reference

### Supabase Dashboard URL
`https://supabase.com/dashboard/project/YOUR_PROJECT_REF`

### Your admin portal (local)
`http://localhost:3000/dashboard`

### Parent app (local)
Scan QR from `npx expo start`

### Key Tables
```
batches → students → student_scores → micro_tags
tests   → test_questions ↗
attendance_logs → (triggers push notification)
homework → homework_submissions
```

---

Built for Cosmos Tutorials, Hyderabad 🔭  
IIT Foundation Coaching · Grades 8–12
