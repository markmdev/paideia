import { auth } from '@/lib/auth'
import { db } from '@/lib/db'
import {
  submissions,
  feedbackDrafts,
  criterionScores,
  assignments,
  rubrics,
  rubricCriteria,
  users,
} from '@/lib/db/schema'
import { eq, and } from 'drizzle-orm'
import { NextResponse } from 'next/server'
import { gradeSubmission } from '@/lib/ai/grade-submission'
import type { GradeSubmissionInput } from '@/lib/ai/grade-submission'

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ submissionId: string }> }
) {
  const session = await auth()
  if (!session?.user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { submissionId } = await params

  // Fetch submission with assignment and student details
  const [submission] = await db
    .select({
      id: submissions.id,
      assignmentId: submissions.assignmentId,
      studentId: submissions.studentId,
      studentName: users.name,
      content: submissions.content,
      attachments: submissions.attachments,
      status: submissions.status,
      totalScore: submissions.totalScore,
      maxScore: submissions.maxScore,
      letterGrade: submissions.letterGrade,
      submittedAt: submissions.submittedAt,
      gradedAt: submissions.gradedAt,
      assignmentTitle: assignments.title,
      assignmentDescription: assignments.description,
      subject: assignments.subject,
      gradeLevel: assignments.gradeLevel,
      rubricId: assignments.rubricId,
      teacherId: assignments.teacherId,
    })
    .from(submissions)
    .innerJoin(assignments, eq(submissions.assignmentId, assignments.id))
    .innerJoin(users, eq(submissions.studentId, users.id))
    .where(eq(submissions.id, submissionId))
    .limit(1)

  if (!submission) {
    return NextResponse.json(
      { error: 'Submission not found' },
      { status: 404 }
    )
  }

  // Verify the teacher owns this assignment
  if (submission.teacherId !== session.user.id) {
    return NextResponse.json(
      { error: 'You do not have access to this submission' },
      { status: 403 }
    )
  }

  // Fetch feedback draft
  const [feedback] = await db
    .select()
    .from(feedbackDrafts)
    .where(eq(feedbackDrafts.submissionId, submissionId))
    .limit(1)

  // Fetch criterion scores
  const scores = await db
    .select({
      id: criterionScores.id,
      criterionId: criterionScores.criterionId,
      criterionName: rubricCriteria.name,
      level: criterionScores.level,
      score: criterionScores.score,
      maxScore: criterionScores.maxScore,
      justification: criterionScores.justification,
    })
    .from(criterionScores)
    .innerJoin(
      rubricCriteria,
      eq(criterionScores.criterionId, rubricCriteria.id)
    )
    .where(eq(criterionScores.submissionId, submissionId))

  return NextResponse.json({
    submission: {
      id: submission.id,
      assignmentId: submission.assignmentId,
      studentId: submission.studentId,
      studentName: submission.studentName,
      content: submission.content,
      attachments: submission.attachments
        ? JSON.parse(submission.attachments)
        : null,
      status: submission.status,
      totalScore: submission.totalScore,
      maxScore: submission.maxScore,
      letterGrade: submission.letterGrade,
      submittedAt: submission.submittedAt,
      gradedAt: submission.gradedAt,
    },
    assignment: {
      title: submission.assignmentTitle,
      description: submission.assignmentDescription,
      subject: submission.subject,
      gradeLevel: submission.gradeLevel,
    },
    feedback: feedback
      ? {
          id: feedback.id,
          aiFeedback: feedback.aiFeedback,
          teacherEdits: feedback.teacherEdits,
          finalFeedback: feedback.finalFeedback,
          status: feedback.status,
          strengths: feedback.strengths
            ? JSON.parse(feedback.strengths)
            : null,
          improvements: feedback.improvements
            ? JSON.parse(feedback.improvements)
            : null,
          nextSteps: feedback.nextSteps
            ? JSON.parse(feedback.nextSteps)
            : null,
          aiMetadata: feedback.aiMetadata
            ? JSON.parse(feedback.aiMetadata)
            : null,
          createdAt: feedback.createdAt,
          updatedAt: feedback.updatedAt,
        }
      : null,
    criterionScores: scores,
  })
}

export async function PUT(
  req: Request,
  { params }: { params: Promise<{ submissionId: string }> }
) {
  const session = await auth()
  if (!session?.user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { submissionId } = await params

  try {
    const body = await req.json()
    const { action, teacherEdits, finalFeedback, feedbackTone } = body

    if (!action || !['approve', 'edit', 'regenerate'].includes(action)) {
      return NextResponse.json(
        { error: 'Invalid action. Must be approve, edit, or regenerate.' },
        { status: 400 }
      )
    }

    // Verify submission exists and teacher owns it
    const [submission] = await db
      .select({
        id: submissions.id,
        assignmentId: submissions.assignmentId,
        content: submissions.content,
        teacherId: assignments.teacherId,
        rubricId: assignments.rubricId,
        assignmentTitle: assignments.title,
        assignmentDescription: assignments.description,
        assignmentInstructions: assignments.instructions,
        subject: assignments.subject,
        gradeLevel: assignments.gradeLevel,
      })
      .from(submissions)
      .innerJoin(assignments, eq(submissions.assignmentId, assignments.id))
      .where(eq(submissions.id, submissionId))
      .limit(1)

    if (!submission) {
      return NextResponse.json(
        { error: 'Submission not found' },
        { status: 404 }
      )
    }

    if (submission.teacherId !== session.user.id) {
      return NextResponse.json(
        { error: 'You do not have access to this submission' },
        { status: 403 }
      )
    }

    // Fetch the existing feedback draft
    const [existingFeedback] = await db
      .select()
      .from(feedbackDrafts)
      .where(eq(feedbackDrafts.submissionId, submissionId))
      .limit(1)

    if (!existingFeedback) {
      return NextResponse.json(
        { error: 'No feedback draft found. Grade the submission first.' },
        { status: 404 }
      )
    }

    if (action === 'approve') {
      const approved = finalFeedback ?? existingFeedback.teacherEdits ?? existingFeedback.aiFeedback

      await db
        .update(feedbackDrafts)
        .set({
          status: 'approved',
          finalFeedback: approved,
          updatedAt: new Date(),
        })
        .where(eq(feedbackDrafts.id, existingFeedback.id))

      await db
        .update(submissions)
        .set({ status: 'returned' })
        .where(eq(submissions.id, submissionId))

      return NextResponse.json({
        status: 'approved',
        finalFeedback: approved,
        submissionStatus: 'returned',
      })
    }

    if (action === 'edit') {
      if (!teacherEdits && !finalFeedback) {
        return NextResponse.json(
          { error: 'Provide teacherEdits or finalFeedback for edit action.' },
          { status: 400 }
        )
      }

      await db
        .update(feedbackDrafts)
        .set({
          teacherEdits: teacherEdits ?? existingFeedback.teacherEdits,
          finalFeedback: finalFeedback ?? existingFeedback.finalFeedback,
          status: 'edited',
          updatedAt: new Date(),
        })
        .where(eq(feedbackDrafts.id, existingFeedback.id))

      return NextResponse.json({
        status: 'edited',
        teacherEdits: teacherEdits ?? existingFeedback.teacherEdits,
        finalFeedback: finalFeedback ?? existingFeedback.finalFeedback,
      })
    }

    if (action === 'regenerate') {
      if (!submission.rubricId) {
        return NextResponse.json(
          { error: 'Assignment has no rubric.' },
          { status: 400 }
        )
      }

      const [rubric] = await db
        .select()
        .from(rubrics)
        .where(eq(rubrics.id, submission.rubricId))
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

      const gradeInput: GradeSubmissionInput = {
        studentWork: submission.content,
        rubric: {
          title: rubric.title,
          levels: JSON.parse(rubric.levels) as string[],
          criteria: criteria.map((c) => ({
            id: c.id,
            name: c.name,
            description: c.description ?? '',
            weight: c.weight,
            descriptors: JSON.parse(c.descriptors) as Record<string, string>,
          })),
        },
        assignment: {
          title: submission.assignmentTitle,
          description: submission.assignmentDescription,
          instructions: submission.assignmentInstructions ?? undefined,
          subject: submission.subject,
          gradeLevel: submission.gradeLevel,
        },
        feedbackTone: feedbackTone ?? undefined,
        teacherGuidance: teacherEdits ?? undefined,
      }

      const gradingResult = await gradeSubmission(gradeInput)

      // Update feedback draft with new AI feedback
      await db
        .update(feedbackDrafts)
        .set({
          aiFeedback: gradingResult.overallFeedback,
          teacherEdits: teacherEdits ?? null,
          finalFeedback: null,
          status: 'draft',
          strengths: JSON.stringify(gradingResult.strengths),
          improvements: JSON.stringify(gradingResult.improvements),
          nextSteps: JSON.stringify(gradingResult.nextSteps),
          aiMetadata: JSON.stringify({
            misconceptions: gradingResult.misconceptions,
            letterGrade: gradingResult.letterGrade,
            regeneratedAt: new Date().toISOString(),
          }),
          updatedAt: new Date(),
        })
        .where(eq(feedbackDrafts.id, existingFeedback.id))

      // Replace criterion scores
      await db
        .delete(criterionScores)
        .where(eq(criterionScores.submissionId, submissionId))

      if (gradingResult.criterionScores.length > 0) {
        await db.insert(criterionScores).values(
          gradingResult.criterionScores.map((cs) => ({
            submissionId,
            criterionId: cs.criterionId,
            level: cs.level,
            score: cs.score,
            maxScore: cs.maxScore,
            justification: cs.justification,
          }))
        )
      }

      // Update submission scores
      await db
        .update(submissions)
        .set({
          totalScore: gradingResult.totalScore,
          maxScore: gradingResult.maxScore,
          letterGrade: gradingResult.letterGrade,
          status: 'graded',
        })
        .where(eq(submissions.id, submissionId))

      return NextResponse.json({
        status: 'regenerated',
        totalScore: gradingResult.totalScore,
        maxScore: gradingResult.maxScore,
        letterGrade: gradingResult.letterGrade,
        feedback: gradingResult.overallFeedback,
        criterionScores: gradingResult.criterionScores,
        strengths: gradingResult.strengths,
        improvements: gradingResult.improvements,
        nextSteps: gradingResult.nextSteps,
      })
    }

    return NextResponse.json({ error: 'Unknown action' }, { status: 400 })
  } catch (error) {
    console.error('Failed to update grading:', error)
    return NextResponse.json(
      { error: 'Failed to update grading' },
      { status: 500 }
    )
  }
}
