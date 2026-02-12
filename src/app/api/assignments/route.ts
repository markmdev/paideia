import { auth } from '@/lib/auth'
import { db } from '@/lib/db'
import { assignments, classes, classMembers, rubrics } from '@/lib/db/schema'
import { eq, desc, and } from 'drizzle-orm'
import { NextResponse } from 'next/server'

export async function GET() {
  const session = await auth()
  if (!session?.user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const results = await db
    .select({
      assignment: assignments,
      className: classes.name,
      rubricTitle: rubrics.title,
    })
    .from(assignments)
    .leftJoin(classes, eq(assignments.classId, classes.id))
    .leftJoin(rubrics, eq(assignments.rubricId, rubrics.id))
    .where(eq(assignments.teacherId, session.user.id))
    .orderBy(desc(assignments.createdAt))

  return NextResponse.json(results)
}

export async function POST(req: Request) {
  const session = await auth()
  if (!session?.user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const body = await req.json()
    const {
      title,
      description,
      instructions,
      type,
      gradeLevel,
      subject,
      dueDate,
      classId,
      rubricId,
      successCriteria,
      aiMetadata,
    } = body

    if (!title || !description || !classId || !gradeLevel || !subject) {
      return NextResponse.json(
        { error: 'Missing required fields: title, description, classId, gradeLevel, subject' },
        { status: 400 }
      )
    }

    // Verify the teacher has access to this class
    const membership = await db
      .select()
      .from(classMembers)
      .where(
        and(
          eq(classMembers.classId, classId),
          eq(classMembers.userId, session.user.id),
          eq(classMembers.role, 'teacher')
        )
      )
      .limit(1)

    if (membership.length === 0) {
      return NextResponse.json(
        { error: 'You do not have access to this class' },
        { status: 403 }
      )
    }

    const [created] = await db
      .insert(assignments)
      .values({
        title,
        description,
        instructions: instructions ?? null,
        type: type ?? 'essay',
        gradeLevel,
        subject,
        dueDate: dueDate ? new Date(dueDate) : null,
        classId,
        teacherId: session.user.id,
        rubricId: rubricId ?? null,
        successCriteria: successCriteria ? JSON.stringify(successCriteria) : null,
        aiMetadata: aiMetadata ? JSON.stringify(aiMetadata) : null,
        status: 'draft',
      })
      .returning()

    return NextResponse.json(created, { status: 201 })
  } catch (error) {
    console.error('Failed to create assignment:', error)
    return NextResponse.json(
      { error: 'Failed to create assignment' },
      { status: 500 }
    )
  }
}
