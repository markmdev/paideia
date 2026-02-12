import { redirect, notFound } from 'next/navigation'
import Link from 'next/link'
import { format } from 'date-fns'
import { auth } from '@/lib/auth'
import { db } from '@/lib/db'
import {
  assignments,
  rubrics,
  rubricCriteria,
  differentiatedVersions,
  classes,
  classMembers,
  submissions,
  feedbackDrafts,
} from '@/lib/db/schema'
import { eq, and, ne, inArray } from 'drizzle-orm'
import {
  ArrowLeft,
  Calendar,
  GraduationCap,
  BookOpen,
  CheckCircle2,
  Lightbulb,
  Layers,
  ClipboardList,
  PenLine,
  FileText,
  MessageSquare,
  Star,
  TrendingUp,
  ArrowRight,
  Clock,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { RubricDisplay } from '@/components/assignments/rubric-display'
import ReactMarkdown from 'react-markdown'
import { DeleteAssignmentButton } from './delete-button'
import { SubmitWorkForm } from '@/components/assignments/submit-work-form'
import { formatGradeLevel } from '@/lib/format'

const statusConfig: Record<string, { label: string; color: string }> = {
  draft: { label: 'Draft', color: 'bg-slate-100 text-slate-700' },
  published: { label: 'Published', color: 'bg-emerald-100 text-emerald-700' },
  grading: { label: 'Grading', color: 'bg-amber-100 text-amber-700' },
  completed: { label: 'Completed', color: 'bg-sky-100 text-sky-700' },
}

const tierLabels: Record<string, { label: string; color: string }> = {
  below_grade: {
    label: 'Below Grade Level',
    color: 'bg-amber-100 text-amber-800 border-amber-200',
  },
  on_grade: {
    label: 'On Grade Level',
    color: 'bg-emerald-100 text-emerald-800 border-emerald-200',
  },
  above_grade: {
    label: 'Above Grade Level',
    color: 'bg-sky-100 text-sky-800 border-sky-200',
  },
}

const submissionStatusConfig: Record<string, { label: string; color: string }> = {
  draft: { label: 'Draft', color: 'bg-slate-100 text-slate-700' },
  submitted: { label: 'Submitted', color: 'bg-sky-100 text-sky-700' },
  grading: { label: 'Being Graded', color: 'bg-amber-100 text-amber-700' },
  graded: { label: 'Graded', color: 'bg-emerald-100 text-emerald-700' },
  returned: { label: 'Returned', color: 'bg-violet-100 text-violet-700' },
}

function parseJsonField(value: string | null): string[] {
  if (!value) return []
  try {
    return JSON.parse(value)
  } catch {
    return []
  }
}

export default async function AssignmentDetailPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const session = await auth()
  if (!session?.user) {
    redirect('/login')
  }

  const { id } = await params
  const isStudent = session.user.role === 'student'

  // Fetch the assignment based on role
  let result: {
    assignment: typeof assignments.$inferSelect
    className: string | null
  } | undefined

  if (isStudent) {
    // Check class membership and exclude draft assignments
    const memberships = await db
      .select({ classId: classMembers.classId })
      .from(classMembers)
      .where(
        and(
          eq(classMembers.userId, session.user.id),
          eq(classMembers.role, 'student')
        )
      )

    const classIds = memberships.map((m) => m.classId)

    if (classIds.length > 0) {
      const [studentResult] = await db
        .select({
          assignment: assignments,
          className: classes.name,
        })
        .from(assignments)
        .leftJoin(classes, eq(assignments.classId, classes.id))
        .where(
          and(
            eq(assignments.id, id),
            inArray(assignments.classId, classIds),
            ne(assignments.status, 'draft')
          )
        )
        .limit(1)
      result = studentResult
    }
  } else {
    // Teacher / other roles: filter by teacherId
    const [teacherResult] = await db
      .select({
        assignment: assignments,
        className: classes.name,
      })
      .from(assignments)
      .leftJoin(classes, eq(assignments.classId, classes.id))
      .where(
        and(
          eq(assignments.id, id),
          eq(assignments.teacherId, session.user.id)
        )
      )
      .limit(1)
    result = teacherResult
  }

  if (!result) {
    notFound()
  }

  const assignment = result.assignment

  // Teacher-only data
  let rubric = null
  let criteria: Array<{
    id: string
    name: string
    description: string | null
    weight: number
    descriptors: string
    rubricId: string
    standardId: string | null
  }> = []
  let versions: (typeof differentiatedVersions.$inferSelect)[] = []
  let successCriteria: string[] = []

  if (!isStudent) {
    // Fetch rubric and criteria
    if (assignment.rubricId) {
      const [rubricResult] = await db
        .select()
        .from(rubrics)
        .where(eq(rubrics.id, assignment.rubricId))
        .limit(1)
      rubric = rubricResult ?? null

      if (rubric) {
        criteria = await db
          .select()
          .from(rubricCriteria)
          .where(eq(rubricCriteria.rubricId, rubric.id))
      }
    }

    // Fetch differentiated versions
    versions = await db
      .select()
      .from(differentiatedVersions)
      .where(eq(differentiatedVersions.assignmentId, id))

    // Parse success criteria
    successCriteria = parseJsonField(assignment.successCriteria ?? null)
  }

  // Student-only data
  let studentSubmission: (typeof submissions.$inferSelect) | null = null
  let feedback: (typeof feedbackDrafts.$inferSelect) | null = null

  if (isStudent) {
    const [sub] = await db
      .select()
      .from(submissions)
      .where(
        and(
          eq(submissions.assignmentId, id),
          eq(submissions.studentId, session.user.id)
        )
      )
      .limit(1)
    studentSubmission = sub ?? null

    if (studentSubmission) {
      const [fb] = await db
        .select()
        .from(feedbackDrafts)
        .where(
          and(
            eq(feedbackDrafts.submissionId, studentSubmission.id),
            // Only show feedback that has been approved or sent
          )
        )
        .limit(1)

      if (fb && (fb.status === 'approved' || fb.status === 'sent')) {
        feedback = fb
      }
    }
  }

  const statusInfo = statusConfig[assignment.status] ?? statusConfig.draft
  const subStatusInfo = studentSubmission
    ? submissionStatusConfig[studentSubmission.status] ?? submissionStatusConfig.submitted
    : null

  // Parse feedback JSON fields
  const feedbackStrengths = feedback ? parseJsonField(feedback.strengths) : []
  const feedbackImprovements = feedback ? parseJsonField(feedback.improvements) : []
  const feedbackNextSteps = feedback ? parseJsonField(feedback.nextSteps) : []

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div className="space-y-1">
          <div className="flex items-center gap-2 mb-2">
            <Button variant="ghost" size="sm" asChild className="gap-1 -ml-2">
              <Link href="/dashboard/assignments">
                <ArrowLeft className="size-3.5" />
                Assignments
              </Link>
            </Button>
          </div>
          <h1 className="text-2xl font-serif font-bold tracking-tight">
            {assignment.title}
          </h1>
          <div className="flex flex-wrap items-center gap-2 mt-2">
            <Badge className={`${statusInfo.color} border-0 text-xs`}>
              {statusInfo.label}
            </Badge>
            <Badge variant="outline" className="text-xs font-normal gap-1">
              <BookOpen className="size-3" />
              {assignment.subject}
            </Badge>
            <Badge variant="outline" className="text-xs font-normal gap-1">
              <GraduationCap className="size-3" />
              {formatGradeLevel(assignment.gradeLevel)}
            </Badge>
            {result.className && (
              <Badge variant="outline" className="text-xs font-normal">
                {result.className}
              </Badge>
            )}
            {assignment.dueDate && (
              <Badge variant="outline" className="text-xs font-normal gap-1">
                <Calendar className="size-3" />
                Due {format(assignment.dueDate, 'MMM d, yyyy')}
              </Badge>
            )}
          </div>
        </div>
        {!isStudent && (
          <div className="flex gap-2 shrink-0">
            <DeleteAssignmentButton assignmentId={assignment.id} />
          </div>
        )}
      </div>

      {/* Content Tabs */}
      <Tabs defaultValue="assignment" className="w-full" activationMode="automatic">
        <TabsList className="w-full justify-start">
          <TabsTrigger value="assignment" className="gap-1.5">
            <PenLine className="size-3.5" />
            Assignment
          </TabsTrigger>
          {!isStudent && rubric && (
            <TabsTrigger value="rubric" className="gap-1.5">
              <ClipboardList className="size-3.5" />
              Rubric
            </TabsTrigger>
          )}
          {!isStudent && successCriteria.length > 0 && (
            <TabsTrigger value="criteria" className="gap-1.5">
              <Lightbulb className="size-3.5" />
              Success Criteria
            </TabsTrigger>
          )}
          {!isStudent && versions.length > 0 && (
            <TabsTrigger value="differentiation" className="gap-1.5">
              <Layers className="size-3.5" />
              Differentiated Versions
            </TabsTrigger>
          )}
          {isStudent && studentSubmission && (
            <TabsTrigger value="submission" className="gap-1.5">
              <FileText className="size-3.5" />
              Your Submission
            </TabsTrigger>
          )}
          {isStudent && feedback && (
            <TabsTrigger value="feedback" className="gap-1.5">
              <MessageSquare className="size-3.5" />
              Feedback
            </TabsTrigger>
          )}
        </TabsList>

        <TabsContent value="assignment" className="mt-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Assignment Details</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <h4 className="text-sm font-medium text-muted-foreground mb-1">
                  Description
                </h4>
                <div className="text-sm leading-relaxed prose prose-sm max-w-none">
                  <ReactMarkdown>{assignment.description}</ReactMarkdown>
                </div>
              </div>
              {assignment.instructions && (
                <div>
                  <h4 className="text-sm font-medium text-muted-foreground mb-1">
                    Instructions
                  </h4>
                  <div className="text-sm leading-relaxed prose prose-sm max-w-none bg-slate-50 rounded-lg p-4 border">
                    <ReactMarkdown>{assignment.instructions}</ReactMarkdown>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {!isStudent && rubric && (
          <TabsContent value="rubric" className="mt-4">
            <RubricDisplay rubric={rubric} criteria={criteria} />
          </TabsContent>
        )}

        {!isStudent && successCriteria.length > 0 && (
          <TabsContent value="criteria" className="mt-4">
            <Card>
              <CardHeader className="bg-gradient-to-r from-emerald-50 to-teal-50 border-b">
                <CardTitle className="text-base flex items-center gap-2">
                  <Lightbulb className="size-4 text-emerald-600" />
                  Success Criteria
                </CardTitle>
                <p className="text-sm text-muted-foreground">
                  Student-facing &ldquo;I can&rdquo; statements.
                </p>
              </CardHeader>
              <CardContent className="p-6">
                <ul className="space-y-3">
                  {successCriteria.map((criterion: string, index: number) => (
                    <li
                      key={index}
                      className="flex items-start gap-3 text-sm"
                    >
                      <CheckCircle2 className="size-4 text-emerald-500 mt-0.5 shrink-0" />
                      <span className="leading-relaxed">{criterion}</span>
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>
          </TabsContent>
        )}

        {!isStudent && versions.length > 0 && (
          <TabsContent value="differentiation" className="mt-4">
            <div className="space-y-4">
              {versions.map((version) => {
                const tierInfo =
                  tierLabels[version.tier] ?? tierLabels.on_grade
                const scaffolds: string[] = parseJsonField(version.scaffolds)

                return (
                  <Card key={version.id} className="overflow-hidden">
                    <CardHeader className="pb-3">
                      <div className="flex items-center gap-2">
                        <Badge
                          className={`${tierInfo.color} border text-xs`}
                        >
                          {tierInfo.label}
                        </Badge>
                      </div>
                      <CardTitle className="text-base mt-1">
                        {version.title}
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-3">
                      <div className="text-sm leading-relaxed prose prose-sm max-w-none">
                        <ReactMarkdown>{version.content}</ReactMarkdown>
                      </div>
                      {scaffolds.length > 0 && (
                        <div className="bg-slate-50 rounded-lg p-4 border">
                          <h4 className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-2">
                            Scaffolds & Supports
                          </h4>
                          <ul className="space-y-1.5">
                            {scaffolds.map(
                              (scaffold: string, index: number) => (
                                <li
                                  key={index}
                                  className="text-sm flex items-start gap-2"
                                >
                                  <span className="text-amber-500 mt-1">
                                    &bull;
                                  </span>
                                  {scaffold}
                                </li>
                              )
                            )}
                          </ul>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                )
              })}
            </div>
          </TabsContent>
        )}

        {/* Student: Submission Tab */}
        {isStudent && studentSubmission && (
          <TabsContent value="submission" className="mt-4">
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="text-base flex items-center gap-2">
                    <FileText className="size-4 text-sky-600" />
                    Your Submission
                  </CardTitle>
                  <div className="flex items-center gap-2">
                    {subStatusInfo && (
                      <Badge className={`${subStatusInfo.color} border-0 text-xs`}>
                        {subStatusInfo.label}
                      </Badge>
                    )}
                    {studentSubmission.letterGrade && (
                      <Badge className="bg-emerald-100 text-emerald-700 border-0 text-xs font-semibold">
                        {studentSubmission.letterGrade}
                      </Badge>
                    )}
                    {studentSubmission.totalScore != null && studentSubmission.maxScore != null && (
                      <Badge variant="outline" className="text-xs font-normal">
                        {studentSubmission.totalScore}/{studentSubmission.maxScore}
                      </Badge>
                    )}
                  </div>
                </div>
                <p className="text-xs text-muted-foreground">
                  Submitted {format(studentSubmission.submittedAt, 'MMM d, yyyy \'at\' h:mm a')}
                  {studentSubmission.gradedAt && (
                    <> &middot; Graded {format(studentSubmission.gradedAt, 'MMM d, yyyy')}</>
                  )}
                </p>
              </CardHeader>
              <CardContent>
                <div className="text-sm leading-relaxed prose prose-sm max-w-none bg-slate-50 rounded-lg p-4 border">
                  <ReactMarkdown>{studentSubmission.content}</ReactMarkdown>
                </div>
              </CardContent>
            </Card>

            {/* Awaiting feedback notice */}
            {!feedback && (
              <Card className="border-amber-200 bg-gradient-to-r from-amber-50 to-orange-50">
                <CardContent className="py-4 flex items-center gap-3">
                  <div className="rounded-full bg-amber-100 p-2 shrink-0">
                    <Clock className="size-4 text-amber-600" />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-amber-900">
                      Awaiting Teacher Feedback
                    </p>
                    <p className="text-xs text-amber-700/80">
                      Your teacher is reviewing your work. Feedback will appear here once it is ready.
                    </p>
                  </div>
                </CardContent>
              </Card>
            )}
          </TabsContent>
        )}

        {/* Student: Feedback Tab */}
        {isStudent && feedback && (
          <TabsContent value="feedback" className="mt-4 space-y-4">
            {/* Overall Feedback */}
            <Card>
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2">
                  <MessageSquare className="size-4 text-violet-600" />
                  Teacher Feedback
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-sm leading-relaxed prose prose-sm max-w-none">
                  <ReactMarkdown>
                    {feedback.finalFeedback ?? feedback.teacherEdits ?? feedback.aiFeedback}
                  </ReactMarkdown>
                </div>
              </CardContent>
            </Card>

            {/* Strengths */}
            {feedbackStrengths.length > 0 && (
              <Card>
                <CardHeader className="bg-gradient-to-r from-emerald-50 to-green-50 border-b">
                  <CardTitle className="text-base flex items-center gap-2">
                    <Star className="size-4 text-emerald-600" />
                    Strengths
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-6">
                  <ul className="space-y-2">
                    {feedbackStrengths.map((item: string, index: number) => (
                      <li
                        key={index}
                        className="flex items-start gap-3 text-sm"
                      >
                        <CheckCircle2 className="size-4 text-emerald-500 mt-0.5 shrink-0" />
                        <span className="leading-relaxed">{item}</span>
                      </li>
                    ))}
                  </ul>
                </CardContent>
              </Card>
            )}

            {/* Areas for Improvement */}
            {feedbackImprovements.length > 0 && (
              <Card>
                <CardHeader className="bg-gradient-to-r from-amber-50 to-orange-50 border-b">
                  <CardTitle className="text-base flex items-center gap-2">
                    <TrendingUp className="size-4 text-amber-600" />
                    Areas for Improvement
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-6">
                  <ul className="space-y-2">
                    {feedbackImprovements.map((item: string, index: number) => (
                      <li
                        key={index}
                        className="flex items-start gap-3 text-sm"
                      >
                        <span className="size-4 rounded-full bg-amber-100 text-amber-600 flex items-center justify-center text-xs font-medium mt-0.5 shrink-0">
                          {index + 1}
                        </span>
                        <span className="leading-relaxed">{item}</span>
                      </li>
                    ))}
                  </ul>
                </CardContent>
              </Card>
            )}

            {/* Next Steps */}
            {feedbackNextSteps.length > 0 && (
              <Card>
                <CardHeader className="bg-gradient-to-r from-sky-50 to-blue-50 border-b">
                  <CardTitle className="text-base flex items-center gap-2">
                    <ArrowRight className="size-4 text-sky-600" />
                    Next Steps
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-6">
                  <ul className="space-y-2">
                    {feedbackNextSteps.map((item: string, index: number) => (
                      <li
                        key={index}
                        className="flex items-start gap-3 text-sm"
                      >
                        <span className="size-4 rounded-full bg-sky-100 text-sky-600 flex items-center justify-center text-xs font-medium mt-0.5 shrink-0">
                          {index + 1}
                        </span>
                        <span className="leading-relaxed">{item}</span>
                      </li>
                    ))}
                  </ul>
                </CardContent>
              </Card>
            )}
          </TabsContent>
        )}
      </Tabs>

      {isStudent && !studentSubmission && (
        <SubmitWorkForm assignmentId={assignment.id} />
      )}
    </div>
  )
}
