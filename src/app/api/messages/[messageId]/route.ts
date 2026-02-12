import { auth } from '@/lib/auth'
import { db } from '@/lib/db'
import { messages, users } from '@/lib/db/schema'
import { eq, and, or } from 'drizzle-orm'
import { NextResponse } from 'next/server'

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ messageId: string }> }
) {
  const session = await auth()
  if (!session?.user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { messageId } = await params

  try {
    const [message] = await db
      .select()
      .from(messages)
      .where(
        and(
          eq(messages.id, messageId),
          or(
            eq(messages.senderId, session.user.id),
            eq(messages.receiverId, session.user.id)
          )
        )
      )
      .limit(1)

    if (!message) {
      return NextResponse.json(
        { error: 'Message not found' },
        { status: 404 }
      )
    }

    // Get sender and receiver names
    const [sender] = await db
      .select({ name: users.name })
      .from(users)
      .where(eq(users.id, message.senderId))
      .limit(1)

    const [receiver] = await db
      .select({ name: users.name })
      .from(users)
      .where(eq(users.id, message.receiverId))
      .limit(1)

    // Mark as read if the current user is the receiver
    if (message.receiverId === session.user.id && message.status === 'sent') {
      await db
        .update(messages)
        .set({ status: 'read' })
        .where(eq(messages.id, messageId))
    }

    return NextResponse.json({
      ...message,
      senderName: sender?.name ?? 'Unknown',
      receiverName: receiver?.name ?? 'Unknown',
      isFromMe: message.senderId === session.user.id,
    })
  } catch (error) {
    console.error('Failed to load message:', error)
    return NextResponse.json(
      { error: 'Failed to load message' },
      { status: 500 }
    )
  }
}

export async function PUT(
  req: Request,
  { params }: { params: Promise<{ messageId: string }> }
) {
  const session = await auth()
  if (!session?.user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { messageId } = await params

  try {
    // Verify access
    const [message] = await db
      .select()
      .from(messages)
      .where(
        and(
          eq(messages.id, messageId),
          or(
            eq(messages.senderId, session.user.id),
            eq(messages.receiverId, session.user.id)
          )
        )
      )
      .limit(1)

    if (!message) {
      return NextResponse.json(
        { error: 'Message not found' },
        { status: 404 }
      )
    }

    const body = await req.json()
    const updates: Record<string, unknown> = {}

    // Mark as read
    if (body.status === 'read' && message.receiverId === session.user.id) {
      updates.status = 'read'
    }

    // Update draft content (only by sender)
    if (body.content && message.senderId === session.user.id && message.status === 'draft') {
      updates.content = body.content
      if (body.subject !== undefined) updates.subject = body.subject
    }

    if (Object.keys(updates).length === 0) {
      return NextResponse.json(
        { error: 'No valid updates provided' },
        { status: 400 }
      )
    }

    const [updated] = await db
      .update(messages)
      .set(updates)
      .where(eq(messages.id, messageId))
      .returning()

    return NextResponse.json(updated)
  } catch (error) {
    console.error('Failed to update message:', error)
    return NextResponse.json(
      { error: 'Failed to update message' },
      { status: 500 }
    )
  }
}
