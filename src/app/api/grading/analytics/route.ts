import { auth } from '@/lib/auth'
import { db } from '@/lib/db'
import {
  submissions,
  feedbackDrafts,
  criterionScores,
  assignments,
  rubricCriteria,
  users,
} from '@/lib/db/schema'
import { eq, and } from 'drizzle-orm'
import { NextResponse } from 'next/server'

export async function GET(req: Request) {
  const session = await auth()
  if (!session?.user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { searchParams } = new URL(req.url)
  const assignmentId = searchParams.get('assignmentId')

  if (!assignmentId) {
    return NextResponse.json(
      { error: 'Missing required query parameter: assignmentId' },
      { status: 400 }
    )
  }

  // Verify the teacher owns this assignment
  const [assignment] = await db
    .select()
    .from(assignments)
    .where(
      and(
        eq(assignments.id, assignmentId),
        eq(assignments.teacherId, session.user.id)
      )
    )
    .limit(1)

  if (!assignment) {
    return NextResponse.json(
      { error: 'Assignment not found or you do not have access' },
      { status: 403 }
    )
  }

  // Fetch all graded submissions for this assignment
  const gradedSubmissions = await db
    .select({
      id: submissions.id,
      studentId: submissions.studentId,
      studentName: users.name,
      totalScore: submissions.totalScore,
      maxScore: submissions.maxScore,
      letterGrade: submissions.letterGrade,
      status: submissions.status,
    })
    .from(submissions)
    .innerJoin(users, eq(submissions.studentId, users.id))
    .where(eq(submissions.assignmentId, assignmentId))

  const scoredSubmissions = gradedSubmissions.filter(
    (s) => s.totalScore !== null && s.maxScore !== null
  )

  if (scoredSubmissions.length === 0) {
    return NextResponse.json({
      assignmentId,
      assignmentTitle: assignment.title,
      totalSubmissions: gradedSubmissions.length,
      gradedCount: 0,
      averageScore: null,
      averagePercentage: null,
      scoreDistribution: {},
      letterGradeDistribution: {},
      criterionAverages: [],
      commonMisconceptions: [],
      classPerformance: [],
    })
  }

  // Calculate average score
  const totalScoreSum = scoredSubmissions.reduce(
    (sum, s) => sum + (s.totalScore ?? 0),
    0
  )
  const maxScoreFirst = scoredSubmissions[0].maxScore ?? 100
  const averageScore = totalScoreSum / scoredSubmissions.length
  const averagePercentage = (averageScore / maxScoreFirst) * 100

  // Score distribution (by 10% buckets)
  const scoreDistribution: Record<string, number> = {
    '0-9%': 0,
    '10-19%': 0,
    '20-29%': 0,
    '30-39%': 0,
    '40-49%': 0,
    '50-59%': 0,
    '60-69%': 0,
    '70-79%': 0,
    '80-89%': 0,
    '90-100%': 0,
  }

  for (const s of scoredSubmissions) {
    const pct = ((s.totalScore ?? 0) / (s.maxScore ?? 100)) * 100
    if (pct >= 90) scoreDistribution['90-100%']++
    else if (pct >= 80) scoreDistribution['80-89%']++
    else if (pct >= 70) scoreDistribution['70-79%']++
    else if (pct >= 60) scoreDistribution['60-69%']++
    else if (pct >= 50) scoreDistribution['50-59%']++
    else if (pct >= 40) scoreDistribution['40-49%']++
    else if (pct >= 30) scoreDistribution['30-39%']++
    else if (pct >= 20) scoreDistribution['20-29%']++
    else if (pct >= 10) scoreDistribution['10-19%']++
    else scoreDistribution['0-9%']++
  }

  // Letter grade distribution
  const letterGradeDistribution: Record<string, number> = {}
  for (const s of scoredSubmissions) {
    const grade = s.letterGrade ?? 'Ungraded'
    letterGradeDistribution[grade] = (letterGradeDistribution[grade] ?? 0) + 1
  }

  // Per-criterion averages
  const submissionIds = scoredSubmissions.map((s) => s.id)
  let criterionAverages: {
    criterionId: string
    criterionName: string
    averageScore: number
    averageMaxScore: number
    averagePercentage: number
  }[] = []

  if (submissionIds.length > 0) {
    const allCriterionScores = await db
      .select({
        criterionId: criterionScores.criterionId,
        criterionName: rubricCriteria.name,
        score: criterionScores.score,
        maxScore: criterionScores.maxScore,
        submissionId: criterionScores.submissionId,
      })
      .from(criterionScores)
      .innerJoin(
        rubricCriteria,
        eq(criterionScores.criterionId, rubricCriteria.id)
      )

    // Filter to only scores for this assignment's submissions
    const relevantScores = allCriterionScores.filter((cs) =>
      submissionIds.includes(cs.submissionId)
    )

    // Group by criterion
    const byCriterion = new Map<
      string,
      { name: string; scores: number[]; maxScores: number[] }
    >()
    for (const cs of relevantScores) {
      const existing = byCriterion.get(cs.criterionId)
      if (existing) {
        existing.scores.push(cs.score)
        existing.maxScores.push(cs.maxScore)
      } else {
        byCriterion.set(cs.criterionId, {
          name: cs.criterionName,
          scores: [cs.score],
          maxScores: [cs.maxScore],
        })
      }
    }

    criterionAverages = Array.from(byCriterion.entries()).map(
      ([criterionId, data]) => {
        const avgScore =
          data.scores.reduce((a, b) => a + b, 0) / data.scores.length
        const avgMax =
          data.maxScores.reduce((a, b) => a + b, 0) / data.maxScores.length
        return {
          criterionId,
          criterionName: data.name,
          averageScore: Math.round(avgScore * 100) / 100,
          averageMaxScore: Math.round(avgMax * 100) / 100,
          averagePercentage:
            avgMax > 0 ? Math.round((avgScore / avgMax) * 10000) / 100 : 0,
        }
      }
    )
  }

  // Common misconceptions (aggregated from feedback drafts)
  const feedbackResults = await db
    .select({
      aiMetadata: feedbackDrafts.aiMetadata,
      submissionId: feedbackDrafts.submissionId,
    })
    .from(feedbackDrafts)

  const relevantFeedback = feedbackResults.filter((f) =>
    submissionIds.includes(f.submissionId)
  )

  const misconceptionCounts = new Map<string, number>()
  for (const f of relevantFeedback) {
    if (!f.aiMetadata) continue
    try {
      const metadata = JSON.parse(f.aiMetadata) as {
        misconceptions?: string[]
      }
      if (metadata.misconceptions) {
        for (const m of metadata.misconceptions) {
          misconceptionCounts.set(m, (misconceptionCounts.get(m) ?? 0) + 1)
        }
      }
    } catch {
      // Skip malformed metadata
    }
  }

  const commonMisconceptions = Array.from(misconceptionCounts.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, 10)
    .map(([misconception, count]) => ({ misconception, count }))

  // Class performance breakdown (per student)
  const classPerformance = scoredSubmissions.map((s) => ({
    studentId: s.studentId,
    studentName: s.studentName,
    totalScore: s.totalScore,
    maxScore: s.maxScore,
    percentage:
      s.maxScore && s.maxScore > 0
        ? Math.round(((s.totalScore ?? 0) / s.maxScore) * 10000) / 100
        : null,
    letterGrade: s.letterGrade,
  }))

  return NextResponse.json({
    assignmentId,
    assignmentTitle: assignment.title,
    totalSubmissions: gradedSubmissions.length,
    gradedCount: scoredSubmissions.length,
    averageScore: Math.round(averageScore * 100) / 100,
    averagePercentage: Math.round(averagePercentage * 100) / 100,
    scoreDistribution,
    letterGradeDistribution,
    criterionAverages,
    commonMisconceptions,
    classPerformance,
  })
}
