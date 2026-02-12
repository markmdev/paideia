import { auth } from '@/lib/auth'
import { db } from '@/lib/db'
import {
  masteryRecords,
  submissions,
  criterionScores,
  rubricCriteria,
  assignments,
} from '@/lib/db/schema'
import { eq, inArray } from 'drizzle-orm'
import { NextResponse } from 'next/server'

function scoreToLevel(score: number, maxScore: number): string {
  if (maxScore === 0) return 'beginning'
  const pct = (score / maxScore) * 100
  if (pct >= 90) return 'advanced'
  if (pct >= 70) return 'proficient'
  if (pct >= 50) return 'developing'
  return 'beginning'
}

export async function POST(req: Request) {
  const session = await auth()
  if (!session?.user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const body = await req.json()
    const { submissionId, criterionScores: scores } = body as {
      submissionId: string
      criterionScores: { criterionId: string; score: number; maxScore: number }[]
    }

    if (!submissionId || !scores || !Array.isArray(scores) || scores.length === 0) {
      return NextResponse.json(
        { error: 'Missing required fields: submissionId, criterionScores' },
        { status: 400 }
      )
    }

    // Fetch the submission to get studentId and assignmentId
    const submissionRows = await db
      .select()
      .from(submissions)
      .where(eq(submissions.id, submissionId))

    if (submissionRows.length === 0) {
      return NextResponse.json({ error: 'Submission not found' }, { status: 404 })
    }

    const submission = submissionRows[0]

    // Fetch criterion details to get standardId mappings
    const criterionIds = scores.map((s) => s.criterionId)
    const criteriaRows = await db
      .select({
        id: rubricCriteria.id,
        standardId: rubricCriteria.standardId,
        name: rubricCriteria.name,
      })
      .from(rubricCriteria)
      .where(inArray(rubricCriteria.id, criterionIds))

    const criterionStandardMap = new Map(
      criteriaRows
        .filter((c) => c.standardId !== null)
        .map((c) => [c.id, c.standardId!])
    )

    // Create mastery records for each standard touched
    const masteryToInsert: {
      studentId: string
      standardId: string
      level: string
      score: number
      source: string
      assessedAt: Date
      notes: string | null
    }[] = []

    // Group scores by standard (multiple criteria can map to the same standard)
    const scoresByStandard = new Map<
      string,
      { totalScore: number; totalMaxScore: number; criterionNames: string[] }
    >()

    for (const s of scores) {
      const standardId = criterionStandardMap.get(s.criterionId)
      if (!standardId) continue

      const existing = scoresByStandard.get(standardId)
      const criterionName =
        criteriaRows.find((c) => c.id === s.criterionId)?.name ?? 'Unknown'

      if (existing) {
        existing.totalScore += s.score
        existing.totalMaxScore += s.maxScore
        existing.criterionNames.push(criterionName)
      } else {
        scoresByStandard.set(standardId, {
          totalScore: s.score,
          totalMaxScore: s.maxScore,
          criterionNames: [criterionName],
        })
      }
    }

    const now = new Date()

    for (const [standardId, data] of scoresByStandard) {
      const pct =
        data.totalMaxScore > 0
          ? Math.round((data.totalScore / data.totalMaxScore) * 100)
          : 0
      const level = scoreToLevel(data.totalScore, data.totalMaxScore)

      masteryToInsert.push({
        studentId: submission.studentId,
        standardId,
        level,
        score: pct,
        source: submission.assignmentId,
        assessedAt: now,
        notes: `Based on criteria: ${data.criterionNames.join(', ')}`,
      })
    }

    if (masteryToInsert.length > 0) {
      await db.insert(masteryRecords).values(masteryToInsert)
    }

    return NextResponse.json(
      {
        created: masteryToInsert.length,
        records: masteryToInsert.map((r) => ({
          standardId: r.standardId,
          level: r.level,
          score: r.score,
        })),
      },
      { status: 201 }
    )
  } catch (error) {
    console.error('Failed to update mastery records:', error)
    return NextResponse.json(
      { error: 'Failed to update mastery records' },
      { status: 500 }
    )
  }
}
