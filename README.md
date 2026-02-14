# AI Teaching OS

A K-12 education platform that unifies the fragmented teaching lifecycle — planning, instruction, assessment, communication, and compliance — into a single AI-native system. Built for the Anthropic hackathon as a demonstration of creative Claude Opus usage.

## Two Deliverables, One Project

This project ships two artifacts:

### 1. The Application

A fully functional web application with 55 API routes, 40+ dashboard pages, and 13 AI service modules powered by Claude Opus. Five user roles (Teacher, SPED Teacher, Admin, Parent, Student) each get tailored dashboards, permissions, and data scoping.

### 2. The Executable English Specification

The entire application distilled into **943 behavioral tests written in plain English** — no code, just precise descriptions of what the system does. Any AI coding agent can translate these tests into real tests and implement the system in any programming language. See [`spec/README.md`](spec/README.md) for details.

**The creative angle:** Claude Opus built the application. Claude Opus then distilled it into a language-agnostic specification. Any Claude instance can reconstruct the application from that specification alone. The code is ephemeral. The specification is the product.

## Modules

| Module | What It Does |
|--------|-------------|
| **Instructional Design** | AI-generated lesson plans, assignments, rubrics, quizzes, exit tickets, and 3-tier differentiation |
| **Assessment Intelligence** | AI grading with rubric-aligned feedback, batch processing, longitudinal mastery tracking, gap analysis |
| **Special Education** | IEP development with AI-drafted present levels, SMART goals, accommodations, progress monitoring, compliance tracking |
| **Family Engagement** | Parent portal with AI-synthesized progress narratives, multilingual messaging (10+ languages), AI transparency panel |
| **District Intelligence** | Admin dashboards with school analytics, teacher engagement metrics, early warning system, AI-powered district insights |
| **Student AI Tutor** | Streaming Socratic tutoring that asks guiding questions instead of giving answers, with practice recommendations based on mastery gaps |

## How Claude Opus Is Used

Every AI feature runs through Claude Opus using the `tool_use` pattern for structured output:

- **Grading**: Analyzes student essays against rubrics, generates criterion-level scores and individualized feedback
- **Content Generation**: Creates standards-aligned lesson plans, rubrics, quizzes, and differentiated materials
- **IEP Writing**: Drafts present levels, SMART goals, and accommodations from student data — with similarity detection to prevent cookie-cutter IEPs
- **Parent Communication**: Synthesizes assessment data into plain-language progress narratives, translates to 10+ languages
- **District Insights**: Uses extended thinking to analyze district-wide patterns and generate actionable recommendations
- **Socratic Tutoring**: Streams conversational responses that guide students through problems without giving direct answers
- **Early Warning**: Identifies at-risk students and generates specific, data-driven intervention recommendations

The tutor is the only service using streaming (`messages.stream()`). All others use forced `tool_choice` for structured JSON output.

## Quick Start

```bash
# Install dependencies
npm install

# Set environment variables
cp .env.example .env  # Then fill in values

# Push schema and seed data
npx drizzle-kit push
npm run db:seed

# Start development server
npm run dev
```

Open [localhost:3000](http://localhost:3000) and sign in with any demo account.

## Demo Accounts

All passwords: `password123`

| Email | Role | Persona |
|-------|------|---------|
| `rivera@school.edu` | Teacher | 8th grade ELA, 5 classes, 16 students |
| `okafor@school.edu` | Teacher | 10th grade Biology, 3 classes |
| `chen@school.edu` | Teacher | 3rd grade, all subjects |
| `rodriguez@school.edu` | SPED Teacher | Case manager, 2 IEPs |
| `williams@school.edu` | Admin | District administrator |
| `sarah.chen@email.com` | Parent | Parent of Aisha Torres |
| `marcus.williams@email.com` | Parent | Parent of DeShawn Williams |
| `aisha@student.edu` | Student | 8th grader, high mastery |
| `deshawn@student.edu` | Student | 10th grader, struggling in ELA |

## Tech Stack

- **Framework**: Next.js 16, TypeScript, React 19
- **Styling**: Tailwind CSS 4, shadcn/ui, Lucide icons
- **Database**: Drizzle ORM + PostgreSQL (Supabase)
- **Auth**: NextAuth.js v5 with JWT strategy
- **AI**: Anthropic Claude Opus via `@anthropic-ai/sdk`
- **Testing**: Vitest (192 passing tests)

## Environment Variables

```
DATABASE_URL=        # Supabase pooler connection string
DIRECT_URL=          # Supabase direct connection string (for migrations)
ANTHROPIC_API_KEY=   # Anthropic API key
AUTH_SECRET=         # NextAuth secret (openssl rand -base64 32)
```

## The Executable Spec

The `spec/` directory contains the entire application described in plain English:

```
spec/
├── ARCHITECTURE.md           # System design and module map
├── SCHEMA.md                 # 31 tables, every column and relationship
├── AI_CONTRACTS.md           # 21 AI service behavioral contracts
└── tests/                    # 943 behavioral tests across 11 files
    ├── auth.tests.md              (128 tests)
    ├── admin-district.tests.md    (100 tests)
    ├── ui-pages.tests.md           (99 tests)
    ├── iep-compliance.tests.md     (98 tests)
    ├── grading.tests.md            (91 tests)
    ├── student-experience.tests.md (89 tests)
    ├── content-generation.tests.md (85 tests)
    ├── mastery-analytics.tests.md  (82 tests)
    ├── communication.tests.md      (68 tests)
    ├── parent-portal.tests.md      (54 tests)
    └── assignments.tests.md        (49 tests)
```

To rebuild the app in another language, give the `spec/` directory to an AI coding agent and say: *"Translate every English test into a real test. Then implement until all tests pass. Do not modify the tests."*

## Project Stats

- **55** API route handlers
- **40+** dashboard pages
- **13** AI service modules (21 service functions)
- **31+** database tables
- **943** English behavioral tests
- **192** coded tests (Vitest)
- **5** user roles with full RBAC
- **~16,000** lines of specification
