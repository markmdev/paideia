import { pgTable, text, timestamp } from 'drizzle-orm/pg-core'
import { createId } from '@paralleldrive/cuid2'

export const demoSessions = pgTable('demo_sessions', {
  id: text('id').primaryKey().$defaultFn(() => createId()),
  sourceEmail: text('source_email').notNull(),
  createdAt: timestamp('created_at', { mode: 'date' }).notNull().defaultNow(),
})
