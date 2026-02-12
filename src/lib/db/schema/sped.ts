import { pgTable, text, timestamp, real, boolean } from 'drizzle-orm/pg-core'
import { createId } from '@paralleldrive/cuid2'
import { users } from './auth'

export const ieps = pgTable('ieps', {
  id: text('id').primaryKey().$defaultFn(() => createId()),
  studentId: text('student_id').notNull().references(() => users.id),
  authorId: text('author_id').notNull().references(() => users.id),
  status: text('status').notNull().default('draft'), // draft, review, active, archived
  startDate: timestamp('start_date', { mode: 'date' }),
  endDate: timestamp('end_date', { mode: 'date' }),
  presentLevels: text('present_levels'),
  disabilityCategory: text('disability_category'),
  accommodations: text('accommodations'), // JSON
  modifications: text('modifications'), // JSON
  relatedServices: text('related_services'), // JSON
  transitionPlan: text('transition_plan'), // JSON
  meetingDate: timestamp('meeting_date', { mode: 'date' }),
  meetingNotes: text('meeting_notes'),
  parentInput: text('parent_input'),
  aiMetadata: text('ai_metadata'), // JSON
  createdAt: timestamp('created_at', { mode: 'date' }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { mode: 'date' }).notNull().defaultNow(),
})

export const iepGoals = pgTable('iep_goals', {
  id: text('id').primaryKey().$defaultFn(() => createId()),
  iepId: text('iep_id').notNull().references(() => ieps.id, { onDelete: 'cascade' }),
  area: text('area').notNull(),
  goalText: text('goal_text').notNull(),
  baseline: text('baseline'),
  target: text('target'),
  measureMethod: text('measure_method'),
  frequency: text('frequency'),
  timeline: text('timeline'),
  status: text('status').notNull().default('active'), // active, met, not_met, discontinued
  similarityScore: real('similarity_score'),
  aiGenerated: boolean('ai_generated').notNull().default(false),
  createdAt: timestamp('created_at', { mode: 'date' }).notNull().defaultNow(),
})

export const progressDataPoints = pgTable('progress_data_points', {
  id: text('id').primaryKey().$defaultFn(() => createId()),
  goalId: text('goal_id').notNull().references(() => iepGoals.id, { onDelete: 'cascade' }),
  studentId: text('student_id').notNull().references(() => users.id),
  value: real('value').notNull(),
  unit: text('unit').notNull(),
  date: timestamp('date', { mode: 'date' }).notNull().defaultNow(),
  notes: text('notes'),
  recordedBy: text('recorded_by'),
})

export const complianceDeadlines = pgTable('compliance_deadlines', {
  id: text('id').primaryKey().$defaultFn(() => createId()),
  type: text('type').notNull(), // initial_eval, annual_review, triennial
  studentId: text('student_id').notNull(),
  dueDate: timestamp('due_date', { mode: 'date' }).notNull(),
  status: text('status').notNull().default('upcoming'),
  completedAt: timestamp('completed_at', { mode: 'date' }),
  notes: text('notes'),
})
