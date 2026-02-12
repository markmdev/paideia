import { auth } from '@/lib/auth'
import { db } from '@/lib/db'
import { quizzes, quizQuestions } from '@/lib/db/schema'
import { generateQuiz } from '@/lib/ai/generate-quiz'
import { NextResponse } from 'next/server'

export async function POST(req: Request) {
  const session = await auth()
  if (!session?.user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const {
      topic,
      gradeLevel,
      subject,
      numberOfQuestions,
      questionTypes,
      standards,
      difficultyLevel,
    } = await req.json()

    if (!topic || !gradeLevel || !subject) {
      return NextResponse.json(
        { error: 'Missing required fields: topic, gradeLevel, subject' },
        { status: 400 }
      )
    }

    const generated = await generateQuiz({
      topic,
      gradeLevel,
      subject,
      numQuestions: numberOfQuestions ?? 10,
      questionTypes: questionTypes ?? ['multiple_choice', 'short_answer'],
      standards: standards ? standards.split(',').map((s: string) => s.trim()).filter(Boolean) : undefined,
    })

    // Save the quiz to the database
    const [createdQuiz] = await db
      .insert(quizzes)
      .values({
        title: generated.title,
        subject,
        gradeLevel,
        standards: standards || null,
      })
      .returning()

    // Save questions
    const questionsToInsert = generated.questions.map((q, index) => ({
      quizId: createdQuiz.id,
      type: q.type,
      questionText: q.questionText,
      options: q.options ? JSON.stringify(q.options) : null,
      correctAnswer: q.correctAnswer,
      explanation: q.explanation,
      bloomsLevel: q.bloomsLevel,
      points: q.points,
      orderIndex: index,
    }))

    const createdQuestions = await db
      .insert(quizQuestions)
      .values(questionsToInsert)
      .returning()

    return NextResponse.json({
      quiz: createdQuiz,
      questions: createdQuestions.map((q) => ({
        ...q,
        options: q.options ? JSON.parse(q.options) : null,
      })),
    })
  } catch (error) {
    console.error('Quiz generation failed:', error)
    return NextResponse.json(
      { error: 'Quiz generation failed. Please try again.' },
      { status: 500 }
    )
  }
}
