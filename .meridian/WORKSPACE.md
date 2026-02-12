# AI Teaching OS - Workspace

## Project Overview
Building a K-12 education platform for Anthropic hackathon. Five modules + Student AI Tutor, all in one Next.js web app.

## Tech Stack
- **Frontend**: Next.js 16 (App Router), TypeScript, Tailwind CSS, shadcn/ui
- **Database**: Drizzle ORM + PostgreSQL (Supabase hosted via connection pooler)
- **Auth**: NextAuth.js (Auth.js v5) with @auth/drizzle-adapter, JWT strategy, credentials provider
- **AI**: Anthropic Claude API (Opus 4.6) via @anthropic-ai/sdk v0.74.0
- **Testing**: Vitest + API endpoint testing

## Supabase Config
- Project: teaching-os (us-west-2, IPv6-only, must use pooler)
- URL: https://qeayczyoaqttlwpstwbn.supabase.co
- DB via pooler (see .env for URLs)
- Credentials in .env (never committed)

## Epic: TEAC-w25zza
| Phase | Pebble ID | Status |
|-------|-----------|--------|
| P1: Foundation | TEAC-xlssqq | DONE |
| P2: Instructional Design | TEAC-nz1ote | DONE |
| P3: Assessment Intelligence | TEAC-4bg5ia | DONE |
| P4: SPED/Compliance | TEAC-275nqy | In Progress |
| P5: Family Engagement | TEAC-hc17it | Blocked by P4 |
| P6: Student AI Tutor | TEAC-2novwk | Blocked by P5 |
| P7: District Intelligence | TEAC-rnynnz | Blocked by P6 |
| P8: Integration & Polish | TEAC-y2fott | Blocked by P7 |

## Key Decisions
- No Chrome extension - unified web platform
- PostgreSQL via Supabase (deployment-ready)
- Anthropic API key stored in .env (ANTHROPIC_API_KEY)
- Creative Opus usage: tool_use for structured output, streaming for tutor, multi-step generation
- All coding delegated to sub-agents; orchestrator only verifies
- Frontend design skill applied: warm education-friendly aesthetics, no AI slop

## API Docs
- [Anthropic API](./api-docs/anthropic-api.md) - DONE (SDK v0.74.0, claude-opus-4-6)
- [Drizzle ORM](./api-docs/drizzle-orm.md) - DONE
- [Next.js Stack](./api-docs/nextjs-stack.md) - DONE

## Creative Opus Usage (Implemented)
1. **tool_use for structured output** - Rubrics, lesson plans, assignments, quizzes (forced tool_choice)
2. **Multi-step generation** - Smart Assignment Creator generates assignment + rubric + criteria + 3 differentiated versions in one call
3. **Streaming** - Real-time Socratic tutor responses (Phase 6)
4. **Prompt caching** - Rubrics reused across student grading (Phase 3)
5. **Message batches** - Batch grading entire classes (Phase 3)

## Phase 1 Complete (10 commits)
- Next.js 16 app scaffold with TypeScript
- Drizzle ORM with 31 tables pushed to Supabase
- NextAuth.js with credentials auth + JWT
- shadcn/ui (19 components)
- Dashboard shell with role-aware sidebar navigation
- Landing page with feature grid
- Comprehensive seed script (29 users, schools, classes, standards, assignments, IEP data)
- Health endpoint verified, registration tested, build passes

## Phase 2 Complete: Instructional Design Engine
All 4 features built and verified (commits f72fce7 through 970ef9c):
1. AI service layer (`src/lib/ai/`) — 6 files, tool_use structured generation
2. Smart Assignment Creator — API (3 routes) + UI (4 pages + 3 components)
3. Lesson Plan Generator — API (3 routes) + UI (5 pages)
4. Rubric Builder — API (3 routes) + UI (4 pages + reusable grid)
All CRUD endpoints verified via curl. TypeScript clean.

## Phase 3 Complete: Assessment Intelligence
All verified end-to-end (commits 4039ca7, 3be8a26, bfa286d, d09ad94):
1. AI grading engine — prompt caching + multi-step criterion analysis (tested: essay scored 92/100)
2. Grading API (4 routes) — single grade, batch grade (3/6 graded, 3 had seed data conflicts), approve, analytics
3. Grading UI (3 pages + 3 components) — feedback review, approve/edit/regenerate
4. Mastery tracking (3 API routes + 2 UI pages + 2 components) — heatmap, gap analysis
5. Known issue: seed rubric weights sum to 4.0 not 1.0, causing scores >100. Fix in Phase 8.

## Phase 4 Active: SPED & Compliance Module
Building 3 features in parallel (2 agents still running: a5b37bf=API, abadcbd=UI):

### Completed
- IEP AI service (`src/lib/ai/iep-service.ts`) — committed as a800b69
  - generatePresentLevels, generateIEPGoals, generateAccommodations, generateProgressNarrative
- IEP components committed as f8512b6 (iep-card, goal-card, progress-chart, compliance-badge, data-entry-form)
- IEP UI pages committed as a5a6c11 (caseload page + detail page with tabs)

### In Progress (agents still running)
- IEP API agent (a5b37bf): 9 IEP routes + 2 compliance routes created, not yet committed
  - src/app/api/iep/route.ts, [iepId]/route.ts, [iepId]/goals/route.ts, [iepId]/goals/[goalId]/route.ts
  - src/app/api/iep/generate/present-levels/route.ts, goals/route.ts, accommodations/route.ts
  - src/app/api/iep/[iepId]/progress/route.ts, progress/narrative/route.ts
  - src/app/api/compliance/route.ts, [studentId]/route.ts
- IEP UI agent (abadcbd): compliance page + progress-monitoring page still pending

### When agents finish, verify:
1. `npx tsc --noEmit`
2. Login as rodriguez@school.edu (sped_teacher)
3. GET /api/iep — list IEPs
4. GET /api/compliance — check deadlines
5. POST /api/iep/generate/present-levels — test AI generation
6. All UI pages render 200

### Next: Phase 5 (Family Engagement), Phase 6 (Student AI Tutor), Phase 7 (District Intelligence), Phase 8 (Polish)

### Creative Opus in Phase 4
- tool_use for legally-compliant IEP structured output (all required IDEA fields)
- Individualization enforcement: similarity detection flags cookie-cutter goals
- Audit trail: every AI suggestion logged with model version for compliance
- Progress narrative generation: AI analyzes trend data and generates parent-friendly reports

## Auth Session Testing
Login flow verified via curl:
1. GET /api/auth/csrf → get CSRF token
2. Store cookies in /tmp/cookies2.txt
3. POST /api/auth/callback/credentials with email+password+csrfToken
4. GET /api/auth/session → returns {user: {name, email, id, role}, expires}
Then use -b /tmp/cookies2.txt for all subsequent API calls

## Seed Users (password: password123)
- rivera@school.edu (teacher, 8th ELA)
- okafor@school.edu (teacher, 10th Bio)
- chen@school.edu (teacher, 3rd grade)
- rodriguez@school.edu (sped_teacher)
- admin@school.edu (admin)
- sarah.chen@email.com (parent)
- marcus.williams@email.com (parent)
- aisha.torres@school.edu (student)
- deshawn.williams@school.edu (student)
