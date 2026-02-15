## Current Status (2026-02-15 12:35)

**Paideia deployed to production.** Live at [usepaideia.com](https://usepaideia.com).

### Session Summary (2026-02-15)

**Demo user isolation + DB cache — fully implemented, reviewed, verified, deployed.**

Everything pushed to GitHub and auto-deploying on Vercel. Schema already pushed to Supabase.

### Demo User Isolation

Each demo button click clones all ~500 rows of seed data with fresh IDs so visitors get isolated sandboxes. Direct credential login for seed emails is blocked.

**Flow:** Login button → POST `/api/auth/demo-login` → `cloneDemoData()` (25 tables, single transaction) → return cloned email → `signIn('credentials')` with cloned email

**Cloned email format:** `{local}.demo.{sessionId8chars}@{domain}` (e.g. `rivera.demo.abc12345@school.edu`)

**Cleanup:** Fire-and-forget on each demo login, deletes sessions older than 1 hour in reverse dependency order inside a transaction.

**Key files:**
- `src/lib/db/schema/demo.ts` — demoSessions table
- `src/lib/demo-constants.ts` — DEMO_SEED_EMAILS (29), DEMO_ENTRY_EMAILS (7)
- `src/lib/demo-clone.ts` — cloneDemoData() + cleanupExpiredDemoSessions()
- `src/app/api/auth/demo-login/route.ts` — POST endpoint
- `src/lib/auth.ts` — blocks seed email direct login in authorize()
- `src/app/login/page.tsx` — demo buttons POST to clone API, "Setting up demo..." spinner

**Verified locally:**
- Teacher, parent, student demo logins all return cloned emails
- Invalid email rejected with 400
- Seed email direct login blocked
- Cloned email authenticates successfully

### Early Warning DB Cache

Replaced unreliable in-memory `Map` with a `cache_entries` table in Supabase.

**Key files:**
- `src/lib/db/schema/cache.ts` — cacheEntries table (key PK, value JSON, expiresAt, createdAt)
- `src/lib/cache.ts` — getCached<T>/setCache with TTL and upsert
- `src/app/api/early-warning/route.ts` — uses DB cache instead of in-memory Map

### Both Reviewers Ran — All Findings Fixed

**Code health reviewer (4 issues, all fixed):**
- TEAC-syz8jj (P1): Added parent + student emails to DEMO_ENTRY_EMAILS
- TEAC-0m3fq5 (P1): 3-phase scoped reads (user → parent ID → grandchild ID)
- TEAC-cpc9lz (P2): Cleanup wrapped in transaction
- TEAC-76qssa (P2): Removed dead cleanExpiredCache() export

**Code reviewer (5 issues, all fixed):**
- TEAC-nlubwf (P0): Same as TEAC-0m3fq5, already fixed
- TEAC-3a3ppb (P1): Same as TEAC-syz8jj, already fixed
- TEAC-u2jacz (P2): Same as TEAC-cpc9lz, already fixed
- TEAC-xjhu5m (P2): Cleanup messages by both senderId and receiverId
- TEAC-vapx2b (P2): Cleanup parentChildren by both parentId and childId

### README Video

Added `paideia-demo-final.mp4` to repo. README uses GitHub raw URL for video embed: `https://github.com/markmdev/paideia/raw/main/paideia-demo-final.mp4`. Image uses `<img>` tag with width=600.

### Git Push Auth Note

The `markmdev` GitHub account owns the repo. Default active account is `markmorgan-darv` which can't push. To push:
```bash
gh auth switch --user markmdev
git push origin main
gh auth switch --user markmorgan-darv
```

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
- TEAC-5hva8v: getBaseUrl() protocol detection fragile (P2)
