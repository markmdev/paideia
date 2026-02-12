import { redirect, notFound } from 'next/navigation'
import Link from 'next/link'
import { auth } from '@/lib/auth'
import { db } from '@/lib/db'
import {
  users,
  classes,
  classMembers,
  schools,
  masteryRecords,
  standards,
  submissions,
  assignments,
  ieps,
  iepGoals,
  tutorSessions,
} from '@/lib/db/schema'
import { eq, and, desc, sql } from 'drizzle-orm'
import { formatGradeLevel } from '@/lib/format'
import {
  ArrowLeft,
  BookOpen,
  TrendingUp,
  FileText,
  Brain,
  ClipboardCheck,
} from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { StatCard } from '@/components/admin/stat-card'

interface PageProps {
  params: Promise<{ studentId: string }>
}

export default async function StudentDetailPage({ params }: PageProps) {
  const { studentId } = await params

  const session = await auth()
  if (!session?.user) {
    redirect('/login')
  }

  if (session.user.role !== 'admin' && session.user.role !== 'district_admin') {
    redirect('/dashboard')
  }

  // Fetch student
  const [student] = await db
    .select({
      id: users.id,
      name: users.name,
      email: users.email,
    })
    .from(users)
    .where(eq(users.id, studentId))

  if (!student) {
    notFound()
  }

  // Get class enrollments with class info and school
  const enrollments = await db
    .select({
      classId: classes.id,
      className: classes.name,
      subject: classes.subject,
      gradeLevel: classes.gradeLevel,
      period: classes.period,
      schoolId: classes.schoolId,
      schoolName: schools.name,
    })
    .from(classMembers)
    .innerJoin(classes, eq(classMembers.classId, classes.id))
    .leftJoin(schools, eq(classes.schoolId, schools.id))
    .where(
      and(eq(classMembers.userId, studentId), eq(classMembers.role, 'student'))
    )

  // Derive grade level and school name from enrollments
  const gradeLevel = enrollments.length > 0 ? enrollments[0].gradeLevel : null
  const schoolName = enrollments.find((e) => e.schoolName)?.schoolName ?? null

  // Get teacher names for each class
  interface ClassWithTeacher {
    classId: string
    className: string
    subject: string
    gradeLevel: string
    period: string | null
    teacherName: string | null
  }
  const classesWithTeachers: ClassWithTeacher[] = []

  for (const enrollment of enrollments) {
    const [teacher] = await db
      .select({ name: users.name })
      .from(classMembers)
      .innerJoin(users, eq(classMembers.userId, users.id))
      .where(
        and(
          eq(classMembers.classId, enrollment.classId),
          eq(classMembers.role, 'teacher')
        )
      )
      .limit(1)

    classesWithTeachers.push({
      classId: enrollment.classId,
      className: enrollment.className,
      subject: enrollment.subject,
      gradeLevel: enrollment.gradeLevel,
      period: enrollment.period,
      teacherName: teacher?.name ?? null,
    })
  }

  // Completed assignments count (submissions with a score)
  const [completedResult] = await db
    .select({ count: sql<number>`count(*)` })
    .from(submissions)
    .where(eq(submissions.studentId, studentId))

  const completedAssignments = Number(completedResult.count)

  // Average score
  const [scoreResult] = await db
    .select({
      avgScore: sql<number>`avg(case when ${submissions.totalScore} is not null and ${submissions.maxScore} is not null and ${submissions.maxScore} > 0 then (${submissions.totalScore}::float / ${submissions.maxScore}::float) * 100 else null end)`,
    })
    .from(submissions)
    .where(eq(submissions.studentId, studentId))

  const avgScore = scoreResult.avgScore
    ? Math.round(Number(scoreResult.avgScore))
    : null

  // Tutor sessions count
  const [tutorResult] = await db
    .select({ count: sql<number>`count(*)` })
    .from(tutorSessions)
    .where(eq(tutorSessions.studentId, studentId))

  const tutorSessionCount = Number(tutorResult.count)

  // Mastery records with standard info
  const masteryData = await db
    .select({
      standardCode: standards.code,
      standardDescription: standards.description,
      subject: standards.subject,
      level: masteryRecords.level,
      score: masteryRecords.score,
      assessedAt: masteryRecords.assessedAt,
    })
    .from(masteryRecords)
    .innerJoin(standards, eq(masteryRecords.standardId, standards.id))
    .where(eq(masteryRecords.studentId, studentId))
    .orderBy(desc(masteryRecords.assessedAt))

  // Deduplicate mastery by standard code (keep most recent)
  const seenStandards = new Set<string>()
  const uniqueMastery = masteryData.filter((m) => {
    if (seenStandards.has(m.standardCode)) return false
    seenStandards.add(m.standardCode)
    return true
  })

  // Recent submissions
  const recentSubmissions = await db
    .select({
      id: submissions.id,
      assignmentTitle: assignments.title,
      totalScore: submissions.totalScore,
      maxScore: submissions.maxScore,
      letterGrade: submissions.letterGrade,
      status: submissions.status,
      submittedAt: submissions.submittedAt,
    })
    .from(submissions)
    .innerJoin(assignments, eq(submissions.assignmentId, assignments.id))
    .where(eq(submissions.studentId, studentId))
    .orderBy(desc(submissions.submittedAt))
    .limit(10)

  // IEP data
  const studentIeps = await db
    .select({
      id: ieps.id,
      status: ieps.status,
      disabilityCategory: ieps.disabilityCategory,
      startDate: ieps.startDate,
      endDate: ieps.endDate,
    })
    .from(ieps)
    .where(eq(ieps.studentId, studentId))
    .orderBy(desc(ieps.createdAt))

  // Count goals for each IEP
  interface IepWithGoals {
    id: string
    status: string
    disabilityCategory: string | null
    startDate: Date | null
    endDate: Date | null
    goalCount: number
  }
  const iepsWithGoals: IepWithGoals[] = []

  for (const iep of studentIeps) {
    const [goalResult] = await db
      .select({ count: sql<number>`count(*)` })
      .from(iepGoals)
      .where(eq(iepGoals.iepId, iep.id))

    iepsWithGoals.push({
      ...iep,
      goalCount: Number(goalResult.count),
    })
  }

  const masteryLevelColors: Record<string, string> = {
    advanced: 'bg-emerald-100 text-emerald-700',
    proficient: 'bg-blue-100 text-blue-700',
    developing: 'bg-amber-100 text-amber-700',
    beginning: 'bg-red-100 text-red-700',
  }

  const statusColors: Record<string, string> = {
    submitted: 'bg-blue-100 text-blue-700',
    grading: 'bg-amber-100 text-amber-700',
    graded: 'bg-emerald-100 text-emerald-700',
    returned: 'bg-emerald-100 text-emerald-700',
    draft: 'bg-stone-100 text-stone-600',
  }

  const iepStatusColors: Record<string, string> = {
    draft: 'bg-stone-100 text-stone-600',
    review: 'bg-amber-100 text-amber-700',
    active: 'bg-emerald-100 text-emerald-700',
    archived: 'bg-stone-100 text-stone-500',
  }

  const plural = (n: number, word: string) =>
    `${n} ${n === 1 ? word : word + 's'}`

  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <Link
          href="/dashboard/students"
          className="inline-flex items-center gap-1.5 text-sm text-stone-500 hover:text-stone-700 transition-colors mb-3"
        >
          <ArrowLeft className="size-4" />
          Back to Students
        </Link>
        <div className="flex items-center gap-3">
          <h1 className="font-serif text-2xl font-bold tracking-tight text-stone-900">
            {student.name || 'Unknown Student'}
          </h1>
          {gradeLevel && (
            <Badge className="bg-amber-100 text-amber-700 border-0">
              {formatGradeLevel(gradeLevel)}
            </Badge>
          )}
        </div>
        <div className="flex items-center gap-3 mt-1 text-sm text-stone-500">
          <span>{student.email}</span>
          {schoolName && (
            <>
              <span className="text-stone-300">|</span>
              <span>{schoolName}</span>
            </>
          )}
        </div>
      </div>

      {/* Stat Cards */}
      <div className="grid gap-4 grid-cols-2 md:grid-cols-4">
        <StatCard
          label="Classes Enrolled"
          value={enrollments.length}
          icon={BookOpen}
        />
        <StatCard
          label="Submissions"
          value={completedAssignments}
          icon={FileText}
        />
        <StatCard
          label="Average Score"
          value={avgScore !== null ? `${avgScore}%` : 'N/A'}
          icon={TrendingUp}
        />
        <StatCard
          label="Tutor Sessions"
          value={tutorSessionCount}
          icon={Brain}
        />
      </div>

      {/* Class Enrollment */}
      <div className="rounded-lg border border-stone-200 bg-white p-6">
        <h2 className="font-serif text-lg font-semibold text-stone-900 mb-4">
          Class Enrollment
        </h2>
        {classesWithTeachers.length === 0 ? (
          <p className="text-sm text-stone-500">
            This student is not enrolled in any classes.
          </p>
        ) : (
          <Table>
            <TableHeader>
              <TableRow className="bg-stone-50">
                <TableHead className="text-stone-600">Class</TableHead>
                <TableHead className="text-stone-600">Subject</TableHead>
                <TableHead className="text-stone-600">Grade Level</TableHead>
                <TableHead className="text-stone-600">Period</TableHead>
                <TableHead className="text-stone-600">Teacher</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {classesWithTeachers.map((cls) => (
                <TableRow key={cls.classId}>
                  <TableCell className="font-medium text-stone-900">
                    {cls.className}
                  </TableCell>
                  <TableCell className="text-stone-600">
                    {cls.subject}
                  </TableCell>
                  <TableCell className="text-stone-600">
                    {formatGradeLevel(cls.gradeLevel)}
                  </TableCell>
                  <TableCell className="text-stone-600">
                    {cls.period ? `Period ${cls.period}` : 'N/A'}
                  </TableCell>
                  <TableCell className="text-stone-600">
                    {cls.teacherName || 'N/A'}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </div>

      {/* Mastery Breakdown */}
      <div className="rounded-lg border border-stone-200 bg-white p-6">
        <h2 className="font-serif text-lg font-semibold text-stone-900 mb-4">
          Mastery Breakdown
        </h2>
        {uniqueMastery.length === 0 ? (
          <p className="text-sm text-stone-500">
            No mastery data available for this student.
          </p>
        ) : (
          <Table>
            <TableHeader>
              <TableRow className="bg-stone-50">
                <TableHead className="text-stone-600">Standard</TableHead>
                <TableHead className="text-stone-600">Subject</TableHead>
                <TableHead className="text-stone-600 text-center">
                  Score
                </TableHead>
                <TableHead className="text-stone-600 text-center">
                  Level
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {uniqueMastery.map((m) => (
                <TableRow key={m.standardCode}>
                  <TableCell>
                    <div>
                      <span className="font-medium text-stone-900">
                        {m.standardCode}
                      </span>
                      <p className="text-xs text-stone-500 mt-0.5">
                        {m.standardDescription}
                      </p>
                    </div>
                  </TableCell>
                  <TableCell className="text-stone-600">{m.subject}</TableCell>
                  <TableCell className="text-center font-medium text-stone-900">
                    {Math.round(m.score)}%
                  </TableCell>
                  <TableCell className="text-center">
                    <Badge
                      className={`text-[10px] px-1.5 py-0.5 border-0 capitalize ${masteryLevelColors[m.level] ?? 'bg-stone-100 text-stone-600'}`}
                    >
                      {m.level}
                    </Badge>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </div>

      {/* Recent Submissions */}
      <div className="rounded-lg border border-stone-200 bg-white p-6">
        <h2 className="font-serif text-lg font-semibold text-stone-900 mb-4">
          Recent Submissions
        </h2>
        {recentSubmissions.length === 0 ? (
          <p className="text-sm text-stone-500">
            No submissions found for this student.
          </p>
        ) : (
          <Table>
            <TableHeader>
              <TableRow className="bg-stone-50">
                <TableHead className="text-stone-600">Assignment</TableHead>
                <TableHead className="text-stone-600 text-center">
                  Score
                </TableHead>
                <TableHead className="text-stone-600 text-center">
                  Grade
                </TableHead>
                <TableHead className="text-stone-600 text-center">
                  Status
                </TableHead>
                <TableHead className="text-stone-600">Date</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {recentSubmissions.map((sub) => (
                <TableRow key={sub.id}>
                  <TableCell className="font-medium text-stone-900">
                    {sub.assignmentTitle}
                  </TableCell>
                  <TableCell className="text-center">
                    {sub.totalScore !== null && sub.maxScore !== null ? (
                      <span className="font-medium text-stone-900">
                        {Math.round(
                          (sub.totalScore / sub.maxScore) * 100
                        )}
                        %
                      </span>
                    ) : (
                      <span className="text-stone-400">N/A</span>
                    )}
                  </TableCell>
                  <TableCell className="text-center text-stone-600">
                    {sub.letterGrade || 'N/A'}
                  </TableCell>
                  <TableCell className="text-center">
                    <Badge
                      className={`text-[10px] px-1.5 py-0.5 border-0 capitalize ${statusColors[sub.status] ?? 'bg-stone-100 text-stone-600'}`}
                    >
                      {sub.status}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-stone-600 text-sm">
                    {sub.submittedAt.toLocaleDateString('en-US', {
                      month: 'short',
                      day: 'numeric',
                      year: 'numeric',
                    })}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </div>

      {/* IEP Status */}
      {iepsWithGoals.length > 0 && (
        <div className="rounded-lg border border-stone-200 bg-white p-6">
          <h2 className="font-serif text-lg font-semibold text-stone-900 mb-4">
            IEP Status
          </h2>
          <div className="space-y-4">
            {iepsWithGoals.map((iep) => (
              <div
                key={iep.id}
                className="flex items-center justify-between rounded-lg border border-stone-200 px-4 py-3"
              >
                <div className="flex items-center gap-4">
                  <div className="rounded-full bg-violet-50 p-2">
                    <ClipboardCheck className="size-4 text-violet-600" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <Badge
                        className={`text-[10px] px-1.5 py-0.5 border-0 capitalize ${iepStatusColors[iep.status] ?? 'bg-stone-100 text-stone-600'}`}
                      >
                        {iep.status}
                      </Badge>
                      {iep.disabilityCategory && (
                        <span className="text-sm text-stone-600">
                          {iep.disabilityCategory}
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-stone-500 mt-0.5">
                      {plural(iep.goalCount, 'goal')}
                      {iep.startDate &&
                        ` | Started ${iep.startDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}`}
                      {iep.endDate &&
                        ` | Ends ${iep.endDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}`}
                    </p>
                  </div>
                </div>
                <Link
                  href={`/dashboard/iep/${iep.id}`}
                  className="text-sm text-amber-700 hover:text-amber-800 font-medium transition-colors"
                >
                  View IEP
                </Link>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
