import { redirect, notFound } from 'next/navigation'
import Link from 'next/link'
import { format } from 'date-fns'
import { auth } from '@/lib/auth'
import { db } from '@/lib/db'
import {
  assignments,
  submissions,
  feedbackDrafts,
  criterionScores,
  rubricCriteria,
  rubrics,
  users,
} from '@/lib/db/schema'
import { eq, and } from 'drizzle-orm'
import { ArrowLeft, User, Calendar, FileText } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { FeedbackPanel } from '@/components/grading/feedback-panel'

const statusConfig: Record<string, { label: string; color: string }> = {
  submitted: { label: 'Submitted', color: 'bg-blue-100 text-blue-700' },
  grading: { label: 'Grading', color: 'bg-amber-100 text-amber-700' },
  graded: { label: 'Graded', color: 'bg-emerald-100 text-emerald-700' },
  returned: { label: 'Returned', color: 'bg-stone-100 text-stone-600' },
}

function parseJsonSafe(value: string | null): string[] {
  if (!value) return []
  try {
    const parsed = JSON.parse(value)
    return Array.isArray(parsed) ? parsed : []
  } catch {
    return []
  }
}

export default async function FeedbackReviewPage({
  params,
}: {
  params: Promise<{ assignmentId: string; submissionId: string }>
}) {
  const session = await auth()
  if (!session?.user) {
    redirect('/login')
  }

  const { assignmentId, submissionId } = await params

  // Verify assignment ownership
  const [assignmentResult] = await db
    .select()
    .from(assignments)
    .where(
      and(
        eq(assignments.id, assignmentId),
        eq(assignments.teacherId, session.user.id)
      )
    )
    .limit(1)

  if (!assignmentResult) {
    notFound()
  }

  // Fetch the submission
  const [submission] = await db
    .select()
    .from(submissions)
    .where(
      and(
        eq(submissions.id, submissionId),
        eq(submissions.assignmentId, assignmentId)
      )
    )
    .limit(1)

  if (!submission) {
    notFound()
  }

  // Fetch student info
  const [student] = await db
    .select({ name: users.name, email: users.email })
    .from(users)
    .where(eq(users.id, submission.studentId))
    .limit(1)

  // Fetch feedback draft
  const [feedback] = await db
    .select()
    .from(feedbackDrafts)
    .where(eq(feedbackDrafts.submissionId, submissionId))
    .limit(1)

  // Fetch criterion scores with criterion names
  const scores = await db
    .select({
      id: criterionScores.id,
      criterionId: criterionScores.criterionId,
      level: criterionScores.level,
      score: criterionScores.score,
      maxScore: criterionScores.maxScore,
      justification: criterionScores.justification,
      criterionName: rubricCriteria.name,
    })
    .from(criterionScores)
    .leftJoin(rubricCriteria, eq(criterionScores.criterionId, rubricCriteria.id))
    .where(eq(criterionScores.submissionId, submissionId))

  // Fetch rubric title
  let rubricTitle: string | null = null
  if (assignmentResult.rubricId) {
    const [rubricResult] = await db
      .select({ title: rubrics.title })
      .from(rubrics)
      .where(eq(rubrics.id, assignmentResult.rubricId))
      .limit(1)
    rubricTitle = rubricResult?.title ?? null
  }

  const statusInfo = statusConfig[submission.status] ?? statusConfig.submitted
  const studentName = student?.name ?? 'Unknown Student'
  const initials = studentName
    .split(' ')
    .map((n) => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2)

  const scorePercent =
    submission.totalScore != null && submission.maxScore != null && submission.maxScore > 0
      ? Math.round((submission.totalScore / submission.maxScore) * 100)
      : null

  // Prepare feedback for client component
  const feedbackData = feedback
    ? {
        id: feedback.id,
        aiFeedback: feedback.aiFeedback,
        teacherEdits: feedback.teacherEdits,
        finalFeedback: feedback.finalFeedback,
        status: feedback.status,
        strengths: parseJsonSafe(feedback.strengths),
        improvements: parseJsonSafe(feedback.improvements),
        nextSteps: parseJsonSafe(feedback.nextSteps),
      }
    : null

  const criterionScoresData = scores.map((s) => ({
    id: s.id,
    criterionName: s.criterionName ?? 'Unknown Criterion',
    level: s.level,
    score: s.score,
    maxScore: s.maxScore,
    justification: s.justification,
  }))

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="space-y-1">
        <div className="flex items-center gap-2 mb-2">
          <Button variant="ghost" size="sm" asChild className="gap-1 -ml-2">
            <Link href={`/dashboard/grading/${assignmentId}`}>
              <ArrowLeft className="size-3.5" />
              {assignmentResult.title}
            </Link>
          </Button>
        </div>
        <div className="flex items-center gap-3">
          <div className="size-10 rounded-full bg-amber-100 text-amber-700 flex items-center justify-center text-sm font-semibold">
            {initials}
          </div>
          <div>
            <h1 className="font-serif text-xl font-bold tracking-tight text-stone-900">
              {studentName}
            </h1>
            <div className="flex items-center gap-2 mt-0.5">
              <Badge className={`text-[10px] px-1.5 py-0.5 border-0 ${statusInfo.color}`}>
                {statusInfo.label}
              </Badge>
              {scorePercent != null && (
                <span className="text-sm font-semibold text-stone-700">
                  {scorePercent}%
                </span>
              )}
              {rubricTitle && (
                <Badge variant="outline" className="text-[10px] font-normal text-stone-500 border-stone-300">
                  {rubricTitle}
                </Badge>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Split layout: Student work left, Feedback right */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Left: Student work */}
        <div className="space-y-4">
          <Card className="bg-white">
            <CardHeader className="bg-stone-50 border-b border-stone-200">
              <div className="flex items-center justify-between">
                <CardTitle className="text-sm font-semibold text-stone-700 flex items-center gap-2">
                  <FileText className="size-4" />
                  Student Work
                </CardTitle>
                <div className="flex items-center gap-2 text-[11px] text-stone-500">
                  <Calendar className="size-3" />
                  {format(submission.submittedAt, 'MMM d, yyyy h:mm a')}
                </div>
              </div>
            </CardHeader>
            <CardContent className="p-6">
              <div className="prose prose-sm prose-stone max-w-none">
                <div className="whitespace-pre-wrap text-sm text-stone-700 leading-relaxed">
                  {submission.content}
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Score summary if graded */}
          {submission.totalScore != null && submission.maxScore != null && (
            <Card className="bg-stone-50/50">
              <CardContent className="py-4 px-5">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-stone-600">Total Score</span>
                  <div className="flex items-baseline gap-1">
                    <span className="text-2xl font-bold text-stone-800">
                      {submission.totalScore}
                    </span>
                    <span className="text-sm text-stone-500">
                      / {submission.maxScore}
                    </span>
                    {scorePercent != null && (
                      <Badge
                        className={`ml-2 text-xs border-0 ${
                          scorePercent >= 90
                            ? 'bg-blue-100 text-blue-700'
                            : scorePercent >= 70
                            ? 'bg-emerald-100 text-emerald-700'
                            : scorePercent >= 50
                            ? 'bg-amber-100 text-amber-700'
                            : 'bg-rose-100 text-rose-700'
                        }`}
                      >
                        {scorePercent}%
                      </Badge>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          )}
        </div>

        {/* Right: AI Feedback */}
        <div>
          <Card className="bg-white">
            <CardHeader className="bg-amber-50/50 border-b border-stone-200">
              <CardTitle className="text-sm font-semibold text-stone-700">
                AI Feedback
              </CardTitle>
            </CardHeader>
            <CardContent className="p-5">
              <FeedbackPanel
                submissionId={submissionId}
                feedback={feedbackData}
                criterionScores={criterionScoresData}
              />
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
