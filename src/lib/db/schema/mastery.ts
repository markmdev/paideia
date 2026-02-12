import { pgTable, text, timestamp, real } from 'drizzle-orm/pg-core'
import { createId } from '@paralleldrive/cuid2'
import { users } from './auth'
import { standards } from './standards'

export const masteryRecords = pgTable('mastery_records', {
  id: text('id').primaryKey().$defaultFn(() => createId()),
  studentId: text('student_id').notNull().references(() => users.id),
  standardId: text('standard_id').notNull().references(() => standards.id),
  level: text('level').notNull(), // beginning, developing, proficient, advanced
  score: real('score').notNull(), // 0-100
  assessedAt: timestamp('assessed_at', { mode: 'date' }).notNull().defaultNow(),
  source: text('source').notNull(), // assignment_id reference
  notes: text('notes'),
})
