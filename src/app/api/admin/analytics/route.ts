import { auth } from '@/lib/auth'
import { db } from '@/lib/db'
import {
  users,
  submissions,
  assignments,
  feedbackDrafts,
  masteryRecords,
  lessonPlans,
  rubrics,
} from '@/lib/db/schema'
import { eq, sql, desc } from 'drizzle-orm'
import { NextResponse } from 'next/server'

export async function GET() {
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

    // Standards mastery distribution
    const masteryDistribution = await db
      .select({
        level: masteryRecords.level,
        count: sql<number>`count(*)`,
      })
      .from(masteryRecords)
      .groupBy(masteryRecords.level)

    // Average scores by subject
    const subjectScores = await db
      .select({
        subject: assignments.subject,
        avgScore: sql<number>`avg(case when ${submissions.totalScore} is not null and ${submissions.maxScore} is not null and ${submissions.maxScore} > 0 then (${submissions.totalScore}::float / ${submissions.maxScore}::float) * 100 else null end)`,
        submissionCount: sql<number>`count(${submissions.id})`,
      })
      .from(assignments)
      .innerJoin(submissions, eq(submissions.assignmentId, assignments.id))
      .groupBy(assignments.subject)

    // Grading completion rates
    const [totalSubmissions] = await db
      .select({ count: sql<number>`count(*)` })
      .from(submissions)

    const [gradedSubmissions] = await db
      .select({ count: sql<number>`count(*)` })
      .from(submissions)
      .where(
        sql`${submissions.status} in ('graded', 'returned')`
      )

    const total = Number(totalSubmissions.count)
    const graded = Number(gradedSubmissions.count)
    const gradingCompletionRate =
      total > 0 ? Math.round((graded / total) * 10000) / 100 : 0

    // Teacher engagement: top teachers by activity
    const teacherEngagement = await db
      .select({
        teacherId: assignments.teacherId,
        teacherName: users.name,
        teacherEmail: users.email,
        assignmentCount: sql<number>`count(distinct ${assignments.id})`,
        submissionCount: sql<number>`count(${submissions.id})`,
        gradedCount: sql<number>`count(*) filter (where ${submissions.status} in ('graded', 'returned'))`,
        feedbackCount: sql<number>`count(${feedbackDrafts.id})`,
      })
      .from(assignments)
      .innerJoin(users, eq(assignments.teacherId, users.id))
      .leftJoin(submissions, eq(submissions.assignmentId, assignments.id))
      .leftJoin(
        feedbackDrafts,
        eq(feedbackDrafts.submissionId, submissions.id)
      )
      .groupBy(assignments.teacherId, users.name, users.email)
      .orderBy(desc(sql`count(distinct ${assignments.id})`))
      .limit(10)

    // Aggregate teacher engagement counts
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

    const [totalTeachers] = await db
      .select({ count: sql<number>`count(*)` })
      .from(users)
      .where(
        sql`${users.role} in ('teacher', 'sped_teacher')`
      )

    return NextResponse.json({
      masteryDistribution: masteryDistribution.map((m) => ({
        level: m.level,
        count: Number(m.count),
      })),
      subjectScores: subjectScores.map((s) => ({
        subject: s.subject,
        avgScore: s.avgScore
          ? Math.round(Number(s.avgScore) * 100) / 100
          : null,
        submissionCount: Number(s.submissionCount),
      })),
      gradingCompletion: {
        total,
        graded,
        completionRate: gradingCompletionRate,
      },
      teacherEngagement: {
        totalTeachers: Number(totalTeachers.count),
        withAssignments: Number(teachersWithAssignments.count),
        withLessonPlans: Number(teachersWithLessonPlans.count),
        withRubrics: Number(teachersWithRubrics.count),
        withFeedbackDrafts: Number(teachersWithFeedback.count),
        topTeachers: teacherEngagement.map((t) => ({
          teacherId: t.teacherId,
          teacherName: t.teacherName,
          teacherEmail: t.teacherEmail,
          assignmentCount: Number(t.assignmentCount),
          submissionCount: Number(t.submissionCount),
          gradedCount: Number(t.gradedCount),
          feedbackCount: Number(t.feedbackCount),
        })),
      },
    })
  } catch (error) {
    console.error('Admin analytics error:', error)
    return NextResponse.json(
      { error: 'Failed to fetch analytics data' },
      { status: 500 }
    )
  }
}
