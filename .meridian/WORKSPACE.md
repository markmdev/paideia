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
| P4: SPED/Compliance | TEAC-275nqy | DONE |
| P5: Family Engagement | TEAC-hc17it | DONE |
| P6: Student AI Tutor | TEAC-2novwk | DONE |
| P7: District Intelligence | TEAC-rnynnz | In Progress |
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
1. **tool_use for structured output** — Rubrics, lesson plans, assignments, quizzes (forced tool_choice)
2. **Multi-step generation** — Smart Assignment Creator generates assignment + rubric + criteria + 3 differentiated versions in one call
3. **Streaming** — Real-time Socratic tutor responses (Phase 6)
4. **Prompt caching** — Rubrics reused across student grading (Phase 3)
5. **Batch grading** — Grade entire class at once with AI (Phase 3)
6. **IEP individualization** — Similarity detection flags cookie-cutter IEPs (Phase 4)
7. **Multilingual translation** — Native LLM translation for parent communication (Phase 5)
8. **District AI analyst** — Opus synthesizes aggregate data into narrative insights (Phase 7)

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
5. Seed rubric weights sum to 1.0 per rubric (0.25 per criterion).

## Phase 4 Complete: SPED & Compliance Module
Commits: a800b69, f8512b6, a5a6c11, 88a5dd5, 2ea17df
- IEP AI service: generatePresentLevels, generateIEPGoals (similarity detection), generateAccommodations, generateProgressNarrative
- IEP API: 11 routes (CRUD + AI generation + progress + compliance)
- IEP UI: caseload overview, detail with tabs, new/edit forms, components
- Compliance API: deadlines with color-coding
- Verified: Login as rodriguez, GET /api/iep returns DeShawn's IEP, all pages 200

## Phase 5 Complete: Family Engagement
Commits: 13bb5c6, 7b948b0, 1de83b1, 23a210f
- AI service: parent-communication.ts (progress narratives, weekly digests, multilingual translation)
- API: /api/parent/dashboard, /api/parent/children/[childId], /api/messages
- UI: /dashboard/children, /dashboard/progress, /dashboard/messages
- Creative Opus: native LLM multilingual translation
- Verified: Parent Sarah Chen sees child Aisha Torres, all pages 200

## Phase 6 Complete: Student AI Tutor
Commits: 55f5003, fd4e7a7, e1c4813, bf9633f, 237a391
- AI service: tutor.ts with streaming Socratic responses (anthropic.messages.stream())
- API: /api/tutor (streaming POST), /api/tutor/sessions
- UI: /dashboard/tutor (hub + chat interface)
- Creative Opus: STREAMING real-time Socratic tutoring — the showpiece feature
- Verified: Student Aisha gets Socratic responses for "2x + 5 = 13" — AI asks guiding questions

## Phase 7 Complete: District Intelligence
Commits: f216d3d (API), ea2ac10 (UI)
- Admin API: /api/admin/overview, /api/admin/analytics, /api/admin/schools (500 error — needs fix), /api/admin/teachers, /api/admin/students, /api/admin/insights
- Admin UI: /dashboard/analytics (with loading.tsx), /dashboard/schools, /dashboard/teachers, /dashboard/students
- Components: stat-card, ai-insights, student-search, student-table
- AI service: district-insights.ts — Opus generates narrative insights from aggregate data
- Verified: Login as williams@school.edu (admin), overview returns real data (2 schools, 5 teachers, 22 students), analytics returns mastery distribution, teachers returns engagement metrics, students returns performance data
- BUG: /api/admin/schools returns 500 — needs investigation and fix

## Phase 8 In Progress: Integration & Polish
- Rubric weights fix: DONE (commit 60ca4d0, weights now 0.25 each)
- Report card narratives: DONE (commit 57f7bbf) — AI service + API + UI + schema
- Vitest tests: Agent a0f6d03 still running — 7 test files created (health, assignments, rubrics, grading, mastery, parent, tutor)
- Schools API fix: NEEDED (500 error)
- Sidebar nav: Need to add Report Cards link for teachers
- Final build verification: NEEDED
- End-to-end demo: NEEDED

## Seed Users (CORRECTED)
- rivera@school.edu (teacher, 8th ELA)
- okafor@school.edu (teacher, 10th Bio)
- chen@school.edu (teacher, 3rd grade)
- rodriguez@school.edu (sped_teacher)
- williams@school.edu (admin) — NOT admin@school.edu
- sarah.chen@email.com (parent)
- marcus.williams@email.com (parent)
- aisha@student.edu (student)
- deshawn@student.edu (student)

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
- aisha@student.edu (student)
- deshawn@student.edu (student)
