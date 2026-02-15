## Current Status (2026-02-15 11:05)

**Paideia deployed to production.** Live at [usepaideia.com](https://usepaideia.com).

### What Is Paideia
K-12 AI education platform (hackathon submission) with two deliverables:
1. **The Application** — 55 API routes, 40+ dashboard pages, 13 AI service modules, 31+ DB tables, 5 user roles
2. **The Executable English Specification** — 943 behavioral tests in plain English that any AI agent can use to rebuild the app in any programming language

### Deployment
- **Production URL:** https://usepaideia.com (custom domain on Vercel)
- **Vercel project:** teaching-os (auto-deploys on push to main)
- **GitHub:** https://github.com/markmdev/paideia
- **Env vars on Vercel:** DATABASE_URL, ANTHROPIC_API_KEY, AUTH_SECRET
- `NEXTAUTH_URL` is NOT set on Vercel — pages use `getBaseUrl()` from `src/lib/url.ts` which derives the URL from the request's `host` header

### Production Fixes (2026-02-15)
- **Server component self-fetches** — analytics, students, teachers, schools pages used `process.env.NEXTAUTH_URL || 'http://localhost:3000'` which fails on Vercel. Created `src/lib/url.ts` with `getBaseUrl()` that reads from request headers.
- **Mastery 404** — Created `/dashboard/mastery/[studentId]` page (was missing, linked from class detail page)
- **Early warning caching** — Added 5-minute in-memory cache for AI intervention recommendations to avoid Claude API call on every page load

### READMEs
Rewrote both `README.md` and `spec/README.md` to focus on the Opus story — 21-hour autonomous build, Opus-powered research, self-deployment, video generation. Less technical, more inspiring.

### Executable English Specification
```
spec/
├── README.md              — Hackathon pitch + usage guide
├── ARCHITECTURE.md        — System design, 57 routes, 5 role nav trees
├── SCHEMA.md              — 31 tables, every column/type/constraint
├── AI_CONTRACTS.md        — 21 AI service behavioral contracts
└── tests/                 — 943 behavioral tests in 11 files
```

### Build Health
- TypeScript: zero errors
- Tests: 192/192 passing across 24 files
- Production build: clean on Vercel

### Seed Users (password: password123)
- rivera@school.edu (teacher, 8th ELA)
- okafor@school.edu (teacher, 10th Bio)
- chen@school.edu (teacher, 3rd grade)
- rodriguez@school.edu (sped_teacher)
- williams@school.edu (admin)
- sarah.chen@email.com (parent)
- marcus.williams@email.com (parent)
- aisha@student.edu (student)
- deshawn@student.edu (student)
