import { auth } from '@/lib/auth'
import { db } from '@/lib/db'
import { rubrics, rubricCriteria } from '@/lib/db/schema'
import { eq, desc } from 'drizzle-orm'
import { NextResponse } from 'next/server'

export async function GET() {
  const session = await auth()
  if (!session?.user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const results = await db
    .select()
    .from(rubrics)
    .where(eq(rubrics.teacherId, session.user.id))
    .orderBy(desc(rubrics.createdAt))

  const rubricIds = results.map((r) => r.id)

  let criteriaByRubric: Record<string, number> = {}
  if (rubricIds.length > 0) {
    const allCriteria = await db
      .select({ rubricId: rubricCriteria.rubricId })
      .from(rubricCriteria)

    for (const c of allCriteria) {
      if (rubricIds.includes(c.rubricId)) {
        criteriaByRubric[c.rubricId] = (criteriaByRubric[c.rubricId] ?? 0) + 1
      }
    }
  }

  const rubricList = results.map((r) => ({
    ...r,
    levels: JSON.parse(r.levels) as string[],
    criteriaCount: criteriaByRubric[r.id] ?? 0,
  }))

  return NextResponse.json(rubricList)
}

export async function POST(req: Request) {
  const session = await auth()
  if (!session?.user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const body = await req.json()
    const { title, description, type, levels, criteria, isTemplate } = body

    if (!title || !levels || !Array.isArray(levels) || levels.length === 0) {
      return NextResponse.json(
        { error: 'Missing required fields: title, levels' },
        { status: 400 }
      )
    }

    const [created] = await db
      .insert(rubrics)
      .values({
        title,
        description: description ?? null,
        type: type ?? 'analytical',
        levels: JSON.stringify(levels),
        teacherId: session.user.id,
        isTemplate: isTemplate ?? false,
      })
      .returning()

    if (criteria && Array.isArray(criteria) && criteria.length > 0) {
      await db.insert(rubricCriteria).values(
        criteria.map((c: { name: string; description?: string; weight: number; standardId?: string; descriptors: Record<string, string> }) => ({
          rubricId: created.id,
          name: c.name,
          description: c.description ?? null,
          weight: c.weight,
          standardId: c.standardId ?? null,
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
      },
      { status: 201 }
    )
  } catch (error) {
    console.error('Failed to create rubric:', error)
    return NextResponse.json(
      { error: 'Failed to create rubric' },
      { status: 500 }
    )
  }
}
