import { NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { db } from '@/lib/db'
import { lessonPlans } from '@/lib/db/schema'
import { eq, and } from 'drizzle-orm'

function parseLessonPlan(plan: typeof lessonPlans.$inferSelect) {
  return {
    ...plan,
    standards: plan.standards ? JSON.parse(plan.standards) : [],
    objectives: JSON.parse(plan.objectives),
    materials: plan.materials ? JSON.parse(plan.materials) : [],
    differentiation: plan.differentiation ? JSON.parse(plan.differentiation) : null,
    aiMetadata: plan.aiMetadata ? JSON.parse(plan.aiMetadata) : null,
  }
}

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth()
  if (!session?.user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { id } = await params

  const [plan] = await db
    .select()
    .from(lessonPlans)
    .where(
      and(
        eq(lessonPlans.id, id),
        eq(lessonPlans.teacherId, session.user.id)
      )
    )

  if (!plan) {
    return NextResponse.json({ error: 'Lesson plan not found' }, { status: 404 })
  }

  return NextResponse.json(parseLessonPlan(plan))
}

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth()
  if (!session?.user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { id } = await params
  const body = await request.json()

  const [existing] = await db
    .select()
    .from(lessonPlans)
    .where(
      and(
        eq(lessonPlans.id, id),
        eq(lessonPlans.teacherId, session.user.id)
      )
    )

  if (!existing) {
    return NextResponse.json({ error: 'Lesson plan not found' }, { status: 404 })
  }

  const updateData: Record<string, unknown> = { updatedAt: new Date() }

  if (body.title !== undefined) updateData.title = body.title
  if (body.subject !== undefined) updateData.subject = body.subject
  if (body.gradeLevel !== undefined) updateData.gradeLevel = body.gradeLevel
  if (body.duration !== undefined) updateData.duration = body.duration
  if (body.warmUp !== undefined) updateData.warmUp = body.warmUp
  if (body.directInstruction !== undefined) updateData.directInstruction = body.directInstruction
  if (body.guidedPractice !== undefined) updateData.guidedPractice = body.guidedPractice
  if (body.independentPractice !== undefined) updateData.independentPractice = body.independentPractice
  if (body.closure !== undefined) updateData.closure = body.closure
  if (body.assessmentPlan !== undefined) updateData.assessmentPlan = body.assessmentPlan
  if (body.standards !== undefined) updateData.standards = JSON.stringify(body.standards)
  if (body.objectives !== undefined) updateData.objectives = JSON.stringify(body.objectives)
  if (body.materials !== undefined) updateData.materials = JSON.stringify(body.materials)
  if (body.differentiation !== undefined) updateData.differentiation = JSON.stringify(body.differentiation)

  const [updated] = await db
    .update(lessonPlans)
    .set(updateData)
    .where(
      and(
        eq(lessonPlans.id, id),
        eq(lessonPlans.teacherId, session.user.id)
      )
    )
    .returning()

  return NextResponse.json(parseLessonPlan(updated))
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth()
  if (!session?.user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { id } = await params

  const [deleted] = await db
    .delete(lessonPlans)
    .where(
      and(
        eq(lessonPlans.id, id),
        eq(lessonPlans.teacherId, session.user.id)
      )
    )
    .returning()

  if (!deleted) {
    return NextResponse.json({ error: 'Lesson plan not found' }, { status: 404 })
  }

  return NextResponse.json({ success: true })
}
