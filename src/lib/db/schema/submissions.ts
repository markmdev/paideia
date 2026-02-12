import { pgTable, text, timestamp, real, boolean, uniqueIndex } from 'drizzle-orm/pg-core'
import { createId } from '@paralleldrive/cuid2'
import { users } from './auth'
import { assignments, rubricCriteria } from './assignments'

export const submissions = pgTable('submissions', {
  id: text('id').primaryKey().$defaultFn(() => createId()),
  assignmentId: text('assignment_id').notNull().references(() => assignments.id),
  studentId: text('student_id').notNull().references(() => users.id),
  content: text('content').notNull(),
  attachments: text('attachments'), // JSON
  status: text('status').notNull().default('submitted'), // draft, submitted, grading, graded, returned
  submittedAt: timestamp('submitted_at', { mode: 'date' }).notNull().defaultNow(),
  gradedAt: timestamp('graded_at', { mode: 'date' }),
  totalScore: real('total_score'),
  maxScore: real('max_score'),
  letterGrade: text('letter_grade'),
})

export const feedbackDrafts = pgTable('feedback_drafts', {
  id: text('id').primaryKey().$defaultFn(() => createId()),
  submissionId: text('submission_id').notNull().unique().references(() => submissions.id),
  teacherId: text('teacher_id').notNull().references(() => users.id),
  aiFeedback: text('ai_feedback').notNull(),
  teacherEdits: text('teacher_edits'),
  finalFeedback: text('final_feedback'),
  status: text('status').notNull().default('draft'), // draft, edited, approved, sent
  strengths: text('strengths'), // JSON
  improvements: text('improvements'), // JSON
  nextSteps: text('next_steps'), // JSON
  aiMetadata: text('ai_metadata'), // JSON
  createdAt: timestamp('created_at', { mode: 'date' }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { mode: 'date' }).notNull().defaultNow(),
})

export const criterionScores = pgTable('criterion_scores', {
  id: text('id').primaryKey().$defaultFn(() => createId()),
  submissionId: text('submission_id').notNull().references(() => submissions.id, { onDelete: 'cascade' }),
  criterionId: text('criterion_id').notNull().references(() => rubricCriteria.id),
  level: text('level').notNull(),
  score: real('score').notNull(),
  maxScore: real('max_score').notNull(),
  justification: text('justification'),
}, (table) => [
  uniqueIndex('criterion_score_idx').on(table.submissionId, table.criterionId),
])
