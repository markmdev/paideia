import { auth } from '@/lib/auth'
import { db } from '@/lib/db'
import { quizzes, quizQuestions } from '@/lib/db/schema'
import { eq } from 'drizzle-orm'
import { notFound, redirect } from 'next/navigation'
import Link from 'next/link'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader } from '@/components/ui/card'
import { ArrowLeft, Clock, FileQuestion } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { formatGradeLevel } from '@/lib/format'

export default async function QuizDetailPage({
  params,
}: {
  params: Promise<{ quizId: string }>
}) {
  const session = await auth()
  if (!session?.user) {
    redirect('/login')
  }

  const { quizId } = await params

  const [quiz] = await db
    .select()
    .from(quizzes)
    .where(eq(quizzes.id, quizId))
    .limit(1)

  if (!quiz || quiz.createdBy !== session.user.id) {
    notFound()
  }

  const questions = await db
    .select()
    .from(quizQuestions)
    .where(eq(quizQuestions.quizId, quizId))
    .orderBy(quizQuestions.orderIndex)

  const standards: string[] = quiz.standards
    ? JSON.parse(quiz.standards)
    : []

  const letters = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H']

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between">
        <Button variant="ghost" size="sm" asChild>
          <Link href="/dashboard/quizzes">
            <ArrowLeft className="size-4 mr-1" />
            All Quizzes
          </Link>
        </Button>
      </div>

      {/* Title & Meta */}
      <div className="space-y-4">
        <h1 className="text-2xl font-serif font-bold tracking-tight">
          {quiz.title}
        </h1>
        <div className="flex flex-wrap items-center gap-2">
          <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200">
            {quiz.subject}
          </Badge>
          <Badge variant="outline" className="bg-emerald-50 text-emerald-700 border-emerald-200">
            {formatGradeLevel(quiz.gradeLevel)}
          </Badge>
          {quiz.difficultyLevel && (
            <Badge variant="outline" className="bg-amber-50 text-amber-700 border-amber-200 capitalize">
              {quiz.difficultyLevel}
            </Badge>
          )}
          {quiz.timeLimit && (
            <Badge variant="outline" className="text-muted-foreground">
              <Clock className="size-3 mr-1" />
              {quiz.timeLimit} min
            </Badge>
          )}
          <Badge variant="outline" className="text-muted-foreground">
            <FileQuestion className="size-3 mr-1" />
            {questions.length} {questions.length === 1 ? 'question' : 'questions'}
          </Badge>
        </div>
        {standards.length > 0 && (
          <div className="flex flex-wrap gap-2">
            {standards.map((standard, i) => (
              <Badge
                key={i}
                variant="outline"
                className="text-xs font-mono bg-sky-50 text-sky-700 border-sky-200"
              >
                {standard}
              </Badge>
            ))}
          </div>
        )}
      </div>

      {/* Questions */}
      <div className="space-y-4">
        {questions.map((question, idx) => {
          const options: string[] = question.options
            ? JSON.parse(question.options)
            : []

          return (
            <Card key={question.id}>
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-start gap-3">
                    <span className="flex items-center justify-center rounded-full bg-primary/10 text-primary text-sm font-semibold size-8 shrink-0 mt-0.5">
                      {idx + 1}
                    </span>
                    <p className="text-sm leading-relaxed pt-1">
                      {question.questionText}
                    </p>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    {question.bloomsLevel && (
                      <Badge variant="secondary" className="text-xs capitalize">
                        {question.bloomsLevel}
                      </Badge>
                    )}
                    <Badge variant="outline" className="text-xs">
                      {question.points} {question.points === 1 ? 'pt' : 'pts'}
                    </Badge>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="pt-0 space-y-3">
                {options.length > 0 && (
                  <ul className="space-y-1.5 ml-11">
                    {options.map((option, optIdx) => {
                      const isCorrect = option === question.correctAnswer
                      return (
                        <li
                          key={optIdx}
                          className={`flex items-start gap-2 text-sm rounded-md px-2.5 py-1.5 ${
                            isCorrect
                              ? 'bg-green-50 text-green-800 font-medium'
                              : 'text-muted-foreground'
                          }`}
                        >
                          <span className={`font-semibold shrink-0 ${isCorrect ? 'text-green-700' : ''}`}>
                            {letters[optIdx]}.
                          </span>
                          <span>{option}</span>
                        </li>
                      )
                    })}
                  </ul>
                )}
                {options.length === 0 && question.correctAnswer && (
                  <div className="ml-11 text-sm">
                    <span className="text-muted-foreground">Answer: </span>
                    <span className="font-medium text-green-700">
                      {question.correctAnswer}
                    </span>
                  </div>
                )}
                {question.explanation && (
                  <div className="ml-11 rounded-md bg-muted/50 px-3 py-2">
                    <p className="text-xs text-muted-foreground">
                      <span className="font-semibold">Explanation:</span>{' '}
                      {question.explanation}
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>
          )
        })}
      </div>
    </div>
  )
}
