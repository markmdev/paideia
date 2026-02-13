import { db } from '@/lib/db'
import {
  submissions,
  feedbackDrafts,
  criterionScores,
} from '@/lib/db/schema'
import { eq } from 'drizzle-orm'
import type { GradeSubmissionInput, GradingResult } from '@/lib/ai/grade-submission'

/**
 * Build the rubric and assignment input structures used by the grading AI service.
 */
export function buildRubricInput(
  rubric: { title: string; levels: string },
  criteria: { id: string; name: string; description: string | null; weight: number; descriptors: string }[],
  assignment: { title: string; description: string; instructions: string | null; subject: string; gradeLevel: string }
): { rubric: GradeSubmissionInput['rubric']; assignment: GradeSubmissionInput['assignment'] } {
  return {
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
      title: assignment.title,
      description: assignment.description,
      instructions: assignment.instructions ?? undefined,
      subject: assignment.subject,
      gradeLevel: assignment.gradeLevel,
    },
  }
}

/**
 * Persist a grading result: insert feedback draft and criterion scores,
 * then update the submission with score totals and graded status.
 *
 * When `extraMeta` is provided, its entries are merged into the aiMetadata JSON object.
 */
export async function persistGradingResult(
  submissionId: string,
  teacherId: string,
  gradingResult: GradingResult,
  extraMeta?: Record<string, unknown>
): Promise<void> {
  // Delete existing feedback and scores if re-grading
  await db.delete(feedbackDrafts).where(eq(feedbackDrafts.submissionId, submissionId))
  await db.delete(criterionScores).where(eq(criterionScores.submissionId, submissionId))

  // Store feedback draft
  await db.insert(feedbackDrafts).values({
    submissionId,
    teacherId,
    aiFeedback: gradingResult.overallFeedback,
    strengths: JSON.stringify(gradingResult.strengths),
    improvements: JSON.stringify(gradingResult.improvements),
    nextSteps: JSON.stringify(gradingResult.nextSteps),
    aiMetadata: JSON.stringify({
      misconceptions: gradingResult.misconceptions,
      letterGrade: gradingResult.letterGrade,
      ...extraMeta,
    }),
    status: 'draft',
  })

  // Store criterion scores
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
    .where(eq(submissions.id, submissionId))
}
