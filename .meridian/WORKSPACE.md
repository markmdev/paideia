# AI Teaching OS - Workspace

## Project Overview
Building a K-12 education platform for Anthropic hackathon. Five modules + Student AI Tutor, all in one Next.js web app.

## Tech Stack
- **Frontend**: Next.js 16 (App Router), TypeScript, Tailwind CSS, shadcn/ui
- **Database**: Drizzle ORM + PostgreSQL (Supabase hosted)
- **Auth**: NextAuth.js (Auth.js v5) with @auth/drizzle-adapter
- **AI**: Anthropic Claude API (Opus 4.6) via @anthropic-ai/sdk v0.74.0
- **Testing**: Vitest + API endpoint testing

## Supabase Config
- Project: teaching-os
- URL: https://qeayczyoaqttlwpstwbn.supabase.co
- DB: postgresql://postgres:[PASS]@db.qeayczyoaqttlwpstwbn.supabase.co:5432/postgres
- Credentials in .env (never committed)

## Epic: TEAC-w25zza
| Phase | Pebble ID | Status |
|-------|-----------|--------|
| P1: Foundation | TEAC-xlssqq | In Progress |
| P2: Instructional Design | TEAC-nz1ote | Blocked by P1 |
| P3: Assessment Intelligence | TEAC-4bg5ia | Blocked by P2 |
| P4: SPED/Compliance | TEAC-275nqy | Blocked by P3 |
| P5: Family Engagement | TEAC-hc17it | Blocked by P4 |
| P6: Student AI Tutor | TEAC-2novwk | Blocked by P5 |
| P7: District Intelligence | TEAC-rnynnz | Blocked by P6 |
| P8: Integration & Polish | TEAC-y2fott | Blocked by P7 |

## Key Decisions
- No Chrome extension - unified web platform
- PostgreSQL via Supabase (deployment-ready)
- Anthropic API key stored in .env (ANTHROPIC_API_KEY)
- Creative Opus usage: multi-step reasoning, tool_use, Socratic dialogue, multi-perspective review
- All coding delegated to sub-agents; orchestrator only verifies

## API Docs
- [Anthropic API](./api-docs/anthropic-api.md) - DONE (SDK v0.74.0, claude-opus-4-6)
- [Drizzle ORM](./api-docs/drizzle-orm.md) - being researched
- Next.js Stack - will research if needed

## Creative Opus Usage Plans
1. **Structured output + Zod** for rubrics, lesson plans, IEP goals (typed generation)
2. **Adaptive thinking** for complex assessment analysis (shows reasoning to teachers)
3. **Tool use + toolRunner** for multi-step grading pipeline
4. **Streaming** for real-time Socratic tutor responses
5. **Prompt caching** for rubrics reused across student grading
6. **Message batches** for batch grading entire classes asynchronously
7. **Multi-modal** for handwritten work analysis (image upload)

## Active Context
- Foundation layer complete: Next.js 16, Drizzle ORM, NextAuth.js with credentials auth, DB schema, middleware
- Building dashboard layout (P1 task): sidebar nav, user menu, role-aware dashboard home, session provider
- Files to create:
  1. `src/components/providers/session-provider.tsx` - AuthSessionProvider wrapper
  2. `src/components/dashboard/sidebar-nav.tsx` - Role-aware sidebar navigation
  3. `src/components/dashboard/user-menu.tsx` - User dropdown with sign out
  4. `src/app/dashboard/layout.tsx` - Dashboard layout with sidebar + header
  5. `src/app/dashboard/page.tsx` - Role-aware dashboard home
  6. Update `src/app/page.tsx` - Landing page with hero
  7. Update `src/app/layout.tsx` - Wrap with SessionProvider
- Existing shadcn components: sidebar, card, badge, dropdown-menu, avatar, button, separator, sheet, tabs, etc.
- User roles: teacher, student, parent, sped_teacher, admin, district_admin
