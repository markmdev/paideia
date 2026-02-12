import { auth } from '@/lib/auth'
import { NextResponse } from 'next/server'
import { generateExitTicket } from '@/lib/ai/generate-exit-ticket'

export async function POST(req: Request) {
  const session = await auth()
  if (!session?.user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const role = session.user.role
  if (role !== 'teacher' && role !== 'sped_teacher') {
    return NextResponse.json(
      { error: 'Only teachers can generate exit tickets' },
      { status: 403 }
    )
  }

  try {
    const { topic, gradeLevel, subject, numberOfQuestions, lessonContext } =
      await req.json()

    if (!topic || !gradeLevel || !subject) {
      return NextResponse.json(
        { error: 'Missing required fields: topic, gradeLevel, subject' },
        { status: 400 }
      )
    }

    const clampedCount = Math.min(Math.max(numberOfQuestions ?? 3, 3), 5)

    const exitTicket = await generateExitTicket({
      topic,
      gradeLevel,
      subject,
      numberOfQuestions: clampedCount,
      lessonContext,
    })

    return NextResponse.json(exitTicket)
  } catch (error) {
    console.error('Exit ticket generation failed:', error)
    return NextResponse.json(
      { error: 'Exit ticket generation failed. Please try again.' },
      { status: 500 }
    )
  }
}
