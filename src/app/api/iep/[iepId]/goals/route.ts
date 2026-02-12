import { auth } from '@/lib/auth'
import { db } from '@/lib/db'
import { ieps, iepGoals, progressDataPoints } from '@/lib/db/schema'
import { eq, and, desc } from 'drizzle-orm'
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
  const conditions = [eq(ieps.id, iepId)]
  if (session.user.role === 'sped_teacher') {
    conditions.push(eq(ieps.authorId, session.user.id))
  }

  const [iep] = await db
    .select({ id: ieps.id })
    .from(ieps)
    .where(and(...conditions))
    .limit(1)

  if (!iep) {
    return NextResponse.json({ error: 'IEP not found' }, { status: 404 })
  }

  // Fetch goals
  const goals = await db
    .select()
    .from(iepGoals)
    .where(eq(iepGoals.iepId, iepId))

  // Fetch latest progress data point for each goal
  const goalsWithProgress = await Promise.all(
    goals.map(async (goal) => {
      const [latestProgress] = await db
        .select()
        .from(progressDataPoints)
        .where(eq(progressDataPoints.goalId, goal.id))
        .orderBy(desc(progressDataPoints.date))
        .limit(1)

      const allProgress = await db
        .select()
        .from(progressDataPoints)
        .where(eq(progressDataPoints.goalId, goal.id))
        .orderBy(desc(progressDataPoints.date))

      return {
        ...goal,
        latestProgress: latestProgress ?? null,
        dataPointCount: allProgress.length,
      }
    })
  )

  return NextResponse.json(goalsWithProgress)
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
  const conditions = [eq(ieps.id, iepId)]
  if (session.user.role === 'sped_teacher') {
    conditions.push(eq(ieps.authorId, session.user.id))
  }

  const [iep] = await db
    .select({ id: ieps.id })
    .from(ieps)
    .where(and(...conditions))
    .limit(1)

  if (!iep) {
    return NextResponse.json({ error: 'IEP not found' }, { status: 404 })
  }

  try {
    const body = await req.json()
    const {
      area,
      goalText,
      baseline,
      target,
      measureMethod,
      frequency,
      timeline,
      aiGenerated,
    } = body

    if (!area || !goalText) {
      return NextResponse.json(
        { error: 'Missing required fields: area, goalText' },
        { status: 400 }
      )
    }

    const [created] = await db
      .insert(iepGoals)
      .values({
        iepId,
        area,
        goalText,
        baseline: baseline ?? null,
        target: target ?? null,
        measureMethod: measureMethod ?? null,
        frequency: frequency ?? null,
        timeline: timeline ?? null,
        aiGenerated: aiGenerated ?? false,
      })
      .returning()

    return NextResponse.json(created, { status: 201 })
  } catch (error) {
    console.error('Failed to create IEP goal:', error)
    return NextResponse.json(
      { error: 'Failed to create IEP goal' },
      { status: 500 }
    )
  }
}
