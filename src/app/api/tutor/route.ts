import { auth } from '@/lib/auth'
import { db } from '@/lib/db'
import { tutorSessions, classMembers, classes } from '@/lib/db/schema'
import { eq, and } from 'drizzle-orm'
import { NextResponse } from 'next/server'
import { streamTutorResponse } from '@/lib/ai/tutor'

interface TutorMessage {
  role: 'user' | 'assistant'
  content: string
  timestamp: string
}

export async function POST(request: Request) {
  const session = await auth()
  if (!session?.user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  if (session.user.role !== 'student') {
    return NextResponse.json({ error: 'Forbidden: only students can access the tutor' }, { status: 403 })
  }

  try {
    const body = await request.json()
    const { message, sessionId, subject, topic, assignmentContext } = body

    if (!message || typeof message !== 'string' || message.trim().length === 0) {
      return NextResponse.json({ error: 'Message is required' }, { status: 400 })
    }

    if (!subject || typeof subject !== 'string') {
      return NextResponse.json({ error: 'Subject is required' }, { status: 400 })
    }

    // Determine student's grade level from their class enrollment
    let gradeLevel = '8' // default
    const enrollment = await db
      .select({ gradeLevel: classes.gradeLevel })
      .from(classMembers)
      .innerJoin(classes, eq(classMembers.classId, classes.id))
      .where(
        and(
          eq(classMembers.userId, session.user.id),
          eq(classMembers.role, 'student')
        )
      )
      .limit(1)

    if (enrollment.length > 0 && enrollment[0].gradeLevel) {
      gradeLevel = enrollment[0].gradeLevel
    }

    let currentSessionId = sessionId
    let conversationHistory: TutorMessage[] = []

    if (currentSessionId) {
      // Load existing session
      const [existingSession] = await db
        .select()
        .from(tutorSessions)
        .where(
          and(
            eq(tutorSessions.id, currentSessionId),
            eq(tutorSessions.studentId, session.user.id)
          )
        )
        .limit(1)

      if (!existingSession) {
        return NextResponse.json({ error: 'Session not found' }, { status: 404 })
      }

      if (existingSession.endedAt) {
        return NextResponse.json({ error: 'Session has ended' }, { status: 400 })
      }

      conversationHistory = JSON.parse(existingSession.messages) as TutorMessage[]
    } else {
      // Create new session
      const [newSession] = await db
        .insert(tutorSessions)
        .values({
          studentId: session.user.id,
          subject,
          topic: topic ?? null,
          messages: '[]',
        })
        .returning()

      currentSessionId = newSession.id
    }

    // Build the new user message
    const userMessage: TutorMessage = {
      role: 'user',
      content: message.trim(),
      timestamp: new Date().toISOString(),
    }

    // Append user message to session
    const updatedMessages = [...conversationHistory, userMessage]
    await db
      .update(tutorSessions)
      .set({ messages: JSON.stringify(updatedMessages) })
      .where(eq(tutorSessions.id, currentSessionId))

    // Stream the AI response
    const aiStream = streamTutorResponse({
      message: message.trim(),
      conversationHistory: conversationHistory.map((m) => ({
        role: m.role,
        content: m.content,
      })),
      subject,
      gradeLevel,
      assignmentContext,
    })

    // Wrap the stream to capture the full response and save it
    let fullResponse = ''
    const decoder = new TextDecoder()
    const capturedSessionId = currentSessionId

    const transformedStream = new ReadableStream<Uint8Array>({
      async start(controller) {
        const reader = aiStream.getReader()
        try {
          while (true) {
            const { done, value } = await reader.read()
            if (done) break
            const text = decoder.decode(value, { stream: true })
            fullResponse += text
            controller.enqueue(value)
          }

          // Save the assistant response to the session
          const assistantMessage: TutorMessage = {
            role: 'assistant',
            content: fullResponse,
            timestamp: new Date().toISOString(),
          }
          const finalMessages = [...updatedMessages, assistantMessage]
          await db
            .update(tutorSessions)
            .set({ messages: JSON.stringify(finalMessages) })
            .where(eq(tutorSessions.id, capturedSessionId))

          controller.close()
        } catch (error) {
          console.error('Tutor stream processing error:', error)
          controller.error(error)
        }
      },
    })

    return new Response(transformedStream, {
      headers: {
        'Content-Type': 'text/plain; charset=utf-8',
        'X-Session-Id': currentSessionId,
        'Cache-Control': 'no-cache',
      },
    })
  } catch (error) {
    console.error('Tutor API error:', error)
    return NextResponse.json(
      { error: 'Failed to process tutor request' },
      { status: 500 }
    )
  }
}
