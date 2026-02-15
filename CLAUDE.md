# Paideia

K-12 education platform with 5 modules + Student AI Tutor, built for the Anthropic hackathon. Unified web app (no Chrome extension) covering instructional design, assessment intelligence, SPED/compliance, family engagement, district intelligence, and Socratic tutoring.

## Quick Start

```bash
npm run dev          # Start dev server on localhost:3000
npx vitest run       # Run all tests (24 files, 192 tests)
npx tsc --noEmit     # Type check
npx next build       # Production build (~100 routes)
npm run db:seed      # Seed demo data (requires DATABASE_URL)
```

Drizzle schema push uses `drizzle-kit` directly:

```bash
npx drizzle-kit push  # Push schema to Supabase (uses DIRECT_URL)
```

## Tech Stack

- **Framework**: Next.js 16 (App Router), TypeScript 5.9, React 19
- **Styling**: Tailwind CSS 4, shadcn/ui (radix-ui), lucide-react icons
- **Database**: Drizzle ORM 0.45 + PostgreSQL (Supabase hosted, connection pooler)
- **Auth**: NextAuth.js v5 (Auth.js beta 30) with @auth/drizzle-adapter, JWT strategy, credentials provider
- **AI**: Anthropic Claude API (claude-opus-4-6) via @anthropic-ai/sdk 0.74
- **Testing**: Vitest 4, @testing-library/react, jsdom
- **Forms**: react-hook-form + @hookform/resolvers + zod 4
- **Other**: bcryptjs, date-fns, react-markdown, sonner (toasts), next-themes

## Project Structure

```
src/
  app/
    api/                    # Route handlers (Next.js App Router)
      admin/                # District intelligence (overview, analytics, schools, teachers, students, insights)
      assignments/          # CRUD + AI generation
      auth/                 # NextAuth catch-all + registration + demo-login
      compliance/           # SPED compliance deadlines
      early-warning/        # At-risk student detection
      exit-tickets/         # Formative assessment generation
      grading/              # Single grade, batch, analytics, differentiate
      health/               # Health check
      iep/                  # IEP CRUD, goals, progress, AI generation
      lesson-plans/         # CRUD + AI generation
      mastery/              # Student mastery tracking + gap analysis
      messages/             # Parent-teacher messaging + translation
      parent/               # Parent dashboard + child detail + progress
      quizzes/              # Quiz listing + AI generation
      report-cards/         # CRUD + batch generation
      rubrics/              # CRUD + AI generation
      student/              # Student self-service progress
      tutor/                # Streaming Socratic tutor + sessions
    dashboard/              # Protected UI pages (role-aware sidebar)
    login/                  # Login page with quick demo buttons
    register/               # Registration page
    page.tsx                # Landing page
    layout.tsx              # Root layout
  components/
    ui/                     # shadcn/ui primitives (button, card, dialog, etc.)
    dashboard/              # Dashboard-specific components (stat-card, ai-insights, etc.)
    assignments/            # Assignment-specific components
    grading/                # Grading-specific components
    iep/                    # IEP-specific components
    mastery/                # Mastery-specific components
    messages/               # Messaging components
    parent/                 # Parent portal components
    report-cards/           # Report card components
    tutor/                  # Tutor chat components
    providers/              # Theme/session providers
  lib/
    ai/                     # AI service layer (13 modules)
      index.ts              # Re-exports all AI services
      generate-rubric.ts    # Rubric generation (tool_use)
      generate-lesson-plan.ts
      generate-assignment.ts
      generate-quiz.ts
      generate-exit-ticket.ts
      differentiate.ts
      grade-submission.ts   # Single + batch grading
      iep-service.ts        # Present levels, goals, accommodations, progress narrative
      parent-communication.ts # Progress narratives, weekly digests, translation
      tutor.ts              # Streaming Socratic responses
      district-insights.ts  # Aggregate analysis with extended thinking
      report-card.ts        # Individualized narrative generation
    ai.ts                   # Anthropic client singleton + AI_MODEL constant
    auth.ts                 # NextAuth configuration
    db/
      index.ts              # Drizzle client (postgres.js driver, prepare: false for Supabase pooler)
      schema/               # 16 schema files, 33+ tables
        demo.ts             # demoSessions
        cache.ts            # cacheEntries (DB-backed cache)
        auth.ts             # users (with demoSessionId), accounts, sessions, verificationTokens
        classes.ts          # schools, classes, classMembers
        standards.ts        # standards
        assignments.ts      # assignments, rubrics, rubricCriteria, differentiatedVersions
        submissions.ts      # submissions, feedbackDrafts, criterionScores
        mastery.ts          # masteryRecords
        lesson-plans.ts     # lessonPlans
        quizzes.ts          # quizzes, quizQuestions, questionStandards
        sped.ts             # ieps, iepGoals, progressDataPoints, complianceDeadlines
        communication.ts    # messages, notifications, parentChildren
        tutor.ts            # tutorSessions
        audit.ts            # auditLogs
        report-cards.ts     # reportCards
      seed.ts               # Seed script (29 users, schools, classes, standards, assignments, IEP data)
    cache.ts                # DB-backed cache helpers (getCached, setCache, cleanExpiredCache)
    demo-constants.ts       # DEMO_SEED_EMAILS, DEMO_ENTRY_EMAILS
    demo-clone.ts           # cloneDemoData(), cleanupExpiredDemoSessions()
    utils.ts                # cn() utility (clsx + tailwind-merge)
  hooks/                    # Custom React hooks
  types/                    # TypeScript type extensions (next-auth.d.ts)
  middleware.ts             # Auth middleware (protect /dashboard, redirect logged-in users)
tests/
  helpers.ts                # Test utilities (mockAuthSession, createChainMock, test users)
  api/                      # 22 API test files
drizzle.config.ts           # Drizzle Kit config (PostgreSQL, DIRECT_URL)
vitest.config.ts            # Vitest config (node env, @/ alias)
```

## Key Patterns

### API Routes

Every route handler follows this pattern:

```typescript
import { auth } from '@/lib/auth'
import { db } from '@/lib/db'
import { NextResponse } from 'next/server'

export async function GET() {
  // 1. Auth check
  const session = await auth()
  if (!session?.user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  // 2. Role check (where applicable)
  if (session.user.role !== 'admin') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  // 3. Business logic wrapped in try/catch
  try {
    const results = await db.select()...
    return NextResponse.json(results)
  } catch (error) {
    console.error('Failed to ...:', error)
    return NextResponse.json({ error: 'Failed to ...' }, { status: 500 })
  }
}
```

Roles: `teacher`, `sped_teacher`, `admin`, `parent`, `student`. The session object carries `user.id`, `user.role`, `user.email`, and `user.name` via JWT callbacks in `src/lib/auth.ts`.

### AI Services

All AI generation uses the `tool_use` pattern with forced `tool_choice` for structured output:

```typescript
import { anthropic, AI_MODEL } from '@/lib/ai'

const response = await anthropic.messages.create({
  model: AI_MODEL,                              // 'claude-opus-4-6'
  max_tokens: 4096,
  system: '...',                                // Role-specific system prompt
  tools: [{
    name: 'tool_name',
    description: '...',
    input_schema: { type: 'object', properties: {...}, required: [...] },
  }],
  tool_choice: { type: 'tool', name: 'tool_name' }, // Forces structured output
  messages: [{ role: 'user', content: '...' }],
})

// Extract structured data from tool_use block
const toolUseBlock = response.content.find(
  (block): block is Extract<typeof block, { type: 'tool_use' }> => block.type === 'tool_use'
)
return toolUseBlock.input as YourType
```

The Anthropic client is a singleton in `src/lib/ai.ts` using the global-for pattern (prevents multiple instances in dev). The tutor uses `anthropic.messages.stream()` for real-time Socratic responses.

### Database

Drizzle ORM with PostgreSQL via Supabase connection pooler. The client uses `prepare: false` (required for Supabase pooler mode).

```typescript
import { db } from '@/lib/db'
import { assignments, classes } from '@/lib/db/schema'
import { eq, and, desc } from 'drizzle-orm'

// Select with joins
const results = await db
  .select({ assignment: assignments, className: classes.name })
  .from(assignments)
  .leftJoin(classes, eq(assignments.classId, classes.id))
  .where(eq(assignments.teacherId, userId))
  .orderBy(desc(assignments.createdAt))

// Insert with returning
const [created] = await db.insert(assignments).values({...}).returning()

// Relational queries
const user = await db.query.users.findFirst({
  where: eq(users.email, email),
})
```

Schema files are in `src/lib/db/schema/` and re-exported from `index.ts`. All tables use `cuid2` for primary keys.

### Testing

Tests are Vitest API-level tests in `tests/api/`. The standard mock setup:

```typescript
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { mockAuthSession, mockNoAuth, TEST_TEACHER, createPostRequest } from '../helpers'

// Mock auth
vi.mock('@/lib/auth', () => ({ auth: vi.fn() }))

// Mock database with chainable query builder
function createChainMock(result: unknown = []) {
  const chain: Record<string, any> = {}
  const methods = ['select', 'from', 'leftJoin', 'innerJoin', 'where',
    'orderBy', 'limit', 'insert', 'values', 'returning',
    'update', 'set', 'delete', 'groupBy']
  for (const method of methods) {
    chain[method] = vi.fn().mockReturnValue(chain)
  }
  chain.then = (resolve: (v: unknown) => void, reject?: (e: unknown) => void) => {
    return Promise.resolve(result).then(resolve, reject)
  }
  return chain
}

let selectResult: unknown = []
vi.mock('@/lib/db', () => ({
  db: {
    select: vi.fn(() => createChainMock(selectResult)),
    insert: vi.fn(() => createChainMock(insertResult)),
    query: {},
  },
}))

// In tests: set selectResult before calling the route handler
selectResult = [{ id: '1', title: 'Test' }]
const response = await GET()
```

Key helpers in `tests/helpers.ts`:
- `mockAuthSession(authFn, user)` -- set up authenticated session
- `mockNoAuth(authFn)` -- set up unauthenticated state
- `createGetRequest(path, params?)` -- create GET Request with query params
- `createPostRequest(path, body)` -- create POST Request with JSON body
- `TEST_TEACHER`, `TEST_STUDENT`, `TEST_PARENT`, `TEST_ADMIN`, `TEST_SPED_TEACHER` -- fixture users

### Auth

NextAuth.js v5 with JWT strategy and credentials provider. Configured in `src/lib/auth.ts`. Exports `auth`, `signIn`, `signOut`, `handlers`.

Session shape (via JWT callbacks):

```typescript
session.user.id    // string (cuid2)
session.user.role  // 'teacher' | 'sped_teacher' | 'admin' | 'parent' | 'student'
session.user.email // string
session.user.name  // string
```

Middleware in `src/middleware.ts` protects `/dashboard/*` routes and redirects authenticated users away from `/login` and `/register`. API routes handle their own auth checks.

## Seed Users

All passwords: `password123`

| Email | Role | Description |
|-------|------|-------------|
| rivera@school.edu | teacher | 8th grade ELA |
| okafor@school.edu | teacher | 10th grade Biology |
| chen@school.edu | teacher | 3rd grade |
| rodriguez@school.edu | sped_teacher | SPED case manager |
| williams@school.edu | admin | District admin |
| sarah.chen@email.com | parent | Parent of Aisha Torres |
| marcus.williams@email.com | parent | Parent of DeShawn Williams |
| aisha@student.edu | student | 8th grade student |
| deshawn@student.edu | student | 10th grade student |

## Environment Variables

```
DATABASE_URL=          # Supabase pooler connection string (used by app)
DIRECT_URL=            # Supabase direct connection string (used by drizzle-kit push)
ANTHROPIC_API_KEY=     # Anthropic API key for Claude
AUTH_SECRET=           # NextAuth.js secret (generate with: openssl rand -base64 32)
```
