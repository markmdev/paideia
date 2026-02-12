import { auth } from '@/lib/auth'
import { db } from '@/lib/db'
import { quizzes, quizQuestions } from '@/lib/db/schema'
import { desc } from 'drizzle-orm'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { Plus, FileQuestion, Calendar } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'

export default async function QuizzesPage() {
  const session = await auth()
  if (!session?.user) {
    redirect('/login')
  }

  const allQuizzes = await db
    .select()
    .from(quizzes)
    .orderBy(desc(quizzes.createdAt))

  const allQuestions = await db
    .select({ quizId: quizQuestions.quizId })
    .from(quizQuestions)

  const questionCountMap: Record<string, number> = {}
  for (const q of allQuestions) {
    questionCountMap[q.quizId] = (questionCountMap[q.quizId] ?? 0) + 1
  }

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-serif font-bold tracking-tight">Quizzes</h1>
          <p className="text-muted-foreground">
            Generate AI-powered quizzes aligned to standards and tagged by Bloom&apos;s taxonomy.
          </p>
        </div>
        <Button asChild>
          <Link href="/dashboard/quizzes/new">
            <Plus className="size-4" />
            New Quiz
          </Link>
        </Button>
      </div>

      {allQuizzes.length === 0 ? (
        <Card className="border-dashed">
          <CardContent className="flex flex-col items-center justify-center py-16 text-center">
            <div className="rounded-full bg-muted p-4 mb-4">
              <FileQuestion className="size-8 text-muted-foreground" />
            </div>
            <h2 className="text-lg font-semibold mb-1">No quizzes yet</h2>
            <p className="text-sm text-muted-foreground max-w-md mb-6">
              Create standards-aligned quizzes with AI-generated questions,
              answer keys, and Bloom&apos;s taxonomy tags.
            </p>
            <Button asChild>
              <Link href="/dashboard/quizzes/new">
                <Plus className="size-4" />
                Create Your First Quiz
              </Link>
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {allQuizzes.map((quiz) => {
            const count = questionCountMap[quiz.id] ?? 0
            return (
              <Card key={quiz.id} className="h-full hover:bg-accent/50 transition-colors">
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between gap-2">
                    <CardTitle className="text-base leading-tight">
                      {quiz.title}
                    </CardTitle>
                    <Badge
                      variant="secondary"
                      className="shrink-0 text-xs"
                    >
                      {quiz.subject}
                    </Badge>
                  </div>
                  <CardDescription className="text-xs">
                    Grade {quiz.gradeLevel}
                  </CardDescription>
                </CardHeader>
                <CardContent className="pt-0">
                  <div className="flex items-center gap-4 text-xs text-muted-foreground">
                    <span className="flex items-center gap-1">
                      <FileQuestion className="size-3" />
                      {count} {count === 1 ? 'question' : 'questions'}
                    </span>
                    <span className="flex items-center gap-1 ml-auto">
                      <Calendar className="size-3" />
                      {quiz.createdAt.toLocaleDateString('en-US', {
                        month: 'short',
                        day: 'numeric',
                        year: 'numeric',
                      })}
                    </span>
                  </div>
                </CardContent>
              </Card>
            )
          })}
        </div>
      )}
    </div>
  )
}
