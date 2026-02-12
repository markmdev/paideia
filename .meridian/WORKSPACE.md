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
| P7: District Intelligence | TEAC-rnynnz | DONE |
| P8: Integration & Polish | TEAC-y2fott | DONE |

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

## Creative Opus Usage (12 Implemented)
1. **tool_use for structured output** — Rubrics, lesson plans, assignments, quizzes (forced tool_choice)
2. **Multi-step generation** — Smart Assignment Creator generates assignment + rubric + criteria + 3 differentiated versions in one call
3. **Streaming** — Real-time Socratic tutor responses (Phase 6)
4. **Prompt caching** — Rubrics reused across student grading (Phase 3)
5. **Batch grading** — Grade entire class at once with AI (Phase 3)
6. **IEP individualization** — Similarity detection flags cookie-cutter IEPs (Phase 4)
7. **Multilingual translation** — Native LLM translation for parent communication (Phase 5)
8. **District AI analyst** — Opus synthesizes aggregate data into narrative insights (Phase 7)
9. **Adaptive thinking** — District insights use extended thinking to reason through complex multi-metric data
10. **Exit ticket generation** — Formative assessment tool generates targeted quick-checks with tool_use
11. **Early warning interventions** — AI generates per-student intervention recommendations for at-risk students
12. **Batch report card narratives** — AI generates individualized narratives for entire classes

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

## Phase 8 Complete: Integration & Polish
- Rubric weights fix: commit 60ca4d0
- Report card narrative generator: commit 57f7bbf
- Schools API fix: commit 584fb4f (inArray instead of raw SQL any())
- IDOR fix on mastery/[studentId]: commit 35b651e — role-based auth for all user types
- Landing page enhanced with stats, demo credentials, "Powered by Claude" badge
- Login page enhanced with quick demo login buttons for all 5 roles

## Phase 9: PRD Gap Features (Post-MVP Polish)
- Quiz Generator: AI + DB existed, added API routes + UI pages + nav entry
- Exit Ticket Generator: new AI service + API route + UI page (formative assessment)
- Early Warning Dashboard: AI-powered at-risk detection with intervention recommendations
- Batch Report Card Generation: API endpoint + "Generate All" UI button
- Assessment-Driven Differentiation: one-click tiered follow-up from grading data
- Student Mastery Self-View: student progress dashboard with strengths/growth areas
- Vitest tests: 12 files, 88 tests, ALL PASSING
- Build: 98 routes, TypeScript clean
- All endpoints verified across all 5 roles

## All 13 Creative Opus Usages
1. **tool_use for structured output** — Rubrics, lesson plans, assignments, quizzes (forced tool_choice)
2. **Multi-step generation** — Assignment + rubric + criteria + 3 differentiated versions in one call
3. **Streaming** — Real-time Socratic tutor responses (Phase 6)
4. **Prompt caching** — Rubrics reused across student grading (Phase 3)
5. **Batch grading** — Grade entire class at once with AI (Phase 3)
6. **IEP individualization** — Similarity detection flags cookie-cutter IEPs (Phase 4)
7. **Multilingual translation** — Native LLM translation for parent communication (Phase 5)
8. **District AI analyst** — Opus synthesizes aggregate data into narrative insights (Phase 7)
9. **Adaptive thinking** — District insights use extended thinking for complex multi-metric reasoning
10. **Exit ticket generation** — Formative assessment tool generates targeted quick-checks
11. **Early warning interventions** — AI generates per-student intervention recommendations
12. **Batch report card narratives** — AI generates individualized narratives for entire classes
13. **Assessment-driven differentiation** — AI clusters students by performance and generates tiered follow-up activities

## Current State
- 24 test files, 192 tests, ALL PASSING
- Pebble epic TEAC-w25zza: 48/48 issues CLOSED
- Production build: 100 routes, TypeScript clean
- Schema pushed to Supabase
- All dashboard pages verified 200 for all 5 roles
- All API endpoints verified with auth boundary checks (401/403)
- AI features verified with real Opus API: quiz gen, exit tickets, streaming tutor
- Loading skeletons on 9 dashboard pages, error boundary at dashboard level
- Favicon (SVG book icon on amber) + apple touch icon
- Login/register pages use design system tokens (consistent with dashboard)
- Registration privilege escalation fixed (role hardcoded to 'teacher')
- Quiz generation handles standards as array or comma-separated string
- ~100 git commits
- **Database re-seeded** with updated student names (Jayden Park, Sofia Martinez, Ethan Nakamura, Zara Ahmed, Lucas Thompson instead of Student 1-5)

## Polish Loop (Iteration 1 of 30)
Work-until loop active: browser testing + visual/UX polish.
Dev server running as background task b7d8737.
Chrome browser tab ID: 1135439413.
Frontend-design skill installed at .claude/skills/frontend-design/SKILL.md.

### Bugs Found & Fixed
1. ✅ Landing page: "--" → em dashes, stats updated, K-12 non-breaking (commit 19b0356)
2. ✅ Dashboard greeting: title-aware name display "Ms. Rivera" (commits 49c2d00, 56b3083)
3. ✅ Double-dash placeholders → "N/A" across 10 files (commit 4c6db8e)
4. ✅ Admin Schools page: pluralization fix "1 Teacher" not "1 Teachers" (commit 5265f79)
5. ✅ IEP detail: capitalize accommodation types and deadline types (commit 8fb5421)
6. ✅ Seed data: realistic student names instead of "Student 1-5" (commit after reseed)
7. ✅ Lesson plan metadata: "8" → "8th Grade", "45" → "45 min" display formatting

### Pages Tested (all 5 roles)
- ✅ Landing page (/) - clean, fixes verified
- ✅ Login page (/login) - demo buttons work
- ✅ Teacher dashboard (Ms. Rivera) - greeting correct, all stats
- ✅ Teacher: Assignments, Lesson Plans, Rubrics, Quizzes, Exit Tickets
- ✅ Teacher: Assessment & Grading, Reports, Report Cards, Early Warning
- ✅ Student dashboard (Aisha Torres) - greeting, stats correct
- ✅ Parent dashboard (Sarah Chen) - greeting, children section
- ✅ Admin dashboard (Dr. Williams) - greeting, stats, analytics
- ✅ Admin: Schools (pluralization fixed), Teachers, Students
- ✅ SPED Teacher dashboard (Ms. Rodriguez) - greeting, Special Education section
- ✅ SPED: IEP Management (caseload overview), IEP Detail (present levels, goals, accommodations, compliance)
- ✅ SPED: Compliance Dashboard
- ✅ Grading detail page (assignment submissions, scores)

### Remaining Issues to Address
- **Re-seeded database** — need to log out and back in to get fresh session (old user IDs stale)
- **NextAuth signout page** — default unstyled, doesn't match app design (low priority)
- **Design improvements** — landing page is functional but generic for a hackathon. Consider using frontend-design skill for a more distinctive look
- **Messages page** — not yet tested
- **Children detail page (parent)** — not yet tested
- **Student progress page** — not yet tested
- **Tutor chat page** — not yet tested
- **Registration page** — not yet tested
- **Create assignment flow** — not yet tested
- **New IEP form** — not yet tested

## Verified Endpoints (all working)
- /api/health — 200
- /api/auth/csrf, /api/auth/callback/credentials, /api/auth/session — auth flow
- /api/assignments (GET/POST) — CRUD
- /api/rubrics (GET/POST) — CRUD
- /api/lesson-plans (GET/POST) — CRUD
- /api/quizzes (GET), /api/quizzes/generate (POST) — quiz generation
- /api/exit-tickets/generate (POST) — formative assessment
- /api/grading (GET/POST), /api/grading/[id] (GET/PUT), /api/grading/batch, /api/grading/analytics
- /api/mastery (GET), /api/mastery/[studentId], /api/mastery/gaps
- /api/early-warning (GET) — at-risk student detection with AI interventions
- /api/iep (GET/POST), /api/iep/[id] (GET/PUT/DELETE), goals, progress, compliance
- /api/parent/dashboard, /api/parent/children/[childId]
- /api/messages (GET/POST)
- /api/tutor (POST streaming), /api/tutor/sessions
- /api/admin/overview, analytics, schools, teachers, students, insights
- /api/report-cards (GET/POST), /api/report-cards/batch (POST)
- /api/grading/differentiate (POST) — assessment-driven differentiation
- /api/student/progress (GET) — student self-service mastery view

## Seed Users (password: password123)
- rivera@school.edu (teacher, 8th ELA)
- okafor@school.edu (teacher, 10th Bio)
- chen@school.edu (teacher, 3rd grade)
- rodriguez@school.edu (sped_teacher)
- williams@school.edu (admin)
- sarah.chen@email.com (parent)
- marcus.williams@email.com (parent)
- aisha@student.edu (student)
- deshawn@student.edu (student)
