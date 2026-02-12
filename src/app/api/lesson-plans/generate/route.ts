import { NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { db } from '@/lib/db'
import { lessonPlans } from '@/lib/db/schema'
import { generateLessonPlan, type LessonPlanInput } from '@/lib/ai/generate-lesson-plan'

export async function POST(request: Request) {
  const session = await auth()
  if (!session?.user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const body = await request.json()

  const { subject, gradeLevel, topic, duration, standards, instructionalModel } = body

  if (!subject || !gradeLevel || !topic) {
    return NextResponse.json(
      { error: 'Missing required fields: subject, gradeLevel, topic' },
      { status: 400 }
    )
  }

  const normalizedStandards = standards
    ? Array.isArray(standards)
      ? standards
      : String(standards).split(',').map((s: string) => s.trim()).filter(Boolean)
    : undefined

  const input: LessonPlanInput = {
    subject,
    gradeLevel,
    topic,
    duration: duration || undefined,
    standards: normalizedStandards,
    instructionalModel: instructionalModel || undefined,
  }

  let generated
  try {
    generated = await generateLessonPlan(input)
  } catch (error) {
    console.error('AI generation failed:', error)
    return NextResponse.json(
      { error: 'Failed to generate lesson plan. Please try again.' },
      { status: 500 }
    )
  }

  const [created] = await db
    .insert(lessonPlans)
    .values({
      title: generated.title,
      subject,
      gradeLevel,
      duration: generated.estimatedDuration || duration || null,
      standards: generated.standards ? JSON.stringify(generated.standards) : null,
      objectives: JSON.stringify(generated.objectives),
      warmUp: generated.warmUp,
      directInstruction: generated.directInstruction,
      guidedPractice: generated.guidedPractice,
      independentPractice: generated.independentPractice,
      closure: generated.closure,
      materials: generated.materials ? JSON.stringify(generated.materials) : null,
      differentiation: generated.differentiation
        ? JSON.stringify(generated.differentiation)
        : null,
      assessmentPlan: generated.assessmentPlan,
      teacherId: session.user.id,
      aiMetadata: JSON.stringify({
        generatedAt: new Date().toISOString(),
        model: 'claude-opus-4-6',
        input: { subject, gradeLevel, topic, duration, instructionalModel },
      }),
    })
    .returning()

  return NextResponse.json(
    {
      ...created,
      standards: created.standards ? JSON.parse(created.standards) : [],
      objectives: JSON.parse(created.objectives),
      materials: created.materials ? JSON.parse(created.materials) : [],
      differentiation: created.differentiation
        ? JSON.parse(created.differentiation)
        : null,
      aiMetadata: created.aiMetadata ? JSON.parse(created.aiMetadata) : null,
    },
    { status: 201 }
  )
}
