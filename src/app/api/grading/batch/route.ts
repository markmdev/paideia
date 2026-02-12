import { auth } from '@/lib/auth'
import { db } from '@/lib/db'
import {
  submissions,
  feedbackDrafts,
  criterionScores,
  assignments,
  rubrics,
  rubricCriteria,
} from '@/lib/db/schema'
import { eq, and } from 'drizzle-orm'
import { NextResponse } from 'next/server'
import { batchGradeSubmissions } from '@/lib/ai/grade-submission'
import type { GradeSubmissionInput } from '@/lib/ai/grade-submission'

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
    const rubricData: GradeSubmissionInput['rubric'] = {
      title: rubric.title,
      levels: JSON.parse(rubric.levels) as string[],
      criteria: criteria.map((c) => ({
        id: c.id,
        name: c.name,
        description: c.description ?? '',
        weight: c.weight,
        descriptors: JSON.parse(c.descriptors) as Record<string, string>,
      })),
    }

    const assignmentData: GradeSubmissionInput['assignment'] = {
      title: assignment.title,
      description: assignment.description,
      instructions: assignment.instructions ?? undefined,
      subject: assignment.subject,
      gradeLevel: assignment.gradeLevel,
    }

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
        const gradingResult = result.result

        // Store feedback draft
        await db.insert(feedbackDrafts).values({
          submissionId: result.submissionId,
          teacherId: session.user.id,
          aiFeedback: gradingResult.overallFeedback,
          strengths: JSON.stringify(gradingResult.strengths),
          improvements: JSON.stringify(gradingResult.improvements),
          nextSteps: JSON.stringify(gradingResult.nextSteps),
          aiMetadata: JSON.stringify({
            misconceptions: gradingResult.misconceptions,
            letterGrade: gradingResult.letterGrade,
            batchGraded: true,
          }),
          status: 'draft',
        })

        // Store criterion scores
        if (gradingResult.criterionScores.length > 0) {
          await db.insert(criterionScores).values(
            gradingResult.criterionScores.map((cs) => ({
              submissionId: result.submissionId,
              criterionId: cs.criterionId,
              level: cs.level,
              score: cs.score,
              maxScore: cs.maxScore,
              justification: cs.justification,
            }))
          )
        }

        // Update submission with scores and status
        await db
          .update(submissions)
          .set({
            status: 'graded',
            totalScore: gradingResult.totalScore,
            maxScore: gradingResult.maxScore,
            letterGrade: gradingResult.letterGrade,
            gradedAt: new Date(),
          })
          .where(eq(submissions.id, result.submissionId))

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
