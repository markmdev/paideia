import { pgTable, text, timestamp } from 'drizzle-orm/pg-core'
import { createId } from '@paralleldrive/cuid2'
import { users } from './auth'

export const tutorSessions = pgTable('tutor_sessions', {
  id: text('id').primaryKey().$defaultFn(() => createId()),
  studentId: text('student_id').notNull().references(() => users.id),
  subject: text('subject').notNull(),
  topic: text('topic'),
  messages: text('messages').notNull(), // JSON array
  startedAt: timestamp('started_at', { mode: 'date' }).notNull().defaultNow(),
  endedAt: timestamp('ended_at', { mode: 'date' }),
  metadata: text('metadata'), // JSON
})
