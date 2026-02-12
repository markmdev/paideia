import { auth } from '@/lib/auth'
import { db } from '@/lib/db'
import {
  assignments,
  rubrics,
  rubricCriteria,
  differentiatedVersions,
  classes,
} from '@/lib/db/schema'
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

  const [result] = await db
    .select({
      assignment: assignments,
      className: classes.name,
      classSubject: classes.subject,
    })
    .from(assignments)
    .leftJoin(classes, eq(assignments.classId, classes.id))
    .where(
      and(
        eq(assignments.id, id),
        eq(assignments.teacherId, session.user.id)
      )
    )
    .limit(1)

  if (!result) {
    return NextResponse.json({ error: 'Assignment not found' }, { status: 404 })
  }

  // Fetch rubric and criteria if rubric exists
  let rubric = null
  let criteria: typeof rubricCriteria.$inferSelect[] = []
  if (result.assignment.rubricId) {
    const [rubricResult] = await db
      .select()
      .from(rubrics)
      .where(eq(rubrics.id, result.assignment.rubricId))
      .limit(1)
    rubric = rubricResult ?? null

    if (rubric) {
      criteria = await db
        .select()
        .from(rubricCriteria)
        .where(eq(rubricCriteria.rubricId, rubric.id))
    }
  }

  // Fetch differentiated versions
  const versions = await db
    .select()
    .from(differentiatedVersions)
    .where(eq(differentiatedVersions.assignmentId, id))

  return NextResponse.json({
    ...result,
    rubric,
    criteria,
    versions,
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
  const body = await req.json()

  // Verify ownership
  const [existing] = await db
    .select()
    .from(assignments)
    .where(
      and(
        eq(assignments.id, id),
        eq(assignments.teacherId, session.user.id)
      )
    )
    .limit(1)

  if (!existing) {
    return NextResponse.json({ error: 'Assignment not found' }, { status: 404 })
  }

  const updateData: Record<string, unknown> = {}
  const allowedFields = [
    'title', 'description', 'instructions', 'type', 'gradeLevel',
    'subject', 'status', 'rubricId',
  ]

  for (const field of allowedFields) {
    if (body[field] !== undefined) {
      updateData[field] = body[field]
    }
  }

  if (body.dueDate !== undefined) {
    updateData.dueDate = body.dueDate ? new Date(body.dueDate) : null
  }

  if (body.successCriteria !== undefined) {
    updateData.successCriteria = body.successCriteria
      ? JSON.stringify(body.successCriteria)
      : null
  }

  if (body.aiMetadata !== undefined) {
    updateData.aiMetadata = body.aiMetadata
      ? JSON.stringify(body.aiMetadata)
      : null
  }

  updateData.updatedAt = new Date()

  const [updated] = await db
    .update(assignments)
    .set(updateData)
    .where(eq(assignments.id, id))
    .returning()

  return NextResponse.json(updated)
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

  // Verify ownership
  const [existing] = await db
    .select()
    .from(assignments)
    .where(
      and(
        eq(assignments.id, id),
        eq(assignments.teacherId, session.user.id)
      )
    )
    .limit(1)

  if (!existing) {
    return NextResponse.json({ error: 'Assignment not found' }, { status: 404 })
  }

  // Delete differentiated versions first (cascade should handle this, but be explicit)
  await db
    .delete(differentiatedVersions)
    .where(eq(differentiatedVersions.assignmentId, id))

  await db.delete(assignments).where(eq(assignments.id, id))

  return NextResponse.json({ success: true })
}
