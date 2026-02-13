import { auth } from '@/lib/auth'
import { db } from '@/lib/db'
import {
  submissions,
  assignments,
  rubrics,
  rubricCriteria,
} from '@/lib/db/schema'
import { eq, and } from 'drizzle-orm'
import { NextResponse } from 'next/server'
import { batchGradeSubmissions } from '@/lib/ai/grade-submission'
import { buildRubricInput, persistGradingResult } from '@/lib/grading-helpers'

export async function POST(req: Request) {
  const session = await auth()
  if (!session?.user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const body = await req.json()
    const { assignmentId, feedbackTone } = body

    if (!assignmentId) {
      return NextResponse.json(
        { error: 'Missing required field: assignmentId' },
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

    if (!assignment.rubricId) {
      return NextResponse.json(
        { error: 'Assignment has no rubric. Create a rubric before grading.' },
        { status: 400 }
      )
    }

    // Fetch the rubric and criteria
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

    // Fetch all ungraded submissions for this assignment
    const ungradedSubmissions = await db
      .select()
      .from(submissions)
      .where(
        and(
          eq(submissions.assignmentId, assignmentId),
          eq(submissions.status, 'submitted')
        )
      )

    if (ungradedSubmissions.length === 0) {
      return NextResponse.json({
        total: 0,
        graded: 0,
        failed: 0,
        message: 'No ungraded submissions found for this assignment.',
      })
    }

    // Mark all submissions as grading
    const submissionIds = ungradedSubmissions.map((s) => s.id)
    for (const id of submissionIds) {
      await db
        .update(submissions)
        .set({ status: 'grading' })
        .where(eq(submissions.id, id))
    }

    // Build rubric and assignment data for the batch
    const { rubric: rubricData, assignment: assignmentData } = buildRubricInput(rubric, criteria, assignment)

    const batchInput = ungradedSubmissions.map((s) => ({
      id: s.id,
      studentWork: s.content,
    }))

    // Call batch grading with prompt caching
    const batchResults = await batchGradeSubmissions(
      batchInput,
      rubricData,
      assignmentData,
      { feedbackTone }
    )

    let graded = 0
    let failed = 0

    for (const result of batchResults) {
      try {
        await persistGradingResult(
          result.submissionId,
          session.user.id,
          result.result,
          { batchGraded: true }
        )

        graded++
      } catch (err) {
        console.error(
          `Failed to store grading for submission ${result.submissionId}:`,
          err
        )

        // Revert submission status to submitted
        await db
          .update(submissions)
          .set({ status: 'submitted' })
          .where(eq(submissions.id, result.submissionId))

        failed++
      }
    }

    return NextResponse.json({
      total: ungradedSubmissions.length,
      graded,
      failed,
    })
  } catch (error) {
    console.error('Failed to batch grade submissions:', error)
    return NextResponse.json(
      { error: 'Failed to batch grade submissions' },
      { status: 500 }
    )
  }
}
