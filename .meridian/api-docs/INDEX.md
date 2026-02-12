# External Tools & APIs

Knowledge docs for external tools, APIs, and libraries. Each doc contains everything you need to work with that tool: overview, current state, API operations, limits, gotchas.

**Rule: You MUST NOT write code using an external tool unless it's documented here. If you need a tool that isn't listed (or need info not covered), run the `docs-researcher` agent first.**

## When to Read These Docs

- Before writing ANY code that uses an external tool
- When planning features that involve external integrations
- When you need current info (versions, models, limits)
- When something isn't working as expected

## When to Run docs-researcher

- Tool not listed below
- Listed but missing the operations/info you need
- Need to verify current state (versions change, models get deprecated)
- Uncertain about limits, pricing tiers, or constraints

## Available Documentation

- anthropic-api.md: Anthropic Claude API -- Messages API, tool use, streaming, structured outputs, extended thinking, prompt caching, batches. SDK v0.74.0. Models through claude-opus-4-6.
- nextjs-stack.md: Next.js 15 full-stack SaaS stack -- App Router, Server Components, Server Actions, Route Handlers, Auth.js v5, Prisma 7 with SQLite, shadcn/ui, middleware, data access patterns, caching, form validation with Zod.
- drizzle-orm.md: Drizzle ORM for PostgreSQL -- schema definition, all PG column types, relations (one-to-many, many-to-many), query builder API (select/insert/update/delete/joins), relational queries, migrations with drizzle-kit, postgres.js driver setup, Next.js integration, type inference, operators. v0.45.1 / drizzle-kit v0.31.9.
