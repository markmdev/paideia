## Current Status (2026-02-15 12:08)

**Paideia deployed to production.** Live at [usepaideia.com](https://usepaideia.com).

### Active Work: Fixing Reviewer Findings on Demo Clone

**Code health reviewer found 4 issues (2 P1, 2 P2). Fixing now.**

**DONE — P1 fix #1:** TEAC-syz8jj — Added parent + student emails to `DEMO_ENTRY_EMAILS` in `src/lib/demo-constants.ts`. Previously parent/student demo buttons would fail with 400 because `sarah.chen@email.com` and `aisha@student.edu` weren't in the entry email set.

**TODO — P1 fix #2:** TEAC-0m3fq5 — Clone reads 17 tables without filtering by seed users. Tables like classes, rubrics, assignments etc. are read with `db.select().from(table)` without filtering. If non-seed data exists, it would get cloned with original FKs. Fix: filter reads by seed user IDs. In `src/lib/demo-clone.ts`, the parallel Promise.all block starting around line 55 needs scoping. Tables to filter:
- `classes` — filter by classMembers where userId is a seed user
- `rubrics` — filter where teacherId in seedUserIds
- `assignments` — filter where teacherId in seedUserIds
- `lessonPlans` — filter where teacherId in seedUserIds
- `quizzes` — filter where createdBy in seedUserIds
- `ieps` — filter where studentId in seedUserIds
- `messages` — filter where senderId in seedUserIds
- `notifications` — filter where userId in seedUserIds
- `tutorSessions` — filter where studentId in seedUserIds
- `reportCards` — filter where studentId in seedUserIds
- `feedbackDrafts` — filter by cloned submission IDs (needs 2-pass or subquery)
- `criterionScores` — filter by cloned submission IDs
- `classStandards` — filter by cloned class IDs
- `rubricCriteria` — filter by cloned rubric IDs
- `differentiatedVersions` — filter by cloned assignment IDs
- `quizQuestions` — filter by cloned quiz IDs
- `questionStandards` — filter by cloned question IDs
- `iepGoals` — filter by cloned IEP IDs
- `progressDataPoints` — filter by cloned goal IDs
- `complianceDeadlines` — filter by seed user IDs
- `parentChildren` — filter by seed user IDs

**TODO — P2 fix #3:** TEAC-cpc9lz — Wrap cleanup in a transaction.

**TODO — P2 fix #4:** TEAC-76qssa — Remove `cleanExpiredCache()` export (dead code — getCached already handles per-key expiry).

**Code reviewer (aea9887) still running in background.**

### Recently Completed: Demo User Isolation + DB Cache

**Key files:**
- `src/lib/db/schema/demo.ts` — demoSessions table
- `src/lib/db/schema/cache.ts` — cacheEntries table
- `src/lib/demo-constants.ts` — DEMO_SEED_EMAILS (29), DEMO_ENTRY_EMAILS (7)
- `src/lib/demo-clone.ts` — cloneDemoData() + cleanupExpiredDemoSessions()
- `src/app/api/auth/demo-login/route.ts` — POST endpoint
- `src/lib/cache.ts` — getCached/setCache with TTL and upsert
- `src/lib/auth.ts` — blocks seed email direct login
- `src/app/login/page.tsx` — demo buttons call clone API
- `src/app/api/early-warning/route.ts` — DB-backed cache

**Schema pushed to Supabase.** Not yet pushed to GitHub/Vercel.

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

### Open Pebble Issues
**From code health review (fix now):**
- TEAC-syz8jj: Demo email constants duplicated (P1) — FIXED, commit pending
- TEAC-0m3fq5: Clone reads without seed-user scoping (P1) — TODO
- TEAC-cpc9lz: Cleanup deletes without transaction (P2) — TODO
- TEAC-76qssa: cleanExpiredCache() never called (P2) — TODO

**Older cosmetic issues:**
- TEAC-u05c08: Mastery level config duplicated across 5 files (P2)
- TEAC-66p252: Analytics page unnecessary Content-Type header (P2)
- TEAC-h7mh6v: Mastery page header duplication (P2)
- TEAC-5hva8v: getBaseUrl() protocol detection fragile (P2)
