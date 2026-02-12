import { redirect } from 'next/navigation'
import { auth } from '@/lib/auth'
import { db } from '@/lib/db'
import { messages, users } from '@/lib/db/schema'
import { eq, desc, or } from 'drizzle-orm'
import { MessageList } from '@/components/messages/message-list'
import { ComposeMessage } from '@/components/messages/compose-message'

export default async function MessagesPage() {
  const session = await auth()
  if (!session?.user) {
    redirect('/login')
  }

  // Get all messages for this user
  const results = await db
    .select({
      id: messages.id,
      senderId: messages.senderId,
      receiverId: messages.receiverId,
      subject: messages.subject,
      content: messages.content,
      type: messages.type,
      language: messages.language,
      isAIGenerated: messages.isAIGenerated,
      status: messages.status,
      metadata: messages.metadata,
      createdAt: messages.createdAt,
    })
    .from(messages)
    .where(
      or(
        eq(messages.senderId, session.user.id),
        eq(messages.receiverId, session.user.id)
      )
    )
    .orderBy(desc(messages.createdAt))
    .limit(50)

  // Get user names for sender/receiver
  const userIdSet = new Set(
    results.flatMap((r) => [r.senderId, r.receiverId])
  )
  const userIds = [...userIdSet]
  const userNames: Record<string, string> = {}

  if (userIds.length > 0) {
    const usersResult = await db
      .select({ id: users.id, name: users.name })
      .from(users)

    for (const u of usersResult) {
      if (userIds.includes(u.id)) {
        userNames[u.id] = u.name ?? 'Unknown'
      }
    }
  }

  const messagesWithNames = results.map((m) => ({
    id: m.id,
    subject: m.subject,
    content: m.content,
    type: m.type,
    isAIGenerated: m.isAIGenerated,
    status: m.status,
    senderName: userNames[m.senderId] ?? 'Unknown',
    receiverName: userNames[m.receiverId] ?? 'Unknown',
    isFromMe: m.senderId === session.user.id,
    createdAt: m.createdAt.toISOString(),
  }))

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-serif font-bold tracking-tight">
            Messages
          </h1>
          <p className="text-muted-foreground text-sm">
            {session.user.role === 'parent'
              ? "Stay connected with your children's teachers."
              : 'Communicate with parents and colleagues.'}
          </p>
        </div>
        <ComposeMessage />
      </div>

      <MessageList messages={messagesWithNames} />
    </div>
  )
}
