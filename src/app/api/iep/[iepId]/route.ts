import { auth } from '@/lib/auth'
import { db } from '@/lib/db'
import { ieps, iepGoals, progressDataPoints, users } from '@/lib/db/schema'
import { eq, and } from 'drizzle-orm'
import { NextResponse } from 'next/server'

async function verifyIEPAccess(iepId: string, userId: string, role: string) {
  const conditions = [eq(ieps.id, iepId)]

  // SPED teachers can only access their own IEPs
  if (role === 'sped_teacher') {
    conditions.push(eq(ieps.authorId, userId))
  }

  const [iep] = await db
    .select()
    .from(ieps)
    .where(and(...conditions))
    .limit(1)

  return iep ?? null
}

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

  const iep = await verifyIEPAccess(iepId, session.user.id, session.user.role)
  if (!iep) {
    return NextResponse.json({ error: 'IEP not found' }, { status: 404 })
  }

  // Fetch student info
  const [student] = await db
    .select({ id: users.id, name: users.name, email: users.email })
    .from(users)
    .where(eq(users.id, iep.studentId))
    .limit(1)

  // Fetch goals
  const goals = await db
    .select()
    .from(iepGoals)
    .where(eq(iepGoals.iepId, iepId))

  // Fetch progress data for each goal
  const goalIds = goals.map((g) => g.id)
  let progressData: (typeof progressDataPoints.$inferSelect)[] = []
  if (goalIds.length > 0) {
    progressData = await db
      .select()
      .from(progressDataPoints)
      .where(eq(progressDataPoints.goalId, goalIds[0]))

    // Fetch for remaining goals
    for (let i = 1; i < goalIds.length; i++) {
      const moreData = await db
        .select()
        .from(progressDataPoints)
        .where(eq(progressDataPoints.goalId, goalIds[i]))
      progressData.push(...moreData)
    }
  }

  // Group progress data by goal
  const progressByGoal: Record<string, typeof progressData> = {}
  for (const dp of progressData) {
    if (!progressByGoal[dp.goalId]) {
      progressByGoal[dp.goalId] = []
    }
    progressByGoal[dp.goalId].push(dp)
  }

  return NextResponse.json({
    ...iep,
    accommodations: iep.accommodations ? JSON.parse(iep.accommodations) : null,
    modifications: iep.modifications ? JSON.parse(iep.modifications) : null,
    relatedServices: iep.relatedServices
      ? JSON.parse(iep.relatedServices)
      : null,
    transitionPlan: iep.transitionPlan
      ? JSON.parse(iep.transitionPlan)
      : null,
    aiMetadata: iep.aiMetadata ? JSON.parse(iep.aiMetadata) : null,
    student,
    goals: goals.map((g) => ({
      ...g,
      progressData: progressByGoal[g.id] ?? [],
    })),
  })
}

export async function PUT(
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

  const existing = await verifyIEPAccess(
    iepId,
    session.user.id,
    session.user.role
  )
  if (!existing) {
    return NextResponse.json({ error: 'IEP not found' }, { status: 404 })
  }

  try {
    const body = await req.json()
    const updateData: Record<string, unknown> = {}

    // Simple text fields
    const textFields = [
      'presentLevels',
      'disabilityCategory',
      'meetingNotes',
      'parentInput',
      'status',
    ]

    for (const field of textFields) {
      if (body[field] !== undefined) {
        updateData[field] = body[field]
      }
    }

    // JSON fields
    const jsonFields = [
      'accommodations',
      'modifications',
      'relatedServices',
      'transitionPlan',
      'aiMetadata',
    ]

    for (const field of jsonFields) {
      if (body[field] !== undefined) {
        updateData[field] = body[field]
          ? JSON.stringify(body[field])
          : null
      }
    }

    // Date fields
    if (body.startDate !== undefined) {
      updateData.startDate = body.startDate ? new Date(body.startDate) : null
    }
    if (body.endDate !== undefined) {
      updateData.endDate = body.endDate ? new Date(body.endDate) : null
    }
    if (body.meetingDate !== undefined) {
      updateData.meetingDate = body.meetingDate
        ? new Date(body.meetingDate)
        : null
    }

    updateData.updatedAt = new Date()

    const [updated] = await db
      .update(ieps)
      .set(updateData)
      .where(eq(ieps.id, iepId))
      .returning()

    return NextResponse.json(updated)
  } catch (error) {
    console.error('Failed to update IEP:', error)
    return NextResponse.json(
      { error: 'Failed to update IEP' },
      { status: 500 }
    )
  }
}

export async function DELETE(
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

  const existing = await verifyIEPAccess(
    iepId,
    session.user.id,
    session.user.role
  )
  if (!existing) {
    return NextResponse.json({ error: 'IEP not found' }, { status: 404 })
  }

  // Soft delete: set status to archived
  const [archived] = await db
    .update(ieps)
    .set({ status: 'archived', updatedAt: new Date() })
    .where(eq(ieps.id, iepId))
    .returning()

  return NextResponse.json(archived)
}
