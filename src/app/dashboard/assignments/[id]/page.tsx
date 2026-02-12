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
} from '@/lib/db/schema'
import { eq, and } from 'drizzle-orm'
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
  Trash2,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { RubricDisplay } from '@/components/assignments/rubric-display'
import { DeleteAssignmentButton } from './delete-button'
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

  // Fetch the assignment
  const [result] = await db
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

  if (!result) {
    notFound()
  }

  const assignment = result.assignment

  // Fetch rubric and criteria
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
  const versions = await db
    .select()
    .from(differentiatedVersions)
    .where(eq(differentiatedVersions.assignmentId, id))

  // Parse success criteria
  const successCriteria: string[] = (() => {
    try {
      return assignment.successCriteria
        ? JSON.parse(assignment.successCriteria)
        : []
    } catch {
      return []
    }
  })()

  const statusInfo = statusConfig[assignment.status] ?? statusConfig.draft

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
        <div className="flex gap-2 shrink-0">
          <DeleteAssignmentButton assignmentId={assignment.id} />
        </div>
      </div>

      {/* Content Tabs */}
      <Tabs defaultValue="assignment" className="w-full" activationMode="automatic">
        <TabsList className="w-full justify-start">
          <TabsTrigger value="assignment" className="gap-1.5">
            <PenLine className="size-3.5" />
            Assignment
          </TabsTrigger>
          {rubric && (
            <TabsTrigger value="rubric" className="gap-1.5">
              <ClipboardList className="size-3.5" />
              Rubric
            </TabsTrigger>
          )}
          {successCriteria.length > 0 && (
            <TabsTrigger value="criteria" className="gap-1.5">
              <Lightbulb className="size-3.5" />
              Success Criteria
            </TabsTrigger>
          )}
          {versions.length > 0 && (
            <TabsTrigger value="differentiation" className="gap-1.5">
              <Layers className="size-3.5" />
              Differentiated Versions
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
                <p className="text-sm leading-relaxed whitespace-pre-wrap">
                  {assignment.description}
                </p>
              </div>
              {assignment.instructions && (
                <div>
                  <h4 className="text-sm font-medium text-muted-foreground mb-1">
                    Instructions
                  </h4>
                  <div className="text-sm leading-relaxed whitespace-pre-wrap bg-slate-50 rounded-lg p-4 border">
                    {assignment.instructions}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {rubric && (
          <TabsContent value="rubric" className="mt-4">
            <RubricDisplay rubric={rubric} criteria={criteria} />
          </TabsContent>
        )}

        {successCriteria.length > 0 && (
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

        {versions.length > 0 && (
          <TabsContent value="differentiation" className="mt-4">
            <div className="space-y-4">
              {versions.map((version) => {
                const tierInfo =
                  tierLabels[version.tier] ?? tierLabels.on_grade
                const scaffolds: string[] = (() => {
                  try {
                    return version.scaffolds
                      ? JSON.parse(version.scaffolds)
                      : []
                  } catch {
                    return []
                  }
                })()

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
                      <div className="text-sm leading-relaxed whitespace-pre-wrap">
                        {version.content}
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
      </Tabs>
    </div>
  )
}
