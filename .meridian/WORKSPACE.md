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
8. ✅ Tutor subject badge: "General" → correct subject (Math) after URL replacement (commit bf27e39)
9. ✅ Parent pages grade level: "8" → "8th Grade" on children list and detail (commit a4d3274)
10. ✅ Registration page: removed misleading role dropdown (commit 20fd78b)
11. ✅ Student assignments page: role-aware query, hide Create button for students (commit 11e2cdd)
12. ✅ Landing page redesign: Instrument Serif headings, warm editorial aesthetic, colored module cards (commit 321131e)
13. ✅ Font-serif heading consistency: added Instrument Serif to h1 headings across 15 dashboard pages (commit 4f90222)
14. ✅ Tutor session preview: strip markdown from session card preview text (commit aae7746)
15. ✅ Admin remaining "--" → "N/A" + grade level "8" → "8th Grade" on Students table (commit 19550e7)
16. ✅ Seed data: remaining 15 generic student names (Student 6-20) replaced with diverse realistic names (commit 2efaf32)

### Pages Tested (all 5 roles)
- ✅ Landing page (/) - redesigned with warm editorial aesthetic, Instrument Serif, colored module cards
- ✅ Login page (/login) - demo buttons work, sign out redirects here cleanly
- ✅ Login page: invalid credentials shows red error banner "Invalid email or password"
- ✅ Registration page (/register) - role dropdown removed, clean form, HTML5 validation
- ✅ Teacher dashboard (Ms. Rivera) - greeting correct, all stats
- ✅ Teacher: Assignments list, Create Assignment form (3-step wizard), Lesson Plans list
- ✅ Teacher: Create Lesson Plan form, Rubrics (1 template, 4 criteria, 4 levels)
- ✅ Teacher: Quizzes list (empty state with CTA), Create Quiz form (3-step wizard)
- ✅ Teacher: Exit Tickets (generator form), Assessment & Grading, Reports, Report Cards
- ✅ Teacher: Early Warning dashboard (22 students, risk badges, indicator pills)
- ✅ Teacher: My Classes (5 periods, student counts)
- ✅ Teacher: Reports & Analytics - mastery bars, class cards, avg scores
- ✅ Teacher: Report Cards - class cards with "Generate All" buttons
- ✅ Teacher: Grading detail - stat cards, submission list with realistic names
- ✅ Student dashboard (Aisha Torres) - greeting, stats correct
- ✅ Student: Assignments - shows class assignments, no Create button (fixed)
- ✅ Student: My Classes - "8th Grade ELA - Period 1", Ms. Rivera
- ✅ Student: Progress page - 85% mastery, ELA skills with progress bars
- ✅ Student: AI Tutor hub - colorful subject cards, personalized greeting
- ✅ Student: AI Tutor chat - streaming Socratic response works, subject badge fixed
- ✅ Student: Tutor session preview - markdown stripped, clean text (verified fix)
- ✅ Parent dashboard (Sarah Chen) - greeting, children section
- ✅ Parent: My Children - Aisha Torres card with "8th Grade", On Track badge
- ✅ Parent: Child detail - stats cards, Skills Snapshot, progress summaries empty state
- ✅ Parent: Progress page - 85% mastery, ELA skills with progress bars
- ✅ Parent: Messages - clean empty state
- ✅ Admin dashboard (Dr. Williams) - greeting, stats, analytics
- ✅ Admin: Schools (pluralization fixed), Teachers, Students (grade level "8th Grade", N/A for nulls)
- ✅ Admin: District Analytics - stat cards, mastery distribution badges, avg scores by subject (N/A fixed)
- ✅ Admin: Teacher Engagement table - Mrs. Chen, Ms. Rivera, Mr. Okafor
- ✅ SPED Teacher dashboard (Ms. Rodriguez) - greeting, Special Education section
- ✅ SPED: IEP Management (caseload), IEP Detail, Create IEP form (5-step wizard)
- ✅ SPED: Exit Tickets, Compliance Dashboard (color-coded deadlines, days left badges)
- ✅ SPED: Early Warning - 1 student (DeShawn), On Track badge
- ✅ Grading detail page (assignment submissions, scores)
- ✅ User menu dropdown (name, email, role badge, sign out)
- ✅ Sign out flow - redirects to /login cleanly (no unstyled NextAuth page)
- ✅ Mobile (390x844): landing, login, dashboard, assignments, early warning, grading, tutor hub, progress

### Bugs Found & Fixed (Iteration 2)
17. ✅ Assignment detail tabs not clickable — added activationMode="automatic" to Tabs (commit a664134)
18. ✅ Assignment detail "Grade 8" → "8th Grade" — added formatGradeLevel helper (commit a664134)
19. ✅ Admin compliance page empty for admin — admin now sees all IEPs district-wide (commit b992ba7)
20. ✅ "Grade X" → "Xth Grade" in 12 files — shared formatGradeLevel in src/lib/format.ts (commit 268e36c)

### Pages Tested (Iteration 3 — in progress)
- ✅ Teacher: Report Cards — "ELA | 8th Grade | 7 students" (grade format fix confirmed)
- ✅ Teacher: Reports & Analytics — "8th Grade" on all 5 class cards (format fix confirmed)
- ✅ Teacher: Rubrics — 1 template (Essay Writing Rubric), 4 criteria, 4 levels
- ✅ Teacher: Rubric detail — full 4x4 grid (Thesis, Evidence Use, Organization, Language), 25% weights
- ✅ Teacher: Assignments list — "8th Grade" badge confirmed
- ✅ Teacher: Assignment detail — tabs (Assignment, Rubric, Success Criteria), description + instructions
- ✅ Teacher: Grading detail — 7 submissions with all real student names, "Grade All" button
- ✅ Teacher: My Classes — 5 periods with correct student counts
- ✅ Teacher: Create Assignment wizard — 3-step form, all fields
- ✅ Teacher: Create Lesson Plan — clean form with Subject, Grade, Topic, Duration, Model
- ✅ SPED: IEP Management — 1 student caseload, stat cards, DeShawn Williams with SLD
- ✅ SPED: IEP Detail — Present Levels, 2 Goals (Reading Fluency 12pts, Written Expression 6pts), 9 Accommodations, Related Services, Compliance Deadlines
- ✅ SPED: Progress Monitoring — Quick Data Entry form, charts with baseline/goal lines, "On Track" + "Flat" trends
- ✅ SPED: Create IEP — 5-step wizard (Student Info, Present Levels, Goals, Accommodations, Review)
- ✅ Student: Dashboard — "Welcome back, Aisha", stat cards (1 class, 0 assignments, N/A avg, 0 tutor)
- ✅ Student: Progress — 85% ELA mastery, 4 skills (3 proficient, 1 advanced)
- ✅ Parent (Sarah Chen): Dashboard — "Welcome back, Sarah", Children card, Quick Actions
- ✅ Parent: My Children — Aisha Torres, "8th Grade", On Track, ELA
- ✅ Parent: Child detail — Stats, Skills Snapshot (4 ELA skills), "No progress summaries yet" empty state
- ✅ Landing page — all sections verified (hero, stats, 6 modules, How It Works, CTA, demo creds, footer)
- ✅ SPED: Mobile (390x844) — IEP Management page responsive

### Bugs Found & Fixed (Iteration 3-4)
21. ✅ Marcus Williams (parent) login fails — seed had `marcus.w@email.com`, CLAUDE.md says `marcus.williams@email.com`. Fixed in seed, re-seeded. (commit da5f928)
22. ✅ Lesson plan generation: `standards.join is not a function` — standards passed as string, AI service expects array. Added normalization. (commit 8b21976)
23. ✅ Assignment generation: `differentiatedVersions.belowGrade` undefined — max_tokens too low (4096→8192), added null safety. (commit 6fe0511)
24. ✅ Re-grading fails with duplicate key constraint — existing feedback_draft not deleted before insert. Added delete-before-insert. (commit by subagent)

### Pages Tested (Iteration 4 — rich data verification)
- ✅ Admin: Dashboard — 2 schools, 4 teachers, 22 students, 18 ungraded
- ✅ Admin: Analytics — mastery distribution (37 Adv, 60 Pro, 45 Dev, 28 Beg), avg scores by subject (Math 83%, Science 84%, ELA 72%)
- ✅ Admin: Teacher Engagement — Okafor (3 assign, 6 sub, 6 graded), Rivera (3/18/5), Chen (3/10/5)
- ✅ Admin: Schools — Washington MS (78% avg, 3 teachers, 22 students), Jefferson ES (83% avg, 1 teacher, 6 students)
- ✅ Admin: Students — 22 students with varied avg scores (48%-95%), diverse mastery distributions
- ✅ Admin: Early Warning — 4 High Risk, 7 Moderate, 11 On Track with specific indicators
- ✅ Admin: SPED Compliance — 3 deadlines (Ethan 90d, DeShawn 185d/550d), all on track
- ✅ Marcus Williams (parent): Dashboard — "Welcome back, Marcus", 1 child (DeShawn), 2 unread messages
- ✅ Marcus: My Children — DeShawn Williams, 8th Grade, On Track, ELA + SPED
- ✅ Marcus: Messages — 5 messages with varied types (alert, progress, weekly digest, replies)

### Rich Seed Data — COMPLETE (commits c6b68a8, cb107c1, 72ea25a)
Database re-seeded with `npm run db:seed` — ALL data verified inserted:
- 9 assignments across 3 teachers (Rivera ELA, Okafor Bio, Chen 3rd grade)
- 34 submissions with 19 feedback drafts and 20 criterion scores
- 6 lesson plans (2 per teacher)
- 170 mastery records across all 22 students (multiple standards each)
- 5 tutor sessions (3 Aisha math/ELA, 2 DeShawn reading)
- 10 parent-teacher messages (mix of AI-generated and manual)
- 5 report cards with narratives
- 2 quizzes with 18 questions
- 2 IEPs (DeShawn SLD + Ethan Nakamura ADHD) with 3 goals, 26 data points, 3 deadlines

### AI LLM Testing — ALL 14 FEATURES PASSING
| Feature | Status | Quality | Notes |
|---------|--------|---------|-------|
| Quiz Generation | ✅ PASS | Excellent | 10 questions, Bloom's levels, MLK speech example, great distractors |
| Exit Ticket Generation | ✅ PASS | Excellent | 3 varied question types, original poetry, target skills |
| Lesson Plan Generation | ✅ PASS | Excellent | Full CER lesson, differentiation, assessment plan, 45min paced |
| Smart Assignment Creator | ✅ PASS | Excellent | Complete package: assignment + 5-criterion rubric + 8 success criteria + 3 diff versions |
| AI Grading (single) | ✅ PASS | Excellent | Rubric-aligned scores, specific feedback referencing student work, actionable next steps |
| Socratic Tutor (streaming) | ✅ PASS | Excellent | Doesn't give answers, asks guiding questions, streaming works |
| District AI Insights | ✅ PASS | Excellent | 5 findings, 3 concerns, 5 recommendations — all data-driven with exact numbers |
| IEP Present Levels | ✅ PASS | Exceptional | Pulled real mastery data, synthesized PLAAFP with 6 strengths, 6 needs, 11 baselines, impact statement |
| IEP Goals | ✅ PASS | Exceptional | 4 SMART goals with baselines, targets, measurement methods, frequency, similarity flags |
| IEP Accommodations | ✅ PASS | Exceptional | 16 accommodations across 4 categories with clinical SLD-specific rationales |
| IEP Progress Narrative | ✅ PASS | Excellent | Personalized parent-friendly narrative, trend analysis, specific recommendations |
| Batch Grading | ✅ PASS | Good | 4/6 graded (2 had no content to grade), scores range from F to A |
| Report Card Batch | ✅ PASS | Excellent | 7 individualized narratives referencing actual student performance data |
| Differentiation | ✅ PASS | Excellent | Clustered students by tier, generated scaffolded activities per tier |

### Remaining Work (Priority Order)
1. **Minor: Form validation UX** — quiz form doesn't show visible errors on empty submit
2. **Continue browser testing** — look for more visual/UX polish opportunities

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
