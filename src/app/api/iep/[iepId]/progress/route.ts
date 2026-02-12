import { auth } from '@/lib/auth'
import { db } from '@/lib/db'
import { ieps, iepGoals, progressDataPoints } from '@/lib/db/schema'
import { eq, and, desc, inArray } from 'drizzle-orm'
import { NextResponse } from 'next/server'

export async function GET(
  _req: Request,
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
    .select({ id: ieps.id })
    .from(ieps)
    .where(and(...iepConditions))
    .limit(1)

  if (!iep) {
    return NextResponse.json({ error: 'IEP not found' }, { status: 404 })
  }

  // Get all goals for this IEP
  const goals = await db
    .select()
    .from(iepGoals)
    .where(eq(iepGoals.iepId, iepId))

  const goalIds = goals.map((g) => g.id)

  if (goalIds.length === 0) {
    return NextResponse.json([])
  }

  // Get all progress data points for these goals
  const dataPoints = await db
    .select()
    .from(progressDataPoints)
    .where(inArray(progressDataPoints.goalId, goalIds))
    .orderBy(desc(progressDataPoints.date))

  // Group by goal
  const progressByGoal = goals.map((goal) => ({
    goal: {
      id: goal.id,
      area: goal.area,
      goalText: goal.goalText,
      baseline: goal.baseline,
      target: goal.target,
      status: goal.status,
    },
    dataPoints: dataPoints.filter((dp) => dp.goalId === goal.id),
  }))

  return NextResponse.json(progressByGoal)
}

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
    const { goalId, value, unit, notes } = body

    if (!goalId || value === undefined || !unit) {
      return NextResponse.json(
        { error: 'Missing required fields: goalId, value, unit' },
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

    const [created] = await db
      .insert(progressDataPoints)
      .values({
        goalId,
        studentId: iep.studentId,
        value,
        unit,
        notes: notes ?? null,
        recordedBy: session.user.id,
      })
      .returning()

    return NextResponse.json(created, { status: 201 })
  } catch (error) {
    console.error('Failed to add progress data point:', error)
    return NextResponse.json(
      { error: 'Failed to add progress data point' },
      { status: 500 }
    )
  }
}
