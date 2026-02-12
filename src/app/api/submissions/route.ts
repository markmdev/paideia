import { auth } from '@/lib/auth'
import { db } from '@/lib/db'
import { submissions, assignments, classMembers } from '@/lib/db/schema'
import { eq, and } from 'drizzle-orm'
import { NextResponse } from 'next/server'

export async function POST(req: Request) {
  const session = await auth()
  if (!session?.user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  if (session.user.role !== 'student') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  try {
    const body = await req.json()
    const { assignmentId, content } = body

    if (!assignmentId || !content) {
      return NextResponse.json(
        { error: 'Missing required fields: assignmentId, content' },
        { status: 400 }
      )
    }

    // Verify assignment exists and is not draft
    const [assignment] = await db
      .select()
      .from(assignments)
      .where(eq(assignments.id, assignmentId))
      .limit(1)

    if (!assignment) {
      return NextResponse.json(
        { error: 'Assignment not found' },
        { status: 404 }
      )
    }

    if (assignment.status === 'draft') {
      return NextResponse.json(
        { error: 'Assignment not found' },
        { status: 404 }
      )
    }

    // Verify the student is enrolled in the class for this assignment
    const [membership] = await db
      .select()
      .from(classMembers)
      .where(
        and(
          eq(classMembers.classId, assignment.classId),
          eq(classMembers.userId, session.user.id),
          eq(classMembers.role, 'student')
        )
      )
      .limit(1)

    if (!membership) {
      return NextResponse.json(
        { error: 'Not enrolled in this class' },
        { status: 404 }
      )
    }

    // Check if the student already has a submission for this assignment
    const [existing] = await db
      .select()
      .from(submissions)
      .where(
        and(
          eq(submissions.assignmentId, assignmentId),
          eq(submissions.studentId, session.user.id)
        )
      )
      .limit(1)

    if (existing) {
      // Update existing submission
      const [updated] = await db
        .update(submissions)
        .set({
          content,
          status: 'submitted',
          submittedAt: new Date(),
        })
        .where(eq(submissions.id, existing.id))
        .returning()

      return NextResponse.json(updated)
    }

    // Create new submission
    const [created] = await db
      .insert(submissions)
      .values({
        assignmentId,
        studentId: session.user.id,
        content,
        status: 'submitted',
        submittedAt: new Date(),
      })
      .returning()

    return NextResponse.json(created)
  } catch (error) {
    console.error('Failed to submit work:', error)
    return NextResponse.json(
      { error: 'Failed to submit work' },
      { status: 500 }
    )
  }
}
