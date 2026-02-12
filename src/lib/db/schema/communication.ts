import { pgTable, text, timestamp, boolean } from 'drizzle-orm/pg-core'
import { createId } from '@paralleldrive/cuid2'
import { users } from './auth'

export const messages = pgTable('messages', {
  id: text('id').primaryKey().$defaultFn(() => createId()),
  senderId: text('sender_id').notNull().references(() => users.id),
  receiverId: text('receiver_id').notNull().references(() => users.id),
  subject: text('subject'),
  content: text('content').notNull(),
  type: text('type').notNull().default('general'), // general, progress_update, assignment_insight, weekly_digest, alert
  language: text('language').notNull().default('en'),
  isAIGenerated: boolean('is_ai_generated').notNull().default(false),
  status: text('status').notNull().default('sent'), // draft, sent, read
  metadata: text('metadata'), // JSON
  createdAt: timestamp('created_at', { mode: 'date' }).notNull().defaultNow(),
})

export const notifications = pgTable('notifications', {
  id: text('id').primaryKey().$defaultFn(() => createId()),
  userId: text('user_id').notNull().references(() => users.id),
  type: text('type').notNull(),
  title: text('title').notNull(),
  body: text('body').notNull(),
  isRead: boolean('is_read').notNull().default(false),
  link: text('link'),
  createdAt: timestamp('created_at', { mode: 'date' }).notNull().defaultNow(),
})
