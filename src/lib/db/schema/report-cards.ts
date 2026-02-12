import { pgTable, text, timestamp } from 'drizzle-orm/pg-core'
import { createId } from '@paralleldrive/cuid2'
import { users } from './auth'
import { classes } from './classes'

export const reportCards = pgTable('report_cards', {
  id: text('id').primaryKey().$defaultFn(() => createId()),
  studentId: text('student_id').notNull().references(() => users.id),
  classId: text('class_id').notNull().references(() => classes.id),
  gradingPeriod: text('grading_period').notNull(),
  narrative: text('narrative').notNull(),
  strengths: text('strengths'), // JSON array
  areasForGrowth: text('areas_for_growth'), // JSON array
  recommendations: text('recommendations'), // JSON array
  gradeRecommendation: text('grade_recommendation'),
  status: text('status').notNull().default('draft'), // draft, approved
  generatedAt: timestamp('generated_at', { mode: 'date' }).notNull().defaultNow(),
  approvedAt: timestamp('approved_at', { mode: 'date' }),
  approvedBy: text('approved_by').references(() => users.id),
})
