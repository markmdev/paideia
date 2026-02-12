import { pgTable, text, timestamp, real, integer, boolean } from 'drizzle-orm/pg-core'
import { createId } from '@paralleldrive/cuid2'
import { users } from './auth'
import { classes } from './classes'
import { standards } from './standards'

export const rubrics = pgTable('rubrics', {
  id: text('id').primaryKey().$defaultFn(() => createId()),
  title: text('title').notNull(),
  description: text('description'),
  type: text('type').notNull().default('analytical'), // analytical, holistic
  levels: text('levels').notNull(), // JSON array
  teacherId: text('teacher_id').notNull().references(() => users.id),
  isTemplate: boolean('is_template').notNull().default(false),
  createdAt: timestamp('created_at', { mode: 'date' }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { mode: 'date' }).notNull().defaultNow(),
})

export const rubricCriteria = pgTable('rubric_criteria', {
  id: text('id').primaryKey().$defaultFn(() => createId()),
  rubricId: text('rubric_id').notNull().references(() => rubrics.id, { onDelete: 'cascade' }),
  name: text('name').notNull(),
  description: text('description'),
  weight: real('weight').notNull().default(1.0),
  standardId: text('standard_id').references(() => standards.id),
  descriptors: text('descriptors').notNull(), // JSON: level -> descriptor
})

export const assignments = pgTable('assignments', {
  id: text('id').primaryKey().$defaultFn(() => createId()),
  title: text('title').notNull(),
  description: text('description').notNull(),
  instructions: text('instructions'),
  type: text('type').notNull().default('essay'), // essay, quiz, short_answer, project, lab_report
  gradeLevel: text('grade_level').notNull(),
  subject: text('subject').notNull(),
  dueDate: timestamp('due_date', { mode: 'date' }),
  status: text('status').notNull().default('draft'), // draft, published, grading, completed
  classId: text('class_id').notNull().references(() => classes.id),
  teacherId: text('teacher_id').notNull().references(() => users.id),
  rubricId: text('rubric_id').references(() => rubrics.id),
  successCriteria: text('success_criteria'), // JSON array
  aiMetadata: text('ai_metadata'), // JSON
  createdAt: timestamp('created_at', { mode: 'date' }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { mode: 'date' }).notNull().defaultNow(),
})

export const differentiatedVersions = pgTable('differentiated_versions', {
  id: text('id').primaryKey().$defaultFn(() => createId()),
  assignmentId: text('assignment_id').notNull().references(() => assignments.id, { onDelete: 'cascade' }),
  tier: text('tier').notNull(), // below_grade, on_grade, above_grade
  title: text('title').notNull(),
  content: text('content').notNull(),
  scaffolds: text('scaffolds'), // JSON
  createdAt: timestamp('created_at', { mode: 'date' }).notNull().defaultNow(),
})
