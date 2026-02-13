import { auth } from '@/lib/auth'
import { db } from '@/lib/db'
import {
  submissions,
  assignments,
  rubrics,
  rubricCriteria,
  users,
} from '@/lib/db/schema'
import { eq, desc, and, inArray } from 'drizzle-orm'
import { NextResponse } from 'next/server'
import { gradeSubmission } from '@/lib/ai/grade-submission'
import { buildRubricInput, persistGradingResult } from '@/lib/grading-helpers'

export async function GET(req: Request) {
  const session = await auth()
  if (!session?.user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { searchParams } = new URL(req.url)
  const assignmentId = searchParams.get('assignmentId')
  const status = searchParams.get('status')

  // Get all assignment IDs belonging to this teacher
  const teacherAssignments = await db
    .select({ id: assignments.id })
    .from(assignments)
    .where(eq(assignments.teacherId, session.user.id))

  const assignmentIds = teacherAssignments.map((a) => a.id)

  if (assignmentIds.length === 0) {
    return NextResponse.json([])
  }

  // Build conditions: submissions must belong to teacher's assignments
  const conditions = [inArray(submissions.assignmentId, assignmentIds)]

  if (assignmentId) {
    conditions.push(eq(submissions.assignmentId, assignmentId))
  }

  if (status) {
    conditions.push(eq(submissions.status, status))
  }

  const results = await db
    .select({
      id: submissions.id,
      assignmentId: submissions.assignmentId,
      studentId: submissions.studentId,
      studentName: users.name,
      assignmentTitle: assignments.title,
      content: submissions.content,
      status: submissions.status,
      totalScore: submissions.totalScore,
      maxScore: submissions.maxScore,
      letterGrade: submissions.letterGrade,
      submittedAt: submissions.submittedAt,
      gradedAt: submissions.gradedAt,
    })
    .from(submissions)
    .innerJoin(assignments, eq(submissions.assignmentId, assignments.id))
    .innerJoin(users, eq(submissions.studentId, users.id))
    .where(and(...conditions))
    .orderBy(desc(submissions.submittedAt))

  return NextResponse.json(results)
}

export async function POST(req: Request) {
  const session = await auth()
  if (!session?.user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const body = await req.json()
    const { submissionId, assignmentId, studentId, content } = body

    let targetSubmission: typeof submissions.$inferSelect | null = null

    if (submissionId) {
      // Grade an existing submission
      const [found] = await db
        .select()
        .from(submissions)
        .where(eq(submissions.id, submissionId))
        .limit(1)

      if (!found) {
        return NextResponse.json(
          { error: 'Submission not found' },
          { status: 404 }
        )
      }

      targetSubmission = found
    } else if (assignmentId && studentId && content) {
      // Create a new submission and grade it
      const [created] = await db
        .insert(submissions)
        .values({
          assignmentId,
          studentId,
          content,
          status: 'submitted',
        })
        .returning()

      targetSubmission = created
    } else {
      return NextResponse.json(
        {
          error:
            'Provide either submissionId, or assignmentId + studentId + content',
        },
        { status: 400 }
      )
    }

    // Verify the teacher owns this assignment
    const [assignment] = await db
      .select()
      .from(assignments)
      .where(
        and(
          eq(assignments.id, targetSubmission.assignmentId),
          eq(assignments.teacherId, session.user.id)
        )
      )
      .limit(1)

    if (!assignment) {
      return NextResponse.json(
        { error: 'You do not have access to this assignment' },
        { status: 403 }
      )
    }

    if (!assignment.rubricId) {
      return NextResponse.json(
        { error: 'Assignment has no rubric. Create a rubric before grading.' },
        { status: 400 }
      )
    }

    // Fetch the rubric and its criteria
    const [rubric] = await db
      .select()
      .from(rubrics)
      .where(eq(rubrics.id, assignment.rubricId))
      .limit(1)

    if (!rubric) {
      return NextResponse.json(
        { error: 'Rubric not found' },
        { status: 404 }
      )
    }

    const criteria = await db
      .select()
      .from(rubricCriteria)
      .where(eq(rubricCriteria.rubricId, rubric.id))

    // Update submission status to grading
    await db
      .update(submissions)
      .set({ status: 'grading' })
      .where(eq(submissions.id, targetSubmission.id))

    // Build AI grading input
    const { rubric: rubricData, assignment: assignmentData } = buildRubricInput(rubric, criteria, assignment)

    const gradingResult = await gradeSubmission({
      studentWork: targetSubmission.content,
      rubric: rubricData,
      assignment: assignmentData,
    })

    await persistGradingResult(targetSubmission.id, session.user.id, gradingResult)

    return NextResponse.json(
      {
        submissionId: targetSubmission.id,
        status: 'graded',
        totalScore: gradingResult.totalScore,
        maxScore: gradingResult.maxScore,
        letterGrade: gradingResult.letterGrade,
        feedback: gradingResult.overallFeedback,
        criterionScores: gradingResult.criterionScores,
        strengths: gradingResult.strengths,
        improvements: gradingResult.improvements,
        nextSteps: gradingResult.nextSteps,
      },
      { status: 201 }
    )
  } catch (error) {
    console.error('Failed to grade submission:', error)
    return NextResponse.json(
      { error: 'Failed to grade submission' },
      { status: 500 }
    )
  }
}
