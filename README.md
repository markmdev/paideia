# Paideia

**Live at [usepaideia.com](https://usepaideia.com)**

https://github.com/markmdev/paideia/raw/main/paideia-demo-final.mp4

---

Paideia is a K-12 education platform — planning, grading, IEPs, parent communication, district analytics, and a Socratic AI tutor — built entirely by Claude Opus in a single autonomous session.

**21 hours. 30 iterations. Zero human-written code.**

<img src="resources/cc-time.png" alt="Claude Code session: 30 iterations complete, cooked for 21h 3m 19s" width="600">

## What Opus Built

One human described a vision. Opus did everything else.

Opus researched the K-12 education market — reading teacher communities on Reddit, analyzing competitors, studying FERPA and IDEA compliance requirements, reviewing peer-reviewed AI tutoring studies from Harvard, Stanford, and CMU. It synthesized all of that into a [16,000-line product specification](spec/) covering five user roles, five platform modules, and 943 behavioral requirements.

Then it built the whole thing. 55 API endpoints. 40+ dashboard pages. 13 AI service modules. 31 database tables. 192 passing tests. A production Next.js application with authentication, role-based access control, real-time streaming, and every AI feature powered by Opus itself — grading student essays, writing IEP goals, generating lesson plans, tutoring students through Socratic dialogue.

Then it reviewed its own code. Found bugs. Fixed them. Refactored. Ran 30 iterations of browser testing to polish the UI. Wrote an executable English specification so precise that another AI agent can rebuild the entire application from scratch in any programming language.

Then it bought a domain, configured DNS, and deployed itself to production.

And right now, another Opus session is generating the video for this submission.

**It's Opus all the way down.**

## The Platform

Paideia unifies the fragmented teaching lifecycle into one AI-native system. Teachers currently juggle 5–10 disconnected tools. Paideia replaces all of them.

| Module | What It Does |
|--------|-------------|
| **Instructional Design** | AI-generated lesson plans, assignments, rubrics, quizzes, exit tickets — all standards-aligned, with automatic 3-tier differentiation |
| **Assessment Intelligence** | Grade a class set of essays in 90 seconds. Rubric-aligned feedback, batch processing, longitudinal mastery tracking, gap analysis |
| **Special Education** | Full IEP workflow — AI-drafted present levels, SMART goals, accommodations, progress monitoring, compliance deadlines. Cookie-cutter detection built in |
| **Family Engagement** | Parent portal with AI-synthesized progress narratives in plain language, multilingual messaging, and an AI transparency panel |
| **District Intelligence** | Cross-school analytics, teacher engagement, early warning system, and AI-powered district insights using extended thinking |
| **Student AI Tutor** | Streaming Socratic tutoring — asks guiding questions, never gives answers. Grounded in the student's actual assignments and mastery gaps |

Five roles — Teacher, SPED Teacher, Admin, Parent, Student — each with tailored dashboards, permissions, and data scoping.

## The Executable English Specification

The most creative part: after building the application, Opus distilled it into **943 behavioral tests written in plain English**. No code. Just precise Given/When/Then descriptions of every API endpoint, every permission check, every AI service contract.

Hand the [`spec/`](spec/) directory to any AI coding agent and say:

> *"Translate every English test into a real test. Then implement until all tests pass."*

The agent produces a fully functional Paideia — in TypeScript, Go, Python, Rust, whatever. The code is ephemeral. The specification is the product.

**[Read the full spec →](spec/README.md)**

## Try It

**Live:** [usepaideia.com](https://usepaideia.com) — sign in with any demo account below.

All passwords: `password123`

| Email | Role |
|-------|------|
| `rivera@school.edu` | Teacher (8th grade ELA) |
| `rodriguez@school.edu` | SPED Teacher |
| `williams@school.edu` | District Admin |
| `sarah.chen@email.com` | Parent |
| `aisha@student.edu` | Student |

## Tech Stack

Next.js 16 · TypeScript · React 19 · Tailwind CSS 4 · shadcn/ui · Drizzle ORM · PostgreSQL (Supabase) · NextAuth.js v5 · Claude Opus (`claude-opus-4-6`) · Vitest (192 tests) · Vercel

## By the Numbers

| | |
|---|---|
| Autonomous build time | **21 hours 3 minutes** |
| Build iterations | **30** |
| API endpoints | **55** |
| Dashboard pages | **40+** |
| AI service modules | **13** (21 functions) |
| Database tables | **31+** |
| English behavioral tests | **943** |
| Coded tests | **192** |
| Lines of specification | **15,987** |
| Human-written lines of code | **0** |
