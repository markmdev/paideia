import { auth } from '@/lib/auth'
import { db } from '@/lib/db'
import { ieps, iepGoals, users } from '@/lib/db/schema'
import { eq, desc, and, sql } from 'drizzle-orm'
import { NextResponse } from 'next/server'

export async function GET(req: Request) {
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

  const { searchParams } = new URL(req.url)
  const studentId = searchParams.get('studentId')
  const status = searchParams.get('status')

  const conditions = []

  // SPED teachers see only their own IEPs; admins see all
  if (session.user.role === 'sped_teacher') {
    conditions.push(eq(ieps.authorId, session.user.id))
  }

  if (studentId) {
    conditions.push(eq(ieps.studentId, studentId))
  }

  if (status) {
    conditions.push(eq(ieps.status, status))
  }

  const goalCountSubquery = db
    .select({
      iepId: iepGoals.iepId,
      goalCount: sql<number>`count(*)`.as('goal_count'),
    })
    .from(iepGoals)
    .groupBy(iepGoals.iepId)
    .as('goal_counts')

  const results = await db
    .select({
      id: ieps.id,
      studentId: ieps.studentId,
      studentName: users.name,
      authorId: ieps.authorId,
      status: ieps.status,
      disabilityCategory: ieps.disabilityCategory,
      startDate: ieps.startDate,
      endDate: ieps.endDate,
      meetingDate: ieps.meetingDate,
      goalCount: sql<number>`coalesce(${goalCountSubquery.goalCount}, 0)`,
      createdAt: ieps.createdAt,
      updatedAt: ieps.updatedAt,
    })
    .from(ieps)
    .innerJoin(users, eq(ieps.studentId, users.id))
    .leftJoin(goalCountSubquery, eq(ieps.id, goalCountSubquery.iepId))
    .where(conditions.length > 0 ? and(...conditions) : undefined)
    .orderBy(desc(ieps.updatedAt))

  return NextResponse.json(
    results.map((r) => ({ ...r, goalCount: Number(r.goalCount) }))
  )
}

export async function POST(req: Request) {
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

  try {
    const body = await req.json()
    const { studentId, disabilityCategory, startDate, endDate } = body

    if (!studentId || !disabilityCategory) {
      return NextResponse.json(
        { error: 'Missing required fields: studentId, disabilityCategory' },
        { status: 400 }
      )
    }

    // Verify the student exists
    const [student] = await db
      .select({ id: users.id, name: users.name })
      .from(users)
      .where(eq(users.id, studentId))
      .limit(1)

    if (!student) {
      return NextResponse.json(
        { error: 'Student not found' },
        { status: 404 }
      )
    }

    const [created] = await db
      .insert(ieps)
      .values({
        studentId,
        authorId: session.user.id,
        disabilityCategory,
        startDate: startDate ? new Date(startDate) : null,
        endDate: endDate ? new Date(endDate) : null,
        status: 'draft',
      })
      .returning()

    return NextResponse.json(
      { ...created, studentName: student.name, goalCount: 0 },
      { status: 201 }
    )
  } catch (error) {
    console.error('Failed to create IEP:', error)
    return NextResponse.json(
      { error: 'Failed to create IEP' },
      { status: 500 }
    )
  }
}
