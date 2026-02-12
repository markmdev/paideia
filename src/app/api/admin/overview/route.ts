import { auth } from '@/lib/auth'
import { db } from '@/lib/db'
import {
  users,
  schools,
  classes,
  assignments,
  submissions,
} from '@/lib/db/schema'
import { eq, sql, and, gte } from 'drizzle-orm'
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

    const [schoolCount] = await db
      .select({ count: sql<number>`count(*)` })
      .from(schools)

    const [teacherCount] = await db
      .select({ count: sql<number>`count(*)` })
      .from(users)
      .where(eq(users.role, 'teacher'))

    const [spedTeacherCount] = await db
      .select({ count: sql<number>`count(*)` })
      .from(users)
      .where(eq(users.role, 'sped_teacher'))

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

    // Recent activity: assignments created this week
    const oneWeekAgo = new Date()
    oneWeekAgo.setDate(oneWeekAgo.getDate() - 7)

    const [recentAssignments] = await db
      .select({ count: sql<number>`count(*)` })
      .from(assignments)
      .where(gte(assignments.createdAt, oneWeekAgo))

    // Submissions graded this week
    const [recentGraded] = await db
      .select({ count: sql<number>`count(*)` })
      .from(submissions)
      .where(
        and(
          eq(submissions.status, 'graded'),
          gte(submissions.gradedAt, oneWeekAgo)
        )
      )

    // Grading pipeline: total ungraded submissions
    const [ungradedCount] = await db
      .select({ count: sql<number>`count(*)` })
      .from(submissions)
      .where(eq(submissions.status, 'submitted'))

    return NextResponse.json({
      totals: {
        schools: Number(schoolCount.count),
        teachers:
          Number(teacherCount.count) + Number(spedTeacherCount.count),
        students: Number(studentCount.count),
        classes: Number(classCount.count),
        assignments: Number(assignmentCount.count),
        submissions: Number(submissionCount.count),
      },
      recentActivity: {
        assignmentsCreatedThisWeek: Number(recentAssignments.count),
        submissionsGradedThisWeek: Number(recentGraded.count),
      },
      gradingPipeline: {
        ungradedSubmissions: Number(ungradedCount.count),
      },
    })
  } catch (error) {
    console.error('Admin overview error:', error)
    return NextResponse.json(
      { error: 'Failed to fetch overview data' },
      { status: 500 }
    )
  }
}
