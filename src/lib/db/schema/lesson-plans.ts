import { pgTable, text, timestamp } from 'drizzle-orm/pg-core'
import { createId } from '@paralleldrive/cuid2'
import { users } from './auth'

export const lessonPlans = pgTable('lesson_plans', {
  id: text('id').primaryKey().$defaultFn(() => createId()),
  title: text('title').notNull(),
  subject: text('subject').notNull(),
  gradeLevel: text('grade_level').notNull(),
  duration: text('duration'),
  standards: text('standards'), // JSON
  objectives: text('objectives').notNull(), // JSON
  warmUp: text('warm_up'),
  directInstruction: text('direct_instruction'),
  guidedPractice: text('guided_practice'),
  independentPractice: text('independent_practice'),
  closure: text('closure'),
  materials: text('materials'), // JSON
  differentiation: text('differentiation'), // JSON
  assessmentPlan: text('assessment_plan'),
  teacherId: text('teacher_id').notNull().references(() => users.id),
  aiMetadata: text('ai_metadata'), // JSON
  createdAt: timestamp('created_at', { mode: 'date' }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { mode: 'date' }).notNull().defaultNow(),
})
