import { auth } from '@/lib/auth'
import { db } from '@/lib/db'
import {
  parentChildren,
  users,
  classMembers,
  classes,
  submissions,
  assignments,
  feedbackDrafts,
  masteryRecords,
  standards,
} from '@/lib/db/schema'
import { eq, desc, and, inArray } from 'drizzle-orm'
import { NextResponse } from 'next/server'

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ childId: string }> }
) {
  const session = await auth()
  if (!session?.user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
  if (session.user.role !== 'parent') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const { childId } = await params

  try {
    // Verify this is the parent's child
    const [link] = await db
      .select()
      .from(parentChildren)
      .where(
        and(
          eq(parentChildren.parentId, session.user.id),
          eq(parentChildren.childId, childId)
        )
      )
      .limit(1)

    if (!link) {
      return NextResponse.json(
        { error: 'Child not found or not authorized' },
        { status: 403 }
      )
    }

    // Get child info
    const [child] = await db
      .select({ id: users.id, name: users.name, email: users.email })
      .from(users)
      .where(eq(users.id, childId))
      .limit(1)

    if (!child) {
      return NextResponse.json({ error: 'Child not found' }, { status: 404 })
    }

    // Get class enrollments
    const enrollments = await db
      .select({
        classId: classes.id,
        className: classes.name,
        subject: classes.subject,
        gradeLevel: classes.gradeLevel,
        period: classes.period,
      })
      .from(classMembers)
      .innerJoin(classes, eq(classMembers.classId, classes.id))
      .where(
        and(eq(classMembers.userId, childId), eq(classMembers.role, 'student'))
      )

    const classIds = enrollments.map((e) => e.classId)

    // Get recent submissions with feedback
    const recentSubmissions = await db
      .select({
        id: submissions.id,
        assignmentTitle: assignments.title,
        subject: assignments.subject,
        totalScore: submissions.totalScore,
        maxScore: submissions.maxScore,
        letterGrade: submissions.letterGrade,
        status: submissions.status,
        submittedAt: submissions.submittedAt,
        gradedAt: submissions.gradedAt,
      })
      .from(submissions)
      .innerJoin(assignments, eq(submissions.assignmentId, assignments.id))
      .where(eq(submissions.studentId, childId))
      .orderBy(desc(submissions.submittedAt))
      .limit(20)

    // Get feedback for graded submissions
    const gradedIds = recentSubmissions
      .filter((s) => s.status === 'graded' || s.status === 'returned')
      .map((s) => s.id)

    let feedbackMap: Record<string, { strengths: string; improvements: string; finalFeedback: string | null }> = {}
    if (gradedIds.length > 0) {
      const feedbacks = await db
        .select({
          submissionId: feedbackDrafts.submissionId,
          strengths: feedbackDrafts.strengths,
          improvements: feedbackDrafts.improvements,
          finalFeedback: feedbackDrafts.finalFeedback,
        })
        .from(feedbackDrafts)
        .where(inArray(feedbackDrafts.submissionId, gradedIds))

      feedbackMap = Object.fromEntries(
        feedbacks.map((f) => [
          f.submissionId,
          {
            strengths: f.strengths ?? '[]',
            improvements: f.improvements ?? '[]',
            finalFeedback: f.finalFeedback,
          },
        ])
      )
    }

    // Get mastery data
    const mastery = await db
      .select({
        standardId: masteryRecords.standardId,
        standardCode: standards.code,
        standardDescription: standards.description,
        subject: standards.subject,
        level: masteryRecords.level,
        score: masteryRecords.score,
        assessedAt: masteryRecords.assessedAt,
      })
      .from(masteryRecords)
      .innerJoin(standards, eq(masteryRecords.standardId, standards.id))
      .where(eq(masteryRecords.studentId, childId))
      .orderBy(desc(masteryRecords.assessedAt))

    // Build response
    const submissionsWithFeedback = recentSubmissions.map((s) => {
      const fb = feedbackMap[s.id]
      return {
        ...s,
        feedback: fb
          ? {
              strengths: JSON.parse(fb.strengths) as string[],
              improvements: JSON.parse(fb.improvements) as string[],
              summary: fb.finalFeedback,
            }
          : null,
      }
    })

    // Group mastery by subject, keep latest per standard
    const masteryBySubject: Record<
      string,
      { standard: string; description: string; level: string; score: number }[]
    > = {}
    const seenStandards = new Set<string>()
    for (const m of mastery) {
      if (seenStandards.has(m.standardId)) continue
      seenStandards.add(m.standardId)
      if (!masteryBySubject[m.subject]) masteryBySubject[m.subject] = []
      masteryBySubject[m.subject].push({
        standard: m.standardCode,
        description: m.standardDescription,
        level: m.level,
        score: m.score,
      })
    }

    return NextResponse.json({
      child: {
        id: child.id,
        name: child.name,
        email: child.email,
        gradeLevel: enrollments.length > 0 ? enrollments[0].gradeLevel : null,
      },
      enrolledClasses: enrollments,
      recentSubmissions: submissionsWithFeedback,
      mastery: masteryBySubject,
    })
  } catch (error) {
    console.error('Failed to load child details:', error)
    return NextResponse.json(
      { error: 'Failed to load child details' },
      { status: 500 }
    )
  }
}
