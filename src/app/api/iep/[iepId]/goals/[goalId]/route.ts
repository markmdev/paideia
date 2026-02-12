import { auth } from '@/lib/auth'
import { db } from '@/lib/db'
import { ieps, iepGoals } from '@/lib/db/schema'
import { eq, and } from 'drizzle-orm'
import { NextResponse } from 'next/server'

export async function PUT(
  req: Request,
  { params }: { params: Promise<{ iepId: string; goalId: string }> }
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

  const { iepId, goalId } = await params

  // Verify IEP access
  const iepConditions = [eq(ieps.id, iepId)]
  if (session.user.role === 'sped_teacher') {
    iepConditions.push(eq(ieps.authorId, session.user.id))
  }

  const [iep] = await db
    .select({ id: ieps.id })
    .from(ieps)
    .where(and(...iepConditions))
    .limit(1)

  if (!iep) {
    return NextResponse.json({ error: 'IEP not found' }, { status: 404 })
  }

  // Verify goal belongs to this IEP
  const [existingGoal] = await db
    .select()
    .from(iepGoals)
    .where(and(eq(iepGoals.id, goalId), eq(iepGoals.iepId, iepId)))
    .limit(1)

  if (!existingGoal) {
    return NextResponse.json({ error: 'Goal not found' }, { status: 404 })
  }

  try {
    const body = await req.json()
    const updateData: Record<string, unknown> = {}

    const allowedFields = [
      'area',
      'goalText',
      'baseline',
      'target',
      'measureMethod',
      'frequency',
      'timeline',
      'status',
    ]

    for (const field of allowedFields) {
      if (body[field] !== undefined) {
        updateData[field] = body[field]
      }
    }

    if (body.similarityScore !== undefined) {
      updateData.similarityScore = body.similarityScore
    }

    if (body.aiGenerated !== undefined) {
      updateData.aiGenerated = body.aiGenerated
    }

    const [updated] = await db
      .update(iepGoals)
      .set(updateData)
      .where(eq(iepGoals.id, goalId))
      .returning()

    return NextResponse.json(updated)
  } catch (error) {
    console.error('Failed to update IEP goal:', error)
    return NextResponse.json(
      { error: 'Failed to update IEP goal' },
      { status: 500 }
    )
  }
}

export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ iepId: string; goalId: string }> }
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

  const { iepId, goalId } = await params

  // Verify IEP access
  const iepConditions = [eq(ieps.id, iepId)]
  if (session.user.role === 'sped_teacher') {
    iepConditions.push(eq(ieps.authorId, session.user.id))
  }

  const [iep] = await db
    .select({ id: ieps.id })
    .from(ieps)
    .where(and(...iepConditions))
    .limit(1)

  if (!iep) {
    return NextResponse.json({ error: 'IEP not found' }, { status: 404 })
  }

  // Verify goal belongs to this IEP
  const [existingGoal] = await db
    .select()
    .from(iepGoals)
    .where(and(eq(iepGoals.id, goalId), eq(iepGoals.iepId, iepId)))
    .limit(1)

  if (!existingGoal) {
    return NextResponse.json({ error: 'Goal not found' }, { status: 404 })
  }

  // Cascade delete will handle progress data points
  await db.delete(iepGoals).where(eq(iepGoals.id, goalId))

  return NextResponse.json({ success: true })
}
