import { auth } from '@/lib/auth'
import { db } from '@/lib/db'
import {
  reportCards,
  submissions,
  assignments,
  masteryRecords,
  feedbackDrafts,
  standards,
  classes,
  classMembers,
  users,
} from '@/lib/db/schema'
import { eq, and, inArray, desc } from 'drizzle-orm'
import { NextResponse } from 'next/server'
import { generateReportCardNarrative } from '@/lib/ai/report-card'

export async function GET(req: Request) {
  const session = await auth()
  if (!session?.user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  if (session.user.role !== 'teacher' && session.user.role !== 'sped_teacher') {
    return NextResponse.json({ error: 'Forbidden: teacher role required' }, { status: 403 })
  }

  const { searchParams } = new URL(req.url)
  const classId = searchParams.get('classId')

  // Get classes where the user is a teacher
  const teacherMemberships = await db
    .select({ classId: classMembers.classId })
    .from(classMembers)
    .where(
      and(
        eq(classMembers.userId, session.user.id),
        eq(classMembers.role, 'teacher')
      )
    )

  const teacherClassIds = teacherMemberships.map((m) => m.classId)

  if (teacherClassIds.length === 0) {
    return NextResponse.json([])
  }

  // If classId filter provided, verify teacher has access
  const targetClassIds = classId
    ? teacherClassIds.includes(classId)
      ? [classId]
      : []
    : teacherClassIds

  if (targetClassIds.length === 0) {
    return NextResponse.json([])
  }

  const results = await db
    .select({
      id: reportCards.id,
      studentId: reportCards.studentId,
      studentName: users.name,
      classId: reportCards.classId,
      className: classes.name,
      subject: classes.subject,
      gradeLevel: classes.gradeLevel,
      gradingPeriod: reportCards.gradingPeriod,
      narrative: reportCards.narrative,
      strengths: reportCards.strengths,
      areasForGrowth: reportCards.areasForGrowth,
      recommendations: reportCards.recommendations,
      gradeRecommendation: reportCards.gradeRecommendation,
      status: reportCards.status,
      generatedAt: reportCards.generatedAt,
      approvedAt: reportCards.approvedAt,
    })
    .from(reportCards)
    .innerJoin(users, eq(reportCards.studentId, users.id))
    .innerJoin(classes, eq(reportCards.classId, classes.id))
    .where(inArray(reportCards.classId, targetClassIds))
    .orderBy(desc(reportCards.generatedAt))

  return NextResponse.json(
    results.map((r) => ({
      ...r,
      strengths: r.strengths ? JSON.parse(r.strengths) : [],
      areasForGrowth: r.areasForGrowth ? JSON.parse(r.areasForGrowth) : [],
      recommendations: r.recommendations ? JSON.parse(r.recommendations) : [],
    }))
  )
}

export async function POST(req: Request) {
  const session = await auth()
  if (!session?.user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  if (session.user.role !== 'teacher' && session.user.role !== 'sped_teacher') {
    return NextResponse.json({ error: 'Forbidden: teacher role required' }, { status: 403 })
  }

  try {
    const body = await req.json()
    const { studentId, classId, gradingPeriod } = body

    if (!studentId || !classId || !gradingPeriod) {
      return NextResponse.json(
        { error: 'studentId, classId, and gradingPeriod are required' },
        { status: 400 }
      )
    }

    // Verify teacher has access to this class
    const [membership] = await db
      .select()
      .from(classMembers)
      .where(
        and(
          eq(classMembers.classId, classId),
          eq(classMembers.userId, session.user.id),
          eq(classMembers.role, 'teacher')
        )
      )
      .limit(1)

    if (!membership) {
      return NextResponse.json(
        { error: 'You do not have access to this class' },
        { status: 403 }
      )
    }

    // Verify student is in this class
    const [studentMembership] = await db
      .select()
      .from(classMembers)
      .where(
        and(
          eq(classMembers.classId, classId),
          eq(classMembers.userId, studentId),
          eq(classMembers.role, 'student')
        )
      )
      .limit(1)

    if (!studentMembership) {
      return NextResponse.json(
        { error: 'Student is not a member of this class' },
        { status: 400 }
      )
    }

    // Get class info
    const [classInfo] = await db
      .select()
      .from(classes)
      .where(eq(classes.id, classId))
      .limit(1)

    if (!classInfo) {
      return NextResponse.json({ error: 'Class not found' }, { status: 404 })
    }

    // Get student info
    const [student] = await db
      .select({ id: users.id, name: users.name })
      .from(users)
      .where(eq(users.id, studentId))
      .limit(1)

    if (!student) {
      return NextResponse.json({ error: 'Student not found' }, { status: 404 })
    }

    // Gather student submissions for this class
    const classAssignments = await db
      .select({ id: assignments.id })
      .from(assignments)
      .where(eq(assignments.classId, classId))

    const assignmentIds = classAssignments.map((a) => a.id)

    let studentSubmissions: {
      assignmentTitle: string
      score: number | null
      maxScore: number | null
      letterGrade: string | null
      submittedAt: string
    }[] = []

    if (assignmentIds.length > 0) {
      const subs = await db
        .select({
          assignmentTitle: assignments.title,
          score: submissions.totalScore,
          maxScore: submissions.maxScore,
          letterGrade: submissions.letterGrade,
          submittedAt: submissions.submittedAt,
        })
        .from(submissions)
        .innerJoin(assignments, eq(submissions.assignmentId, assignments.id))
        .where(
          and(
            eq(submissions.studentId, studentId),
            inArray(submissions.assignmentId, assignmentIds)
          )
        )
        .orderBy(desc(submissions.submittedAt))

      studentSubmissions = subs.map((s) => ({
        assignmentTitle: s.assignmentTitle,
        score: s.score,
        maxScore: s.maxScore,
        letterGrade: s.letterGrade,
        submittedAt: s.submittedAt.toISOString().split('T')[0],
      }))
    }

    // Gather mastery records
    const masteryData = await db
      .select({
        standardCode: standards.code,
        standardDescription: standards.description,
        level: masteryRecords.level,
        score: masteryRecords.score,
      })
      .from(masteryRecords)
      .innerJoin(standards, eq(masteryRecords.standardId, standards.id))
      .where(eq(masteryRecords.studentId, studentId))
      .orderBy(desc(masteryRecords.assessedAt))

    // Gather feedback highlights from feedback drafts
    let feedbackHighlights: string[] = []
    if (assignmentIds.length > 0) {
      const submissionIds = await db
        .select({ id: submissions.id })
        .from(submissions)
        .where(
          and(
            eq(submissions.studentId, studentId),
            inArray(submissions.assignmentId, assignmentIds)
          )
        )

      const subIds = submissionIds.map((s) => s.id)

      if (subIds.length > 0) {
        const feedbacks = await db
          .select({
            aiFeedback: feedbackDrafts.aiFeedback,
            strengths: feedbackDrafts.strengths,
          })
          .from(feedbackDrafts)
          .where(inArray(feedbackDrafts.submissionId, subIds))

        feedbackHighlights = feedbacks
          .flatMap((f) => {
            const highlights: string[] = []
            if (f.aiFeedback) {
              highlights.push(f.aiFeedback.slice(0, 200))
            }
            if (f.strengths) {
              try {
                const parsed = JSON.parse(f.strengths) as string[]
                highlights.push(...parsed.slice(0, 2))
              } catch {
                // skip malformed JSON
              }
            }
            return highlights
          })
          .slice(0, 8)
      }
    }

    // Generate the report card narrative with AI
    const generated = await generateReportCardNarrative({
      studentName: student.name ?? 'Student',
      className: classInfo.name,
      subject: classInfo.subject,
      gradeLevel: classInfo.gradeLevel,
      gradingPeriod,
      submissions: studentSubmissions,
      masteryData: masteryData.map((m) => ({
        standardCode: m.standardCode,
        standardDescription: m.standardDescription,
        level: m.level,
        score: m.score,
      })),
      feedbackHighlights,
    })

    // Store the report card
    const [reportCard] = await db
      .insert(reportCards)
      .values({
        studentId,
        classId,
        gradingPeriod,
        narrative: generated.overallNarrative,
        strengths: JSON.stringify(generated.strengths),
        areasForGrowth: JSON.stringify(generated.areasForGrowth),
        recommendations: JSON.stringify(generated.recommendations),
        gradeRecommendation: generated.gradeRecommendation,
        status: 'draft',
      })
      .returning()

    return NextResponse.json(
      {
        id: reportCard.id,
        studentId: reportCard.studentId,
        studentName: student.name,
        classId: reportCard.classId,
        className: classInfo.name,
        gradingPeriod: reportCard.gradingPeriod,
        narrative: reportCard.narrative,
        strengths: generated.strengths,
        areasForGrowth: generated.areasForGrowth,
        recommendations: generated.recommendations,
        gradeRecommendation: reportCard.gradeRecommendation,
        status: reportCard.status,
        generatedAt: reportCard.generatedAt,
      },
      { status: 201 }
    )
  } catch (error) {
    console.error('Failed to generate report card:', error)
    return NextResponse.json(
      { error: 'Failed to generate report card narrative' },
      { status: 500 }
    )
  }
}
