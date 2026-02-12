import { auth } from '@/lib/auth'
import { db } from '@/lib/db'
import { messages, users } from '@/lib/db/schema'
import { eq, desc, or } from 'drizzle-orm'
import { NextResponse } from 'next/server'

export async function GET() {
  const session = await auth()
  if (!session?.user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    // Get all messages where user is sender or receiver
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

    // Get sender/receiver names
    const userIds = [
      ...new Set(results.flatMap((r) => [r.senderId, r.receiverId])),
    ]

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
      ...m,
      senderName: userNames[m.senderId] ?? 'Unknown',
      receiverName: userNames[m.receiverId] ?? 'Unknown',
      isFromMe: m.senderId === session.user.id,
    }))

    return NextResponse.json(messagesWithNames)
  } catch (error) {
    console.error('Failed to load messages:', error)
    return NextResponse.json(
      { error: 'Failed to load messages' },
      { status: 500 }
    )
  }
}

export async function POST(req: Request) {
  const session = await auth()
  if (!session?.user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const body = await req.json()
    const { receiverId, subject, content, type, isAIGenerated, metadata } = body

    if (!receiverId || !content) {
      return NextResponse.json(
        { error: 'receiverId and content are required' },
        { status: 400 }
      )
    }

    // Verify receiver exists
    const [receiver] = await db
      .select({ id: users.id })
      .from(users)
      .where(eq(users.id, receiverId))
      .limit(1)

    if (!receiver) {
      return NextResponse.json(
        { error: 'Receiver not found' },
        { status: 404 }
      )
    }

    const [message] = await db
      .insert(messages)
      .values({
        senderId: session.user.id,
        receiverId,
        subject: subject ?? null,
        content,
        type: type ?? 'general',
        isAIGenerated: isAIGenerated ?? false,
        status: 'sent',
        metadata: metadata ? JSON.stringify(metadata) : null,
      })
      .returning()

    return NextResponse.json(message, { status: 201 })
  } catch (error) {
    console.error('Failed to send message:', error)
    return NextResponse.json(
      { error: 'Failed to send message' },
      { status: 500 }
    )
  }
}
