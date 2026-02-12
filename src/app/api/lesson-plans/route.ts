import { NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { db } from '@/lib/db'
import { lessonPlans } from '@/lib/db/schema'
import { eq, desc } from 'drizzle-orm'

export async function GET() {
  const session = await auth()
  if (!session?.user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const plans = await db
    .select()
    .from(lessonPlans)
    .where(eq(lessonPlans.teacherId, session.user.id))
    .orderBy(desc(lessonPlans.createdAt))

  const parsed = plans.map((plan) => ({
    ...plan,
    standards: plan.standards ? JSON.parse(plan.standards) : [],
    objectives: JSON.parse(plan.objectives),
    materials: plan.materials ? JSON.parse(plan.materials) : [],
    differentiation: plan.differentiation ? JSON.parse(plan.differentiation) : null,
    aiMetadata: plan.aiMetadata ? JSON.parse(plan.aiMetadata) : null,
  }))

  return NextResponse.json(parsed)
}

export async function POST(request: Request) {
  const session = await auth()
  if (!session?.user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const body = await request.json()

  const {
    title,
    subject,
    gradeLevel,
    duration,
    standards,
    objectives,
    warmUp,
    directInstruction,
    guidedPractice,
    independentPractice,
    closure,
    materials,
    differentiation,
    assessmentPlan,
    aiMetadata,
  } = body

  if (!title || !subject || !gradeLevel || !objectives) {
    return NextResponse.json(
      { error: 'Missing required fields: title, subject, gradeLevel, objectives' },
      { status: 400 }
    )
  }

  const [created] = await db
    .insert(lessonPlans)
    .values({
      title,
      subject,
      gradeLevel,
      duration: duration ?? null,
      standards: standards ? JSON.stringify(standards) : null,
      objectives: JSON.stringify(objectives),
      warmUp: warmUp ?? null,
      directInstruction: directInstruction ?? null,
      guidedPractice: guidedPractice ?? null,
      independentPractice: independentPractice ?? null,
      closure: closure ?? null,
      materials: materials ? JSON.stringify(materials) : null,
      differentiation: differentiation ? JSON.stringify(differentiation) : null,
      assessmentPlan: assessmentPlan ?? null,
      teacherId: session.user.id,
      aiMetadata: aiMetadata ? JSON.stringify(aiMetadata) : null,
    })
    .returning()

  return NextResponse.json({
    ...created,
    standards: created.standards ? JSON.parse(created.standards) : [],
    objectives: JSON.parse(created.objectives),
    materials: created.materials ? JSON.parse(created.materials) : [],
    differentiation: created.differentiation ? JSON.parse(created.differentiation) : null,
    aiMetadata: created.aiMetadata ? JSON.parse(created.aiMetadata) : null,
  }, { status: 201 })
}
