import { auth } from '@/lib/auth'
import { db } from '@/lib/db'
import { masteryRecords, standards, submissions, assignments } from '@/lib/db/schema'
import { eq, and, desc, avg, count } from 'drizzle-orm'
import { NextResponse } from 'next/server'

export async function GET() {
  const session = await auth()
  if (!session?.user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  if (session.user.role !== 'student') {
    return NextResponse.json({ error: 'Forbidden: student role required' }, { status: 403 })
  }

  const studentId = session.user.id

  // Fetch mastery records with standards info, ordered by assessed date
  const masteryData = await db
    .select({
      subject: standards.subject,
      level: masteryRecords.level,
      score: masteryRecords.score,
      assessedAt: masteryRecords.assessedAt,
      standardId: masteryRecords.standardId,
      standardDescription: standards.description,
    })
    .from(masteryRecords)
    .innerJoin(standards, eq(masteryRecords.standardId, standards.id))
    .where(eq(masteryRecords.studentId, studentId))
    .orderBy(desc(masteryRecords.assessedAt))

  // Fetch subject averages
  const subjectAverages = await db
    .select({
      subject: standards.subject,
      avgScore: avg(masteryRecords.score),
    })
    .from(masteryRecords)
    .innerJoin(standards, eq(masteryRecords.standardId, standards.id))
    .where(eq(masteryRecords.studentId, studentId))
    .groupBy(standards.subject)

  // Fetch recent graded submissions with assignment titles
  const recentSubmissions = await db
    .select({
      assignmentTitle: assignments.title,
      subject: assignments.subject,
      totalScore: submissions.totalScore,
      maxScore: submissions.maxScore,
      submittedAt: submissions.submittedAt,
      gradedAt: submissions.gradedAt,
    })
    .from(submissions)
    .innerJoin(assignments, eq(submissions.assignmentId, assignments.id))
    .where(
      and(
        eq(submissions.studentId, studentId),
        eq(submissions.status, 'graded')
      )
    )
    .orderBy(desc(submissions.gradedAt))
    .limit(20)

  // Count total graded submissions
  const totalGraded = await db
    .select({ total: count() })
    .from(submissions)
    .where(
      and(
        eq(submissions.studentId, studentId),
        eq(submissions.status, 'graded')
      )
    )

  // Calculate overall average from submissions
  const overallAvgResult = await db
    .select({ avgScore: avg(submissions.totalScore) })
    .from(submissions)
    .where(
      and(
        eq(submissions.studentId, studentId),
        eq(submissions.status, 'graded')
      )
    )

  const overallAverage = overallAvgResult[0]?.avgScore
    ? Math.round(Number(overallAvgResult[0].avgScore))
    : null

  // Deduplicate mastery by standard (keep latest per standard)
  const latestByStandard = new Map<
    string,
    { subject: string; level: string; score: number; description: string }
  >()
  for (const m of masteryData) {
    if (!latestByStandard.has(m.standardId)) {
      latestByStandard.set(m.standardId, {
        subject: m.subject,
        level: m.level,
        score: m.score,
        description: m.standardDescription,
      })
    }
  }

  // Build subject mastery from deduplicated data
  const subjectMap = new Map<string, { levels: string[]; scores: number[] }>()
  for (const entry of latestByStandard.values()) {
    if (!subjectMap.has(entry.subject)) {
      subjectMap.set(entry.subject, { levels: [], scores: [] })
    }
    const bucket = subjectMap.get(entry.subject)!
    bucket.levels.push(entry.level)
    bucket.scores.push(entry.score)
  }

  function dominantLevel(levels: string[]): string {
    const counts: Record<string, number> = {}
    for (const l of levels) {
      counts[l] = (counts[l] ?? 0) + 1
    }
    let best = 'beginning'
    let bestCount = 0
    for (const [level, n] of Object.entries(counts)) {
      if (n > bestCount) {
        best = level
        bestCount = n
      }
    }
    return best
  }

  const subjectMastery = subjectAverages.map((sa) => {
    const bucket = subjectMap.get(sa.subject)
    return {
      subject: sa.subject,
      masteryLevel: bucket ? dominantLevel(bucket.levels) : 'beginning',
      score: sa.avgScore ? Math.round(Number(sa.avgScore)) : 0,
    }
  })

  // Determine strengths and areas for growth
  const strengths: string[] = []
  const areasForGrowth: string[] = []

  for (const entry of latestByStandard.values()) {
    if (entry.score >= 80) {
      strengths.push(entry.description)
    } else if (entry.score < 60) {
      areasForGrowth.push(entry.description)
    }
  }

  // Compute mastery trend from recent records
  let masteryTrend: 'improving' | 'stable' | 'declining' = 'stable'
  if (masteryData.length >= 4) {
    const recentHalf = masteryData.slice(0, Math.floor(masteryData.length / 2))
    const olderHalf = masteryData.slice(Math.floor(masteryData.length / 2))
    const recentAvg =
      recentHalf.reduce((sum, r) => sum + r.score, 0) / recentHalf.length
    const olderAvg =
      olderHalf.reduce((sum, r) => sum + r.score, 0) / olderHalf.length
    const diff = recentAvg - olderAvg
    if (diff > 5) masteryTrend = 'improving'
    else if (diff < -5) masteryTrend = 'declining'
  }

  return NextResponse.json({
    overallAverage,
    totalCompleted: totalGraded[0]?.total ?? 0,
    masteryTrend,
    subjectMastery,
    recentSubmissions: recentSubmissions.map((s) => ({
      assignmentTitle: s.assignmentTitle,
      subject: s.subject,
      score:
        s.totalScore != null && s.maxScore != null && s.maxScore > 0
          ? Math.round((s.totalScore / s.maxScore) * 100)
          : null,
      submittedAt: s.submittedAt.toISOString(),
    })),
    strengths: strengths.slice(0, 5),
    areasForGrowth: areasForGrowth.slice(0, 5),
  })
}
