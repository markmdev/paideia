import { auth } from '@/lib/auth'
import { db } from '@/lib/db'
import { masteryRecords, standards, classMembers, users, assignments, parentChildren } from '@/lib/db/schema'
import { eq, and, inArray, desc } from 'drizzle-orm'
import { NextRequest, NextResponse } from 'next/server'

function computeTrend(records: { score: number }[]): 'improving' | 'stable' | 'declining' {
  if (records.length < 2) return 'stable'

  const recent = records.slice(0, 3)
  if (recent.length < 2) return 'stable'

  const first = recent[recent.length - 1].score
  const last = recent[0].score
  const diff = last - first

  if (diff > 5) return 'improving'
  if (diff < -5) return 'declining'
  return 'stable'
}

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ studentId: string }> }
) {
  const session = await auth()
  if (!session?.user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { studentId } = await params
  const { searchParams } = new URL(req.url)
  const classId = searchParams.get('classId')

  // If classId is provided, verify the current user is a teacher of that class
  if (classId) {
    const membership = await db
      .select({ userId: classMembers.userId })
      .from(classMembers)
      .where(
        and(
          eq(classMembers.classId, classId),
          eq(classMembers.userId, session.user.id),
          eq(classMembers.role, 'teacher')
        )
      )

    if (membership.length === 0) {
      return NextResponse.json({ error: 'Not a teacher of this class' }, { status: 403 })
    }
  } else {
    // No classId provided — verify the user is authorized to view this student's data
    const userRole = session.user.role

    if (userRole === 'student') {
      // Students can only view their own mastery data
      if (studentId !== session.user.id) {
        return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
      }
    } else if (userRole === 'parent') {
      // Parents can only view mastery data for their own children
      const parentChild = await db
        .select({ childId: parentChildren.childId })
        .from(parentChildren)
        .where(
          and(
            eq(parentChildren.parentId, session.user.id),
            eq(parentChildren.childId, studentId)
          )
        )

      if (parentChild.length === 0) {
        return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
      }
    } else if (userRole === 'teacher' || userRole === 'sped_teacher') {
      // Teachers can only view mastery data for students in their classes
      const sharedClass = await db
        .select({ classId: classMembers.classId })
        .from(classMembers)
        .where(
          and(
            eq(classMembers.userId, session.user.id),
            eq(classMembers.role, 'teacher')
          )
        )

      const teacherClassIds = sharedClass.map((c) => c.classId)

      if (teacherClassIds.length === 0) {
        return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
      }

      const studentInClass = await db
        .select({ classId: classMembers.classId })
        .from(classMembers)
        .where(
          and(
            inArray(classMembers.classId, teacherClassIds),
            eq(classMembers.userId, studentId),
            eq(classMembers.role, 'student')
          )
        )

      if (studentInClass.length === 0) {
        return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
      }
    }
    // admin and district_admin roles are allowed without restriction
  }

  // Fetch the student's info
  const studentRows = await db
    .select({ id: users.id, name: users.name, email: users.email })
    .from(users)
    .where(eq(users.id, studentId))

  if (studentRows.length === 0) {
    return NextResponse.json({ error: 'Student not found' }, { status: 404 })
  }

  const student = studentRows[0]

  // Fetch all mastery records for this student, ordered by assessedAt desc
  const records = await db
    .select()
    .from(masteryRecords)
    .where(eq(masteryRecords.studentId, studentId))
    .orderBy(desc(masteryRecords.assessedAt))

  // Fetch standards info
  const standardIdSet = [...new Set(records.map((r) => r.standardId))]
  let standardRows: { id: string; code: string; description: string; subject: string; gradeLevel: string; domain: string | null }[] = []
  if (standardIdSet.length > 0) {
    standardRows = await db
      .select()
      .from(standards)
      .where(inArray(standards.id, standardIdSet))
  }

  const standardMap = new Map(standardRows.map((s) => [s.id, s]))

  // Fetch assignment info for source references
  const sourceIds = [...new Set(records.map((r) => r.source))]
  let assignmentRows: { id: string; title: string }[] = []
  if (sourceIds.length > 0) {
    assignmentRows = await db
      .select({ id: assignments.id, title: assignments.title })
      .from(assignments)
      .where(inArray(assignments.id, sourceIds))
  }

  const assignmentMap = new Map(assignmentRows.map((a) => [a.id, a.title]))

  // Group records by standard
  const byStandard: Record<string, typeof records> = {}
  for (const record of records) {
    if (!byStandard[record.standardId]) {
      byStandard[record.standardId] = []
    }
    byStandard[record.standardId].push(record)
  }

  // Build per-standard mastery detail
  const standardMastery = Object.entries(byStandard).map(([stdId, stdRecords]) => {
    const std = standardMap.get(stdId)
    const latest = stdRecords[0] // already sorted desc
    const trend = computeTrend(stdRecords)

    return {
      standardId: stdId,
      standardCode: std?.code ?? 'Unknown',
      standardDescription: std?.description ?? '',
      subject: std?.subject ?? '',
      domain: std?.domain ?? null,
      currentLevel: latest.level,
      currentScore: latest.score,
      trend,
      lastAssessedAt: latest.assessedAt.toISOString(),
      assessmentCount: stdRecords.length,
      recentAssessments: stdRecords.slice(0, 3).map((r) => ({
        level: r.level,
        score: r.score,
        assessedAt: r.assessedAt.toISOString(),
        source: r.source,
        sourceTitle: assignmentMap.get(r.source) ?? 'Unknown Assignment',
        notes: r.notes,
      })),
      history: stdRecords.map((r) => ({
        level: r.level,
        score: r.score,
        assessedAt: r.assessedAt.toISOString(),
        source: r.source,
        sourceTitle: assignmentMap.get(r.source) ?? 'Unknown Assignment',
      })),
    }
  })

  return NextResponse.json({
    student: {
      id: student.id,
      name: student.name,
      email: student.email,
    },
    mastery: standardMastery,
  })
}
