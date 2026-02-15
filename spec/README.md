# The Executable English Specification

> An AI built an application. Then it described the application so precisely in plain English that another AI can rebuild it from scratch — in any programming language.

## What This Is

This directory contains **943 behavioral tests written in plain English** — not code, not pseudocode, but precise Given/When/Then descriptions of every API endpoint, every permission check, every AI service contract, and every data relationship in a full K-12 education platform.

These tests, along with architectural guidance and a complete data model, form a specification so detailed that an AI coding agent can translate it into working software without seeing the original implementation.

**The code is ephemeral. The specification is the product.**

## How It Was Made

Claude Opus built the Paideia application autonomously over 21 hours — 55 API endpoints, 40+ dashboard pages, 13 AI service modules, 31 database tables, 192 coded tests. Then, in the same session, Opus read its own source code and distilled the running application into this language-agnostic specification.

The original application exists as a TypeScript/Next.js codebase. But the specification describes *behavior*, not implementation. It works for any language and framework.

## How to Use It

Give this directory to any AI coding agent — Claude Code, Cursor, Devin, Copilot Workspace, or whatever comes next — and say:

> *"Translate every English test into a real test in [your language]. Then implement the application until all tests pass. You may not modify the tests."*

The agent will produce a fully functional Paideia instance. TypeScript, Go, Python, Rust, Java — the spec doesn't care.

### Rules for Implementing Agents

1. **Translate tests first.** Convert every English test into a real test before writing application code.
2. **Tests are immutable.** You may not modify, skip, or weaken any test. The tests ARE the specification.
3. **Schema is mandatory.** SCHEMA.md defines every table, column, and relationship. Your data model must match exactly.
4. **AI contracts are behavioral.** AI_CONTRACTS.md defines what each AI service does, not how. Use any AI provider.
5. **Architecture is guidance.** ARCHITECTURE.md describes the system design. Follow its structure, adapt to your language's idioms.
6. **Done means all tests pass.** The implementation is complete when every English test has a corresponding real test, and every real test passes.

## What's Inside

```
spec/
├── ARCHITECTURE.md         — System design, 5 modules, API map, auth model, patterns
├── SCHEMA.md               — 31 tables, every column, type, constraint, and relationship
├── AI_CONTRACTS.md         — 21 AI service behavioral contracts with inputs, outputs, and guardrails
└── tests/                  — 943 behavioral tests across 11 domains
    ├── auth.tests.md               128 tests — authentication, authorization, role-based access
    ├── admin-district.tests.md     100 tests — district analytics, schools, teachers, insights
    ├── ui-pages.tests.md            99 tests — dashboard shell, navigation, role-specific views
    ├── iep-compliance.tests.md      98 tests — IEP lifecycle, SPED compliance, progress monitoring
    ├── grading.tests.md             91 tests — AI grading, batch processing, mastery analytics
    ├── student-experience.tests.md  89 tests — student dashboard, progress, Socratic AI tutor
    ├── content-generation.tests.md  85 tests — rubrics, lesson plans, quizzes, exit tickets
    ├── mastery-analytics.tests.md   82 tests — mastery tracking, gap analysis, early warning
    ├── communication.tests.md       68 tests — messaging, translation, contacts
    ├── parent-portal.tests.md       54 tests — parent dashboard, child progress, narratives
    └── assignments.tests.md         49 tests — assignment CRUD and AI generation
```

**15,987 lines of specification across 15 files.**

## Test Format

Every test uses BDD-style English:

```markdown
### Authenticated teacher can create an assignment

**Given** a teacher "Ms. Rivera" is signed in with role "teacher"
**And** a class "Period 1 ELA" exists that she teaches

**When** she sends POST /api/assignments with body:
  - title: "Poetry Analysis Essay"
  - classId: [the class ID]
  - subject: "ELA"
  - gradeLevel: "8"

**Then** the response status is 201
**And** the response contains an assignment with:
  - id: a unique string identifier
  - title: matching the submitted value
  - teacherId: matching the signed-in teacher's ID
**And** the assignment is retrievable via GET /api/assignments
```

Tests specify HTTP methods, paths, request bodies, response codes, response shapes, role requirements, and error cases. Every endpoint has tests for success, 401 unauthorized, 403 forbidden, 404 not found, and 400 validation errors.

## Why This Matters

Software has always been trapped in its implementation language. A Python app can't become a Go app without a rewrite. But if you specify behavior precisely enough — in plain English, with no language-specific assumptions — then the specification becomes portable. The implementation becomes a compilation target.

This is Opus working at the specification level: understanding complex systems, translating running software into behavioral contracts, and producing artifacts that other AI agents can implement. Not generating code. Generating *understanding*.
