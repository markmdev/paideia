import { pgTable, text, timestamp } from 'drizzle-orm/pg-core'

export const cacheEntries = pgTable('cache_entries', {
  key: text('key').primaryKey(),
  value: text('value').notNull(),
  expiresAt: timestamp('expires_at', { mode: 'date' }).notNull(),
  createdAt: timestamp('created_at', { mode: 'date' }).notNull().defaultNow(),
})
