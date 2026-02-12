import { pgTable, text, timestamp } from 'drizzle-orm/pg-core'
import { createId } from '@paralleldrive/cuid2'

export const auditLogs = pgTable('audit_logs', {
  id: text('id').primaryKey().$defaultFn(() => createId()),
  entityType: text('entity_type').notNull(),
  entityId: text('entity_id').notNull(),
  action: text('action').notNull(),
  userId: text('user_id'),
  before: text('before'), // JSON
  after: text('after'), // JSON
  aiModel: text('ai_model'),
  aiPrompt: text('ai_prompt'),
  timestamp: timestamp('timestamp', { mode: 'date' }).notNull().defaultNow(),
})
