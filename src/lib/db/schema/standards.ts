import { pgTable, text, uniqueIndex } from 'drizzle-orm/pg-core'
import { createId } from '@paralleldrive/cuid2'
import { classes } from './classes'

export const standards = pgTable('standards', {
  id: text('id').primaryKey().$defaultFn(() => createId()),
  code: text('code').notNull().unique(),
  description: text('description').notNull(),
  subject: text('subject').notNull(),
  gradeLevel: text('grade_level').notNull(),
  domain: text('domain'),
  state: text('state').notNull().default('CCSS'),
})

export const classStandards = pgTable('class_standards', {
  id: text('id').primaryKey().$defaultFn(() => createId()),
  classId: text('class_id').notNull().references(() => classes.id, { onDelete: 'cascade' }),
  standardId: text('standard_id').notNull().references(() => standards.id),
}, (table) => [
  uniqueIndex('class_standard_idx').on(table.classId, table.standardId),
])
