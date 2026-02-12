import { redirect } from 'next/navigation'
import Link from 'next/link'
import { auth } from '@/lib/auth'
import { db } from '@/lib/db'
import {
  classes,
  classMembers,
  reportCards,
  users,
} from '@/lib/db/schema'
import { eq, and, inArray, desc, sql } from 'drizzle-orm'
import { FileText, Users, CheckCircle2, Clock } from 'lucide-react'
import { formatGradeLevel } from '@/lib/format'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { BatchGenerateDialog } from '@/components/report-cards/batch-generate-dialog'

export default async function ReportCardsPage() {
  const session = await auth()
  if (!session?.user) {
    redirect('/login')
  }

  if (session.user.role !== 'teacher' && session.user.role !== 'sped_teacher') {
    redirect('/dashboard')
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

  if (classIds.length === 0) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="font-serif text-2xl font-bold tracking-tight text-stone-900">
            Report Cards
          </h1>
          <p className="text-stone-500 text-sm mt-1">
            Generate AI-powered narrative report cards for your students.
          </p>
        </div>
        <div className="flex flex-col items-center justify-center py-16 text-center">
          <div className="rounded-full bg-amber-50 p-6 mb-4">
            <FileText className="size-10 text-amber-400" />
          </div>
          <h3 className="text-lg font-semibold text-stone-800 mb-1">No classes found</h3>
          <p className="text-sm text-stone-500 max-w-md">
            You need to be assigned to classes before generating report cards.
          </p>
        </div>
      </div>
    )
  }

  // Fetch class details
  const teacherClasses = await db
    .select({
      id: classes.id,
      name: classes.name,
      subject: classes.subject,
      gradeLevel: classes.gradeLevel,
      period: classes.period,
    })
    .from(classes)
    .where(inArray(classes.id, classIds))

  // Get student count per class
  const studentCounts = await db
    .select({
      classId: classMembers.classId,
      count: sql<number>`count(*)`.as('student_count'),
    })
    .from(classMembers)
    .where(
      and(
        inArray(classMembers.classId, classIds),
        eq(classMembers.role, 'student')
      )
    )
    .groupBy(classMembers.classId)

  const studentCountMap = new Map(studentCounts.map((s) => [s.classId, s.count]))

  // Get report card stats per class
  const rcStats = await db
    .select({
      classId: reportCards.classId,
      totalCount: sql<number>`count(*)`.as('total_count'),
      draftCount: sql<number>`count(*) filter (where ${reportCards.status} = 'draft')`.as('draft_count'),
      approvedCount: sql<number>`count(*) filter (where ${reportCards.status} = 'approved')`.as('approved_count'),
    })
    .from(reportCards)
    .where(inArray(reportCards.classId, classIds))
    .groupBy(reportCards.classId)

  const rcStatsMap = new Map(rcStats.map((s) => [s.classId, s]))

  // Get recent report cards across all classes
  const recentCards = await db
    .select({
      id: reportCards.id,
      studentId: reportCards.studentId,
      studentName: users.name,
      classId: reportCards.classId,
      className: classes.name,
      gradingPeriod: reportCards.gradingPeriod,
      gradeRecommendation: reportCards.gradeRecommendation,
      status: reportCards.status,
      generatedAt: reportCards.generatedAt,
    })
    .from(reportCards)
    .innerJoin(users, eq(reportCards.studentId, users.id))
    .innerJoin(classes, eq(reportCards.classId, classes.id))
    .where(inArray(reportCards.classId, classIds))
    .orderBy(desc(reportCards.generatedAt))
    .limit(20)

  return (
    <div className="space-y-8">
      <div>
        <h1 className="font-serif text-2xl font-bold tracking-tight text-stone-900">
          Report Cards
        </h1>
        <p className="text-stone-500 text-sm mt-1">
          Generate AI-powered narrative report cards for your students based on their longitudinal performance data.
        </p>
      </div>

      {/* Class cards for generating report cards */}
      <div>
        <h2 className="text-sm font-semibold text-stone-700 uppercase tracking-wide mb-3">
          Your Classes
        </h2>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {teacherClasses.map((cls) => {
            const students = studentCountMap.get(cls.id) ?? 0
            const stats = rcStatsMap.get(cls.id)
            const total = stats?.totalCount ?? 0
            const drafts = stats?.draftCount ?? 0
            const approved = stats?.approvedCount ?? 0

            return (
              <Link key={cls.id} href={`/dashboard/report-cards?classId=${cls.id}`}>
                <Card className="h-full hover:bg-stone-50 transition-colors cursor-pointer border-stone-200 group">
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
                      {cls.subject} | {formatGradeLevel(cls.gradeLevel)} | {students} students
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="pt-0 space-y-3">
                    <div className="flex items-center justify-between text-xs text-stone-500">
                      <span className="flex items-center gap-1">
                        <Users className="size-3" />
                        {total} report cards
                      </span>
                      <div className="flex items-center gap-2">
                        {drafts > 0 && (
                          <span className="flex items-center gap-1">
                            <Clock className="size-3 text-amber-500" />
                            {drafts} drafts
                          </span>
                        )}
                        {approved > 0 && (
                          <span className="flex items-center gap-1">
                            <CheckCircle2 className="size-3 text-emerald-500" />
                            {approved} approved
                          </span>
                        )}
                      </div>
                    </div>
                    <BatchGenerateDialog
                      classId={cls.id}
                      className={cls.name}
                      studentCount={students}
                    />
                  </CardContent>
                </Card>
              </Link>
            )
          })}
        </div>
      </div>

      {/* Recent report cards table */}
      {recentCards.length > 0 && (
        <div>
          <h2 className="text-sm font-semibold text-stone-700 uppercase tracking-wide mb-3">
            Recent Report Cards
          </h2>
          <div className="rounded-lg border border-stone-200 overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-stone-50 border-b border-stone-200">
                  <th className="text-left px-4 py-2.5 font-medium text-stone-600">Student</th>
                  <th className="text-left px-4 py-2.5 font-medium text-stone-600">Class</th>
                  <th className="text-left px-4 py-2.5 font-medium text-stone-600">Period</th>
                  <th className="text-left px-4 py-2.5 font-medium text-stone-600">Grade</th>
                  <th className="text-left px-4 py-2.5 font-medium text-stone-600">Status</th>
                  <th className="text-left px-4 py-2.5 font-medium text-stone-600">Generated</th>
                </tr>
              </thead>
              <tbody>
                {recentCards.map((card) => (
                  <tr
                    key={card.id}
                    className="border-b border-stone-100 last:border-0 hover:bg-stone-50/50"
                  >
                    <td className="px-4 py-2.5">
                      <Link
                        href={`/dashboard/report-cards/${card.id}`}
                        className="text-amber-700 hover:text-amber-800 font-medium hover:underline"
                      >
                        {card.studentName}
                      </Link>
                    </td>
                    <td className="px-4 py-2.5 text-stone-600">{card.className}</td>
                    <td className="px-4 py-2.5 text-stone-600">{card.gradingPeriod}</td>
                    <td className="px-4 py-2.5">
                      <span className="font-semibold text-stone-800">
                        {card.gradeRecommendation ?? '-'}
                      </span>
                    </td>
                    <td className="px-4 py-2.5">
                      {card.status === 'approved' ? (
                        <Badge className="text-[10px] px-1.5 py-0.5 bg-emerald-100 text-emerald-700 border-0">
                          Approved
                        </Badge>
                      ) : (
                        <Badge className="text-[10px] px-1.5 py-0.5 bg-amber-100 text-amber-700 border-0">
                          Draft
                        </Badge>
                      )}
                    </td>
                    <td className="px-4 py-2.5 text-stone-500 text-xs">
                      {card.generatedAt.toLocaleDateString()}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  )
}
