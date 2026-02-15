# Demo User Isolation + Early Warning DB Cache

## Context

Two issues to fix before the demo is ready:

1. **Demo isolation** — Anyone can log in to seed accounts and modify data, breaking it for the next visitor. Each demo login should clone all seed data so visitors get isolated copies.
2. **Early warning caching** — In-memory `Map` doesn't persist across Vercel serverless invocations, so AI recommendations are regenerated on every page load. Move to a DB-backed cache table.

## Part 1: Demo User Isolation

### Schema Changes (3 files)

**Create `src/lib/db/schema/demo.ts`:**
- `demoSessions` table: `id` (cuid2 PK), `sourceEmail` (text), `createdAt` (timestamp)

**Edit `src/lib/db/schema/auth.ts`:**
- Add `demoSessionId` nullable text column to `users` table
- Reference `demoSessions.id` — **NO `onDelete: cascade`** (cleanup must delete child rows explicitly first, since 14+ tables reference `users.id` without cascade)

**Edit `src/lib/db/schema/index.ts`:**
- Add `export * from './demo'`

Run `npx drizzle-kit push` to apply.

### Constants (1 new file)

**Create `src/lib/demo-constants.ts`** (separate from auth.ts to avoid circular imports):
- `DEMO_SEED_EMAILS` — all 29 seed user emails
- `DEMO_ENTRY_EMAILS` — the 5 demo button emails (rivera, okafor, chen, rodriguez, williams @school.edu)

### Clone Service (1 new file)

**Create `src/lib/demo-clone.ts`:**

**`cloneDemoData(sourceEmail: string)`:**
1. Create a `demoSessions` row
2. Read all seed data (users where `demoSessionId IS NULL`)
3. Generate new cuid2 IDs for every row, build ID maps
4. Remap all FKs using the maps
5. Cloned user emails: `{local}.demo.{sessionId first 8 chars}@{domain}` (e.g. `rivera.demo.abc12345@school.edu`)
6. Insert in dependency order **inside a `db.transaction()`**
7. Return `{ email: clonedEmail, sessionId }` for the entry user

**Clone order (25 tables, excludes shared districts/schools/standards and auth adapter tables):**
```
users → classes → classMembers → parentChildren → classStandards →
rubrics → rubricCriteria → assignments → differentiatedVersions →
submissions → feedbackDrafts → criterionScores → masteryRecords →
lessonPlans → quizzes → quizQuestions → questionStandards →
ieps → iepGoals → progressDataPoints → complianceDeadlines →
messages → notifications → tutorSessions → reportCards
```

**NOT cloned (shared reference data):** districts, schools, standards, auditLogs

**ID maps needed (10):**
`userIdMap`, `classIdMap`, `rubricIdMap`, `criterionIdMap`, `assignmentIdMap`, `submissionIdMap`, `quizIdMap`, `questionIdMap`, `iepIdMap`, `goalIdMap`

**FK remaps by table:**

| Table | FK Columns to Remap |
|-------|-------------------|
| users | demoSessionId (set to session ID) |
| classes | schoolId (keep original — shared) |
| classMembers | userId → userIdMap, classId → classIdMap |
| parentChildren | parentId → userIdMap, childId → userIdMap |
| classStandards | classId → classIdMap, standardId (keep — shared) |
| rubrics | teacherId → userIdMap |
| rubricCriteria | rubricId → rubricIdMap, standardId (keep — shared) |
| assignments | teacherId → userIdMap, classId → classIdMap, rubricId → rubricIdMap |
| differentiatedVersions | assignmentId → assignmentIdMap |
| submissions | studentId → userIdMap, assignmentId → assignmentIdMap |
| feedbackDrafts | submissionId → submissionIdMap, teacherId → userIdMap |
| criterionScores | submissionId → submissionIdMap, criterionId → criterionIdMap |
| masteryRecords | studentId → userIdMap, standardId (keep), source (text) → assignmentIdMap |
| lessonPlans | teacherId → userIdMap |
| quizzes | createdBy → userIdMap |
| quizQuestions | quizId → quizIdMap |
| questionStandards | questionId → questionIdMap, standardId (keep) |
| ieps | studentId → userIdMap, authorId → userIdMap |
| iepGoals | iepId → iepIdMap |
| progressDataPoints | goalId → goalIdMap, studentId → userIdMap, recordedBy (text) → userIdMap |
| complianceDeadlines | studentId (plain text, not FK) → userIdMap |
| messages | senderId → userIdMap, receiverId → userIdMap |
| notifications | userId → userIdMap |
| tutorSessions | studentId → userIdMap |
| reportCards | studentId → userIdMap, classId → classIdMap, approvedBy → userIdMap |

**`cleanupExpiredDemoSessions()`:**
1. Find sessions older than 1 hour
2. Delete in **reverse dependency order** (reportCards first, users last, then demoSessions)
3. Explicit deletes per table — cannot rely on cascade since child tables don't cascade on user FK
4. Fire-and-forget with `.catch(console.error)` so cleanup errors don't block login

### Demo Login API (1 new file)

**Create `src/app/api/auth/demo-login/route.ts`** — POST endpoint:
1. Validate `email` is in `DEMO_ENTRY_EMAILS`, return 400 if not
2. Fire-and-forget: `cleanupExpiredDemoSessions().catch(console.error)`
3. Call `cloneDemoData(email)` inside try/catch
4. On success: return `{ email: clonedEmail }`
5. On failure: return `{ error: 'Failed to create demo session' }` with status 500

### Auth Guard (1 edit)

**Edit `src/lib/auth.ts`:**
- In `authorize()`, import `DEMO_SEED_EMAILS` from `demo-constants.ts`
- If `credentials.email` is in `DEMO_SEED_EMAILS`, return `null` (reject login)
- This blocks direct credential login for seed accounts — demo access only through the clone endpoint

### Login Page (1 edit)

**Edit `src/app/login/page.tsx`:**
- `handleDemoLogin(email)` becomes async:
  1. Set loading state with spinner text "Setting up demo..."
  2. POST to `/api/auth/demo-login` with `{ email }`
  3. On success: call `signIn('credentials', { email: response.email, password: 'password123' })`
  4. On failure: show toast error "Demo login failed. Please try again."
- Remove hardcoded `password123` from visible demo button code

### Performance

~25 bulk INSERTs + ~25 SELECTs = ~50 DB round-trips. At 10-20ms each on Supabase = **0.5-1s total**. Acceptable behind a "Setting up demo..." spinner. All writes wrapped in a single `db.transaction()` for atomicity.

### Trade-offs

- **Admin dashboards** show slightly inflated numbers with concurrent demo sessions (admin queries don't filter by user). Acceptable for hackathon.
- **~500 rows per session** with 1-hour TTL. At 10 concurrent demo users = 5,000 extra rows. Trivial for Postgres.

---

## Part 2: Early Warning DB Cache

Replace the in-memory `Map` in `src/app/api/early-warning/route.ts` with a DB-backed cache table.

### Schema (1 file edit)

**Create `src/lib/db/schema/cache.ts`:**
```
cacheEntries table:
  key: text PK
  value: text (JSON stringified)
  expiresAt: timestamp
  createdAt: timestamp (defaultNow)
```

**Edit `src/lib/db/schema/index.ts`** — add `export * from './cache'`

Run `npx drizzle-kit push`.

### Cache Helper (1 new file)

**Create `src/lib/cache.ts`:**
- `getCached<T>(key: string): Promise<T | null>` — SELECT where key matches and expiresAt > now, parse JSON, return typed result or null
- `setCache(key: string, value: unknown, ttlMs: number): Promise<void>` — UPSERT (insert on conflict update) with JSON.stringify, set expiresAt to now + ttl
- `cleanExpiredCache(): Promise<void>` — DELETE where expiresAt <= now

### Early Warning Route Edit

**Edit `src/app/api/early-warning/route.ts`:**
- Remove the in-memory `recommendationCache` Map and `CACHE_TTL_MS`
- Import `getCached`, `setCache` from `@/lib/cache`
- Before calling `generateStudentInterventions`, check `getCached(cacheKey)`
- After generating, call `setCache(cacheKey, result, 5 * 60 * 1000)`
- Keep the same cache key logic: `early-warning:${userId}:${sortedFlaggedIds}`

---

## File Summary

| Action | File | Part |
|--------|------|------|
| Create | `src/lib/db/schema/demo.ts` | Demo |
| Create | `src/lib/db/schema/cache.ts` | Cache |
| Edit | `src/lib/db/schema/auth.ts` — add demoSessionId | Demo |
| Edit | `src/lib/db/schema/index.ts` — export demo + cache | Both |
| Create | `src/lib/demo-constants.ts` | Demo |
| Create | `src/lib/demo-clone.ts` — clone + cleanup | Demo |
| Create | `src/app/api/auth/demo-login/route.ts` | Demo |
| Create | `src/lib/cache.ts` — DB cache helpers | Cache |
| Edit | `src/lib/auth.ts` — block seed emails | Demo |
| Edit | `src/app/login/page.tsx` — new handleDemoLogin | Demo |
| Edit | `src/app/api/early-warning/route.ts` — use DB cache | Cache |

## Verification

**Demo isolation:**
1. Click each of the 5 demo buttons → logs in within 2 seconds
2. As demo teacher, create an assignment → visible only to that session
3. Open second browser, click same demo button → gets fresh data, doesn't see first session's changes
4. Type `rivera@school.edu` + `password123` in the form → rejected
5. Wait 1 hour (or lower TTL for testing) → cloned data cleaned up

**Early warning cache:**
6. Load early warning page → AI recommendations generated (first load)
7. Reload within 5 minutes → same recommendations served from DB cache (no AI call)
8. Check `cache_entries` table → row exists with correct key and expiry

**Build health:**
9. `npx tsc --noEmit` — zero errors
10. `npx vitest run` — all tests passing
