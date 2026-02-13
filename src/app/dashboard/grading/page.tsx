import { redirect } from 'next/navigation'
import Link from 'next/link'
import { auth } from '@/lib/auth'
import { db } from '@/lib/db'
import { assignments, submissions, rubrics, classes } from '@/lib/db/schema'
import { eq, sql, and, inArray } from 'drizzle-orm'
import { ClipboardList, FileText, Users, CheckCircle2, Clock } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'

export default async function GradingOverviewPage() {
  const session = await auth()
  if (!session?.user) {
    redirect('/login')
  }

  // Fetch all assignments belonging to this teacher that have at least one submission
  const teacherAssignments = await db
    .select({
      id: assignments.id,
      title: assignments.title,
      subject: assignments.subject,
      gradeLevel: assignments.gradeLevel,
      type: assignments.type,
      rubricId: assignments.rubricId,
      classId: assignments.classId,
      dueDate: assignments.dueDate,
    })
    .from(assignments)
    .where(eq(assignments.teacherId, session.user.id))

  if (teacherAssignments.length === 0) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="font-serif text-2xl font-bold tracking-tight text-stone-900">
            Assessment & Grading
          </h1>
          <p className="text-stone-500 text-sm mt-1">
            Review submissions, provide AI-assisted feedback, and track student progress.
          </p>
        </div>
        <div className="flex flex-col items-center justify-center py-16 text-center">
          <div className="rounded-full bg-amber-50 p-6 mb-4">
            <ClipboardList className="size-10 text-amber-400" />
          </div>
          <h3 className="text-lg font-semibold text-stone-800 mb-1">No assignments to grade</h3>
          <p className="text-sm text-stone-500 max-w-md mb-6">
            Create an assignment and wait for student submissions to appear here.
            Once students submit their work, you can grade it with AI assistance.
          </p>
        </div>
      </div>
    )
  }

  const assignmentIds = teacherAssignments.map((a) => a.id)

  // Get submission stats per assignment
  const submissionStats = await db
    .select({
      assignmentId: submissions.assignmentId,
      totalCount: sql<number>`count(*)`.as('total_count'),
      gradedCount: sql<number>`count(*) filter (where ${submissions.status} in ('graded', 'returned'))`.as('graded_count'),
      ungradedCount: sql<number>`count(*) filter (where ${submissions.status} in ('submitted', 'grading'))`.as('ungraded_count'),
      avgScore: sql<number>`avg(case when ${submissions.totalScore} is not null and ${submissions.maxScore} is not null and ${submissions.maxScore} > 0 then (${submissions.totalScore}::float / ${submissions.maxScore}::float) * 100 else null end)`.as('avg_score'),
    })
    .from(submissions)
    .where(inArray(submissions.assignmentId, assignmentIds))
    .groupBy(submissions.assignmentId)

  const statsMap = new Map(submissionStats.map((s) => [s.assignmentId, s]))

  // Get rubric titles
  const rubricIds = teacherAssignments
    .map((a) => a.rubricId)
    .filter((id): id is string => id !== null)

  const rubricTitles =
    rubricIds.length > 0
      ? await db
          .select({ id: rubrics.id, title: rubrics.title })
          .from(rubrics)
          .where(inArray(rubrics.id, rubricIds))
      : []

  const rubricMap = new Map(rubricTitles.map((r) => [r.id, r.title]))

  // Get class names
  const classIds = [...new Set(teacherAssignments.map((a) => a.classId))]
  const classNames = await db
    .select({ id: classes.id, name: classes.name })
    .from(classes)
    .where(inArray(classes.id, classIds))

  const classMap = new Map(classNames.map((c) => [c.id, c.name]))

  // Only show assignments that have submissions
  const assignmentsWithSubmissions = teacherAssignments.filter((a) => {
    const stats = statsMap.get(a.id)
    return stats && Number(stats.totalCount) > 0
  })

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-serif text-2xl font-bold tracking-tight text-stone-900">
          Assessment & Grading
        </h1>
        <p className="text-stone-500 text-sm mt-1">
          Review submissions, provide AI-assisted feedback, and track student progress.
        </p>
      </div>

      {assignmentsWithSubmissions.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 text-center">
          <div className="rounded-full bg-amber-50 p-6 mb-4">
            <Clock className="size-10 text-amber-400" />
          </div>
          <h3 className="text-lg font-semibold text-stone-800 mb-1">Waiting for submissions</h3>
          <p className="text-sm text-stone-500 max-w-md">
            Your assignments are published. Once students submit their work,
            they will appear here for grading.
          </p>
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {assignmentsWithSubmissions.map((assignment) => {
            const stats = statsMap.get(assignment.id)
            const total = Number(stats?.totalCount ?? 0)
            const graded = Number(stats?.gradedCount ?? 0)
            const ungraded = Number(stats?.ungradedCount ?? 0)
            const avgScore = stats?.avgScore != null ? Number(stats.avgScore) : null
            const rubricTitle = assignment.rubricId
              ? rubricMap.get(assignment.rubricId)
              : null
            const className = classMap.get(assignment.classId)

            const progressPercent = total > 0 ? Math.round((graded / total) * 100) : 0
            const isComplete = ungraded === 0 && total > 0

            return (
              <Link
                key={assignment.id}
                href={`/dashboard/grading/${assignment.id}`}
              >
                <Card className="group relative overflow-hidden transition-all hover:shadow-md hover:border-amber-200 cursor-pointer h-full bg-stone-50/50">
                  <div className="absolute top-0 left-0 w-1 h-full bg-amber-400 opacity-0 group-hover:opacity-100 transition-opacity" />
                  <CardHeader className="pb-3">
                    <div className="flex items-start justify-between gap-2">
                      <CardTitle className="text-sm font-semibold leading-tight line-clamp-2 text-stone-900">
                        {assignment.title}
                      </CardTitle>
                      {isComplete ? (
                        <Badge className="shrink-0 text-[10px] px-1.5 py-0.5 bg-emerald-100 text-emerald-700 border-0">
                          Complete
                        </Badge>
                      ) : (
                        <Badge className="shrink-0 text-[10px] px-1.5 py-0.5 bg-amber-100 text-amber-700 border-0">
                          {ungraded} to grade
                        </Badge>
                      )}
                    </div>
                    <div className="flex flex-wrap items-center gap-1.5 mt-1">
                      {className && (
                        <Badge variant="outline" className="text-[10px] font-normal px-1.5 py-0 text-stone-600 border-stone-300">
                          {className}
                        </Badge>
                      )}
                      <Badge variant="outline" className="text-[10px] font-normal px-1.5 py-0 text-stone-600 border-stone-300">
                        {assignment.subject}
                      </Badge>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    {/* Progress bar */}
                    <div>
                      <div className="flex items-center justify-between text-[11px] text-stone-500 mb-1.5">
                        <span className="flex items-center gap-1">
                          <Users className="size-3" />
                          {graded} of {total} graded
                        </span>
                        <span>{progressPercent}%</span>
                      </div>
                      <div className="h-1.5 bg-stone-200 rounded-full overflow-hidden">
                        <div
                          className="h-full bg-emerald-500 rounded-full transition-all"
                          style={{ width: `${progressPercent}%` }}
                        />
                      </div>
                    </div>

                    {/* Stats row */}
                    <div className="flex items-center justify-between pt-1 border-t border-stone-200 text-[11px] text-stone-500">
                      <div className="flex items-center gap-3">
                        {rubricTitle && (
                          <span className="flex items-center gap-1">
                            <ClipboardList className="size-3" />
                            {rubricTitle}
                          </span>
                        )}
                      </div>
                      {avgScore != null && (
                        <span className="flex items-center gap-1 font-medium text-stone-700">
                          <CheckCircle2 className="size-3 text-emerald-500" />
                          {Math.round(avgScore)}% avg
                        </span>
                      )}
                    </div>
                  </CardContent>
                </Card>
              </Link>
            )
          })}
        </div>
      )}
    </div>
  )
}
