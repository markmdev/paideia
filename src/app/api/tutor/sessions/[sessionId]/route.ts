import { auth } from '@/lib/auth'
import { db } from '@/lib/db'
import { tutorSessions } from '@/lib/db/schema'
import { eq, and } from 'drizzle-orm'
import { NextResponse } from 'next/server'

interface TutorMessage {
  role: 'user' | 'assistant'
  content: string
  timestamp: string
}

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ sessionId: string }> }
) {
  const session = await auth()
  if (!session?.user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  if (session.user.role !== 'student') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const { sessionId } = await params

  const [tutorSession] = await db
    .select()
    .from(tutorSessions)
    .where(
      and(
        eq(tutorSessions.id, sessionId),
        eq(tutorSessions.studentId, session.user.id)
      )
    )
    .limit(1)

  if (!tutorSession) {
    return NextResponse.json({ error: 'Session not found' }, { status: 404 })
  }

  const messages = JSON.parse(tutorSession.messages) as TutorMessage[]

  return NextResponse.json({
    id: tutorSession.id,
    subject: tutorSession.subject,
    topic: tutorSession.topic,
    startedAt: tutorSession.startedAt.toISOString(),
    endedAt: tutorSession.endedAt?.toISOString() ?? null,
    messages,
  })
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ sessionId: string }> }
) {
  const session = await auth()
  if (!session?.user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  if (session.user.role !== 'student') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const { sessionId } = await params

  const [tutorSession] = await db
    .select()
    .from(tutorSessions)
    .where(
      and(
        eq(tutorSessions.id, sessionId),
        eq(tutorSessions.studentId, session.user.id)
      )
    )
    .limit(1)

  if (!tutorSession) {
    return NextResponse.json({ error: 'Session not found' }, { status: 404 })
  }

  await db
    .update(tutorSessions)
    .set({ endedAt: new Date() })
    .where(eq(tutorSessions.id, sessionId))

  return NextResponse.json({ success: true })
}
