import { redirect, notFound } from 'next/navigation'
import Link from 'next/link'
import { auth } from '@/lib/auth'
import { db } from '@/lib/db'
import {
  schools,
  classes,
  classMembers,
  users,
  assignments,
  submissions,
  masteryRecords,
} from '@/lib/db/schema'
import { eq, and, sql, inArray, desc } from 'drizzle-orm'
import { formatGradeLevel } from '@/lib/format'
import {
  ArrowLeft,
  Users,
  GraduationCap,
  BookOpen,
  TrendingUp,
  FileText,
  Trophy,
} from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
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
  params: Promise<{ schoolId: string }>
}

export default async function SchoolDetailPage({ params }: PageProps) {
  const { schoolId } = await params

  const session = await auth()
  if (!session?.user) {
    redirect('/login')
  }

  if (session.user.role !== 'admin' && session.user.role !== 'district_admin') {
    redirect('/dashboard')
  }

  // Fetch school
  const [school] = await db
    .select({ id: schools.id, name: schools.name, address: schools.address })
    .from(schools)
    .where(eq(schools.id, schoolId))

  if (!school) {
    notFound()
  }

  // Fetch all classes for this school
  const schoolClasses = await db
    .select({
      id: classes.id,
      name: classes.name,
      subject: classes.subject,
      gradeLevel: classes.gradeLevel,
      period: classes.period,
    })
    .from(classes)
    .where(eq(classes.schoolId, schoolId))

  const classIds = schoolClasses.map((c) => c.id)

  // Stat card data
  let teacherCount = 0
  let studentCount = 0
  let avgScore: number | null = null

  if (classIds.length > 0) {
    const [teachers] = await db
      .select({ count: sql<number>`count(distinct ${classMembers.userId})` })
      .from(classMembers)
      .where(
        and(
          inArray(classMembers.classId, classIds),
          eq(classMembers.role, 'teacher')
        )
      )
    teacherCount = Number(teachers.count)

    const [students] = await db
      .select({ count: sql<number>`count(distinct ${classMembers.userId})` })
      .from(classMembers)
      .where(
        and(
          inArray(classMembers.classId, classIds),
          eq(classMembers.role, 'student')
        )
      )
    studentCount = Number(students.count)

    const [scoreResult] = await db
      .select({
        avgScore: sql<number>`avg(case when ${submissions.totalScore} is not null and ${submissions.maxScore} is not null and ${submissions.maxScore} > 0 then (${submissions.totalScore}::float / ${submissions.maxScore}::float) * 100 else null end)`,
      })
      .from(submissions)
      .innerJoin(assignments, eq(submissions.assignmentId, assignments.id))
      .where(inArray(assignments.classId, classIds))
    avgScore = scoreResult.avgScore
      ? Math.round(Number(scoreResult.avgScore) * 100) / 100
      : null
  }

  // Teachers section: unique teachers with class + assignment counts
  interface TeacherInfo {
    id: string
    name: string | null
    classCount: number
    assignmentCount: number
  }
  const teacherMap = new Map<string, TeacherInfo>()

  if (classIds.length > 0) {
    const teacherMembers = await db
      .select({
        userId: classMembers.userId,
        userName: users.name,
        classId: classMembers.classId,
      })
      .from(classMembers)
      .innerJoin(users, eq(classMembers.userId, users.id))
      .where(
        and(
          inArray(classMembers.classId, classIds),
          eq(classMembers.role, 'teacher')
        )
      )

    for (const tm of teacherMembers) {
      const existing = teacherMap.get(tm.userId)
      if (existing) {
        existing.classCount++
      } else {
        teacherMap.set(tm.userId, {
          id: tm.userId,
          name: tm.userName,
          classCount: 1,
          assignmentCount: 0,
        })
      }
    }

    // Assignment counts per teacher
    if (teacherMap.size > 0) {
      const teacherAssignments = await db
        .select({
          teacherId: assignments.teacherId,
          count: sql<number>`count(*)`,
        })
        .from(assignments)
        .where(
          and(
            inArray(assignments.classId, classIds),
            inArray(assignments.teacherId, [...teacherMap.keys()])
          )
        )
        .groupBy(assignments.teacherId)

      for (const ta of teacherAssignments) {
        const teacher = teacherMap.get(ta.teacherId)
        if (teacher) {
          teacher.assignmentCount = Number(ta.count)
        }
      }
    }
  }
  const teacherList = [...teacherMap.values()]

  // Classes section: each class with student count, assignment count, avg score
  interface ClassInfo {
    id: string
    name: string
    subject: string
    gradeLevel: string
    period: string | null
    studentCount: number
    assignmentCount: number
    avgScore: number | null
  }
  const classInfoList: ClassInfo[] = []

  for (const cls of schoolClasses) {
    const [studentResult] = await db
      .select({ count: sql<number>`count(*)` })
      .from(classMembers)
      .where(
        and(eq(classMembers.classId, cls.id), eq(classMembers.role, 'student'))
      )

    const [assignmentResult] = await db
      .select({ count: sql<number>`count(*)` })
      .from(assignments)
      .where(eq(assignments.classId, cls.id))

    const [classScoreResult] = await db
      .select({
        avgScore: sql<number>`avg(case when ${submissions.totalScore} is not null and ${submissions.maxScore} is not null and ${submissions.maxScore} > 0 then (${submissions.totalScore}::float / ${submissions.maxScore}::float) * 100 else null end)`,
      })
      .from(submissions)
      .innerJoin(assignments, eq(submissions.assignmentId, assignments.id))
      .where(eq(assignments.classId, cls.id))

    classInfoList.push({
      id: cls.id,
      name: cls.name,
      subject: cls.subject,
      gradeLevel: cls.gradeLevel,
      period: cls.period,
      studentCount: Number(studentResult.count),
      assignmentCount: Number(assignmentResult.count),
      avgScore: classScoreResult.avgScore
        ? Math.round(Number(classScoreResult.avgScore))
        : null,
    })
  }

  // Performance summary: top subjects by avg score
  interface SubjectPerformance {
    subject: string
    avgScore: number
  }
  const subjectPerformanceList: SubjectPerformance[] = []

  if (classIds.length > 0) {
    const subjectScores = await db
      .select({
        subject: assignments.subject,
        avgScore: sql<number>`avg(case when ${submissions.totalScore} is not null and ${submissions.maxScore} is not null and ${submissions.maxScore} > 0 then (${submissions.totalScore}::float / ${submissions.maxScore}::float) * 100 else null end)`,
      })
      .from(submissions)
      .innerJoin(assignments, eq(submissions.assignmentId, assignments.id))
      .where(inArray(assignments.classId, classIds))
      .groupBy(assignments.subject)

    for (const ss of subjectScores) {
      if (ss.avgScore !== null) {
        subjectPerformanceList.push({
          subject: ss.subject,
          avgScore: Math.round(Number(ss.avgScore)),
        })
      }
    }
    subjectPerformanceList.sort((a, b) => b.avgScore - a.avgScore)
  }
  const topSubjects = subjectPerformanceList.slice(0, 3)

  // Mastery distribution for students at this school
  interface MasteryDist {
    advanced: number
    proficient: number
    developing: number
    beginning: number
  }
  const masteryDist: MasteryDist = {
    advanced: 0,
    proficient: 0,
    developing: 0,
    beginning: 0,
  }

  if (classIds.length > 0) {
    // Get student IDs at this school
    const schoolStudents = await db
      .select({ userId: classMembers.userId })
      .from(classMembers)
      .where(
        and(
          inArray(classMembers.classId, classIds),
          eq(classMembers.role, 'student')
        )
      )
    const studentIds = [...new Set(schoolStudents.map((s) => s.userId))]

    if (studentIds.length > 0) {
      const masteryLevels = await db
        .select({
          level: masteryRecords.level,
          count: sql<number>`count(*)`,
        })
        .from(masteryRecords)
        .where(inArray(masteryRecords.studentId, studentIds))
        .groupBy(masteryRecords.level)

      for (const ml of masteryLevels) {
        const key = ml.level as keyof MasteryDist
        if (key in masteryDist) {
          masteryDist[key] = Number(ml.count)
        }
      }
    }
  }

  const masteryTotal =
    masteryDist.advanced +
    masteryDist.proficient +
    masteryDist.developing +
    masteryDist.beginning

  const plural = (n: number, word: string, pluralForm?: string) =>
    `${n} ${n === 1 ? word : (pluralForm ?? word + 's')}`

  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <Link
          href="/dashboard/schools"
          className="inline-flex items-center gap-1.5 text-sm text-stone-500 hover:text-stone-700 transition-colors mb-3"
        >
          <ArrowLeft className="size-4" />
          Back to Schools
        </Link>
        <h1 className="font-serif text-2xl font-bold tracking-tight text-stone-900">
          {school.name}
        </h1>
        {school.address && (
          <p className="text-stone-500 text-sm mt-1">{school.address}</p>
        )}
      </div>

      {/* Stat Cards */}
      <div className="grid gap-4 grid-cols-2 md:grid-cols-4">
        <StatCard
          label="Teachers"
          value={teacherCount}
          icon={Users}
        />
        <StatCard
          label="Students"
          value={studentCount}
          icon={GraduationCap}
        />
        <StatCard
          label="Classes"
          value={classIds.length}
          icon={BookOpen}
        />
        <StatCard
          label="Average Score"
          value={avgScore !== null ? `${Math.round(avgScore)}%` : 'N/A'}
          icon={TrendingUp}
        />
      </div>

      {/* Teachers Section */}
      <Card>
        <CardHeader>
          <CardTitle className="font-serif text-lg text-stone-900">
            Teachers
          </CardTitle>
        </CardHeader>
        <CardContent>
          {teacherList.length === 0 ? (
            <p className="text-sm text-stone-500">
              No teachers assigned to this school yet.
            </p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow className="bg-stone-50">
                  <TableHead className="text-stone-600">Name</TableHead>
                  <TableHead className="text-stone-600 text-center">
                    Classes
                  </TableHead>
                  <TableHead className="text-stone-600 text-center">
                    Assignments
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {teacherList.map((teacher) => (
                  <TableRow key={teacher.id}>
                    <TableCell className="font-medium text-stone-900">
                      {teacher.name || 'Unknown'}
                    </TableCell>
                    <TableCell className="text-center text-stone-600">
                      {teacher.classCount}
                    </TableCell>
                    <TableCell className="text-center text-stone-600">
                      {teacher.assignmentCount}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Classes Section */}
      <Card>
        <CardHeader>
          <CardTitle className="font-serif text-lg text-stone-900">
            Classes
          </CardTitle>
        </CardHeader>
        <CardContent>
          {classInfoList.length === 0 ? (
            <p className="text-sm text-stone-500">
              No classes at this school yet.
            </p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow className="bg-stone-50">
                  <TableHead className="text-stone-600">Class</TableHead>
                  <TableHead className="text-stone-600">Subject</TableHead>
                  <TableHead className="text-stone-600 text-center">
                    Students
                  </TableHead>
                  <TableHead className="text-stone-600 text-center">
                    Assignments
                  </TableHead>
                  <TableHead className="text-stone-600 text-center">
                    Avg Score
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {classInfoList.map((cls) => (
                  <TableRow key={cls.id}>
                    <TableCell>
                      <Link
                        href={`/dashboard/classes/${cls.id}`}
                        className="font-medium text-stone-900 hover:text-amber-700 transition-colors"
                      >
                        {cls.name}
                      </Link>
                      <div className="flex items-center gap-1.5 mt-0.5">
                        <Badge className="text-[10px] px-1.5 py-0 bg-stone-100 text-stone-600 border-0">
                          {formatGradeLevel(cls.gradeLevel)}
                        </Badge>
                        {cls.period && (
                          <Badge className="text-[10px] px-1.5 py-0 bg-stone-100 text-stone-600 border-0">
                            Period {cls.period}
                          </Badge>
                        )}
                      </div>
                    </TableCell>
                    <TableCell className="text-stone-600">
                      {cls.subject}
                    </TableCell>
                    <TableCell className="text-center text-stone-600">
                      {cls.studentCount}
                    </TableCell>
                    <TableCell className="text-center text-stone-600">
                      {cls.assignmentCount}
                    </TableCell>
                    <TableCell className="text-center">
                      {cls.avgScore !== null ? (
                        <Badge className="text-[10px] px-1.5 py-0.5 bg-emerald-100 text-emerald-700 border-0">
                          {cls.avgScore}%
                        </Badge>
                      ) : (
                        <span className="text-stone-400">N/A</span>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Performance Summary */}
      <div className="grid gap-4 md:grid-cols-2">
        {/* Top Subjects */}
        <Card>
          <CardHeader>
            <CardTitle className="font-serif text-lg text-stone-900">
              Top Subjects by Score
            </CardTitle>
          </CardHeader>
          <CardContent>
            {topSubjects.length === 0 ? (
              <p className="text-sm text-stone-500">
                No graded submissions yet.
              </p>
            ) : (
              <div className="space-y-3">
                {topSubjects.map((subject, index) => (
                  <div
                    key={subject.subject}
                    className="flex items-center justify-between rounded-lg border border-stone-200 px-4 py-3"
                  >
                    <div className="flex items-center gap-3">
                      <div className="flex items-center justify-center size-7 rounded-full bg-amber-50 text-amber-700 text-xs font-bold">
                        {index + 1}
                      </div>
                      <span className="font-medium text-stone-900">
                        {subject.subject}
                      </span>
                    </div>
                    <Badge className="text-xs px-2 py-0.5 bg-emerald-100 text-emerald-700 border-0">
                      {subject.avgScore}%
                    </Badge>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Mastery Distribution */}
        <Card>
          <CardHeader>
            <CardTitle className="font-serif text-lg text-stone-900">
              Mastery Distribution
            </CardTitle>
          </CardHeader>
          <CardContent>
            {masteryTotal === 0 ? (
              <p className="text-sm text-stone-500">
                No mastery data available.
              </p>
            ) : (
              <div className="space-y-3">
                {(
                  [
                    { key: 'advanced', label: 'Advanced', color: 'bg-emerald-100 text-emerald-700' },
                    { key: 'proficient', label: 'Proficient', color: 'bg-blue-100 text-blue-700' },
                    { key: 'developing', label: 'Developing', color: 'bg-amber-100 text-amber-700' },
                    { key: 'beginning', label: 'Beginning', color: 'bg-red-100 text-red-700' },
                  ] as const
                ).map(({ key, label, color }) => (
                  <div
                    key={key}
                    className="flex items-center justify-between rounded-lg border border-stone-200 px-4 py-3"
                  >
                    <Badge className={`text-xs px-2 py-0.5 border-0 ${color}`}>
                      {label}
                    </Badge>
                    <div className="flex items-center gap-2">
                      <span className="text-lg font-bold text-stone-900">
                        {masteryDist[key]}
                      </span>
                      <span className="text-xs text-stone-500">records</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
