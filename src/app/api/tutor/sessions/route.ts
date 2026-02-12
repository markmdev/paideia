import { auth } from '@/lib/auth'
import { db } from '@/lib/db'
import { tutorSessions } from '@/lib/db/schema'
import { eq, desc } from 'drizzle-orm'
import { NextResponse } from 'next/server'

interface TutorMessage {
  role: 'user' | 'assistant'
  content: string
  timestamp: string
}

export async function GET() {
  const session = await auth()
  if (!session?.user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  if (session.user.role !== 'student') {
    return NextResponse.json({ error: 'Forbidden: only students can access tutor sessions' }, { status: 403 })
  }

  const sessions = await db
    .select()
    .from(tutorSessions)
    .where(eq(tutorSessions.studentId, session.user.id))
    .orderBy(desc(tutorSessions.startedAt))

  const result = sessions.map((s) => {
    const messages = JSON.parse(s.messages) as TutorMessage[]
    return {
      id: s.id,
      subject: s.subject,
      topic: s.topic,
      startedAt: s.startedAt.toISOString(),
      endedAt: s.endedAt?.toISOString() ?? null,
      messageCount: messages.length,
      lastMessage: messages.length > 0 ? messages[messages.length - 1].content.slice(0, 120) : null,
    }
  })

  return NextResponse.json(result)
}
