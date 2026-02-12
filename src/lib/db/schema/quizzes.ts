import { pgTable, text, timestamp, real, integer, uniqueIndex } from 'drizzle-orm/pg-core'
import { createId } from '@paralleldrive/cuid2'
import { users } from './auth'
import { standards } from './standards'

export const quizzes = pgTable('quizzes', {
  id: text('id').primaryKey().$defaultFn(() => createId()),
  title: text('title').notNull(),
  subject: text('subject').notNull(),
  gradeLevel: text('grade_level').notNull(),
  standards: text('standards_json'), // JSON
  difficultyLevel: text('difficulty_level'),
  timeLimit: integer('time_limit'),
  createdBy: text('created_by').references(() => users.id),
  createdAt: timestamp('created_at', { mode: 'date' }).notNull().defaultNow(),
})

export const quizQuestions = pgTable('quiz_questions', {
  id: text('id').primaryKey().$defaultFn(() => createId()),
  quizId: text('quiz_id').notNull().references(() => quizzes.id, { onDelete: 'cascade' }),
  type: text('type').notNull(), // multiple_choice, short_answer, essay, matching, fill_blank
  questionText: text('question_text').notNull(),
  options: text('options'), // JSON for MC
  correctAnswer: text('correct_answer'),
  explanation: text('explanation'),
  bloomsLevel: text('blooms_level'),
  points: real('points').notNull().default(1.0),
  orderIndex: integer('order_index').notNull(),
})

export const questionStandards = pgTable('question_standards', {
  id: text('id').primaryKey().$defaultFn(() => createId()),
  questionId: text('question_id').notNull().references(() => quizQuestions.id, { onDelete: 'cascade' }),
  standardId: text('standard_id').notNull().references(() => standards.id),
}, (table) => [
  uniqueIndex('question_standard_idx').on(table.questionId, table.standardId),
])
