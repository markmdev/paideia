import { redirect } from 'next/navigation'
import { auth } from '@/lib/auth'
import { db } from '@/lib/db'
import {
  parentChildren,
  users,
  masteryRecords,
  standards,
  submissions,
  assignments,
} from '@/lib/db/schema'
import { eq, desc, and, inArray, avg } from 'drizzle-orm'
import { TrendingUp, BarChart3, BookOpen } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'

export default async function ProgressPage() {
  const session = await auth()
  if (!session?.user) {
    redirect('/login')
  }

  const role = session.user.role
  if (!['student', 'parent'].includes(role)) {
    redirect('/dashboard')
  }

  // Determine which student IDs to show
  let studentIds: string[] = []
  let studentNames: Record<string, string> = {}

  if (role === 'student') {
    studentIds = [session.user.id]
    studentNames[session.user.id] = session.user.name ?? 'You'
  } else if (role === 'parent') {
    const children = await db
      .select({
        childId: parentChildren.childId,
        childName: users.name,
      })
      .from(parentChildren)
      .innerJoin(users, eq(parentChildren.childId, users.id))
      .where(eq(parentChildren.parentId, session.user.id))

    studentIds = children.map((c) => c.childId)
    studentNames = Object.fromEntries(
      children.map((c) => [c.childId, c.childName ?? 'Student'])
    )
  }

  if (studentIds.length === 0) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-serif font-bold tracking-tight">
            Progress
          </h1>
          <p className="text-muted-foreground text-sm">
            {role === 'parent'
              ? 'No children linked to your account yet.'
              : 'No progress data available yet.'}
          </p>
        </div>
      </div>
    )
  }

  // Get mastery data grouped by student and subject
  const masteryData = await db
    .select({
      studentId: masteryRecords.studentId,
      subject: standards.subject,
      standardDescription: standards.description,
      level: masteryRecords.level,
      score: masteryRecords.score,
      assessedAt: masteryRecords.assessedAt,
      standardId: masteryRecords.standardId,
    })
    .from(masteryRecords)
    .innerJoin(standards, eq(masteryRecords.standardId, standards.id))
    .where(inArray(masteryRecords.studentId, studentIds))
    .orderBy(desc(masteryRecords.assessedAt))

  // Get subject averages
  const subjectAverages = await db
    .select({
      studentId: masteryRecords.studentId,
      subject: standards.subject,
      avgScore: avg(masteryRecords.score),
    })
    .from(masteryRecords)
    .innerJoin(standards, eq(masteryRecords.standardId, standards.id))
    .where(inArray(masteryRecords.studentId, studentIds))
    .groupBy(masteryRecords.studentId, standards.subject)

  // Deduplicate mastery by student + standard (keep latest)
  const uniqueMastery: Record<
    string,
    Record<
      string,
      { description: string; level: string; score: number }[]
    >
  > = {}

  for (const sid of studentIds) {
    uniqueMastery[sid] = {}
    const studentData = masteryData.filter((m) => m.studentId === sid)
    const seen = new Set<string>()
    for (const m of studentData) {
      if (seen.has(m.standardId)) continue
      seen.add(m.standardId)
      if (!uniqueMastery[sid][m.subject]) uniqueMastery[sid][m.subject] = []
      uniqueMastery[sid][m.subject].push({
        description: m.standardDescription,
        level: m.level,
        score: m.score,
      })
    }
  }

  // Get recent assignment stats
  const recentStats = await db
    .select({
      studentId: submissions.studentId,
      subject: assignments.subject,
      totalScore: submissions.totalScore,
      maxScore: submissions.maxScore,
    })
    .from(submissions)
    .innerJoin(assignments, eq(submissions.assignmentId, assignments.id))
    .where(
      and(
        inArray(submissions.studentId, studentIds),
        eq(submissions.status, 'graded')
      )
    )
    .orderBy(desc(submissions.gradedAt))
    .limit(50)

  const levelConfig: Record<string, { color: string; bg: string }> = {
    proficient: { color: 'text-emerald-700', bg: 'bg-emerald-100' },
    advanced: { color: 'text-emerald-700', bg: 'bg-emerald-100' },
    developing: { color: 'text-amber-700', bg: 'bg-amber-100' },
    beginning: { color: 'text-rose-700', bg: 'bg-rose-100' },
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-serif font-bold tracking-tight">
          Progress
        </h1>
        <p className="text-muted-foreground text-sm">
          {role === 'parent'
            ? "Track your children's mastery across subjects."
            : 'Track your mastery across subjects.'}
        </p>
      </div>

      {studentIds.map((sid) => {
        const studentMastery = uniqueMastery[sid] ?? {}
        const studentAvgs = subjectAverages.filter((a) => a.studentId === sid)
        const studentSubs = recentStats.filter((s) => s.studentId === sid)
        const showName = role === 'parent' && studentIds.length > 1

        return (
          <div key={sid} className="space-y-4">
            {showName && (
              <h2 className="text-lg font-serif font-semibold">
                {studentNames[sid]}
              </h2>
            )}

            {/* Subject summary cards */}
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {studentAvgs.map((avg) => {
                const score = avg.avgScore ? Math.round(Number(avg.avgScore)) : 0
                let statusColor = 'bg-emerald-100 text-emerald-700'
                if (score < 60) statusColor = 'bg-rose-100 text-rose-700'
                else if (score < 75) statusColor = 'bg-amber-100 text-amber-700'

                return (
                  <Card key={avg.subject}>
                    <CardHeader className="flex flex-row items-center justify-between pb-2">
                      <CardTitle className="text-sm font-medium">
                        {avg.subject}
                      </CardTitle>
                      <BookOpen className="size-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                      <div className="flex items-center gap-2">
                        <div className="text-2xl font-bold">{score}%</div>
                        <Badge
                          className={`text-[10px] px-1.5 py-0 ${statusColor} border-0`}
                        >
                          {score >= 75
                            ? 'On Track'
                            : score >= 60
                              ? 'Developing'
                              : 'Needs Help'}
                        </Badge>
                      </div>
                      <p className="text-xs text-muted-foreground mt-1">
                        Average mastery score
                      </p>
                    </CardContent>
                  </Card>
                )
              })}
            </div>

            {/* Detailed mastery by subject */}
            {Object.entries(studentMastery).map(([subject, items]) => (
              <Card key={subject}>
                <CardHeader className="pb-3">
                  <div className="flex items-center gap-2">
                    <BarChart3 className="size-4 text-stone-500" />
                    <CardTitle className="text-sm font-serif">
                      {subject} Skills
                    </CardTitle>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    {items.map((item, i) => {
                      const lc =
                        levelConfig[item.level] ?? levelConfig.developing
                      const widthPct = Math.max(5, Math.min(100, item.score))
                      let barColor = 'bg-emerald-400'
                      if (item.score < 60) barColor = 'bg-rose-400'
                      else if (item.score < 75) barColor = 'bg-amber-400'

                      return (
                        <div key={i} className="space-y-1">
                          <div className="flex items-center justify-between gap-2">
                            <span className="text-xs text-stone-600 flex-1">
                              {item.description}
                            </span>
                            <Badge
                              className={`text-[10px] px-1.5 py-0 ${lc.bg} ${lc.color} border-0 capitalize shrink-0`}
                            >
                              {item.level}
                            </Badge>
                          </div>
                          <div className="h-1.5 rounded-full bg-stone-100 overflow-hidden">
                            <div
                              className={`h-full rounded-full ${barColor} transition-all`}
                              style={{ width: `${widthPct}%` }}
                            />
                          </div>
                        </div>
                      )
                    })}
                  </div>
                </CardContent>
              </Card>
            ))}

            {Object.keys(studentMastery).length === 0 && (
              <Card className="bg-stone-50 border-stone-200">
                <CardContent className="py-8 text-center">
                  <TrendingUp className="size-8 text-stone-300 mx-auto mb-2" />
                  <h3 className="text-sm font-medium mb-1">
                    No mastery data yet
                  </h3>
                  <p className="text-xs text-muted-foreground">
                    As assignments are graded, mastery data will appear here to
                    show progress on each skill.
                  </p>
                </CardContent>
              </Card>
            )}
          </div>
        )
      })}
    </div>
  )
}
