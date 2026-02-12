import { auth } from '@/lib/auth'
import { db } from '@/lib/db'
import { quizzes, quizQuestions } from '@/lib/db/schema'
import { eq, desc } from 'drizzle-orm'
import { NextResponse } from 'next/server'

export async function GET() {
  const session = await auth()
  if (!session?.user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const results = await db
    .select()
    .from(quizzes)
    .where(eq(quizzes.createdBy, session.user.id))
    .orderBy(desc(quizzes.createdAt))

  const quizIds = results.map((q) => q.id)

  let questionCountByQuiz: Record<string, number> = {}
  if (quizIds.length > 0) {
    const allQuestions = await db
      .select({ quizId: quizQuestions.quizId })
      .from(quizQuestions)

    for (const q of allQuestions) {
      if (quizIds.includes(q.quizId)) {
        questionCountByQuiz[q.quizId] = (questionCountByQuiz[q.quizId] ?? 0) + 1
      }
    }
  }

  const quizList = results.map((q) => ({
    ...q,
    questionCount: questionCountByQuiz[q.id] ?? 0,
  }))

  return NextResponse.json(quizList)
}
