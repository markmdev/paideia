import { auth } from '@/lib/auth'
import { db } from '@/lib/db'
import { ieps, iepGoals, progressDataPoints, users, auditLogs } from '@/lib/db/schema'
import { eq, and } from 'drizzle-orm'
import { NextResponse } from 'next/server'
import { generateProgressNarrative } from '@/lib/ai/iep-service'

export async function POST(
  req: Request,
  { params }: { params: Promise<{ iepId: string }> }
) {
  const session = await auth()
  if (!session?.user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  if (session.user.role !== 'sped_teacher' && session.user.role !== 'admin') {
    return NextResponse.json(
      { error: 'Forbidden: SPED teacher or admin role required' },
      { status: 403 }
    )
  }

  const { iepId } = await params

  // Verify IEP access
  const iepConditions = [eq(ieps.id, iepId)]
  if (session.user.role === 'sped_teacher') {
    iepConditions.push(eq(ieps.authorId, session.user.id))
  }

  const [iep] = await db
    .select({ id: ieps.id, studentId: ieps.studentId })
    .from(ieps)
    .where(and(...iepConditions))
    .limit(1)

  if (!iep) {
    return NextResponse.json({ error: 'IEP not found' }, { status: 404 })
  }

  try {
    const body = await req.json()
    const { goalId } = body

    if (!goalId) {
      return NextResponse.json(
        { error: 'Missing required field: goalId' },
        { status: 400 }
      )
    }

    // Verify goal belongs to this IEP
    const [goal] = await db
      .select()
      .from(iepGoals)
      .where(and(eq(iepGoals.id, goalId), eq(iepGoals.iepId, iepId)))
      .limit(1)

    if (!goal) {
      return NextResponse.json(
        { error: 'Goal not found on this IEP' },
        { status: 404 }
      )
    }

    // Fetch student name
    const [student] = await db
      .select({ name: users.name })
      .from(users)
      .where(eq(users.id, iep.studentId))
      .limit(1)

    // Fetch all data points for this goal
    const dataPoints = await db
      .select()
      .from(progressDataPoints)
      .where(eq(progressDataPoints.goalId, goalId))

    // Parse target as a number for the AI service
    const targetValue = goal.target ? parseFloat(goal.target) : 100

    const result = await generateProgressNarrative({
      goalText: goal.goalText,
      dataPoints: dataPoints.map((dp) => ({
        date: dp.date.toISOString().split('T')[0],
        value: dp.value,
        notes: dp.notes ?? undefined,
      })),
      targetValue: isNaN(targetValue) ? 100 : targetValue,
      unit: dataPoints.length > 0 ? dataPoints[0].unit : 'points',
      studentName: student?.name ?? 'Student',
    })

    // Log to audit trail
    await db.insert(auditLogs).values({
      entityType: 'iep_progress_narrative',
      entityId: goalId,
      action: 'ai_generate',
      userId: session.user.id,
      after: JSON.stringify(result),
      aiModel: result.audit.modelVersion,
      aiPrompt: 'generateProgressNarrative',
    })

    return NextResponse.json(result, { status: 201 })
  } catch (error) {
    console.error('Failed to generate progress narrative:', error)
    return NextResponse.json(
      { error: 'Failed to generate progress narrative' },
      { status: 500 }
    )
  }
}
