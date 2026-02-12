import { redirect } from 'next/navigation'
import Link from 'next/link'
import { auth } from '@/lib/auth'
import { db } from '@/lib/db'
import { lessonPlans } from '@/lib/db/schema'
import { eq, desc } from 'drizzle-orm'
import { format } from 'date-fns'
import {
  BookOpen,
  Plus,
  Clock,
  GraduationCap,
  Sparkles,
  Calendar,
} from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { formatGradeLevel } from '@/lib/utils'

function formatDuration(duration: string): string {
  const num = parseInt(duration, 10)
  if (isNaN(num) || String(num) !== duration.trim()) return duration
  return `${num} min`
}

export default async function LessonPlansPage() {
  const session = await auth()

  if (!session?.user) {
    redirect('/login')
  }

  const plans = await db
    .select()
    .from(lessonPlans)
    .where(eq(lessonPlans.teacherId, session.user.id))
    .orderBy(desc(lessonPlans.createdAt))

  const parsedPlans = plans.map((plan) => ({
    ...plan,
    objectives: JSON.parse(plan.objectives) as string[],
    aiMetadata: plan.aiMetadata ? JSON.parse(plan.aiMetadata) : null,
  }))

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-serif font-bold tracking-tight">Lesson Plans</h1>
          <p className="text-muted-foreground">
            Create, manage, and organize your lesson plans.
          </p>
        </div>
        <Button asChild>
          <Link href="/dashboard/lesson-plans/new">
            <Plus className="size-4 mr-2" />
            Create Lesson Plan
          </Link>
        </Button>
      </div>

      {parsedPlans.length === 0 ? (
        <Card className="border-dashed">
          <CardContent className="flex flex-col items-center justify-center py-16 text-center">
            <div className="rounded-full bg-amber-50 p-4 mb-4">
              <BookOpen className="size-8 text-amber-600" />
            </div>
            <h3 className="text-lg font-semibold mb-1">No lesson plans yet</h3>
            <p className="text-muted-foreground mb-6 max-w-sm">
              Get started by creating your first lesson plan. Use AI to generate
              standards-aligned plans in seconds.
            </p>
            <Button asChild>
              <Link href="/dashboard/lesson-plans/new">
                <Sparkles className="size-4 mr-2" />
                Generate with AI
              </Link>
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {parsedPlans.map((plan) => (
            <Link key={plan.id} href={`/dashboard/lesson-plans/${plan.id}`}>
              <Card className="h-full hover:shadow-md transition-shadow cursor-pointer group">
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between gap-2">
                    <CardTitle className="text-base leading-snug group-hover:text-amber-700 transition-colors line-clamp-2">
                      {plan.title}
                    </CardTitle>
                    {plan.aiMetadata && (
                      <Badge
                        variant="secondary"
                        className="shrink-0 bg-amber-50 text-amber-700 border-amber-200"
                      >
                        <Sparkles className="size-3 mr-1" />
                        AI
                      </Badge>
                    )}
                  </div>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="flex flex-wrap gap-2">
                    <Badge variant="outline" className="text-xs font-normal">
                      <GraduationCap className="size-3 mr-1" />
                      {formatGradeLevel(plan.gradeLevel)}
                    </Badge>
                    <Badge variant="outline" className="text-xs font-normal">
                      <BookOpen className="size-3 mr-1" />
                      {plan.subject}
                    </Badge>
                    {plan.duration && (
                      <Badge variant="outline" className="text-xs font-normal">
                        <Clock className="size-3 mr-1" />
                        {formatDuration(plan.duration)}
                      </Badge>
                    )}
                  </div>
                  {plan.objectives.length > 0 && (
                    <p className="text-sm text-muted-foreground line-clamp-2">
                      {plan.objectives[0]}
                    </p>
                  )}
                  <div className="flex items-center text-xs text-muted-foreground pt-1">
                    <Calendar className="size-3 mr-1" />
                    {format(plan.createdAt, 'MMM d, yyyy')}
                  </div>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      )}
    </div>
  )
}
