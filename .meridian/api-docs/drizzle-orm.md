# Drizzle ORM (PostgreSQL)

A TypeScript ORM with a SQL-like query builder and zero-overhead abstraction over SQL. Drizzle provides type-safe database access while letting you think in SQL.

**Versions researched**: drizzle-orm 0.45.1, drizzle-kit 0.31.9 (as of 2026-02-11)
**Official docs**: https://orm.drizzle.team
**Source**: npm package type definitions and source code

## Overview

Drizzle ORM consists of two packages:

- **`drizzle-orm`** -- the ORM itself with query builder, schema definitions, and driver adapters
- **`drizzle-kit`** -- CLI companion for migrations, introspection, and database push

Key properties:
- Schemas are defined in TypeScript alongside your application code
- Two query APIs: SQL-like query builder and relational queries (like Prisma's `include`)
- Type inference flows from schema definitions -- no code generation step
- Supports multiple PostgreSQL drivers: `postgres` (postgres.js), `pg`, `@neondatabase/serverless`, `@vercel/postgres`

## How It Works

### Architecture

1. **Schema files** define tables, columns, relations, and indexes as TypeScript objects
2. **`drizzle()`** creates a database instance connected to a driver
3. The **query builder** constructs SQL from method chains, returning typed results
4. **`drizzle-kit`** reads your schema files and computes migrations or pushes changes directly

### Mental Model

Drizzle schemas are the single source of truth. Table definitions produce TypeScript types for select and insert operations automatically. The `$inferSelect` and `$inferInsert` properties on any table give you the inferred types without manual type definitions.

The query builder maps 1:1 to SQL -- if you know SQL, you know Drizzle. Every method corresponds directly to a SQL clause: `.select()`, `.from()`, `.where()`, `.leftJoin()`, `.groupBy()`, `.orderBy()`, `.limit()`, `.offset()`.

## Setup

### Installation

```bash
npm install drizzle-orm postgres
npm install -D drizzle-kit
```

The `postgres` package is the postgres.js driver -- the recommended driver for PostgreSQL with Drizzle. Other supported drivers:

```bash
# Alternative drivers (pick one)
npm install pg            # node-postgres
npm install @neondatabase/serverless  # Neon serverless
npm install @vercel/postgres          # Vercel Postgres
```

### Database Connection (postgres.js driver)

```ts
// db/index.ts
import { drizzle } from 'drizzle-orm/postgres-js';
import * as schema from './schema';

// Option 1: Connection string (recommended)
const db = drizzle({
  connection: process.env.DATABASE_URL!,
  schema,
});

// Option 2: Connection string with options
const db = drizzle({
  connection: {
    url: process.env.DATABASE_URL!,
    // postgres.js options
    max: 10,
    idle_timeout: 20,
    connect_timeout: 10,
  },
  schema,
});

// Option 3: Pass an existing postgres.js client
import postgres from 'postgres';
const client = postgres(process.env.DATABASE_URL!);
const db = drizzle({
  client,
  schema,
});

// Option 4: Shorthand (connection string as first arg)
const db = drizzle(process.env.DATABASE_URL!, { schema });

// Option 5: Shorthand (client as first arg)
const db = drizzle(client, { schema });

export { db };
```

### DrizzleConfig Options

```ts
interface DrizzleConfig<TSchema> {
  logger?: boolean | Logger;  // Enable SQL query logging
  schema?: TSchema;           // Schema for relational queries (db.query.*)
  casing?: 'snake_case' | 'camelCase';  // Auto column name casing
}
```

The `schema` parameter is required for relational queries (`db.query.*`). Without it, only the SQL-like query builder (`db.select()`, etc.) is available.

The `casing` option transforms column names automatically. With `casing: 'snake_case'`, a column defined as `createdAt` maps to `created_at` in the database.

### drizzle-kit Configuration

```ts
// drizzle.config.ts
import { defineConfig } from 'drizzle-kit';

export default defineConfig({
  schema: './db/schema.ts',       // Path to schema file(s)
  out: './drizzle',               // Output directory for migrations
  dialect: 'postgresql',
  dbCredentials: {
    url: process.env.DATABASE_URL!,
  },
  // Optional
  verbose: true,                  // Print all SQL statements
  strict: true,                   // Prompt for confirmation on destructive ops
});
```

### Next.js App Router Integration

```ts
// db/index.ts
import { drizzle } from 'drizzle-orm/postgres-js';
import * as schema from './schema';

// Create singleton connection for server components / route handlers
const db = drizzle({
  connection: process.env.DATABASE_URL!,
  schema,
});

export { db };
```

```ts
// app/users/page.tsx (Server Component)
import { db } from '@/db';
import { users } from '@/db/schema';

export default async function UsersPage() {
  const allUsers = await db.select().from(users);
  return <div>{/* render users */}</div>;
}
```

```ts
// app/api/users/route.ts (Route Handler)
import { db } from '@/db';
import { users } from '@/db/schema';
import { eq } from 'drizzle-orm';

export async function GET() {
  const allUsers = await db.select().from(users);
  return Response.json(allUsers);
}

export async function POST(request: Request) {
  const body = await request.json();
  const [newUser] = await db.insert(users).values(body).returning();
  return Response.json(newUser, { status: 201 });
}
```

For Next.js with postgres.js: the `postgres` driver maintains its own connection pool. A single `drizzle()` instance at module scope works in both serverless and long-running environments. Do not create a new connection per request.

## Schema Definition

### Tables

Tables are defined with `pgTable()`. The second argument is a record of column definitions. Column names in the database default to the object key names.

```ts
// db/schema.ts
import {
  pgTable,
  serial,
  text,
  varchar,
  integer,
  boolean,
  timestamp,
  uuid,
  jsonb,
  index,
  uniqueIndex,
} from 'drizzle-orm/pg-core';

export const users = pgTable('users', {
  id: serial().primaryKey(),
  email: varchar({ length: 255 }).notNull().unique(),
  name: text().notNull(),
  role: text({ enum: ['admin', 'user', 'moderator'] }).default('user').notNull(),
  isActive: boolean().default(true).notNull(),
  metadata: jsonb().$type<{ theme: string; lang: string }>(),
  createdAt: timestamp({ withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp({ withTimezone: true }).defaultNow().notNull(),
});
```

#### Column Name Mapping

By default, the object key becomes the database column name. You can override this by passing a name string as the first argument:

```ts
// Explicit column name mapping (key is TS name, first arg is DB name)
export const users = pgTable('users', {
  id: serial('id').primaryKey(),
  firstName: text('first_name').notNull(),
  lastName: text('last_name').notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
});
```

Alternatively, use the `casing` option in `drizzle()` to auto-map:

```ts
const db = drizzle({
  connection: process.env.DATABASE_URL!,
  schema,
  casing: 'snake_case', // createdAt -> created_at automatically
});
```

#### Extra Config (Indexes, Composite Keys, Constraints)

The third argument to `pgTable` is an extra config function that returns an **array** of constraints, indexes, and foreign keys.

```ts
import {
  pgTable, integer, text, timestamp, uuid,
  index, uniqueIndex, primaryKey, foreignKey, unique, check,
} from 'drizzle-orm/pg-core';
import { sql } from 'drizzle-orm';

export const posts = pgTable('posts', {
  id: uuid().defaultRandom().primaryKey(),
  authorId: integer().notNull(),
  title: text().notNull(),
  slug: text().notNull(),
  content: text(),
  publishedAt: timestamp({ withTimezone: true }),
  createdAt: timestamp({ withTimezone: true }).defaultNow().notNull(),
}, (t) => [
  // Indexes
  index('posts_author_idx').on(t.authorId),
  uniqueIndex('posts_slug_idx').on(t.slug),

  // Composite unique constraint
  unique('posts_author_title').on(t.authorId, t.title),

  // Check constraint
  check('title_length', sql`char_length(${t.title}) > 0`),
]);
```

The old API returned an object from the extra config function. That is **deprecated** -- use an array instead.

#### Composite Primary Key

```ts
import { pgTable, integer, primaryKey } from 'drizzle-orm/pg-core';

export const userRoles = pgTable('user_roles', {
  userId: integer().notNull(),
  roleId: integer().notNull(),
}, (t) => [
  primaryKey({ columns: [t.userId, t.roleId] }),
]);
```

#### Inline Foreign Keys

```ts
export const posts = pgTable('posts', {
  id: serial().primaryKey(),
  authorId: integer()
    .notNull()
    .references(() => users.id, { onDelete: 'cascade' }),
  categoryId: integer()
    .references(() => categories.id, { onDelete: 'set null' }),
});
```

#### Explicit Foreign Keys (Extra Config)

```ts
import { pgTable, integer, foreignKey } from 'drizzle-orm/pg-core';

export const posts = pgTable('posts', {
  id: serial().primaryKey(),
  authorId: integer().notNull(),
}, (t) => [
  foreignKey({
    columns: [t.authorId],
    foreignColumns: [users.id],
  }).onDelete('cascade').onUpdate('cascade'),
]);
```

Foreign key actions: `'cascade'`, `'restrict'`, `'no action'`, `'set null'`, `'set default'`.

### Enums

```ts
import { pgEnum, pgTable, serial, text } from 'drizzle-orm/pg-core';

// Define a PostgreSQL enum type
export const statusEnum = pgEnum('status', ['active', 'inactive', 'pending']);

export const users = pgTable('users', {
  id: serial().primaryKey(),
  status: statusEnum().default('active').notNull(),
});
```

You can also pass an object to `pgEnum` for more complex enum mappings:

```ts
export const roleEnum = pgEnum('role', {
  Admin: 'admin',
  User: 'user',
  Moderator: 'moderator',
});
```

Alternatively, use `text` with an `enum` config for app-level validation without a database enum type:

```ts
export const users = pgTable('users', {
  role: text({ enum: ['admin', 'user', 'moderator'] }).notNull(),
});
```

### Schemas (PostgreSQL Schemas)

```ts
import { pgSchema } from 'drizzle-orm/pg-core';

const mySchema = pgSchema('my_schema');

export const users = mySchema.table('users', {
  id: serial().primaryKey(),
  name: text().notNull(),
});
```

## Column Types (PostgreSQL)

### Numeric

| Function | PostgreSQL Type | TypeScript Type | Notes |
|---|---|---|---|
| `integer()` | `integer` | `number` | 4 bytes, -2B to +2B |
| `smallint()` | `smallint` | `number` | 2 bytes, -32K to +32K |
| `bigint({ mode: 'number' })` | `bigint` | `number` | 8 bytes, number mode (precision loss) |
| `bigint({ mode: 'bigint' })` | `bigint` | `bigint` | 8 bytes, bigint mode |
| `serial()` | `serial` | `number` | Auto-incrementing 4-byte integer |
| `smallserial()` | `smallserial` | `number` | Auto-incrementing 2-byte integer |
| `bigserial({ mode: 'number' })` | `bigserial` | `number` | Auto-incrementing 8-byte integer |
| `real()` | `real` | `number` | 4-byte floating point |
| `doublePrecision()` | `double precision` | `number` | 8-byte floating point |
| `numeric()` | `numeric` | `string` | Arbitrary precision, defaults to string |
| `numeric({ mode: 'number' })` | `numeric` | `number` | Number mode (precision loss possible) |
| `numeric({ precision: 10, scale: 2 })` | `numeric(10,2)` | `string` | With precision/scale |

`numeric()` returns `string` by default to prevent precision loss. Use `{ mode: 'number' }` only when precision loss is acceptable.

`bigint()` **requires** the `mode` config parameter -- it has no default mode.

`serial()`, `smallserial()`, and `bigserial()` are automatically `notNull` and `hasDefault`.

### String

| Function | PostgreSQL Type | TypeScript Type | Notes |
|---|---|---|---|
| `text()` | `text` | `string` | Unlimited length |
| `text({ enum: [...] })` | `text` | union type | App-level enum check |
| `varchar()` | `varchar` | `string` | Variable length, no limit |
| `varchar({ length: 255 })` | `varchar(255)` | `string` | With max length |
| `char({ length: 2 })` | `char(2)` | `string` | Fixed length |

### Boolean

| Function | PostgreSQL Type | TypeScript Type |
|---|---|---|
| `boolean()` | `boolean` | `boolean` |

### Date / Time

| Function | PostgreSQL Type | TypeScript Type | Notes |
|---|---|---|---|
| `timestamp()` | `timestamp` | `Date` | Without timezone, Date mode |
| `timestamp({ withTimezone: true })` | `timestamptz` | `Date` | With timezone |
| `timestamp({ mode: 'string' })` | `timestamp` | `string` | String mode |
| `timestamp({ precision: 3 })` | `timestamp(3)` | `Date` | Fractional second precision (0-6) |
| `date()` | `date` | `string` | Date only, defaults to string mode |
| `date({ mode: 'date' })` | `date` | `Date` | Date mode |
| `time()` | `time` | `string` | Time only |
| `time({ withTimezone: true })` | `timetz` | `string` | With timezone |
| `interval()` | `interval` | `string` | Time interval |

Date columns (`timestamp`, `date`, `time`) have a `.defaultNow()` method that sets `default now()`.

**Recommendation for Supabase**: Use `timestamp({ withTimezone: true })` for all timestamp columns. Supabase strongly recommends `timestamptz` to avoid timezone ambiguity.

### JSON

| Function | PostgreSQL Type | TypeScript Type | Notes |
|---|---|---|---|
| `json()` | `json` | `unknown` | Stored as text, parsed on read |
| `jsonb()` | `jsonb` | `unknown` | Binary format, indexable |

Use `.$type<T>()` to narrow the TypeScript type:

```ts
jsonb().$type<{ preferences: string[]; theme: 'dark' | 'light' }>()
```

### UUID

| Function | PostgreSQL Type | TypeScript Type | Notes |
|---|---|---|---|
| `uuid()` | `uuid` | `string` | |
| `uuid().defaultRandom()` | `uuid` | `string` | `default gen_random_uuid()` |

### Network

| Function | PostgreSQL Type | TypeScript Type |
|---|---|---|
| `inet()` | `inet` | `string` |
| `cidr()` | `cidr` | `string` |
| `macaddr()` | `macaddr` | `string` |
| `macaddr8()` | `macaddr8` | `string` |

### Geometry

| Function | PostgreSQL Type | TypeScript Type |
|---|---|---|
| `point()` | `point` | `[number, number]` |
| `line()` | `line` | `[number, number, number]` |

### Other

| Function | PostgreSQL Type | TypeScript Type | Notes |
|---|---|---|---|
| `vector({ dimensions: N })` | `vector(N)` | `number[]` | pgvector extension |
| `customType(...)` | any | any | Custom column type |

### Arrays

Any column type can be made into an array with `.array()`:

```ts
export const posts = pgTable('posts', {
  id: serial().primaryKey(),
  tags: text().array().notNull().default([]),
  scores: integer().array(3),  // Fixed-size array
});
```

### Column Modifiers

All column types support these chainable methods:

| Method | Effect |
|---|---|
| `.notNull()` | Adds `NOT NULL` constraint |
| `.default(value)` | Adds `DEFAULT value` |
| `.defaultNow()` | `DEFAULT now()` (date/time columns only) |
| `.defaultRandom()` | `DEFAULT gen_random_uuid()` (uuid only) |
| `.$defaultFn(fn)` | Runtime default (ORM-level, not in SQL) |
| `.$onUpdateFn(fn)` | Runtime value on update (ORM-level) |
| `.primaryKey()` | Makes column the primary key (implies `NOT NULL`) |
| `.unique()` | Adds `UNIQUE` constraint |
| `.references(() => table.col, { onDelete, onUpdate })` | Inline foreign key |
| `.array()` | Makes column an array type |
| `.$type<T>()` | Narrows TypeScript type (useful for json/jsonb) |
| `.generatedAlwaysAs(sql)` | Generated column (always) |
| `.generatedAlwaysAsIdentity()` | Identity column (GENERATED ALWAYS) |
| `.generatedByDefaultAsIdentity()` | Identity column (GENERATED BY DEFAULT) |

### Identity Columns (Preferred over serial)

Identity columns are the modern replacement for `serial`:

```ts
export const users = pgTable('users', {
  // GENERATED ALWAYS AS IDENTITY -- cannot manually set value on insert
  id: integer().primaryKey().generatedAlwaysAsIdentity(),

  // GENERATED BY DEFAULT AS IDENTITY -- can override on insert
  id: integer().primaryKey().generatedByDefaultAsIdentity(),

  // With sequence options
  id: integer().primaryKey().generatedAlwaysAsIdentity({
    name: 'users_id_seq',
    startWith: 1000,
    increment: 1,
  }),
});
```

## Type Inference

Drizzle tables expose `$inferSelect` and `$inferInsert` for extracting TypeScript types:

```ts
import { users } from './schema';

// Select type -- all columns, respecting nullability
type User = typeof users.$inferSelect;

// Insert type -- optional fields for columns with defaults
type NewUser = typeof users.$inferInsert;
```

These are equivalent to the older `InferSelectModel<typeof users>` and `InferInsertModel<typeof users>` from `drizzle-orm`.

For a table with:
- `id: serial().primaryKey()` -- select: `number`, insert: optional (has default)
- `email: text().notNull()` -- select: `string`, insert: required
- `name: text()` -- select: `string | null`, insert: optional (nullable)
- `createdAt: timestamp().defaultNow().notNull()` -- select: `Date`, insert: optional (has default)

## Relations (Relational Query API)

Relations are declared separately from tables and enable the `db.query.*` API with nested loading.

```ts
// db/schema.ts
import { relations } from 'drizzle-orm';
import { pgTable, serial, text, integer, timestamp, uuid } from 'drizzle-orm/pg-core';

// Tables
export const users = pgTable('users', {
  id: serial().primaryKey(),
  name: text().notNull(),
});

export const posts = pgTable('posts', {
  id: serial().primaryKey(),
  title: text().notNull(),
  content: text(),
  authorId: integer().notNull().references(() => users.id),
});

export const comments = pgTable('comments', {
  id: serial().primaryKey(),
  text: text().notNull(),
  postId: integer().notNull().references(() => posts.id),
  authorId: integer().notNull().references(() => users.id),
});

// Relations
export const usersRelations = relations(users, ({ one, many }) => ({
  posts: many(posts),
  comments: many(comments),
}));

export const postsRelations = relations(posts, ({ one, many }) => ({
  author: one(users, {
    fields: [posts.authorId],
    references: [users.id],
  }),
  comments: many(comments),
}));

export const commentsRelations = relations(comments, ({ one }) => ({
  post: one(posts, {
    fields: [comments.postId],
    references: [posts.id],
  }),
  author: one(users, {
    fields: [comments.authorId],
    references: [users.id],
  }),
}));
```

### Relation Rules

- `one()` represents the "belongs to" / "has one" side. It takes a `fields` (local FK columns) and `references` (remote PK columns) config.
- `many()` represents the "has many" side. It does not take `fields`/`references` -- Drizzle infers the join from the corresponding `one()` relation.
- Every `many()` must have a corresponding `one()` on the other table.
- Relations are ORM-level only -- they do not create foreign keys in the database. Use `.references()` on columns for actual FK constraints.

### Many-to-Many

Many-to-many requires an explicit join table:

```ts
export const usersToGroups = pgTable('users_to_groups', {
  userId: integer().notNull().references(() => users.id),
  groupId: integer().notNull().references(() => groups.id),
}, (t) => [
  primaryKey({ columns: [t.userId, t.groupId] }),
]);

export const users = pgTable('users', {
  id: serial().primaryKey(),
  name: text().notNull(),
});

export const groups = pgTable('groups', {
  id: serial().primaryKey(),
  name: text().notNull(),
});

export const usersRelations = relations(users, ({ many }) => ({
  usersToGroups: many(usersToGroups),
}));

export const groupsRelations = relations(groups, ({ many }) => ({
  usersToGroups: many(usersToGroups),
}));

export const usersToGroupsRelations = relations(usersToGroups, ({ one }) => ({
  user: one(users, {
    fields: [usersToGroups.userId],
    references: [users.id],
  }),
  group: one(groups, {
    fields: [usersToGroups.groupId],
    references: [groups.id],
  }),
}));
```

### Disambiguating Multiple Relations to the Same Table

When a table has multiple foreign keys to the same table, use `relationName`:

```ts
export const messages = pgTable('messages', {
  id: serial().primaryKey(),
  senderId: integer().notNull().references(() => users.id),
  receiverId: integer().notNull().references(() => users.id),
  content: text().notNull(),
});

export const messagesRelations = relations(messages, ({ one }) => ({
  sender: one(users, {
    fields: [messages.senderId],
    references: [users.id],
    relationName: 'sender',
  }),
  receiver: one(users, {
    fields: [messages.receiverId],
    references: [users.id],
    relationName: 'receiver',
  }),
}));

export const usersRelations = relations(users, ({ many }) => ({
  sentMessages: many(messages, { relationName: 'sender' }),
  receivedMessages: many(messages, { relationName: 'receiver' }),
}));
```

## Query API

### Relational Queries (db.query.*)

Requires `schema` to be passed to `drizzle()`.

#### findMany

```ts
// Basic -- get all users
const allUsers = await db.query.users.findMany();

// With column selection
const userNames = await db.query.users.findMany({
  columns: {
    id: true,
    name: true,
  },
});

// Exclude columns
const usersWithoutEmail = await db.query.users.findMany({
  columns: {
    email: false,
  },
});

// With relations (nested loading)
const usersWithPosts = await db.query.users.findMany({
  with: {
    posts: true,
  },
});

// Nested relations with filtering
const usersWithRecentPosts = await db.query.users.findMany({
  with: {
    posts: {
      where: (posts, { gt }) => gt(posts.createdAt, new Date('2024-01-01')),
      orderBy: (posts, { desc }) => desc(posts.createdAt),
      limit: 5,
      with: {
        comments: true,
      },
    },
  },
});

// Filtering, ordering, pagination
const activeUsers = await db.query.users.findMany({
  where: (users, { eq }) => eq(users.isActive, true),
  orderBy: (users, { desc }) => desc(users.createdAt),
  limit: 20,
  offset: 0,
});

// Extras (computed columns)
const usersWithFullName = await db.query.users.findMany({
  extras: {
    fullName: sql<string>`${users.firstName} || ' ' || ${users.lastName}`.as('full_name'),
  },
});
```

#### findFirst

Same API as `findMany` but returns a single row or `undefined` (implicitly adds `LIMIT 1`):

```ts
const user = await db.query.users.findFirst({
  where: (users, { eq }) => eq(users.id, 1),
  with: {
    posts: true,
  },
});
// Type: { id: number; name: string; posts: Post[] } | undefined
```

### SQL-Like Query Builder

#### SELECT

```ts
import { eq, and, or, gt, gte, lt, lte, ne, like, ilike, between, inArray, isNull, isNotNull, not, sql, asc, desc, count, sum, avg } from 'drizzle-orm';

// Select all columns
const allUsers = await db.select().from(users);

// Select specific columns
const userEmails = await db.select({
  id: users.id,
  email: users.email,
}).from(users);

// With WHERE
const activeUsers = await db.select()
  .from(users)
  .where(eq(users.isActive, true));

// Multiple conditions
const result = await db.select()
  .from(users)
  .where(
    and(
      eq(users.role, 'admin'),
      gt(users.createdAt, new Date('2024-01-01')),
    )
  );

// OR conditions
const result = await db.select()
  .from(users)
  .where(
    or(
      eq(users.role, 'admin'),
      eq(users.role, 'moderator'),
    )
  );

// LIKE / ILIKE
const result = await db.select()
  .from(users)
  .where(ilike(users.name, '%john%'));

// IN array
const result = await db.select()
  .from(users)
  .where(inArray(users.id, [1, 2, 3]));

// IS NULL / IS NOT NULL
const result = await db.select()
  .from(users)
  .where(isNull(users.deletedAt));

// BETWEEN
const result = await db.select()
  .from(users)
  .where(between(users.age, 18, 65));

// ORDER BY
const result = await db.select()
  .from(users)
  .orderBy(asc(users.name));

// Multiple order by
const result = await db.select()
  .from(users)
  .orderBy(desc(users.createdAt), asc(users.name));

// LIMIT / OFFSET
const result = await db.select()
  .from(users)
  .limit(10)
  .offset(20);

// COUNT with GROUP BY
const result = await db.select({
  role: users.role,
  count: sql<number>`cast(count(*) as int)`,
}).from(users)
  .groupBy(users.role);

// HAVING
const result = await db.select({
  role: users.role,
  count: sql<number>`cast(count(*) as int)`,
}).from(users)
  .groupBy(users.role)
  .having(({ count }) => gt(count, 5));

// Raw SQL in select
const result = await db.select({
  id: users.id,
  lowerName: sql<string>`lower(${users.name})`,
}).from(users);
```

#### DISTINCT / DISTINCT ON

```ts
// SELECT DISTINCT
const result = await db.selectDistinct({ role: users.role }).from(users);

// SELECT DISTINCT ON (PostgreSQL-specific)
const result = await db.selectDistinctOn([users.role])
  .from(users)
  .orderBy(users.role, desc(users.createdAt));
```

#### JOINS

```ts
// INNER JOIN
const result = await db.select()
  .from(users)
  .innerJoin(posts, eq(users.id, posts.authorId));
// Type: { users: User; posts: Post }[]

// LEFT JOIN (joined table is nullable)
const result = await db.select()
  .from(users)
  .leftJoin(posts, eq(users.id, posts.authorId));
// Type: { users: User; posts: Post | null }[]

// RIGHT JOIN
const result = await db.select()
  .from(users)
  .rightJoin(posts, eq(users.id, posts.authorId));
// Type: { users: User | null; posts: Post }[]

// FULL JOIN
const result = await db.select()
  .from(users)
  .fullJoin(posts, eq(users.id, posts.authorId));
// Type: { users: User | null; posts: Post | null }[]

// Partial select with join
const result = await db.select({
  userName: users.name,
  postTitle: posts.title,
}).from(users)
  .innerJoin(posts, eq(users.id, posts.authorId));
// Type: { userName: string; postTitle: string }[]

// Multiple joins
const result = await db.select()
  .from(posts)
  .innerJoin(users, eq(posts.authorId, users.id))
  .leftJoin(comments, eq(posts.id, comments.postId));

// Lateral joins (PostgreSQL-specific)
// Allows the subquery to reference columns from the left side
const result = await db.select()
  .from(users)
  .innerJoinLateral(
    db.select().from(posts).where(eq(posts.authorId, users.id)).limit(3).as('recent_posts'),
    sql`true`
  );
```

#### INSERT

```ts
// Insert one row
await db.insert(users).values({
  email: 'john@example.com',
  name: 'John',
});

// Insert multiple rows
await db.insert(users).values([
  { email: 'john@example.com', name: 'John' },
  { email: 'jane@example.com', name: 'Jane' },
]);

// Insert with RETURNING
const [newUser] = await db.insert(users)
  .values({ email: 'john@example.com', name: 'John' })
  .returning();

// Return specific fields
const [{ id }] = await db.insert(users)
  .values({ email: 'john@example.com', name: 'John' })
  .returning({ id: users.id });

// ON CONFLICT DO NOTHING (upsert)
await db.insert(users)
  .values({ id: 1, email: 'john@example.com', name: 'John' })
  .onConflictDoNothing();

// With conflict target
await db.insert(users)
  .values({ id: 1, email: 'john@example.com', name: 'John' })
  .onConflictDoNothing({ target: users.email });

// ON CONFLICT DO UPDATE (upsert)
await db.insert(users)
  .values({ id: 1, email: 'john@example.com', name: 'John' })
  .onConflictDoUpdate({
    target: users.email,
    set: { name: 'John Updated' },
  });

// Upsert with where clause on target
await db.insert(users)
  .values({ id: 1, email: 'john@example.com', name: 'John' })
  .onConflictDoUpdate({
    target: users.email,
    set: { name: 'John Updated' },
    targetWhere: sql`${users.isActive} = true`,
  });

// Insert from SELECT
await db.insert(archivedUsers)
  .select(
    db.select().from(users).where(eq(users.isActive, false))
  );
```

#### UPDATE

```ts
// Basic update
await db.update(users)
  .set({ name: 'Updated Name' })
  .where(eq(users.id, 1));

// Update with RETURNING
const [updated] = await db.update(users)
  .set({ isActive: false })
  .where(eq(users.id, 1))
  .returning();

// Update with SQL expressions
await db.update(users)
  .set({
    loginCount: sql`${users.loginCount} + 1`,
    lastLoginAt: new Date(),
  })
  .where(eq(users.id, 1));

// Update with FROM clause (PostgreSQL-specific)
await db.update(users)
  .set({ role: 'premium' })
  .from(subscriptions)
  .where(
    and(
      eq(users.id, subscriptions.userId),
      gt(subscriptions.expiresAt, new Date()),
    )
  );
```

#### DELETE

```ts
// Delete with WHERE
await db.delete(users).where(eq(users.id, 1));

// Delete with RETURNING
const [deleted] = await db.delete(users)
  .where(eq(users.id, 1))
  .returning();

// Return specific columns
const [{ id, email }] = await db.delete(users)
  .where(eq(users.id, 1))
  .returning({ id: users.id, email: users.email });
```

### $count Helper

```ts
const userCount = await db.$count(users);
// Type: number

const activeCount = await db.$count(users, eq(users.isActive, true));
```

### Raw SQL

```ts
// Execute raw SQL
const result = await db.execute(sql`SELECT * FROM users WHERE id = ${userId}`);

// The sql template tag handles parameterization
const name = 'John';
const result = await db.execute(sql`SELECT * FROM users WHERE name = ${name}`);
```

### Transactions

```ts
const result = await db.transaction(async (tx) => {
  const [user] = await tx.insert(users)
    .values({ name: 'John', email: 'john@example.com' })
    .returning();

  await tx.insert(posts)
    .values({ title: 'First Post', authorId: user.id });

  return user;
});

// With transaction config
await db.transaction(async (tx) => {
  // ...
}, {
  isolationLevel: 'serializable',
  accessMode: 'read write',
  deferrable: true,
});

// Manual rollback
await db.transaction(async (tx) => {
  await tx.insert(users).values({ name: 'John', email: 'john@example.com' });

  // This will rollback the entire transaction
  tx.rollback();
});
```

### Prepared Statements

```ts
const getUserById = db.select()
  .from(users)
  .where(eq(users.id, sql.placeholder('id')))
  .prepare('get_user_by_id');

const user = await getUserById.execute({ id: 1 });
```

### Common Table Expressions (WITH)

```ts
const sq = db.$with('sq').as(
  db.select().from(users).where(eq(users.isActive, true))
);

const result = await db.with(sq)
  .select()
  .from(sq);
```

### Set Operations

```ts
// UNION (removes duplicates)
const result = await db.select({ name: users.name })
  .from(users)
  .union(
    db.select({ name: archivedUsers.name }).from(archivedUsers)
  );

// UNION ALL (keeps duplicates)
const result = await db.select({ name: users.name })
  .from(users)
  .unionAll(
    db.select({ name: archivedUsers.name }).from(archivedUsers)
  );

// Also available: .intersect(), .intersectAll(), .except(), .exceptAll()
```

## Migrations

### Workflow Options

drizzle-kit provides two approaches to syncing your schema with the database:

#### 1. `drizzle-kit push` (Rapid Development)

Pushes schema changes directly to the database without generating migration files. Ideal for local development and prototyping.

```bash
npx drizzle-kit push
```

- Reads your schema files and compares to the current database state
- Applies changes directly
- No migration files generated
- No migration history tracked
- Fast iteration during development

#### 2. `drizzle-kit generate` + `drizzle-kit migrate` (Production)

Generates SQL migration files from schema changes, then applies them.

```bash
# Generate migration from schema changes
npx drizzle-kit generate

# Apply pending migrations
npx drizzle-kit migrate
```

- Generates timestamped SQL files in the `out` directory (default: `./drizzle`)
- Migration files can be reviewed, edited, and committed to version control
- Migration history is tracked in a `__drizzle_migrations` table
- Suitable for production workflows, CI/CD

#### Programmatic Migration (at app startup)

```ts
import { migrate } from 'drizzle-orm/postgres-js/migrator';
import { db } from './db';

await migrate(db, {
  migrationsFolder: './drizzle',
  migrationsTable: '__drizzle_migrations',  // optional, this is the default
  migrationsSchema: 'public',               // optional, this is the default
});
```

### Other drizzle-kit Commands

```bash
# Introspect existing database and generate schema files
npx drizzle-kit introspect

# Open Drizzle Studio (database GUI)
npx drizzle-kit studio

# Check schema for errors without applying
npx drizzle-kit check

# Drop a specific migration
npx drizzle-kit drop
```

### Recommended Workflow

- **Local development**: Use `drizzle-kit push` for fast iteration
- **Before deployment**: Switch to `drizzle-kit generate` to create migration files
- **Production**: Apply migrations with `drizzle-kit migrate` or programmatic `migrate()`
- **Always commit migration files** to version control

## Filters and Operators

All imported from `drizzle-orm`:

| Operator | SQL | Example |
|---|---|---|
| `eq(col, val)` | `col = val` | `eq(users.id, 1)` |
| `ne(col, val)` | `col <> val` | `ne(users.role, 'admin')` |
| `gt(col, val)` | `col > val` | `gt(users.age, 18)` |
| `gte(col, val)` | `col >= val` | `gte(users.age, 18)` |
| `lt(col, val)` | `col < val` | `lt(users.age, 65)` |
| `lte(col, val)` | `col <= val` | `lte(users.age, 65)` |
| `isNull(col)` | `col IS NULL` | `isNull(users.deletedAt)` |
| `isNotNull(col)` | `col IS NOT NULL` | `isNotNull(users.email)` |
| `inArray(col, vals)` | `col IN (...)` | `inArray(users.id, [1,2,3])` |
| `notInArray(col, vals)` | `col NOT IN (...)` | `notInArray(users.role, ['banned'])` |
| `like(col, pat)` | `col LIKE pat` | `like(users.name, 'J%')` |
| `ilike(col, pat)` | `col ILIKE pat` | `ilike(users.name, '%john%')` |
| `notLike(col, pat)` | `col NOT LIKE pat` | |
| `notIlike(col, pat)` | `col NOT ILIKE pat` | |
| `between(col, min, max)` | `col BETWEEN min AND max` | `between(users.age, 18, 65)` |
| `notBetween(col, min, max)` | `col NOT BETWEEN` | |
| `and(...conds)` | `c1 AND c2 AND ...` | `and(eq(...), gt(...))` |
| `or(...conds)` | `c1 OR c2 OR ...` | `or(eq(...), eq(...))` |
| `not(cond)` | `NOT cond` | `not(eq(users.role, 'admin'))` |
| `exists(subquery)` | `EXISTS (subquery)` | |
| `notExists(subquery)` | `NOT EXISTS (subquery)` | |
| `arrayContains(col, val)` | `col @> val` | Array contains |
| `arrayContained(col, val)` | `col <@ val` | Array contained by |
| `arrayOverlaps(col, val)` | `col && val` | Array overlap |
| `sql\`...\`` | Raw SQL | Any expression |

`and()` and `or()` accept `undefined` values and filter them out. This is useful for conditional filtering:

```ts
const result = await db.select().from(users).where(
  and(
    eq(users.isActive, true),
    role ? eq(users.role, role) : undefined,
    search ? ilike(users.name, `%${search}%`) : undefined,
  )
);
```

## Best Practices

### Schema Organization

- Keep all table definitions in a single `schema.ts` or split into `schema/users.ts`, `schema/posts.ts` etc., and re-export from `schema/index.ts`
- Export everything from schema files -- drizzle-kit needs access to all tables, enums, and relations
- Place the `db` instance in a `db/index.ts` file and import it everywhere

### Column Types

- Use `uuid().defaultRandom()` for primary keys in distributed systems
- Use `serial()` or `integer().generatedAlwaysAsIdentity()` for simple auto-incrementing IDs
- Prefer `text()` over `varchar()` unless you have a specific length constraint -- PostgreSQL treats them identically for performance
- Use `timestamp({ withTimezone: true })` for all timestamps (critical with Supabase)
- Use `jsonb()` over `json()` -- jsonb is indexable and more efficient for queries

### Type Safety

- Use `.$type<T>()` on `jsonb()` columns to get typed JSON
- Extract types with `typeof table.$inferSelect` and `typeof table.$inferInsert`
- Relations-based queries (`db.query.*`) provide better nested type inference than manual joins

### Query Patterns

- Use `db.query.*` (relational queries) for reads with nested data
- Use `db.select()` / `db.insert()` / `db.update()` / `db.delete()` for precise SQL control
- Use `.returning()` on inserts, updates, and deletes to get affected rows back
- Use `.onConflictDoUpdate()` for upserts
- Use `sql.placeholder()` with `.prepare()` for frequently-executed queries

### Performance

- Add indexes for columns used in WHERE clauses and joins
- Use `.limit()` and `.offset()` for pagination (or cursor-based pagination with WHERE + ORDER BY)
- Use `db.query.*.findFirst()` instead of `findMany` with `limit: 1` for single-row lookups

## Common Mistakes

### Forgetting to pass schema to drizzle()

```ts
// WRONG -- db.query.* will not be available
const db = drizzle(process.env.DATABASE_URL!);

// RIGHT
const db = drizzle({
  connection: process.env.DATABASE_URL!,
  schema,
});
```

### Using the deprecated extra config format

```ts
// DEPRECATED -- returning an object
pgTable('users', { id: integer() }, (t) => ({
  idx: index().on(t.id),
}));

// CORRECT -- returning an array
pgTable('users', { id: integer() }, (t) => [
  index().on(t.id),
]);
```

### Nullable columns in selects

Columns without `.notNull()` will have `| null` in their select type. This is intentional:

```ts
const users = pgTable('users', {
  name: text(),  // select type: string | null
});

// Fix: add .notNull() if the column should never be null
const users = pgTable('users', {
  name: text().notNull(),  // select type: string
});
```

### Expecting bigint to auto-select mode

```ts
// WRONG -- bigint requires explicit mode
bigint()  // TypeScript error

// RIGHT
bigint({ mode: 'number' })
bigint({ mode: 'bigint' })
```

### Forgetting to await queries

All Drizzle queries return Promises. They implement `QueryPromise` which extends `Promise`. Always `await` them:

```ts
// WRONG -- returns a promise, not results
const users = db.select().from(usersTable);

// RIGHT
const users = await db.select().from(usersTable);
```

## Gotchas

- **serial/bigserial are always notNull + hasDefault**: You cannot make them nullable. They are automatically excluded from required insert fields.
- **`numeric()` returns `string` by default**: This prevents precision loss with large decimal values. Use `{ mode: 'number' }` explicitly if you want a number.
- **`date()` returns `string` by default**: Unlike `timestamp()` which returns `Date`, the `date()` column defaults to string mode. Pass `{ mode: 'date' }` for `Date` objects.
- **Relations are ORM-only**: Declaring `relations()` does not create foreign key constraints in the database. You still need `.references()` on columns or `foreignKey()` in extra config for actual DB constraints.
- **`$defaultFn` and `$onUpdateFn` are runtime only**: These values are set by the ORM at runtime, not by the database. They do not appear in migrations and drizzle-kit is not aware of them.
- **Column key names as default DB names**: If you write `firstName: text()` without a first argument, the database column name is `firstName` (camelCase in your DB). Use the `casing: 'snake_case'` option or explicit column names to get `first_name`.
- **`drizzle-kit push` is lossy**: It applies changes directly and cannot be undone. For production, use `generate` + `migrate`.
- **`drizzle-kit push` and `generate` require a running database**: They compare your schema to the actual database state.
- **postgres.js connection pooling**: The `postgres` (postgres.js) driver manages its own connection pool. A single module-level `drizzle()` call is sufficient. Do not create new instances per request.

## Links

- Official docs: https://orm.drizzle.team
- PostgreSQL column types: https://orm.drizzle.team/docs/column-types/pg
- Queries: https://orm.drizzle.team/docs/select
- Relations: https://orm.drizzle.team/docs/rqb
- Migrations: https://orm.drizzle.team/docs/migrations
- drizzle-kit config: https://orm.drizzle.team/docs/drizzle-config-file
- GitHub: https://github.com/drizzle-team/drizzle-orm
- npm drizzle-orm: https://www.npmjs.com/package/drizzle-orm
- npm drizzle-kit: https://www.npmjs.com/package/drizzle-kit
