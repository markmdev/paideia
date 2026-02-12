import { pgTable, text, timestamp, uniqueIndex } from 'drizzle-orm/pg-core'
import { createId } from '@paralleldrive/cuid2'
import { users } from './auth'

export const districts = pgTable('districts', {
  id: text('id').primaryKey().$defaultFn(() => createId()),
  name: text('name').notNull(),
  state: text('state').notNull(),
  createdAt: timestamp('created_at', { mode: 'date' }).notNull().defaultNow(),
})

export const schools = pgTable('schools', {
  id: text('id').primaryKey().$defaultFn(() => createId()),
  name: text('name').notNull(),
  districtId: text('district_id').references(() => districts.id),
  address: text('address'),
  createdAt: timestamp('created_at', { mode: 'date' }).notNull().defaultNow(),
})

export const classes = pgTable('classes', {
  id: text('id').primaryKey().$defaultFn(() => createId()),
  name: text('name').notNull(),
  subject: text('subject').notNull(),
  gradeLevel: text('grade_level').notNull(),
  period: text('period'),
  schoolYear: text('school_year').notNull().default('2025-2026'),
  schoolId: text('school_id').references(() => schools.id),
  createdAt: timestamp('created_at', { mode: 'date' }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { mode: 'date' }).notNull().defaultNow(),
})

export const classMembers = pgTable('class_members', {
  id: text('id').primaryKey().$defaultFn(() => createId()),
  classId: text('class_id').notNull().references(() => classes.id, { onDelete: 'cascade' }),
  userId: text('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  role: text('role').notNull(), // teacher, student
  joinedAt: timestamp('joined_at', { mode: 'date' }).notNull().defaultNow(),
}, (table) => [
  uniqueIndex('class_member_idx').on(table.classId, table.userId),
])

export const parentChildren = pgTable('parent_children', {
  id: text('id').primaryKey().$defaultFn(() => createId()),
  parentId: text('parent_id').notNull().references(() => users.id),
  childId: text('child_id').notNull().references(() => users.id),
}, (table) => [
  uniqueIndex('parent_child_idx').on(table.parentId, table.childId),
])
