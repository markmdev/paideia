import { auth } from '@/lib/auth'
import { db } from '@/lib/db'
import {
  complianceDeadlines,
  ieps,
  iepGoals,
  progressDataPoints,
  users,
} from '@/lib/db/schema'
import { eq, and, desc } from 'drizzle-orm'
import { NextResponse } from 'next/server'

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ studentId: string }> }
) {
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

  const { studentId } = await params

  // Verify student exists
  const [student] = await db
    .select({ id: users.id, name: users.name, email: users.email })
    .from(users)
    .where(eq(users.id, studentId))
    .limit(1)

  if (!student) {
    return NextResponse.json(
      { error: 'Student not found' },
      { status: 404 }
    )
  }

  // If SPED teacher, verify they have an IEP for this student
  if (session.user.role === 'sped_teacher') {
    const [teacherIep] = await db
      .select({ id: ieps.id })
      .from(ieps)
      .where(
        and(
          eq(ieps.studentId, studentId),
          eq(ieps.authorId, session.user.id)
        )
      )
      .limit(1)

    if (!teacherIep) {
      return NextResponse.json(
        { error: 'You do not have an IEP for this student' },
        { status: 403 }
      )
    }
  }

  // Fetch compliance deadlines
  const deadlines = await db
    .select()
    .from(complianceDeadlines)
    .where(eq(complianceDeadlines.studentId, studentId))
    .orderBy(desc(complianceDeadlines.dueDate))

  const now = new Date()
  const in15Days = new Date(now.getTime() + 15 * 24 * 60 * 60 * 1000)
  const in30Days = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000)

  const colorCodedDeadlines = deadlines.map((d) => {
    const dueDate = new Date(d.dueDate)
    let color: 'green' | 'yellow' | 'red' | 'overdue' | 'completed'

    if (d.status === 'completed' || d.completedAt) {
      color = 'completed'
    } else if (dueDate < now) {
      color = 'overdue'
    } else if (dueDate < in15Days) {
      color = 'red'
    } else if (dueDate < in30Days) {
      color = 'yellow'
    } else {
      color = 'green'
    }

    return {
      ...d,
      color,
      daysUntilDue: Math.ceil(
        (dueDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)
      ),
    }
  })

  // Fetch IEP status
  const studentIeps = await db
    .select({
      id: ieps.id,
      status: ieps.status,
      startDate: ieps.startDate,
      endDate: ieps.endDate,
      authorId: ieps.authorId,
      disabilityCategory: ieps.disabilityCategory,
      updatedAt: ieps.updatedAt,
    })
    .from(ieps)
    .where(eq(ieps.studentId, studentId))
    .orderBy(desc(ieps.updatedAt))

  // Count progress monitoring data points
  const allGoals = await db
    .select({ id: iepGoals.id, iepId: iepGoals.iepId })
    .from(iepGoals)
    .innerJoin(ieps, eq(iepGoals.iepId, ieps.id))
    .where(eq(ieps.studentId, studentId))

  let totalDataPoints = 0
  for (const goal of allGoals) {
    const points = await db
      .select({ id: progressDataPoints.id })
      .from(progressDataPoints)
      .where(eq(progressDataPoints.goalId, goal.id))

    totalDataPoints += points.length
  }

  return NextResponse.json({
    student,
    deadlines: colorCodedDeadlines,
    ieps: studentIeps,
    progressMonitoring: {
      totalGoals: allGoals.length,
      totalDataPoints,
    },
  })
}
