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
    const { classId, gradingPeriod } = body

    if (!classId || !gradingPeriod) {
      return NextResponse.json(
        { error: 'classId and gradingPeriod are required' },
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

    // Get class info
    const [classInfo] = await db
      .select()
      .from(classes)
      .where(eq(classes.id, classId))
      .limit(1)

    if (!classInfo) {
      return NextResponse.json({ error: 'Class not found' }, { status: 404 })
    }

    // Get all students in the class
    const studentMembers = await db
      .select({
        userId: classMembers.userId,
      })
      .from(classMembers)
      .where(
        and(
          eq(classMembers.classId, classId),
          eq(classMembers.role, 'student')
        )
      )

    const studentIds = studentMembers.map((m) => m.userId)

    if (studentIds.length === 0) {
      return NextResponse.json({
        generated: 0,
        skipped: 0,
        total: 0,
        reportCards: [],
      })
    }

    // Check which students already have report cards for this grading period
    const existingCards = await db
      .select({
        studentId: reportCards.studentId,
      })
      .from(reportCards)
      .where(
        and(
          eq(reportCards.classId, classId),
          eq(reportCards.gradingPeriod, gradingPeriod)
        )
      )

    const existingStudentIds = new Set(existingCards.map((c) => c.studentId))

    // Get student names
    const studentRecords = await db
      .select({ id: users.id, name: users.name })
      .from(users)
      .where(inArray(users.id, studentIds))

    const studentMap = new Map(studentRecords.map((s) => [s.id, s.name ?? 'Student']))

    // Get all assignments for this class (shared across students)
    const classAssignments = await db
      .select({ id: assignments.id })
      .from(assignments)
      .where(eq(assignments.classId, classId))

    const assignmentIds = classAssignments.map((a) => a.id)

    // Process each student sequentially
    const results: { studentId: string; studentName: string; status: 'generated' | 'skipped' | 'error' }[] = []
    let generated = 0
    let skipped = 0

    for (const studentId of studentIds) {
      const studentName = studentMap.get(studentId) ?? 'Student'

      // Skip if report card already exists
      if (existingStudentIds.has(studentId)) {
        results.push({ studentId, studentName, status: 'skipped' })
        skipped++
        continue
      }

      try {
        // Get student submissions for this class
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

        // Get mastery records
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

        // Get feedback highlights
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
        const generatedCard = await generateReportCardNarrative({
          studentName,
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

        // Save to database
        await db.insert(reportCards).values({
          studentId,
          classId,
          gradingPeriod,
          narrative: generatedCard.overallNarrative,
          strengths: JSON.stringify(generatedCard.strengths),
          areasForGrowth: JSON.stringify(generatedCard.areasForGrowth),
          recommendations: JSON.stringify(generatedCard.recommendations),
          gradeRecommendation: generatedCard.gradeRecommendation,
          status: 'draft',
        })

        results.push({ studentId, studentName, status: 'generated' })
        generated++
      } catch (error) {
        console.error(`Failed to generate report card for student ${studentId}:`, error)
        results.push({ studentId, studentName, status: 'error' })
      }
    }

    return NextResponse.json({
      generated,
      skipped,
      total: studentIds.length,
      reportCards: results,
    })
  } catch (error) {
    console.error('Failed to batch generate report cards:', error)
    return NextResponse.json(
      { error: 'Failed to batch generate report cards' },
      { status: 500 }
    )
  }
}
