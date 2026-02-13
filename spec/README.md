# AI Teaching OS — Executable English Specification

> **This repository contains no application code.** It contains a complete behavioral specification — architecture, data model, AI service contracts, and 300+ tests written in plain English — that any AI coding agent can implement in any programming language.

## The Concept

What if you could describe an entire application so precisely in English that an AI agent could build it from scratch?

This is that experiment. The AI Teaching OS is a K-12 education platform with 55+ API endpoints, 40+ dashboard pages, 13 AI service modules, and 31+ database tables. Instead of shipping code, we ship the **specification**: behavioral tests and architectural contracts written in plain English.

**To build the application:**

1. Give this entire `spec/` directory to an AI coding agent (Claude Code, Cursor, Codex, etc.)
2. Tell it: *"Translate every English test into a real test in [your language]. Then implement the application until all tests pass. You may not modify the tests."*
3. The agent produces a fully functional AI Teaching OS.

The specification is language-agnostic. It works for TypeScript/Next.js, Go/Chi, Python/FastAPI, Java/Spring, Rust/Axum — any stack capable of building a web application with an AI integration layer.

## Why This Exists

This is a submission for the Anthropic hackathon demonstrating **creative usage of Claude Opus**. The creative angle:

- Claude Opus built the original application (55 routes, 40+ pages, 13 AI modules, 192 tests)
- Claude Opus then distilled the running application into this language-agnostic specification
- Any Claude instance can reconstruct the application from this specification alone
- **The code is ephemeral. The specification is the product.**

This demonstrates that AI can work at the *specification level* — understanding, translating, and implementing complex behavioral requirements across language boundaries — not just at the code level.

## Specification Structure

```
spec/
├── README.md                        # You are here
├── ARCHITECTURE.md                  # System design, modules, patterns, decisions
├── SCHEMA.md                        # Complete data model (every table, column, relationship)
├── AI_CONTRACTS.md                  # AI service behavioral contracts (inputs → outputs)
└── tests/
    ├── auth.tests.md                # Authentication, authorization, role guards
    ├── assignments.tests.md         # Assignment CRUD and AI generation
    ├── grading.tests.md             # Grading, batch processing, analytics, differentiation
    ├── content-generation.tests.md  # Rubrics, lesson plans, quizzes, exit tickets
    ├── iep-compliance.tests.md      # IEP lifecycle, SPED compliance, progress monitoring
    ├── mastery-analytics.tests.md   # Mastery tracking, gap analysis, early warning
    ├── communication.tests.md       # Messaging, translation, contacts
    ├── parent-portal.tests.md       # Parent dashboard, child detail, progress narratives
    ├── student-experience.tests.md  # Student dashboard, progress, AI tutor
    ├── admin-district.tests.md      # District analytics, schools, teachers, report cards
    └── ui-pages.tests.md           # All dashboard pages, landing page, navigation
```

## Test Format

Every test uses BDD-style English with Given/When/Then:

```markdown
### Authenticated teacher can create an assignment

**Given** a teacher "Ms. Rivera" is signed in with role "teacher"
**And** a class "Period 1 ELA" exists that she teaches

**When** she sends POST /api/assignments with body:
  - title: "Poetry Analysis Essay"
  - classId: [the class ID]
  - subject: "ELA"
  - gradeLevel: "8"
  - type: "essay"
  - description: "Analyze the use of metaphor"

**Then** the response status is 201
**And** the response contains an assignment with:
  - id: a unique string identifier
  - title: matching the submitted value
  - teacherId: matching the signed-in teacher's ID
  - createdAt: a valid timestamp
**And** the assignment is retrievable via GET /api/assignments
```

## Rules for Implementing Agents

1. **Translate tests first.** Convert every English test into a real test in your chosen language and framework before writing any application code.

2. **Tests are immutable.** You may not modify, skip, or weaken any test. If a test seems wrong, implement what it describes — the tests ARE the specification.

3. **Architecture is guidance.** ARCHITECTURE.md describes the system design. Follow its module structure and patterns, but adapt to your chosen language's idioms.

4. **Schema is mandatory.** SCHEMA.md defines every table, column, and relationship. Your data model must match exactly — field names, types, and constraints.

5. **AI contracts are behavioral.** AI_CONTRACTS.md defines what each AI service does, not how. Use any AI provider, but the inputs, outputs, and behavior must match.

6. **All tests must pass.** The implementation is complete when every English test has a corresponding real test, and every real test passes.

## What the AI Teaching OS Does

A K-12 education platform with 5 interconnected modules and a student AI tutor:

| Module | Purpose | Key Features |
|--------|---------|-------------|
| **Instructional Design** | Planning & content creation | Lesson plans, assignments, rubrics, quizzes, exit tickets, differentiation |
| **Assessment Intelligence** | Grading & feedback | AI-powered rubric-aligned feedback, batch grading, mastery tracking, gap analysis |
| **Special Education** | IEP & compliance | IEP development, progress monitoring, compliance deadlines, accommodations |
| **Family Engagement** | Parent communication | Parent portal, progress narratives, multilingual messaging, AI transparency |
| **District Intelligence** | Admin analytics | School dashboards, teacher engagement, early warning, AI insights |
| **Student AI Tutor** | Socratic tutoring | Streaming chat, subject selection, practice recommendations, session history |

**5 user roles:** Teacher, SPED Teacher, Admin, Parent, Student — each with role-specific dashboards, permissions, and data scoping.

## Metrics

The original implementation (which this spec describes):

- **55** API route handlers
- **40+** dashboard pages
- **13** AI service modules
- **31+** database tables
- **192** passing tests
- **5** user roles with complete RBAC
- **0** TypeScript errors
- **~100** compiled routes in production build
