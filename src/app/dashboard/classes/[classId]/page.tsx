import { redirect, notFound } from 'next/navigation'
import Link from 'next/link'
import { auth } from '@/lib/auth'
import { db } from '@/lib/db'
import {
  classes,
  classMembers,
  users,
  assignments,
  submissions,
  masteryRecords,
  standards,
} from '@/lib/db/schema'
import { eq, and, inArray, desc, sql } from 'drizzle-orm'
import {
  ArrowLeft,
  Users,
  ClipboardList,
  BarChart3,
  Target,
  TrendingUp,
  TrendingDown,
  BookOpen,
  Calendar,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { formatGradeLevel } from '@/lib/format'

function getInitials(name: string): string {
  return name
    .split(' ')
    .map((n) => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2)
}

function getMasteryBadge(level: string) {
  switch (level) {
    case 'advanced':
      return <Badge className="bg-blue-100 text-blue-700 hover:bg-blue-100 border-0 text-xs">Advanced</Badge>
    case 'proficient':
      return <Badge className="bg-emerald-100 text-emerald-700 hover:bg-emerald-100 border-0 text-xs">Proficient</Badge>
    case 'developing':
      return <Badge className="bg-amber-100 text-amber-700 hover:bg-amber-100 border-0 text-xs">Developing</Badge>
    case 'beginning':
      return <Badge className="bg-rose-100 text-rose-700 hover:bg-rose-100 border-0 text-xs">Beginning</Badge>
    default:
      return <Badge variant="secondary" className="text-xs">N/A</Badge>
  }
}

function getStatusBadge(status: string) {
  switch (status) {
    case 'published':
      return <Badge className="bg-emerald-100 text-emerald-700 hover:bg-emerald-100 border-0 text-xs">Published</Badge>
    case 'draft':
      return <Badge variant="secondary" className="text-xs">Draft</Badge>
    case 'grading':
      return <Badge className="bg-amber-100 text-amber-700 hover:bg-amber-100 border-0 text-xs">Grading</Badge>
    case 'completed':
      return <Badge className="bg-blue-100 text-blue-700 hover:bg-blue-100 border-0 text-xs">Completed</Badge>
    default:
      return <Badge variant="secondary" className="text-xs">{status}</Badge>
  }
}

export default async function ClassDetailPage({
  params,
}: {
  params: Promise<{ classId: string }>
}) {
  const session = await auth()
  if (!session?.user) {
    redirect('/login')
  }

  const { classId } = await params

  // 1. Fetch class
  const [cls] = await db
    .select()
    .from(classes)
    .where(eq(classes.id, classId))
    .limit(1)

  if (!cls) {
    notFound()
  }

  // 2. Verify teacher membership
  const [membership] = await db
    .select({ id: classMembers.id })
    .from(classMembers)
    .where(
      and(
        eq(classMembers.classId, classId),
        eq(classMembers.userId, session.user.id),
        eq(classMembers.role, 'teacher')
      )
    )
    .limit(1)

  if (!membership) {
    redirect('/dashboard/classes')
  }

  // 3. Fetch student members with user info
  const studentMembers = await db
    .select({
      userId: classMembers.userId,
      name: users.name,
      email: users.email,
    })
    .from(classMembers)
    .innerJoin(users, eq(classMembers.userId, users.id))
    .where(
      and(
        eq(classMembers.classId, classId),
        eq(classMembers.role, 'student')
      )
    )

  const studentIds = studentMembers.map((s) => s.userId)

  // 4. Fetch assignments for this class
  const classAssignments = await db
    .select()
    .from(assignments)
    .where(eq(assignments.classId, classId))
    .orderBy(desc(assignments.createdAt))

  const assignmentIds = classAssignments.map((a) => a.id)

  // 5. Fetch submissions for those assignments
  let classSubmissions: {
    id: string
    assignmentId: string
    studentId: string
    status: string
    totalScore: number | null
    maxScore: number | null
  }[] = []

  if (assignmentIds.length > 0) {
    classSubmissions = await db
      .select({
        id: submissions.id,
        assignmentId: submissions.assignmentId,
        studentId: submissions.studentId,
        status: submissions.status,
        totalScore: submissions.totalScore,
        maxScore: submissions.maxScore,
      })
      .from(submissions)
      .where(inArray(submissions.assignmentId, assignmentIds))
  }

  // 6. Fetch mastery records for these students
  let allMasteryRecords: {
    id: string
    studentId: string
    standardId: string
    level: string
    score: number
    assessedAt: Date
  }[] = []

  if (studentIds.length > 0) {
    allMasteryRecords = await db
      .select({
        id: masteryRecords.id,
        studentId: masteryRecords.studentId,
        standardId: masteryRecords.standardId,
        level: masteryRecords.level,
        score: masteryRecords.score,
        assessedAt: masteryRecords.assessedAt,
      })
      .from(masteryRecords)
      .innerJoin(standards, eq(masteryRecords.standardId, standards.id))
      .where(
        and(
          inArray(masteryRecords.studentId, studentIds),
          eq(standards.subject, cls.subject)
        )
      )
      .orderBy(desc(masteryRecords.assessedAt))
  }

  // Get latest mastery per (student, standard)
  const latestMastery = new Map<string, { level: string; score: number; standardId: string; studentId: string }>()
  for (const record of allMasteryRecords) {
    const key = `${record.studentId}:${record.standardId}`
    if (!latestMastery.has(key)) {
      latestMastery.set(key, {
        level: record.level,
        score: record.score,
        standardId: record.standardId,
        studentId: record.studentId,
      })
    }
  }

  // --- Compute stat card values ---

  const studentCount = studentMembers.length
  const assignmentCount = classAssignments.length

  // Average score across graded submissions
  const gradedSubmissions = classSubmissions.filter(
    (s) => s.totalScore != null && s.maxScore != null && s.maxScore > 0
  )
  const avgScore =
    gradedSubmissions.length > 0
      ? Math.round(
          gradedSubmissions.reduce(
            (sum, s) => sum + (s.totalScore! / s.maxScore!) * 100,
            0
          ) / gradedSubmissions.length
        )
      : null

  // Mastery rate: % of student-standard pairs that are proficient or advanced
  const masteryValues = [...latestMastery.values()]
  const proficientOrAdvanced = masteryValues.filter(
    (m) => m.level === 'proficient' || m.level === 'advanced'
  ).length
  const masteryRate =
    masteryValues.length > 0
      ? Math.round((proficientOrAdvanced / masteryValues.length) * 100)
      : null

  // --- Student roster data ---

  // Per-student avg score from submissions
  const studentScores = new Map<string, { total: number; count: number }>()
  for (const sub of gradedSubmissions) {
    const entry = studentScores.get(sub.studentId) ?? { total: 0, count: 0 }
    entry.total += (sub.totalScore! / sub.maxScore!) * 100
    entry.count += 1
    studentScores.set(sub.studentId, entry)
  }

  // Per-student submission count
  const studentSubmissionCounts = new Map<string, number>()
  for (const sub of classSubmissions) {
    studentSubmissionCounts.set(
      sub.studentId,
      (studentSubmissionCounts.get(sub.studentId) ?? 0) + 1
    )
  }

  // Per-student predominant mastery level
  const studentMasteryLevels = new Map<string, string>()
  const studentMasteryByStudent = new Map<string, string[]>()
  for (const m of masteryValues) {
    const levels = studentMasteryByStudent.get(m.studentId) ?? []
    levels.push(m.level)
    studentMasteryByStudent.set(m.studentId, levels)
  }
  for (const [studentId, levels] of studentMasteryByStudent) {
    const counts: Record<string, number> = {}
    for (const l of levels) {
      counts[l] = (counts[l] ?? 0) + 1
    }
    const dominant = Object.entries(counts).sort((a, b) => b[1] - a[1])[0]
    studentMasteryLevels.set(studentId, dominant?.[0] ?? 'N/A')
  }

  // Sort students alphabetically
  const sortedStudents = [...studentMembers].sort((a, b) =>
    (a.name ?? '').localeCompare(b.name ?? '')
  )

  // --- Recent assignments (limit 5) ---

  const recentAssignments = classAssignments.slice(0, 5)

  // Submission counts per assignment
  const assignmentSubmissionCounts = new Map<string, number>()
  const assignmentAvgScores = new Map<string, number | null>()
  for (const aId of assignmentIds) {
    const subs = classSubmissions.filter((s) => s.assignmentId === aId)
    assignmentSubmissionCounts.set(aId, subs.length)
    const scored = subs.filter(
      (s) => s.totalScore != null && s.maxScore != null && s.maxScore > 0
    )
    if (scored.length > 0) {
      assignmentAvgScores.set(
        aId,
        Math.round(
          scored.reduce(
            (sum, s) => sum + (s.totalScore! / s.maxScore!) * 100,
            0
          ) / scored.length
        )
      )
    } else {
      assignmentAvgScores.set(aId, null)
    }
  }

  // --- Class Performance Summary: standards analysis ---

  // Aggregate average mastery score per standard
  const standardScores = new Map<string, { total: number; count: number }>()
  for (const m of masteryValues) {
    const entry = standardScores.get(m.standardId) ?? { total: 0, count: 0 }
    entry.total += m.score
    entry.count += 1
    standardScores.set(m.standardId, entry)
  }

  const standardAvgs = [...standardScores.entries()].map(([standardId, { total, count }]) => ({
    standardId,
    avg: total / count,
  }))

  // Fetch standard info for the standards in use
  const standardIdList = standardAvgs.map((s) => s.standardId)
  let standardInfoMap = new Map<string, { code: string; description: string }>()

  if (standardIdList.length > 0) {
    const standardRows = await db
      .select({
        id: standards.id,
        code: standards.code,
        description: standards.description,
      })
      .from(standards)
      .where(inArray(standards.id, standardIdList))

    for (const s of standardRows) {
      standardInfoMap.set(s.id, { code: s.code, description: s.description })
    }
  }

  const standardsWithAvg = standardAvgs
    .map((s) => ({
      ...s,
      ...(standardInfoMap.get(s.standardId) ?? { code: 'Unknown', description: '' }),
    }))
    .sort((a, b) => a.avg - b.avg)

  const strugglingStandards = standardsWithAvg.slice(0, 3)
  const excellingStandards = [...standardsWithAvg].sort((a, b) => b.avg - a.avg).slice(0, 3)

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="space-y-1">
        <div className="flex items-center gap-2 mb-2">
          <Button variant="ghost" size="sm" asChild className="gap-1 -ml-2">
            <Link href="/dashboard/classes">
              <ArrowLeft className="size-3.5" />
              My Classes
            </Link>
          </Button>
        </div>
        <h1 className="font-serif text-2xl font-bold tracking-tight text-stone-900">
          {cls.name}
        </h1>
        <div className="flex flex-wrap items-center gap-2 mt-2">
          <Badge variant="outline" className="text-xs font-normal text-stone-600 border-stone-300">
            {cls.subject}
          </Badge>
          <Badge variant="outline" className="text-xs font-normal text-stone-600 border-stone-300">
            {formatGradeLevel(cls.gradeLevel)}
          </Badge>
          {cls.period && (
            <Badge variant="outline" className="text-xs font-normal text-stone-600 border-stone-300">
              Period {cls.period}
            </Badge>
          )}
        </div>
      </div>

      {/* Stat Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <Card className="bg-stone-50/50">
          <CardContent className="py-3 px-4">
            <div className="flex items-center gap-2">
              <Users className="size-4 text-stone-400" />
              <span className="text-[11px] text-stone-500 uppercase tracking-wider">Students</span>
            </div>
            <p className="text-2xl font-bold text-stone-800 mt-1">{studentCount}</p>
          </CardContent>
        </Card>
        <Card className="bg-blue-50/50">
          <CardContent className="py-3 px-4">
            <div className="flex items-center gap-2">
              <ClipboardList className="size-4 text-blue-500" />
              <span className="text-[11px] text-blue-600 uppercase tracking-wider">Assignments</span>
            </div>
            <p className="text-2xl font-bold text-blue-700 mt-1">{assignmentCount}</p>
          </CardContent>
        </Card>
        <Card className="bg-emerald-50/50">
          <CardContent className="py-3 px-4">
            <div className="flex items-center gap-2">
              <BarChart3 className="size-4 text-emerald-500" />
              <span className="text-[11px] text-emerald-600 uppercase tracking-wider">Avg Score</span>
            </div>
            <p className="text-2xl font-bold text-emerald-700 mt-1">
              {avgScore != null ? `${avgScore}%` : 'N/A'}
            </p>
          </CardContent>
        </Card>
        <Card className="bg-amber-50/50">
          <CardContent className="py-3 px-4">
            <div className="flex items-center gap-2">
              <Target className="size-4 text-amber-500" />
              <span className="text-[11px] text-amber-600 uppercase tracking-wider">Mastery Rate</span>
            </div>
            <p className="text-2xl font-bold text-amber-700 mt-1">
              {masteryRate != null ? `${masteryRate}%` : 'N/A'}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Student Roster */}
      <div className="space-y-3">
        <h2 className="text-sm font-semibold text-stone-700 uppercase tracking-wider">
          Student Roster ({studentCount})
        </h2>
        {sortedStudents.length === 0 ? (
          <div className="rounded-lg border border-dashed border-stone-300 bg-stone-50 p-12 text-center">
            <p className="text-stone-500">No students enrolled in this class yet.</p>
          </div>
        ) : (
          <div className="grid gap-2">
            {sortedStudents.map((student) => {
              const name = student.name ?? 'Unknown Student'
              const scoreEntry = studentScores.get(student.userId)
              const studentAvg = scoreEntry
                ? Math.round(scoreEntry.total / scoreEntry.count)
                : null
              const subCount = studentSubmissionCounts.get(student.userId) ?? 0
              const masteryLevel = studentMasteryLevels.get(student.userId) ?? 'N/A'

              return (
                <Link
                  key={student.userId}
                  href={`/dashboard/mastery/${student.userId}`}
                  className="block"
                >
                  <Card className="hover:bg-stone-50/80 transition-colors">
                    <CardContent className="py-3 px-4 flex items-center gap-4">
                      {/* Avatar */}
                      <div className="flex-shrink-0 size-9 rounded-full bg-amber-100 text-amber-700 flex items-center justify-center text-sm font-semibold">
                        {getInitials(name)}
                      </div>

                      {/* Name */}
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-stone-900 truncate">{name}</p>
                      </div>

                      {/* Stats */}
                      <div className="flex items-center gap-4 text-xs text-stone-500 shrink-0">
                        <div className="hidden sm:flex items-center gap-1">
                          <BookOpen className="size-3" />
                          <span>{subCount} {subCount === 1 ? 'submission' : 'submissions'}</span>
                        </div>
                        <div className="hidden sm:block w-16 text-right">
                          {studentAvg != null ? (
                            <span className="font-medium text-stone-700">{studentAvg}%</span>
                          ) : (
                            <span>N/A</span>
                          )}
                        </div>
                        {getMasteryBadge(masteryLevel)}
                      </div>
                    </CardContent>
                  </Card>
                </Link>
              )
            })}
          </div>
        )}
      </div>

      {/* Recent Assignments */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-semibold text-stone-700 uppercase tracking-wider">
            Recent Assignments
          </h2>
          {classAssignments.length > 5 && (
            <Link
              href="/dashboard/assignments"
              className="text-xs text-amber-600 hover:text-amber-700 font-medium"
            >
              View all
            </Link>
          )}
        </div>
        {recentAssignments.length === 0 ? (
          <div className="rounded-lg border border-dashed border-stone-300 bg-stone-50 p-12 text-center">
            <p className="text-stone-500">No assignments created for this class yet.</p>
          </div>
        ) : (
          <div className="space-y-2">
            {recentAssignments.map((assignment) => {
              const subCount = assignmentSubmissionCounts.get(assignment.id) ?? 0
              const assignAvg = assignmentAvgScores.get(assignment.id)

              return (
                <Link
                  key={assignment.id}
                  href={`/dashboard/grading/${assignment.id}`}
                  className="block"
                >
                  <Card className="hover:bg-stone-50/80 transition-colors">
                    <CardContent className="py-3 px-4 flex items-center gap-4">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <p className="text-sm font-medium text-stone-900 truncate">
                            {assignment.title}
                          </p>
                          {getStatusBadge(assignment.status)}
                        </div>
                        {assignment.dueDate && (
                          <div className="flex items-center gap-1 mt-1 text-xs text-stone-400">
                            <Calendar className="size-3" />
                            <span>
                              Due {assignment.dueDate.toLocaleDateString('en-US', {
                                month: 'short',
                                day: 'numeric',
                                year: 'numeric',
                              })}
                            </span>
                          </div>
                        )}
                      </div>
                      <div className="flex items-center gap-4 text-xs text-stone-500 shrink-0">
                        <div className="hidden sm:block">
                          {subCount}/{studentCount} submitted
                        </div>
                        <div className="w-14 text-right">
                          {assignAvg != null ? (
                            <span className="font-medium text-stone-700">{assignAvg}%</span>
                          ) : (
                            <span>N/A</span>
                          )}
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </Link>
              )
            })}
          </div>
        )}
      </div>

      {/* Class Performance Summary */}
      {standardsWithAvg.length > 0 && (
        <div className="grid sm:grid-cols-2 gap-4">
          {/* Struggling Standards */}
          <Card>
            <CardHeader className="pb-3">
              <div className="flex items-center gap-2">
                <TrendingDown className="size-4 text-rose-500" />
                <CardTitle className="text-sm font-semibold text-stone-700">
                  Areas for Growth
                </CardTitle>
              </div>
            </CardHeader>
            <CardContent className="pt-0">
              {strugglingStandards.length === 0 ? (
                <p className="text-sm text-stone-500">No mastery data yet.</p>
              ) : (
                <div className="space-y-3">
                  {strugglingStandards.map((s) => (
                    <div key={s.standardId} className="space-y-1">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-medium text-stone-700">{s.code}</span>
                        <span className="text-xs font-semibold text-rose-600">
                          {Math.round(s.avg)}%
                        </span>
                      </div>
                      <p className="text-xs text-stone-500 line-clamp-1">{s.description}</p>
                      <div className="h-1.5 rounded-full bg-stone-100">
                        <div
                          className="h-full rounded-full bg-rose-400"
                          style={{ width: `${Math.round(s.avg)}%` }}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Excelling Standards */}
          <Card>
            <CardHeader className="pb-3">
              <div className="flex items-center gap-2">
                <TrendingUp className="size-4 text-emerald-500" />
                <CardTitle className="text-sm font-semibold text-stone-700">
                  Strengths
                </CardTitle>
              </div>
            </CardHeader>
            <CardContent className="pt-0">
              {excellingStandards.length === 0 ? (
                <p className="text-sm text-stone-500">No mastery data yet.</p>
              ) : (
                <div className="space-y-3">
                  {excellingStandards.map((s) => (
                    <div key={s.standardId} className="space-y-1">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-medium text-stone-700">{s.code}</span>
                        <span className="text-xs font-semibold text-emerald-600">
                          {Math.round(s.avg)}%
                        </span>
                      </div>
                      <p className="text-xs text-stone-500 line-clamp-1">{s.description}</p>
                      <div className="h-1.5 rounded-full bg-stone-100">
                        <div
                          className="h-full rounded-full bg-emerald-400"
                          style={{ width: `${Math.round(s.avg)}%` }}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  )
}
