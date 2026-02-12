import { auth } from '@/lib/auth'
import { db } from '@/lib/db'
import {
  classes,
  classMembers,
  classStandards,
  masteryRecords,
  standards,
  users,
} from '@/lib/db/schema'
import { eq, and, inArray, desc } from 'drizzle-orm'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { TrendingUp, BarChart3 } from 'lucide-react'
import { formatGradeLevel } from '@/lib/format'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'

const LEVEL_COLORS: Record<string, string> = {
  advanced: 'bg-blue-100 text-blue-800 border-blue-200',
  proficient: 'bg-emerald-100 text-emerald-800 border-emerald-200',
  developing: 'bg-amber-100 text-amber-800 border-amber-200',
  beginning: 'bg-rose-100 text-rose-800 border-rose-200',
}

const LEVEL_DOT: Record<string, string> = {
  advanced: 'bg-blue-500',
  proficient: 'bg-emerald-500',
  developing: 'bg-amber-500',
  beginning: 'bg-rose-500',
}

export default async function ReportsPage() {
  const session = await auth()
  if (!session?.user) {
    redirect('/login')
  }

  // Fetch classes where the user is a teacher
  const teacherMemberships = await db
    .select({ classId: classMembers.classId })
    .from(classMembers)
    .where(
      and(
        eq(classMembers.userId, session.user.id),
        eq(classMembers.role, 'teacher')
      )
    )

  const classIds = teacherMemberships.map((m) => m.classId)

  let teacherClasses: {
    id: string
    name: string
    subject: string
    gradeLevel: string
    period: string | null
  }[] = []

  if (classIds.length > 0) {
    teacherClasses = await db
      .select({
        id: classes.id,
        name: classes.name,
        subject: classes.subject,
        gradeLevel: classes.gradeLevel,
        period: classes.period,
      })
      .from(classes)
      .where(inArray(classes.id, classIds))
  }

  // For each class, get a summary of mastery levels
  const classSummaries = await Promise.all(
    teacherClasses.map(async (cls) => {
      // Get student IDs in this class
      const studentMembers = await db
        .select({ userId: classMembers.userId })
        .from(classMembers)
        .where(
          and(
            eq(classMembers.classId, cls.id),
            eq(classMembers.role, 'student')
          )
        )

      const studentIds = studentMembers.map((m) => m.userId)
      const studentCount = studentIds.length

      if (studentCount === 0) {
        return { ...cls, studentCount, masteryOverview: null }
      }

      // Get all mastery records for these students
      const records = await db
        .select()
        .from(masteryRecords)
        .where(inArray(masteryRecords.studentId, studentIds))
        .orderBy(desc(masteryRecords.assessedAt))

      // Get latest per (student, standard)
      const latestByKey = new Map<string, typeof records[number]>()
      for (const record of records) {
        const key = `${record.studentId}:${record.standardId}`
        if (!latestByKey.has(key)) {
          latestByKey.set(key, record)
        }
      }

      const latestRecords = [...latestByKey.values()]

      // Count by level
      const counts = { beginning: 0, developing: 0, proficient: 0, advanced: 0 }
      for (const r of latestRecords) {
        if (r.level in counts) {
          counts[r.level as keyof typeof counts]++
        }
      }

      const total = latestRecords.length
      const avgScore =
        total > 0
          ? Math.round(
              latestRecords.reduce((sum, r) => sum + r.score, 0) / total
            )
          : 0

      return {
        ...cls,
        studentCount,
        masteryOverview: {
          totalRecords: total,
          counts,
          avgScore,
        },
      }
    })
  )

  return (
    <div className="space-y-8">
      {/* Page header */}
      <div>
        <h1 className="font-serif text-2xl font-bold tracking-tight text-stone-900">
          Reports & Analytics
        </h1>
        <p className="text-stone-500">
          Track student mastery across standards and identify learning gaps.
        </p>
      </div>

      {/* Legend */}
      <div className="flex items-center gap-4 text-xs text-stone-600">
        <span className="font-medium">Mastery Levels:</span>
        <span className="flex items-center gap-1">
          <span className="inline-block size-2.5 rounded-full bg-rose-500" />
          Beginning
        </span>
        <span className="flex items-center gap-1">
          <span className="inline-block size-2.5 rounded-full bg-amber-500" />
          Developing
        </span>
        <span className="flex items-center gap-1">
          <span className="inline-block size-2.5 rounded-full bg-emerald-500" />
          Proficient
        </span>
        <span className="flex items-center gap-1">
          <span className="inline-block size-2.5 rounded-full bg-blue-500" />
          Advanced
        </span>
      </div>

      {/* Class cards */}
      {classSummaries.length === 0 ? (
        <Card className="border-dashed">
          <CardContent className="flex flex-col items-center justify-center py-16 text-center">
            <div className="rounded-full bg-stone-100 p-4 mb-4">
              <BarChart3 className="size-8 text-stone-400" />
            </div>
            <h2 className="text-lg font-semibold mb-1 text-stone-900">
              No classes yet
            </h2>
            <p className="text-sm text-stone-500 max-w-md">
              Once you have classes with graded assignments, mastery data will
              appear here.
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {classSummaries.map((cls) => (
            <Link key={cls.id} href={`/dashboard/reports/${cls.id}`}>
              <Card className="h-full hover:bg-stone-50 transition-colors cursor-pointer border-stone-200">
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between gap-2">
                    <CardTitle className="text-base leading-tight text-stone-900">
                      {cls.name}
                    </CardTitle>
                    {cls.period && (
                      <Badge
                        variant="outline"
                        className="shrink-0 text-xs border-stone-300 text-stone-600"
                      >
                        Period {cls.period}
                      </Badge>
                    )}
                  </div>
                  <CardDescription className="text-xs text-stone-500">
                    {cls.subject} | {formatGradeLevel(cls.gradeLevel)} |{' '}
                    {cls.studentCount} students
                  </CardDescription>
                </CardHeader>
                <CardContent className="pt-0">
                  {cls.masteryOverview && cls.masteryOverview.totalRecords > 0 ? (
                    <div className="space-y-3">
                      {/* Traffic light bar */}
                      <div className="flex h-3 rounded-full overflow-hidden bg-stone-100">
                        {cls.masteryOverview.counts.beginning > 0 && (
                          <div
                            className="bg-rose-400"
                            style={{
                              width: `${(cls.masteryOverview.counts.beginning / cls.masteryOverview.totalRecords) * 100}%`,
                            }}
                          />
                        )}
                        {cls.masteryOverview.counts.developing > 0 && (
                          <div
                            className="bg-amber-400"
                            style={{
                              width: `${(cls.masteryOverview.counts.developing / cls.masteryOverview.totalRecords) * 100}%`,
                            }}
                          />
                        )}
                        {cls.masteryOverview.counts.proficient > 0 && (
                          <div
                            className="bg-emerald-400"
                            style={{
                              width: `${(cls.masteryOverview.counts.proficient / cls.masteryOverview.totalRecords) * 100}%`,
                            }}
                          />
                        )}
                        {cls.masteryOverview.counts.advanced > 0 && (
                          <div
                            className="bg-blue-400"
                            style={{
                              width: `${(cls.masteryOverview.counts.advanced / cls.masteryOverview.totalRecords) * 100}%`,
                            }}
                          />
                        )}
                      </div>

                      {/* Summary stats */}
                      <div className="flex items-center justify-between text-xs text-stone-500">
                        <span>
                          Avg Score:{' '}
                          <span className="font-medium text-stone-700">
                            {cls.masteryOverview.avgScore}%
                          </span>
                        </span>
                        <span className="flex items-center gap-1">
                          <TrendingUp className="size-3" />
                          {cls.masteryOverview.totalRecords} data points
                        </span>
                      </div>
                    </div>
                  ) : (
                    <p className="text-xs text-stone-400 italic">
                      No mastery data yet
                    </p>
                  )}
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      )}
    </div>
  )
}
