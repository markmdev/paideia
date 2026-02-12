# Next.js Full-Stack SaaS Stack

A comprehensive reference for building full-stack SaaS applications with Next.js, Auth.js, Prisma, and shadcn/ui.

**Versions researched**: Next.js 15.5.12 (latest v15), Next.js 16.1.6 (latest stable), next-auth 5.0.0-beta.30, Prisma 7.4.0, shadcn CLI 3.8.4 (as of 2026-02-11)
**Official docs**: https://nextjs.org/docs

---

## Overview

Next.js is a React framework for building full-stack web applications. The App Router (introduced in v13, stable since v14) is the recommended architecture. It uses React Server Components by default, file-system routing, and supports Server Actions for mutations.

The stack covered here:
- **Next.js 15** -- App Router, Server Components, Server Actions, Middleware
- **Auth.js v5 (NextAuth.js)** -- Authentication with OAuth, credentials, session management
- **Prisma 7** -- Type-safe ORM with SQLite for development/small-scale production
- **shadcn/ui** -- Copy-paste component library built on Radix UI and Tailwind CSS

### Next.js 15 vs 16

Next.js 16 is the latest stable release. Key differences from v15:
- Next.js 16 uses `proxy.ts` instead of `middleware.ts` for request proxying
- Next.js 16 introduces `use cache` directive and `cacheTag`/`updateTag` APIs
- Next.js 16 defaults to Turbopack for both dev and build
- `create-next-app` now prompts for React Compiler support

**For new projects in early 2026**, Next.js 15 remains a safe, well-documented choice. Next.js 16 is stable but some ecosystem libraries (notably next-auth) may still target v15 patterns. This document focuses on Next.js 15 patterns that also work in 16.

---

## How It Works

### App Router Architecture

The App Router uses a nested file-system routing model. Every folder inside `app/` maps to a URL segment. Special files define the UI for each segment:

| File | Purpose |
|------|---------|
| `page.tsx` | The UI for a route (makes the route publicly accessible) |
| `layout.tsx` | Shared UI that wraps child pages and layouts (persists across navigations) |
| `loading.tsx` | Loading UI (wraps page in a React Suspense boundary) |
| `error.tsx` | Error UI (wraps page in a React error boundary) |
| `not-found.tsx` | UI shown when `notFound()` is called |
| `route.ts` | API endpoint (Route Handler) -- cannot coexist with `page.tsx` at same path |
| `template.tsx` | Like layout but re-renders on every navigation |
| `default.tsx` | Fallback for parallel routes |

### Component Rendering Model

**Server Components** (the default): Render on the server. Can be async. Can directly access databases, file systems, environment variables. Their code never ships to the browser.

**Client Components** (marked with `'use client'`): Render on both server (for initial HTML) and client. Required for interactivity (state, event handlers, browser APIs, hooks like `useState`, `useEffect`).

The `'use client'` directive declares a boundary. Everything imported by a Client Component is included in the client bundle. Server Components can import Client Components but not vice versa.

**Key mental model**: Start with Server Components for everything. Add `'use client'` only at the leaf-level interactive components. Keep the boundary as low as possible in the tree.

### Server Components vs Client Components Decision Matrix

Use **Server Components** when you need to:
- Fetch data from databases or APIs
- Access secrets (API keys, tokens)
- Keep heavy dependencies server-side
- Reduce client JavaScript

Use **Client Components** when you need:
- `useState`, `useReducer`, or other React state
- Event handlers (`onClick`, `onChange`)
- `useEffect` or other lifecycle hooks
- Browser APIs (`localStorage`, `window`, geolocation)
- Custom hooks that depend on any of the above

### Rendering Flow

1. **Server**: React renders Server Components into RSC Payload (binary). Client Components are placeholder references.
2. **Client (first load)**: HTML is displayed immediately (non-interactive). RSC Payload reconciles the tree. JavaScript hydrates Client Components.
3. **Subsequent navigations**: RSC Payload is fetched, cached, and used to update the UI without a full page reload. Client Components render entirely on the client.

---

## Project Structure

### Recommended Layout for a SaaS App

```
my-app/
  app/
    (auth)/                    # Route group for auth pages
      login/page.tsx
      register/page.tsx
      layout.tsx               # Auth-specific layout (no sidebar, etc.)
    (dashboard)/               # Route group for authenticated pages
      dashboard/page.tsx
      settings/page.tsx
      layout.tsx               # Dashboard layout with sidebar/nav
    api/
      auth/[...nextauth]/route.ts  # Auth.js route handler
      webhooks/route.ts            # Webhook endpoints
    layout.tsx                 # Root layout (html, body, providers)
    page.tsx                   # Landing page
    not-found.tsx
    error.tsx
  components/
    ui/                        # shadcn/ui components (auto-generated)
    nav.tsx                    # App-specific shared components
    sidebar.tsx
  lib/
    db.ts                      # Prisma client singleton
    auth.ts                    # Auth.js configuration (re-exported)
    actions/                   # Server Actions organized by domain
      users.ts
      posts.ts
    validators/                # Zod schemas for form validation
      user.ts
  prisma/
    schema.prisma
    migrations/
  public/
  middleware.ts                # Auth middleware at project root
  next.config.ts
  tailwind.config.ts
  .env.local
```

### Key Conventions

- **Route groups** `(name)` organize routes without affecting URLs. Use them to separate auth pages from dashboard pages, each with their own layout.
- **Private folders** `_name` are excluded from routing. Use `_components`, `_lib`, etc. for colocated utilities.
- The `src/` directory is optional. If used, `app/` goes inside `src/app/`.
- The `@` alias maps to the project root (or `src/` if used). Configured via `tsconfig.json`.

### Top-Level Files

| File | Purpose |
|------|---------|
| `next.config.ts` | Next.js configuration (TypeScript supported) |
| `middleware.ts` | Runs before every request for auth checks, redirects |
| `tsconfig.json` | TypeScript configuration |
| `.env.local` | Local environment variables (gitignored) |
| `.env` | Default environment variables |

---

## Next.js 15 Breaking Changes (vs 14)

These are critical to know when writing Next.js 15 code:

### Async Request APIs

`cookies()`, `headers()`, `draftMode()`, `params`, and `searchParams` are now **async** and must be awaited:

```tsx
// Next.js 15 -- all these must be awaited
import { cookies, headers } from 'next/headers'

export default async function Page({
  params,
  searchParams,
}: {
  params: Promise<{ slug: string }>
  searchParams: Promise<{ q: string }>
}) {
  const { slug } = await params
  const { q } = await searchParams

  const cookieStore = await cookies()
  const token = cookieStore.get('token')

  const headersList = await headers()
  const userAgent = headersList.get('user-agent')

  return <div>...</div>
}
```

### React 19

Next.js 15 uses React 19. Key changes:
- `useFormState` is replaced by `useActionState` (from `'react'`, not `'react-dom'`)
- `useFormStatus` now returns `data`, `method`, and `action` in addition to `pending`
- `ref` is a prop (no more `forwardRef` needed)
- The `use` API reads promises and context

### Fetch Caching

`fetch` requests are **not cached by default** in Next.js 15. To cache:

```tsx
// Explicitly opt into caching
const data = await fetch('https://...', { cache: 'force-cache' })

// Time-based revalidation
const data = await fetch('https://...', { next: { revalidate: 3600 } })
```

---

## Server Actions vs Route Handlers

### Server Actions (Server Functions)

Server Actions are async functions that run on the server, invoked from forms or event handlers. They are the primary way to handle mutations in the App Router.

**When to use Server Actions:**
- Form submissions (create, update, delete)
- Any mutation that updates data and then updates the UI
- Progressive enhancement -- forms work without JavaScript
- When you need to revalidate cached data after a mutation

**Defining Server Actions:**

```ts
// app/lib/actions/posts.ts
'use server'

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { db } from '@/lib/db'

export async function createPost(formData: FormData) {
  const title = formData.get('title') as string
  const content = formData.get('content') as string

  await db.post.create({ data: { title, content } })

  revalidatePath('/posts')
  redirect('/posts')
}

export async function deletePost(id: string) {
  await db.post.delete({ where: { id } })
  revalidatePath('/posts')
}
```

**Using in forms (Server Component):**

```tsx
// app/posts/new/page.tsx
import { createPost } from '@/lib/actions/posts'

export default function NewPostPage() {
  return (
    <form action={createPost}>
      <input name="title" type="text" required />
      <textarea name="content" required />
      <button type="submit">Create Post</button>
    </form>
  )
}
```

**Using in Client Components with validation feedback:**

```tsx
// app/posts/new/form.tsx
'use client'

import { useActionState } from 'react'
import { createPost } from '@/lib/actions/posts'

export function CreatePostForm() {
  const [state, action, pending] = useActionState(createPost, undefined)

  return (
    <form action={action}>
      <input name="title" type="text" required />
      {state?.errors?.title && <p>{state.errors.title}</p>}
      <textarea name="content" required />
      {state?.errors?.content && <p>{state.errors.content}</p>}
      <button type="submit" disabled={pending}>
        {pending ? 'Creating...' : 'Create Post'}
      </button>
    </form>
  )
}
```

**Passing additional arguments with `bind`:**

```tsx
'use client'

import { updateUser } from '@/lib/actions/users'

export function UserProfile({ userId }: { userId: string }) {
  const updateUserWithId = updateUser.bind(null, userId)

  return (
    <form action={updateUserWithId}>
      <input type="text" name="name" />
      <button type="submit">Update</button>
    </form>
  )
}
```

```ts
// In the server action, the bound arg comes first
'use server'

export async function updateUser(userId: string, formData: FormData) {
  const name = formData.get('name') as string
  // ...
}
```

**Using in event handlers (Client Components):**

```tsx
'use client'

import { useState } from 'react'
import { incrementLike } from './actions'

export function LikeButton({ initialLikes }: { initialLikes: number }) {
  const [likes, setLikes] = useState(initialLikes)

  return (
    <button
      onClick={async () => {
        const updatedLikes = await incrementLike()
        setLikes(updatedLikes)
      }}
    >
      {likes} likes
    </button>
  )
}
```

**Optimistic updates with `useOptimistic`:**

```tsx
'use client'

import { useOptimistic } from 'react'
import { addMessage } from './actions'

export function Chat({ messages }: { messages: Message[] }) {
  const [optimisticMessages, addOptimistic] = useOptimistic(
    messages,
    (state, newMsg: string) => [...state, { text: newMsg, sending: true }]
  )

  const formAction = async (formData: FormData) => {
    const text = formData.get('message') as string
    addOptimistic(text)
    await addMessage(text)
  }

  return (
    <div>
      {optimisticMessages.map((m, i) => (
        <div key={i}>{m.text} {m.sending && '(sending...)'}</div>
      ))}
      <form action={formAction}>
        <input name="message" />
        <button type="submit">Send</button>
      </form>
    </div>
  )
}
```

### Route Handlers (API Routes)

Route Handlers are REST-style API endpoints defined in `route.ts` files. They use the standard Web Request/Response API.

**When to use Route Handlers:**
- Webhook endpoints (Stripe, GitHub, etc.)
- API consumed by external clients (mobile apps, third-party integrations)
- Streaming responses
- File downloads
- Any endpoint that needs to return non-HTML content types (JSON, XML, images)

**Basic Route Handler:**

```ts
// app/api/posts/route.ts
import { NextRequest } from 'next/server'
import { db } from '@/lib/db'

export async function GET() {
  const posts = await db.post.findMany()
  return Response.json(posts)
}

export async function POST(request: NextRequest) {
  const body = await request.json()
  const post = await db.post.create({ data: body })
  return Response.json(post, { status: 201 })
}
```

**Route Handler with dynamic params:**

```ts
// app/api/posts/[id]/route.ts
import { NextRequest } from 'next/server'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params  // Must await in Next.js 15
  const post = await db.post.findUnique({ where: { id } })

  if (!post) {
    return Response.json({ error: 'Not found' }, { status: 404 })
  }

  return Response.json(post)
}
```

**Supported methods:** `GET`, `POST`, `PUT`, `PATCH`, `DELETE`, `HEAD`, `OPTIONS`.

**Caching:** Route Handlers are NOT cached by default. `GET` methods can opt into caching with `export const dynamic = 'force-static'`.

**Key constraint:** A `route.ts` and `page.tsx` file CANNOT exist at the same URL path. Use `app/api/...` for API routes.

### Decision Guide: Server Actions vs Route Handlers

| Scenario | Use |
|----------|-----|
| Form submission from your own UI | Server Action |
| Mutation + UI update | Server Action |
| Progressive enhancement needed | Server Action |
| Webhook receiver | Route Handler |
| External API for mobile/third-party | Route Handler |
| File upload/download | Route Handler |
| Non-JSON response (XML, CSV, images) | Route Handler |
| CORS-enabled endpoint | Route Handler |

---

## Data Fetching

### In Server Components

Server Components can be async. Fetch data directly:

```tsx
// app/posts/page.tsx
import { db } from '@/lib/db'

export default async function PostsPage() {
  const posts = await db.post.findMany({
    orderBy: { createdAt: 'desc' },
  })

  return (
    <ul>
      {posts.map(post => (
        <li key={post.id}>{post.title}</li>
      ))}
    </ul>
  )
}
```

### Streaming with Suspense

Wrap slow data fetches in Suspense boundaries to stream UI progressively:

```tsx
// app/dashboard/page.tsx
import { Suspense } from 'react'
import { RevenueChart } from './revenue-chart'
import { LatestInvoices } from './latest-invoices'

export default function DashboardPage() {
  return (
    <div>
      <h1>Dashboard</h1>
      <Suspense fallback={<div>Loading chart...</div>}>
        <RevenueChart />
      </Suspense>
      <Suspense fallback={<div>Loading invoices...</div>}>
        <LatestInvoices />
      </Suspense>
    </div>
  )
}
```

### Streaming Data to Client Components with `use`

Pass a promise from a Server Component; resolve it in a Client Component with React's `use` API:

```tsx
// app/posts/page.tsx (Server Component)
import Posts from './posts-list'
import { Suspense } from 'react'

export default function Page() {
  const postsPromise = getPosts()  // Don't await

  return (
    <Suspense fallback={<div>Loading...</div>}>
      <Posts posts={postsPromise} />
    </Suspense>
  )
}
```

```tsx
// app/posts/posts-list.tsx (Client Component)
'use client'
import { use } from 'react'

export default function Posts({ posts }: { posts: Promise<Post[]> }) {
  const allPosts = use(posts)

  return (
    <ul>
      {allPosts.map(post => (
        <li key={post.id}>{post.title}</li>
      ))}
    </ul>
  )
}
```

### In Client Components

Use SWR or React Query for client-side data fetching with caching, revalidation, and optimistic updates:

```tsx
'use client'

import useSWR from 'swr'

const fetcher = (url: string) => fetch(url).then(r => r.json())

export function PostList() {
  const { data, error, isLoading } = useSWR('/api/posts', fetcher)

  if (isLoading) return <div>Loading...</div>
  if (error) return <div>Error loading posts</div>

  return (
    <ul>
      {data.map((post: any) => <li key={post.id}>{post.title}</li>)}
    </ul>
  )
}
```

---

## Caching and Revalidation

### Key APIs

| API | Purpose | Where |
|-----|---------|-------|
| `revalidatePath(path)` | Revalidate all data for a route | Server Actions, Route Handlers |
| `revalidateTag(tag)` | Revalidate data tagged with a specific tag | Server Actions, Route Handlers |
| `fetch(..., { next: { revalidate: N } })` | Time-based revalidation for fetch | Server Components |
| `fetch(..., { next: { tags: [...] } })` | Tag a fetch for on-demand revalidation | Server Components |
| `unstable_cache` | Cache arbitrary async work (legacy) | Server Components |

### Next.js 16 Additions (for forward reference)

| API | Purpose |
|-----|---------|
| `'use cache'` directive | Cache any function or component |
| `cacheTag(tag)` | Tag cached data inside `'use cache'` blocks |
| `updateTag(tag)` | Immediately expire cache in Server Actions (read-your-own-writes) |
| `revalidateTag(tag, 'max')` | Stale-while-revalidate semantics |

### Revalidation After Mutations

```ts
'use server'

import { revalidatePath } from 'next/cache'
import { revalidateTag } from 'next/cache'

export async function createPost(formData: FormData) {
  await db.post.create({ ... })

  // Option 1: Revalidate a specific path
  revalidatePath('/posts')

  // Option 2: Revalidate by tag (if using tagged fetch)
  revalidateTag('posts')
}
```

---

## Authentication (Auth.js v5 / NextAuth.js)

### Setup

Auth.js v5 (NextAuth.js v5) provides a unified `auth()` function that works in Server Components, Route Handlers, Middleware, and API Routes.

**Install:**

```bash
npm install next-auth@beta
```

**Configuration (`lib/auth.ts`):**

```ts
import NextAuth from 'next-auth'
import GitHub from 'next-auth/providers/github'
import Credentials from 'next-auth/providers/credentials'

export const { handlers, auth, signIn, signOut } = NextAuth({
  providers: [
    GitHub,  // Auto-infers AUTH_GITHUB_ID and AUTH_GITHUB_SECRET from env
    Credentials({
      credentials: {
        email: { label: 'Email', type: 'email' },
        password: { label: 'Password', type: 'password' },
      },
      async authorize(credentials) {
        // Validate credentials against your database
        const user = await getUserByEmail(credentials.email as string)
        if (!user) return null

        const isValid = await bcrypt.compare(
          credentials.password as string,
          user.passwordHash
        )
        if (!isValid) return null

        return { id: user.id, name: user.name, email: user.email }
      },
    }),
  ],
  pages: {
    signIn: '/login',    // Custom sign-in page
  },
  callbacks: {
    authorized({ auth, request }) {
      // Used by middleware to check if user is authenticated
      return !!auth?.user
    },
    async session({ session, token }) {
      // Add custom fields to the session
      if (token.sub) {
        session.user.id = token.sub
      }
      return session
    },
    async jwt({ token, user }) {
      if (user) {
        token.sub = user.id
      }
      return token
    },
  },
  session: {
    strategy: 'jwt',  // Use JWT for session (no database sessions needed)
  },
})
```

**Environment variables (`.env.local`):**

```bash
AUTH_SECRET=your-random-secret-at-least-32-chars   # Required in production
AUTH_GITHUB_ID=your-github-oauth-app-id
AUTH_GITHUB_SECRET=your-github-oauth-app-secret
```

Auth.js v5 infers OAuth credentials from `AUTH_{PROVIDER}_{ID|SECRET}` environment variables automatically.

**Route Handler (`app/api/auth/[...nextauth]/route.ts`):**

```ts
import { handlers } from '@/lib/auth'
export const { GET, POST } = handlers
```

### Using Auth in Server Components

```tsx
import { auth } from '@/lib/auth'

export default async function Page() {
  const session = await auth()

  if (!session?.user) {
    return <p>Not authenticated</p>
  }

  return <p>Hello, {session.user.name}</p>
}
```

### Using Auth in Middleware

Create `middleware.ts` at the project root:

```ts
// middleware.ts
export { auth as middleware } from '@/lib/auth'

export const config = {
  matcher: ['/((?!api/auth|_next/static|_next/image|favicon.ico).*)'],
}
```

Or with custom logic:

```ts
// middleware.ts
import { auth } from '@/lib/auth'
import { NextResponse } from 'next/server'

export default auth((req) => {
  const isLoggedIn = !!req.auth
  const isOnDashboard = req.nextUrl.pathname.startsWith('/dashboard')
  const isOnAuth = req.nextUrl.pathname.startsWith('/login') ||
                   req.nextUrl.pathname.startsWith('/register')

  if (isOnDashboard && !isLoggedIn) {
    return NextResponse.redirect(new URL('/login', req.nextUrl))
  }

  if (isOnAuth && isLoggedIn) {
    return NextResponse.redirect(new URL('/dashboard', req.nextUrl))
  }

  return NextResponse.next()
})

export const config = {
  matcher: ['/((?!api/auth|_next/static|_next/image|favicon.ico).*)'],
}
```

### Sign In / Sign Out with Server Actions

```tsx
// app/(auth)/login/page.tsx
import { signIn } from '@/lib/auth'

export default function LoginPage() {
  return (
    <div>
      <form
        action={async () => {
          'use server'
          await signIn('github')
        }}
      >
        <button type="submit">Sign in with GitHub</button>
      </form>

      <form
        action={async (formData) => {
          'use server'
          await signIn('credentials', formData)
        }}
      >
        <input name="email" type="email" required />
        <input name="password" type="password" required />
        <button type="submit">Sign in with Email</button>
      </form>
    </div>
  )
}
```

```tsx
// components/sign-out-button.tsx
import { signOut } from '@/lib/auth'

export function SignOutButton() {
  return (
    <form
      action={async () => {
        'use server'
        await signOut()
      }}
    >
      <button type="submit">Sign out</button>
    </form>
  )
}
```

### Client-Side Session (when needed)

For Client Components that need session data, use `SessionProvider` and `useSession`:

```tsx
// app/layout.tsx
import { SessionProvider } from 'next-auth/react'
import { auth } from '@/lib/auth'

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const session = await auth()

  return (
    <html lang="en">
      <body>
        <SessionProvider session={session}>
          {children}
        </SessionProvider>
      </body>
    </html>
  )
}
```

```tsx
// components/user-menu.tsx
'use client'

import { useSession } from 'next-auth/react'

export function UserMenu() {
  const { data: session, status } = useSession()

  if (status === 'loading') return <div>Loading...</div>
  if (!session) return <a href="/login">Sign in</a>

  return <span>{session.user?.name}</span>
}
```

**Best practice:** Prefer `auth()` in Server Components over `useSession` in Client Components. Only use `useSession` when you genuinely need client-side reactivity to session changes.

### Auth.js with Prisma Adapter

For database-backed sessions (instead of JWT), use the Prisma adapter:

```bash
npm install @auth/prisma-adapter @prisma/client
```

```ts
// lib/auth.ts
import NextAuth from 'next-auth'
import { PrismaAdapter } from '@auth/prisma-adapter'
import { prisma } from '@/lib/db'

export const { handlers, auth, signIn, signOut } = NextAuth({
  adapter: PrismaAdapter(prisma),
  providers: [/* ... */],
  // With a database adapter, the default session strategy is "database"
  // For edge compatibility, override to "jwt":
  session: { strategy: 'jwt' },
})
```

---

## Database Integration (Prisma with SQLite)

### Setup

```bash
npm install prisma @prisma/client --save-dev
npm install @prisma/client
npx prisma init --datasource-provider sqlite
```

This creates `prisma/schema.prisma` and sets `DATABASE_URL` in `.env`.

### Prisma Schema for SQLite

```prisma
// prisma/schema.prisma
datasource db {
  provider = "sqlite"
  url      = env("DATABASE_URL")
}

generator client {
  provider = "prisma-client-js"
}

model User {
  id            String    @id @default(cuid())
  name          String?
  email         String    @unique
  emailVerified DateTime?
  image         String?
  passwordHash  String?
  accounts      Account[]
  sessions      Session[]
  posts         Post[]
  createdAt     DateTime  @default(now())
  updatedAt     DateTime  @updatedAt
}

model Account {
  id                String  @id @default(cuid())
  userId            String
  type              String
  provider          String
  providerAccountId String
  refresh_token     String?
  access_token      String?
  expires_at        Int?
  token_type        String?
  scope             String?
  id_token          String?
  session_state     String?
  user              User    @relation(fields: [userId], references: [id], onDelete: Cascade)
  createdAt         DateTime @default(now())
  updatedAt         DateTime @updatedAt

  @@unique([provider, providerAccountId])
}

model Session {
  id           String   @id @default(cuid())
  sessionToken String   @unique
  userId       String
  expires      DateTime
  user         User     @relation(fields: [userId], references: [id], onDelete: Cascade)
  createdAt    DateTime @default(now())
  updatedAt    DateTime @updatedAt
}

model VerificationToken {
  identifier String
  token      String
  expires    DateTime

  @@unique([identifier, token])
}

model Post {
  id        String   @id @default(cuid())
  title     String
  content   String?
  published Boolean  @default(false)
  authorId  String
  author    User     @relation(fields: [authorId], references: [id], onDelete: Cascade)
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt
}
```

### Environment Variable

```bash
# .env
DATABASE_URL="file:./dev.db"
```

### Prisma Client Singleton

Prevent multiple PrismaClient instances in development (caused by hot reload):

```ts
// lib/db.ts
import { PrismaClient } from '@prisma/client'

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined
}

export const prisma = globalForPrisma.prisma ?? new PrismaClient()

if (process.env.NODE_ENV !== 'production') {
  globalForPrisma.prisma = prisma
}
```

### Common Commands

```bash
npx prisma migrate dev --name init    # Create and apply migration
npx prisma migrate deploy             # Apply migrations in production
npx prisma db push                    # Push schema without migration (prototyping)
npx prisma generate                   # Regenerate Prisma Client
npx prisma studio                     # Open database GUI
npx prisma db seed                    # Run seed script
```

### Seeding

Add to `package.json`:

```json
{
  "prisma": {
    "seed": "tsx prisma/seed.ts"
  }
}
```

```ts
// prisma/seed.ts
import { prisma } from '../lib/db'

async function main() {
  await prisma.user.create({
    data: {
      email: 'admin@example.com',
      name: 'Admin',
      posts: {
        create: [
          { title: 'First Post', content: 'Hello world', published: true },
        ],
      },
    },
  })
}

main()
  .then(() => prisma.$disconnect())
  .catch((e) => {
    console.error(e)
    prisma.$disconnect()
    process.exit(1)
  })
```

### SQLite Limitations

- No `@db.Text` or `@db.VarChar` annotations (SQLite has no length limits on text)
- No `enum` support (use String with application-level validation)
- No `Json` type natively (store as String, parse in application)
- No `createMany` with `skipDuplicates`
- Limited concurrent write performance (single-writer model)
- Fine for development and small-to-medium apps; switch to PostgreSQL for production scale

---

## Middleware Patterns

Middleware runs before every matched request. It executes on the Edge Runtime and can redirect, rewrite, set headers, or return responses.

### File Location

`middleware.ts` must be at the project root (alongside `app/`, not inside it).

### Matcher Configuration

```ts
// middleware.ts

export const config = {
  // Only run middleware on specific paths
  matcher: [
    // Match all paths except static files and images
    '/((?!api/auth|_next/static|_next/image|favicon.ico).*)',
  ],
}
```

Matcher patterns:
- `'/dashboard/:path*'` -- matches `/dashboard` and all sub-paths
- `'/((?!api|_next/static|_next/image|favicon.ico).*)'` -- negative lookahead for exclusions

### Common Patterns

**Auth protection (with Auth.js):**

```ts
import { auth } from '@/lib/auth'
import { NextResponse } from 'next/server'

export default auth((req) => {
  const { pathname } = req.nextUrl
  const isLoggedIn = !!req.auth

  // Protected routes
  const protectedPaths = ['/dashboard', '/settings', '/admin']
  const isProtected = protectedPaths.some(path => pathname.startsWith(path))

  if (isProtected && !isLoggedIn) {
    const loginUrl = new URL('/login', req.nextUrl)
    loginUrl.searchParams.set('callbackUrl', pathname)
    return NextResponse.redirect(loginUrl)
  }

  // Redirect logged-in users away from auth pages
  if (pathname.startsWith('/login') && isLoggedIn) {
    return NextResponse.redirect(new URL('/dashboard', req.nextUrl))
  }
})

export const config = {
  matcher: ['/((?!api/auth|_next/static|_next/image|favicon.ico).*)'],
}
```

**Role-based access:**

```ts
export default auth((req) => {
  if (req.nextUrl.pathname.startsWith('/admin')) {
    if (req.auth?.user?.role !== 'admin') {
      return NextResponse.redirect(new URL('/unauthorized', req.nextUrl))
    }
  }
})
```

**Setting headers:**

```ts
import { NextResponse } from 'next/server'

export function middleware(request: Request) {
  const response = NextResponse.next()
  response.headers.set('x-request-id', crypto.randomUUID())
  return response
}
```

### Middleware Limitations

- Runs on the Edge Runtime (limited Node.js API surface)
- Cannot use Prisma queries directly (Prisma requires Node.js runtime)
- Should be lightweight -- runs on every matched request
- Cannot modify the response body (only headers, redirects, rewrites)

---

## shadcn/ui Setup

shadcn/ui is not a package you install. It's a CLI that copies component source code into your project. Components are built on Radix UI primitives and styled with Tailwind CSS.

### Installation

```bash
npx shadcn@latest init
```

This prompts for configuration and creates `components.json`. It also sets up:
- Tailwind CSS configuration with CSS variables for theming
- A `cn()` utility function in `lib/utils.ts`
- Base styles

For a new Next.js project, you can also scaffold everything at once:

```bash
npx shadcn@latest init -d   # Use defaults
```

### Adding Components

```bash
npx shadcn@latest add button
npx shadcn@latest add card
npx shadcn@latest add dialog
npx shadcn@latest add form        # Includes react-hook-form + zod integration
npx shadcn@latest add input
npx shadcn@latest add label
npx shadcn@latest add table
npx shadcn@latest add toast
npx shadcn@latest add dropdown-menu
npx shadcn@latest add sheet       # Mobile-friendly slide-out panel
npx shadcn@latest add separator
npx shadcn@latest add avatar
npx shadcn@latest add badge
npx shadcn@latest add skeleton    # Loading placeholders
```

Components are copied to `components/ui/` and can be modified freely.

### Key Utilities

The `cn()` function merges Tailwind classes with conflict resolution:

```ts
// lib/utils.ts (auto-generated)
import { type ClassValue, clsx } from 'clsx'
import { twMerge } from 'tailwind-merge'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}
```

### Form Pattern with shadcn/ui + Zod + Server Actions

```tsx
// components/create-post-form.tsx
'use client'

import { useActionState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { createPost } from '@/lib/actions/posts'

export function CreatePostForm() {
  const [state, action, pending] = useActionState(createPost, undefined)

  return (
    <form action={action} className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="title">Title</Label>
        <Input id="title" name="title" required />
        {state?.errors?.title && (
          <p className="text-sm text-destructive">{state.errors.title}</p>
        )}
      </div>

      <div className="space-y-2">
        <Label htmlFor="content">Content</Label>
        <Textarea id="content" name="content" required />
        {state?.errors?.content && (
          <p className="text-sm text-destructive">{state.errors.content}</p>
        )}
      </div>

      <Button type="submit" disabled={pending}>
        {pending ? 'Creating...' : 'Create Post'}
      </Button>
    </form>
  )
}
```

### CLI Commands Reference

| Command | Purpose |
|---------|---------|
| `npx shadcn@latest init` | Initialize shadcn/ui in project |
| `npx shadcn@latest add [component]` | Add a component |
| `npx shadcn@latest diff [component]` | Check for updates to a component |
| `npx shadcn@latest add --all` | Add all available components |

---

## Data Access Layer Pattern

For SaaS applications, centralize all data access in a dedicated layer. This ensures authorization checks happen consistently.

```ts
// lib/dal.ts
import 'server-only'
import { cache } from 'react'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/db'
import { redirect } from 'next/navigation'

// Cached per-request: call this anywhere without redundant DB hits
export const getCurrentUser = cache(async () => {
  const session = await auth()
  if (!session?.user?.id) return null

  return prisma.user.findUnique({
    where: { id: session.user.id },
    select: { id: true, name: true, email: true, image: true },
  })
})

// Require auth or redirect
export const requireAuth = cache(async () => {
  const user = await getCurrentUser()
  if (!user) redirect('/login')
  return user
})

// Data access functions that enforce authorization
export async function getUserPosts() {
  const user = await requireAuth()

  return prisma.post.findMany({
    where: { authorId: user.id },
    orderBy: { createdAt: 'desc' },
  })
}

export async function getPostById(id: string) {
  const user = await requireAuth()

  const post = await prisma.post.findUnique({ where: { id } })

  // Authorization: user can only see their own posts
  if (!post || post.authorId !== user.id) return null

  return post
}
```

**The `server-only` package** ensures this module cannot be imported in Client Components:

```bash
npm install server-only
```

---

## Form Validation with Zod

Use Zod schemas for both client-side and server-side validation:

```ts
// lib/validators/post.ts
import { z } from 'zod'

export const createPostSchema = z.object({
  title: z
    .string()
    .min(1, 'Title is required')
    .max(200, 'Title must be 200 characters or less'),
  content: z
    .string()
    .min(1, 'Content is required')
    .max(10000, 'Content must be 10,000 characters or less'),
})

export type CreatePostInput = z.infer<typeof createPostSchema>
```

```ts
// lib/actions/posts.ts
'use server'

import { createPostSchema } from '@/lib/validators/post'
import { requireAuth } from '@/lib/dal'
import { prisma } from '@/lib/db'
import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'

type ActionState = {
  errors?: Record<string, string[]>
  message?: string
} | undefined

export async function createPost(
  prevState: ActionState,
  formData: FormData
): Promise<ActionState> {
  const user = await requireAuth()

  const validated = createPostSchema.safeParse({
    title: formData.get('title'),
    content: formData.get('content'),
  })

  if (!validated.success) {
    return { errors: validated.error.flatten().fieldErrors }
  }

  await prisma.post.create({
    data: {
      ...validated.data,
      authorId: user.id,
    },
  })

  revalidatePath('/posts')
  redirect('/posts')
}
```

---

## Common Mistakes

### Passing unsanitized data to Client Components

Server Components fetch all database fields. If you pass the whole object as a prop to a Client Component, private fields leak to the client bundle. Always create a DTO (Data Transfer Object) or select only the fields you need.

### Using `'use client'` at too high a level

Marking a layout or page as `'use client'` forces the entire subtree into the client bundle. Push the boundary down to the smallest interactive component.

### Forgetting to await async APIs in Next.js 15

`cookies()`, `headers()`, `params`, and `searchParams` are Promises in Next.js 15. Not awaiting them causes TypeScript errors or runtime issues.

### Calling Prisma in middleware

Middleware runs on the Edge Runtime. Prisma requires the Node.js runtime. Query the database in Server Components or API Routes instead. Use JWT session strategy with Auth.js to avoid needing database access in middleware.

### Not using the Prisma singleton

Every file that imports `new PrismaClient()` creates a new connection pool. In development with hot reload, this exhausts connections quickly. Always use the singleton pattern from `lib/db.ts`.

### Server Action error handling

If a Server Action throws, the error propagates to the nearest error boundary. For user-facing validation errors, return them as state instead of throwing. Reserve `throw` for unexpected errors.

---

## Gotchas

- **`redirect()` throws internally.** It uses a special error to trigger the redirect. Never wrap it in a try/catch -- let it propagate. Call it outside try/catch blocks.
- **Route groups `(name)` can have their own layouts.** This is powerful but can cause unexpected layout nesting if you are not careful about where `layout.tsx` files exist.
- **`generateStaticParams` runs at build time.** For dynamic routes that should be statically generated, export this function from the page file.
- **Middleware runs on every matched request.** Keep it lightweight. Avoid heavy computation or external API calls.
- **`loading.tsx` wraps only the page, not the layout.** The layout renders immediately; the loading state appears where the page would be.
- **Parallel requests in Server Components are deduped.** Multiple calls to the same `fetch` URL within a single render are automatically deduplicated by React.
- **SQLite `dev.db` file should be gitignored.** Add `prisma/dev.db` to `.gitignore`.

---

## Links

- **Next.js Docs**: https://nextjs.org/docs
- **Next.js App Router API Reference**: https://nextjs.org/docs/app/api-reference
- **Next.js GitHub (docs source)**: https://github.com/vercel/next.js/tree/canary/docs
- **Auth.js v5 Docs**: https://authjs.dev
- **Auth.js Next.js Guide**: https://nextjs.authjs.dev
- **Auth.js Prisma Adapter**: https://authjs.dev/reference/adapter/prisma
- **Prisma Docs**: https://www.prisma.io/docs
- **Prisma SQLite Guide**: https://www.prisma.io/docs/getting-started/setup-prisma/start-from-scratch/relational-databases-typescript-sqlite
- **shadcn/ui Docs**: https://ui.shadcn.com
- **shadcn/ui GitHub**: https://github.com/shadcn-ui/ui
- **Zod Docs**: https://zod.dev
- **React 19 Docs**: https://react.dev
