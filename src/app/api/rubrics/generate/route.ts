import { auth } from '@/lib/auth'
import { db } from '@/lib/db'
import { rubrics, rubricCriteria } from '@/lib/db/schema'
import { eq } from 'drizzle-orm'
import { NextResponse } from 'next/server'
import { generateRubric, type RubricInput } from '@/lib/ai/generate-rubric'

export async function POST(req: Request) {
  const session = await auth()
  if (!session?.user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const body = await req.json()
    const { title, subject, gradeLevel, assignmentDescription, standards, levels } = body

    if (!title || !subject || !gradeLevel || !assignmentDescription) {
      return NextResponse.json(
        { error: 'Missing required fields: title, subject, gradeLevel, assignmentDescription' },
        { status: 400 }
      )
    }

    const input: RubricInput = {
      title,
      subject,
      gradeLevel,
      assignmentDescription,
      standards: standards ?? undefined,
      levels: levels ?? undefined,
    }

    const generated = await generateRubric(input)

    const [created] = await db
      .insert(rubrics)
      .values({
        title: generated.title,
        description: generated.description,
        type: generated.type,
        levels: JSON.stringify(generated.levels),
        teacherId: session.user.id,
        isTemplate: false,
      })
      .returning()

    if (generated.criteria.length > 0) {
      await db.insert(rubricCriteria).values(
        generated.criteria.map((c) => ({
          rubricId: created.id,
          name: c.name,
          description: c.description,
          weight: c.weight,
          standardId: null,
          descriptors: JSON.stringify(c.descriptors),
        }))
      )
    }

    const savedCriteria = await db
      .select()
      .from(rubricCriteria)
      .where(eq(rubricCriteria.rubricId, created.id))

    return NextResponse.json(
      {
        ...created,
        levels: JSON.parse(created.levels) as string[],
        criteria: savedCriteria.map((c) => ({
          ...c,
          descriptors: JSON.parse(c.descriptors) as Record<string, string>,
        })),
        successCriteria: generated.successCriteria,
      },
      { status: 201 }
    )
  } catch (error) {
    console.error('Failed to generate rubric:', error)
    return NextResponse.json(
      { error: 'Failed to generate rubric. Please try again.' },
      { status: 500 }
    )
  }
}
