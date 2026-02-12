import { redirect, notFound } from 'next/navigation'
import Link from 'next/link'
import { auth } from '@/lib/auth'
import { db } from '@/lib/db'
import {
  assignments,
  submissions,
  rubrics,
  users,
  classes,
} from '@/lib/db/schema'
import { eq, and, sql, inArray } from 'drizzle-orm'
import { ArrowLeft, Users, CheckCircle2, BarChart3 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { SubmissionCard } from '@/components/grading/submission-card'
import { BatchGradeButton } from '@/components/grading/batch-grade-button'
import { DifferentiationPanel } from '@/components/grading/differentiation-panel'

export default async function AssignmentGradingPage({
  params,
}: {
  params: Promise<{ assignmentId: string }>
}) {
  const session = await auth()
  if (!session?.user) {
    redirect('/login')
  }

  const { assignmentId } = await params

  // Fetch assignment with class info
  const [result] = await db
    .select({
      assignment: assignments,
      className: classes.name,
    })
    .from(assignments)
    .leftJoin(classes, eq(assignments.classId, classes.id))
    .where(
      and(
        eq(assignments.id, assignmentId),
        eq(assignments.teacherId, session.user.id)
      )
    )
    .limit(1)

  if (!result) {
    notFound()
  }

  const assignment = result.assignment

  // Fetch rubric info
  let rubricTitle: string | null = null
  if (assignment.rubricId) {
    const [rubricResult] = await db
      .select({ title: rubrics.title })
      .from(rubrics)
      .where(eq(rubrics.id, assignment.rubricId))
      .limit(1)
    rubricTitle = rubricResult?.title ?? null
  }

  // Fetch all submissions for this assignment
  const allSubmissions = await db
    .select({
      id: submissions.id,
      studentId: submissions.studentId,
      status: submissions.status,
      submittedAt: submissions.submittedAt,
      totalScore: submissions.totalScore,
      maxScore: submissions.maxScore,
    })
    .from(submissions)
    .where(eq(submissions.assignmentId, assignmentId))

  // Get student names
  const studentIds = [...new Set(allSubmissions.map((s) => s.studentId))]
  const studentRecords =
    studentIds.length > 0
      ? await db
          .select({ id: users.id, name: users.name })
          .from(users)
          .where(inArray(users.id, studentIds))
      : []

  const studentMap = new Map(studentRecords.map((s) => [s.id, s.name]))

  // Compute stats
  const totalSubmissions = allSubmissions.length
  const gradedCount = allSubmissions.filter(
    (s) => s.status === 'graded' || s.status === 'returned'
  ).length
  const ungradedCount = allSubmissions.filter(
    (s) => s.status === 'submitted' || s.status === 'grading'
  ).length

  const scoredSubmissions = allSubmissions.filter(
    (s) => s.totalScore != null && s.maxScore != null && s.maxScore > 0
  )
  const avgScore =
    scoredSubmissions.length > 0
      ? Math.round(
          scoredSubmissions.reduce(
            (sum, s) => sum + (s.totalScore! / s.maxScore!) * 100,
            0
          ) / scoredSubmissions.length
        )
      : null

  // Serialize submissions for client component
  const serializedSubmissions = allSubmissions.map((s) => ({
    id: s.id,
    status: s.status,
    submittedAt: s.submittedAt.toISOString(),
    totalScore: s.totalScore,
    maxScore: s.maxScore,
    studentName: studentMap.get(s.studentId) ?? null,
  }))

  // Sort: ungraded first, then grading, then graded, then returned
  const statusOrder: Record<string, number> = {
    submitted: 0,
    grading: 1,
    graded: 2,
    returned: 3,
  }
  serializedSubmissions.sort(
    (a, b) => (statusOrder[a.status] ?? 4) - (statusOrder[b.status] ?? 4)
  )

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div className="space-y-1">
          <div className="flex items-center gap-2 mb-2">
            <Button variant="ghost" size="sm" asChild className="gap-1 -ml-2">
              <Link href="/dashboard/grading">
                <ArrowLeft className="size-3.5" />
                Grading
              </Link>
            </Button>
          </div>
          <h1 className="font-serif text-2xl font-bold tracking-tight text-stone-900">
            {assignment.title}
          </h1>
          <div className="flex flex-wrap items-center gap-2 mt-2">
            {result.className && (
              <Badge variant="outline" className="text-xs font-normal text-stone-600 border-stone-300">
                {result.className}
              </Badge>
            )}
            {rubricTitle && (
              <Badge variant="outline" className="text-xs font-normal text-stone-600 border-stone-300">
                {rubricTitle}
              </Badge>
            )}
          </div>
        </div>

        <BatchGradeButton
          assignmentId={assignmentId}
          ungradedCount={ungradedCount}
        />
      </div>

      {/* Quick stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <Card className="bg-stone-50/50">
          <CardContent className="py-3 px-4">
            <div className="flex items-center gap-2">
              <Users className="size-4 text-stone-400" />
              <span className="text-[11px] text-stone-500 uppercase tracking-wider">Total</span>
            </div>
            <p className="text-2xl font-bold text-stone-800 mt-1">{totalSubmissions}</p>
          </CardContent>
        </Card>
        <Card className="bg-emerald-50/50">
          <CardContent className="py-3 px-4">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="size-4 text-emerald-500" />
              <span className="text-[11px] text-emerald-600 uppercase tracking-wider">Graded</span>
            </div>
            <p className="text-2xl font-bold text-emerald-700 mt-1">{gradedCount}</p>
          </CardContent>
        </Card>
        <Card className="bg-amber-50/50">
          <CardContent className="py-3 px-4">
            <div className="flex items-center gap-2">
              <div className="size-4 rounded-full border-2 border-amber-400" />
              <span className="text-[11px] text-amber-600 uppercase tracking-wider">Ungraded</span>
            </div>
            <p className="text-2xl font-bold text-amber-700 mt-1">{ungradedCount}</p>
          </CardContent>
        </Card>
        <Card className="bg-blue-50/50">
          <CardContent className="py-3 px-4">
            <div className="flex items-center gap-2">
              <BarChart3 className="size-4 text-blue-500" />
              <span className="text-[11px] text-blue-600 uppercase tracking-wider">Average</span>
            </div>
            <p className="text-2xl font-bold text-blue-700 mt-1">
              {avgScore != null ? `${avgScore}%` : 'N/A'}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Submissions list */}
      {serializedSubmissions.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-12 text-center">
          <div className="rounded-full bg-stone-100 p-6 mb-4">
            <Users className="size-8 text-stone-400" />
          </div>
          <h3 className="text-lg font-semibold text-stone-800 mb-1">No submissions yet</h3>
          <p className="text-sm text-stone-500 max-w-md">
            Students haven&apos;t submitted any work for this assignment yet.
          </p>
        </div>
      ) : (
        <div className="space-y-2">
          <h2 className="text-sm font-semibold text-stone-700 uppercase tracking-wider">
            Submissions ({serializedSubmissions.length})
          </h2>
          <div className="space-y-2">
            {serializedSubmissions.map((sub) => (
              <SubmissionCard
                key={sub.id}
                submission={{
                  id: sub.id,
                  status: sub.status,
                  submittedAt: sub.submittedAt,
                  totalScore: sub.totalScore,
                  maxScore: sub.maxScore,
                }}
                studentName={sub.studentName}
                assignmentId={assignmentId}
              />
            ))}
          </div>
        </div>
      )}

      {/* Differentiation panel - available when graded submissions exist */}
      {gradedCount > 0 && (
        <DifferentiationPanel assignmentId={assignmentId} />
      )}
    </div>
  )
}
