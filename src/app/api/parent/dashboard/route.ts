import { auth } from '@/lib/auth'
import { db } from '@/lib/db'
import {
  parentChildren,
  users,
  classMembers,
  classes,
  submissions,
  assignments,
  masteryRecords,
  standards,
} from '@/lib/db/schema'
import { eq, desc, and, inArray, avg } from 'drizzle-orm'
import { NextResponse } from 'next/server'

export async function GET() {
  const session = await auth()
  if (!session?.user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
  if (session.user.role !== 'parent') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  try {
    // Get parent's children
    const children = await db
      .select({
        childId: parentChildren.childId,
        childName: users.name,
        childEmail: users.email,
      })
      .from(parentChildren)
      .innerJoin(users, eq(parentChildren.childId, users.id))
      .where(eq(parentChildren.parentId, session.user.id))

    if (children.length === 0) {
      return NextResponse.json({ children: [] })
    }

    const childIds = children.map((c) => c.childId)

    // Get class enrollments for each child
    const enrollments = await db
      .select({
        userId: classMembers.userId,
        className: classes.name,
        subject: classes.subject,
        gradeLevel: classes.gradeLevel,
      })
      .from(classMembers)
      .innerJoin(classes, eq(classMembers.classId, classes.id))
      .where(
        and(
          inArray(classMembers.userId, childIds),
          eq(classMembers.role, 'student')
        )
      )

    // Get recent submissions (last 10 per child)
    const recentSubmissions = await db
      .select({
        studentId: submissions.studentId,
        assignmentTitle: assignments.title,
        subject: assignments.subject,
        totalScore: submissions.totalScore,
        maxScore: submissions.maxScore,
        letterGrade: submissions.letterGrade,
        status: submissions.status,
        gradedAt: submissions.gradedAt,
      })
      .from(submissions)
      .innerJoin(assignments, eq(submissions.assignmentId, assignments.id))
      .where(inArray(submissions.studentId, childIds))
      .orderBy(desc(submissions.submittedAt))
      .limit(30)

    // Get mastery snapshot per child
    const masterySnapshot = await db
      .select({
        studentId: masteryRecords.studentId,
        subject: standards.subject,
        avgScore: avg(masteryRecords.score),
      })
      .from(masteryRecords)
      .innerJoin(standards, eq(masteryRecords.standardId, standards.id))
      .where(inArray(masteryRecords.studentId, childIds))
      .groupBy(masteryRecords.studentId, standards.subject)

    // Build response per child
    const childData = children.map((child) => {
      const childEnrollments = enrollments.filter((e) => e.userId === child.childId)
      const childSubmissions = recentSubmissions.filter((s) => s.studentId === child.childId)
      const childMastery = masterySnapshot.filter((m) => m.studentId === child.childId)

      // Determine overall status (traffic light)
      const gradedSubmissions = childSubmissions.filter(
        (s) => s.totalScore !== null && s.maxScore !== null
      )
      const avgPercentage =
        gradedSubmissions.length > 0
          ? gradedSubmissions.reduce(
              (sum, s) => sum + (s.totalScore! / s.maxScore!) * 100,
              0
            ) / gradedSubmissions.length
          : null

      let overallStatus: 'good' | 'watch' | 'concern' = 'good'
      if (avgPercentage !== null) {
        if (avgPercentage < 60) overallStatus = 'concern'
        else if (avgPercentage < 75) overallStatus = 'watch'
      }

      const gradeLevel =
        childEnrollments.length > 0 ? childEnrollments[0].gradeLevel : null

      return {
        id: child.childId,
        name: child.childName,
        email: child.childEmail,
        gradeLevel,
        overallStatus,
        averageScore: avgPercentage !== null ? Math.round(avgPercentage) : null,
        recentGrades: childSubmissions.slice(0, 5).map((s) => ({
          assignment: s.assignmentTitle,
          subject: s.subject,
          score: s.totalScore,
          maxScore: s.maxScore,
          letterGrade: s.letterGrade,
          gradedAt: s.gradedAt,
        })),
        subjects: childMastery.map((m) => ({
          subject: m.subject,
          averageMastery: m.avgScore ? Math.round(Number(m.avgScore)) : null,
        })),
        enrolledClasses: childEnrollments.map((e) => ({
          name: e.className,
          subject: e.subject,
        })),
      }
    })

    return NextResponse.json({ children: childData })
  } catch (error) {
    console.error('Failed to load parent dashboard:', error)
    return NextResponse.json(
      { error: 'Failed to load dashboard data' },
      { status: 500 }
    )
  }
}
