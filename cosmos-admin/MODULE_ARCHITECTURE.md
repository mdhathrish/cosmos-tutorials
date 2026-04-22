# Cosmos Admin — Module Architecture Guide

> **For Developers** · Updated April 2026

---

## How Module Isolation Works

Every route has its own `error.tsx` file. If a module crashes, **only that module shows an error** — the sidebar, navigation, and all other pages continue working.

```
app/
├── dashboard/
│   ├── page.tsx          ← Module code
│   └── error.tsx         ← Catches crashes → shows "Dashboard — Error"
├── attendance/
│   ├── page.tsx
│   └── error.tsx         ← Catches crashes → shows "Attendance — Error"
├── batches/
│   ├── page.tsx
│   └── error.tsx
...
```

When a module crashes, users see:
- ⚠️ **Module name** that crashed
- The **error message**
- A **"Retry Module"** button
- A **"Copy Report"** button (copies module name + error + stack trace)
- The **sidebar remains functional** — they can navigate away

---

## Module Map

| Module | Route | Error Boundary | Key Files |
|--------|-------|---------------|-----------|
| Dashboard | `/dashboard` | `dashboard/error.tsx` | `dashboard/page.tsx` |
| Attendance | `/attendance` | `attendance/error.tsx` | `attendance/page.tsx` |
| Batches | `/batches` | `batches/error.tsx` | `batches/page.tsx` |
| Calendar | `/calendar` | `calendar/error.tsx` | `calendar/page.tsx` |
| Fees | `/fees` | `fees/error.tsx` | `fees/page.tsx` |
| Homework | `/homework` | `homework/error.tsx` | `homework/page.tsx`, `homework/[id]/page.tsx` |
| Inbox | `/inbox` | `inbox/error.tsx` | `inbox/page.tsx` |
| Institutes | `/institutes` | `institutes/error.tsx` | `institutes/page.tsx`, `[id]/page.tsx`, `new/page.tsx` |
| Marks Entry | `/marks-entry` | `marks-entry/error.tsx` | `marks-entry/page.tsx` |
| Micro Tags | `/micro-tags` | `micro-tags/error.tsx` | `micro-tags/page.tsx` |
| Notices | `/notices` | `notices/error.tsx` | `notices/page.tsx` |
| Students | `/students` | `students/error.tsx` | `students/page.tsx`, `[id]/performance/`, `[id]/report/` |
| Support | `/support` | `support/error.tsx` | `support/page.tsx` |
| Support Inbox | `/support-inbox` | `support-inbox/error.tsx` | `support-inbox/page.tsx` |
| Teachers | `/teachers` | `teachers/error.tsx` | `teachers/page.tsx` |

---

## Shared Infrastructure

| File | Purpose |
|------|---------|
| `components/ModuleError.tsx` | Error UI shown when a module crashes |
| `components/Sidebar.tsx` | Navigation — always visible, even during errors |
| `lib/GlobalContext.tsx` | Auth state, institute selection, theme injection |
| `lib/logger.ts` | `createLogger('Module')` for consistent console logging |
| `lib/logger.ts` | `friendlyError(err)` for user-facing error messages |
| `lib/themes.ts` | Predefined theme palettes |
| `lib/supabase.ts` | Supabase client factory |

---

## How to Use the Logger

```ts
import { createLogger, friendlyError } from '@/lib/logger'

const log = createLogger('Attendance')

// In your component:
log.info('Loaded 42 students')
log.warn('Batch has no students')
log.error('Failed to save', error)

// For toast errors:
if (error) {
    toast.error(friendlyError(error))
    log.error('Save failed', error)
}
```

Console output will look like:
```
[Attendance] Loaded 42 students
[Attendance] Failed to save { code: '23505', message: '...' }
```

---

## Adding a New Module

1. Create the route: `app/your-module/page.tsx`
2. Create error boundary: `app/your-module/error.tsx`
3. Follow this template for `error.tsx`:

```tsx
'use client'
import ModuleError from '@/components/ModuleError'

export default function Error({ error, reset }: { error: Error; reset: () => void }) {
    return <ModuleError module="Your Module Name" error={error} reset={reset} />
}
```

4. In your page, use the logger:
```tsx
import { createLogger, friendlyError } from '@/lib/logger'
const log = createLogger('Your Module')
```

---

## Auth Flow & Context

```
User signs in → GlobalContext.onAuthStateChange fires
                → init() fetches role + institutes
                → Theme CSS variables injected
                → Sidebar renders correct nav items

User signs out → onAuthStateChange('SIGNED_OUT')
                → All state reset (role, institutes, theme)
                → Redirect to /login

User switches accounts → Full re-init, no stale data
```

---

## Key Rules

1. **Every module must have an `error.tsx`** — no exceptions
2. **Use `friendlyError()` for all toast messages** — never show raw DB errors to users
3. **Use `createLogger()` for console logging** — makes it easy to grep by module
4. **Always pass `institute_id`** when inserting data
5. **Never hardcode institute names** — use `currentInstitute` from GlobalContext
