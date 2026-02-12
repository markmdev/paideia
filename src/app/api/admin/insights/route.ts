import { auth } from '@/lib/auth'
import { db } from '@/lib/db'
import {
  users,
  schools,
  classes,
  assignments,
  submissions,
  masteryRecords,
  feedbackDrafts,
  lessonPlans,
  rubrics,
} from '@/lib/db/schema'
import { eq, sql } from 'drizzle-orm'
import { NextResponse } from 'next/server'
import {
  generateDistrictInsights,
  type DistrictSnapshot,
} from '@/lib/ai/district-insights'

export async function POST() {
  try {
    const session = await auth()
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    if (
      session.user.role !== 'admin' &&
      session.user.role !== 'district_admin'
    ) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    // Gather aggregate data for the AI to analyze
    const [schoolCount] = await db
      .select({ count: sql<number>`count(*)` })
      .from(schools)

    const [teacherCount] = await db
      .select({ count: sql<number>`count(*)` })
      .from(users)
      .where(sql`${users.role} in ('teacher', 'sped_teacher')`)

    const [studentCount] = await db
      .select({ count: sql<number>`count(*)` })
      .from(users)
      .where(eq(users.role, 'student'))

    const [classCount] = await db
      .select({ count: sql<number>`count(*)` })
      .from(classes)

    const [assignmentCount] = await db
      .select({ count: sql<number>`count(*)` })
      .from(assignments)

    const [submissionCount] = await db
      .select({ count: sql<number>`count(*)` })
      .from(submissions)

    const [gradedCount] = await db
      .select({ count: sql<number>`count(*)` })
      .from(submissions)
      .where(sql`${submissions.status} in ('graded', 'returned')`)

    const [ungradedCount] = await db
      .select({ count: sql<number>`count(*)` })
      .from(submissions)
      .where(eq(submissions.status, 'submitted'))

    const [feedbackCount] = await db
      .select({ count: sql<number>`count(*)` })
      .from(feedbackDrafts)

    // Mastery distribution
    const masteryDist = await db
      .select({
        level: masteryRecords.level,
        count: sql<number>`count(*)`,
      })
      .from(masteryRecords)
      .groupBy(masteryRecords.level)

    // Subject scores
    const subjectScores = await db
      .select({
        subject: assignments.subject,
        avgScore: sql<number>`avg(case when ${submissions.totalScore} is not null and ${submissions.maxScore} is not null and ${submissions.maxScore} > 0 then (${submissions.totalScore}::float / ${submissions.maxScore}::float) * 100 else null end)`,
        count: sql<number>`count(${submissions.id})`,
      })
      .from(assignments)
      .innerJoin(submissions, eq(submissions.assignmentId, assignments.id))
      .groupBy(assignments.subject)

    // Teacher engagement aggregates
    const [teachersWithAssignments] = await db
      .select({
        count: sql<number>`count(distinct ${assignments.teacherId})`,
      })
      .from(assignments)

    const [teachersWithLessonPlans] = await db
      .select({
        count: sql<number>`count(distinct ${lessonPlans.teacherId})`,
      })
      .from(lessonPlans)

    const [teachersWithRubrics] = await db
      .select({
        count: sql<number>`count(distinct ${rubrics.teacherId})`,
      })
      .from(rubrics)

    const [teachersWithFeedback] = await db
      .select({
        count: sql<number>`count(distinct ${feedbackDrafts.teacherId})`,
      })
      .from(feedbackDrafts)

    const totalSubs = Number(submissionCount.count)
    const totalGraded = Number(gradedCount.count)
    const gradingCompletionRate =
      totalSubs > 0
        ? Math.round((totalGraded / totalSubs) * 10000) / 100
        : 0

    const snapshot: DistrictSnapshot = {
      schools: Number(schoolCount.count),
      teachers: Number(teacherCount.count),
      students: Number(studentCount.count),
      classes: Number(classCount.count),
      assignments: Number(assignmentCount.count),
      submissions: totalSubs,
      gradedSubmissions: totalGraded,
      aiFeedbackGenerated: Number(feedbackCount.count),
      ungradedSubmissions: Number(ungradedCount.count),
      masteryDistribution: Object.fromEntries(
        masteryDist.map((m) => [m.level, Number(m.count)])
      ),
      subjectScores: subjectScores.map((s) => ({
        subject: s.subject,
        avgScore: s.avgScore
          ? Math.round(Number(s.avgScore) * 10) / 10
          : null,
        submissions: Number(s.count),
      })),
      gradingCompletionRate,
      teacherEngagement: {
        totalTeachers: Number(teacherCount.count),
        withAssignments: Number(teachersWithAssignments.count),
        withLessonPlans: Number(teachersWithLessonPlans.count),
        withRubrics: Number(teachersWithRubrics.count),
        withFeedbackDrafts: Number(teachersWithFeedback.count),
      },
    }

    const insights = await generateDistrictInsights(snapshot)

    return NextResponse.json({
      insights,
      snapshot,
      generatedAt: new Date().toISOString(),
    })
  } catch (error) {
    console.error('Admin insights error:', error)
    return NextResponse.json(
      { error: 'Failed to generate district insights' },
      { status: 500 }
    )
  }
}
