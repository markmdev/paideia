import { auth } from '@/lib/auth'
import { db } from '@/lib/db'
import { rubrics, rubricCriteria } from '@/lib/db/schema'
import { eq, and } from 'drizzle-orm'
import { NextResponse } from 'next/server'

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth()
  if (!session?.user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { id } = await params

  const [rubric] = await db
    .select()
    .from(rubrics)
    .where(and(eq(rubrics.id, id), eq(rubrics.teacherId, session.user.id)))
    .limit(1)

  if (!rubric) {
    return NextResponse.json({ error: 'Rubric not found' }, { status: 404 })
  }

  const criteria = await db
    .select()
    .from(rubricCriteria)
    .where(eq(rubricCriteria.rubricId, id))

  return NextResponse.json({
    ...rubric,
    levels: JSON.parse(rubric.levels) as string[],
    criteria: criteria.map((c) => ({
      ...c,
      descriptors: JSON.parse(c.descriptors) as Record<string, string>,
    })),
  })
}

export async function PUT(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth()
  if (!session?.user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { id } = await params

  const [existing] = await db
    .select()
    .from(rubrics)
    .where(and(eq(rubrics.id, id), eq(rubrics.teacherId, session.user.id)))
    .limit(1)

  if (!existing) {
    return NextResponse.json({ error: 'Rubric not found' }, { status: 404 })
  }

  try {
    const body = await req.json()
    const { title, description, type, levels, criteria } = body

    const [updated] = await db
      .update(rubrics)
      .set({
        ...(title !== undefined && { title }),
        ...(description !== undefined && { description }),
        ...(type !== undefined && { type }),
        ...(levels !== undefined && { levels: JSON.stringify(levels) }),
        updatedAt: new Date(),
      })
      .where(eq(rubrics.id, id))
      .returning()

    if (criteria && Array.isArray(criteria)) {
      await db
        .delete(rubricCriteria)
        .where(eq(rubricCriteria.rubricId, id))

      if (criteria.length > 0) {
        await db.insert(rubricCriteria).values(
          criteria.map((c: { name: string; description?: string; weight: number; standardId?: string; descriptors: Record<string, string> }) => ({
            rubricId: id,
            name: c.name,
            description: c.description ?? null,
            weight: c.weight,
            standardId: c.standardId ?? null,
            descriptors: JSON.stringify(c.descriptors),
          }))
        )
      }
    }

    const savedCriteria = await db
      .select()
      .from(rubricCriteria)
      .where(eq(rubricCriteria.rubricId, id))

    return NextResponse.json({
      ...updated,
      levels: JSON.parse(updated.levels) as string[],
      criteria: savedCriteria.map((c) => ({
        ...c,
        descriptors: JSON.parse(c.descriptors) as Record<string, string>,
      })),
    })
  } catch (error) {
    console.error('Failed to update rubric:', error)
    return NextResponse.json(
      { error: 'Failed to update rubric' },
      { status: 500 }
    )
  }
}

export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth()
  if (!session?.user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { id } = await params

  const [existing] = await db
    .select()
    .from(rubrics)
    .where(and(eq(rubrics.id, id), eq(rubrics.teacherId, session.user.id)))
    .limit(1)

  if (!existing) {
    return NextResponse.json({ error: 'Rubric not found' }, { status: 404 })
  }

  await db.delete(rubrics).where(eq(rubrics.id, id))

  return NextResponse.json({ success: true })
}
