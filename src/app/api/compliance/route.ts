import { auth } from '@/lib/auth'
import { db } from '@/lib/db'
import { complianceDeadlines, ieps, users } from '@/lib/db/schema'
import { eq, and, lt, gte, lte, desc } from 'drizzle-orm'
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
  const statusFilter = searchParams.get('status') // upcoming, overdue, all

  const now = new Date()
  const in15Days = new Date(now.getTime() + 15 * 24 * 60 * 60 * 1000)
  const in30Days = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000)

  // Get student IDs from IEPs this teacher authored (or all for admin)
  let studentIds: string[] = []
  if (session.user.role === 'sped_teacher') {
    const teacherIeps = await db
      .select({ studentId: ieps.studentId })
      .from(ieps)
      .where(eq(ieps.authorId, session.user.id))

    studentIds = [...new Set(teacherIeps.map((i) => i.studentId))]
  }

  // Build query conditions
  const conditions = []

  if (session.user.role === 'sped_teacher' && studentIds.length > 0) {
    // Filter to only this teacher's students
    // Using a manual approach since we need IN clause
  }

  if (statusFilter === 'overdue') {
    conditions.push(lt(complianceDeadlines.dueDate, now))
    conditions.push(eq(complianceDeadlines.status, 'upcoming'))
  } else if (statusFilter === 'upcoming') {
    conditions.push(gte(complianceDeadlines.dueDate, now))
  }

  const allDeadlines = await db
    .select({
      id: complianceDeadlines.id,
      type: complianceDeadlines.type,
      studentId: complianceDeadlines.studentId,
      studentName: users.name,
      dueDate: complianceDeadlines.dueDate,
      status: complianceDeadlines.status,
      completedAt: complianceDeadlines.completedAt,
      notes: complianceDeadlines.notes,
    })
    .from(complianceDeadlines)
    .leftJoin(users, eq(complianceDeadlines.studentId, users.id))
    .where(conditions.length > 0 ? and(...conditions) : undefined)
    .orderBy(desc(complianceDeadlines.dueDate))

  // Filter by teacher's students if not admin
  const filteredDeadlines =
    session.user.role === 'sped_teacher' && studentIds.length > 0
      ? allDeadlines.filter((d) => studentIds.includes(d.studentId))
      : allDeadlines

  // Color-code deadlines
  const colorCoded = filteredDeadlines.map((deadline) => {
    const dueDate = new Date(deadline.dueDate)
    let color: 'green' | 'yellow' | 'red' | 'overdue' | 'completed'

    if (deadline.status === 'completed' || deadline.completedAt) {
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
      ...deadline,
      color,
      daysUntilDue: Math.ceil(
        (dueDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)
      ),
    }
  })

  // Summary counts
  const summary = {
    total: colorCoded.length,
    overdue: colorCoded.filter((d) => d.color === 'overdue').length,
    red: colorCoded.filter((d) => d.color === 'red').length,
    yellow: colorCoded.filter((d) => d.color === 'yellow').length,
    green: colorCoded.filter((d) => d.color === 'green').length,
    completed: colorCoded.filter((d) => d.color === 'completed').length,
  }

  return NextResponse.json({ deadlines: colorCoded, summary })
}
