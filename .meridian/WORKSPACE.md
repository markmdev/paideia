## Current Status (2026-02-15 12:10)

**Paideia deployed to production.** Live at [usepaideia.com](https://usepaideia.com).

### Recently Completed: Demo User Isolation + DB Cache

**Demo isolation implemented.** Each demo button click clones all ~500 rows of seed data with remapped IDs. Direct credential login for seed emails is blocked.

**Key files created:**
- `src/lib/db/schema/demo.ts` — demoSessions table
- `src/lib/db/schema/cache.ts` — cacheEntries table for DB-backed caching
- `src/lib/demo-constants.ts` — DEMO_SEED_EMAILS (29), DEMO_ENTRY_EMAILS (5)
- `src/lib/demo-clone.ts` — cloneDemoData() clones 25 tables in a transaction, cleanupExpiredDemoSessions() deletes in reverse dependency order
- `src/app/api/auth/demo-login/route.ts` — POST endpoint for demo login flow
- `src/lib/cache.ts` — getCached/setCache/cleanExpiredCache with TTL and upsert

**Key files edited:**
- `src/lib/db/schema/auth.ts` — added demoSessionId column to users
- `src/lib/db/schema/index.ts` — exports demo + cache schemas
- `src/lib/auth.ts` — blocks seed email direct login via DEMO_SEED_EMAILS check
- `src/app/login/page.tsx` — demo buttons POST to /api/auth/demo-login, show "Setting up demo..." spinner
- `src/app/api/early-warning/route.ts` — replaced in-memory Map cache with DB-backed cache via getCached/setCache

**Schema pushed to Supabase.** Needs `git push` to deploy to Vercel.

**Clone flow:** Login button → POST /api/auth/demo-login → cloneDemoData() → return cloned email → signIn('credentials') with cloned email

**Cleanup:** Fire-and-forget on each demo login, deletes sessions older than 1 hour. Explicit reverse-dependency-order deletes (no cascade reliance).

**Cloned email format:** `{local}.demo.{sessionId8chars}@{domain}` (e.g. `rivera.demo.abc12345@school.edu`)

### What Is Paideia
K-12 AI education platform (hackathon submission) with two deliverables:
1. **The Application** — 56 API routes, 40+ dashboard pages, 13 AI service modules, 33+ DB tables, 5 user roles
2. **The Executable English Specification** — 943 behavioral tests in plain English

### Deployment
- **Production URL:** https://usepaideia.com (custom domain on Vercel)
- **Vercel project:** teaching-os (auto-deploys on push to main)
- **GitHub:** https://github.com/markmdev/paideia
- **Env vars on Vercel:** DATABASE_URL, ANTHROPIC_API_KEY, AUTH_SECRET
- `NEXTAUTH_URL` is NOT set on Vercel — pages use `getBaseUrl()` from `src/lib/url.ts`

### Build Health
- TypeScript: zero errors
- Tests: 192/192 passing across 24 files
- Production build: clean on Vercel

### Seed Users (password: password123, blocked from direct login)
- rivera@school.edu (teacher, 8th ELA)
- okafor@school.edu (teacher, 10th Bio)
- chen@school.edu (teacher, 3rd grade)
- rodriguez@school.edu (sped_teacher)
- williams@school.edu (admin)
- sarah.chen@email.com (parent)
- marcus.williams@email.com (parent)
- aisha@student.edu (student)
- deshawn@student.edu (student)
- Plus 20 additional students (students[0-19])

### Open Pebble Issues (cosmetic, not blocking)
- TEAC-u05c08: Mastery level config duplicated across 5 files (P2)
- TEAC-66p252: Analytics page unnecessary Content-Type header (P2)
- TEAC-h7mh6v: Mastery page header duplication (P2)
- TEAC-5hva8v: getBaseUrl() protocol detection fragile (P2) — partially addressed with x-forwarded-proto
