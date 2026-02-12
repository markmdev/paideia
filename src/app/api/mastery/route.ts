import { auth } from '@/lib/auth'
import { db } from '@/lib/db'
import { masteryRecords, standards, classMembers, users } from '@/lib/db/schema'
import { eq, and, inArray } from 'drizzle-orm'
import { NextRequest, NextResponse } from 'next/server'

function trafficLight(level: string): 'red' | 'yellow' | 'green' {
  switch (level) {
    case 'advanced':
    case 'proficient':
      return 'green'
    case 'developing':
      return 'yellow'
    default:
      return 'red'
  }
}

export async function GET(req: NextRequest) {
  const session = await auth()
  if (!session?.user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { searchParams } = new URL(req.url)
  const classId = searchParams.get('classId')
  const studentId = searchParams.get('studentId')
  const standardId = searchParams.get('standardId')

  let studentIds: string[] = []

  if (studentId) {
    studentIds = [studentId]
  } else if (classId) {
    // Verify the teacher belongs to this class
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

    const members = await db
      .select({ userId: classMembers.userId })
      .from(classMembers)
      .where(
        and(
          eq(classMembers.classId, classId),
          eq(classMembers.role, 'student')
        )
      )

    studentIds = members.map((m) => m.userId)
  } else {
    return NextResponse.json(
      { error: 'Missing required parameter: classId or studentId' },
      { status: 400 }
    )
  }

  if (studentIds.length === 0) {
    return NextResponse.json({ students: [], standards: [] })
  }

  // Fetch mastery records for these students
  let records
  if (standardId) {
    records = await db
      .select()
      .from(masteryRecords)
      .where(
        and(
          inArray(masteryRecords.studentId, studentIds),
          eq(masteryRecords.standardId, standardId)
        )
      )
  } else {
    records = await db
      .select()
      .from(masteryRecords)
      .where(inArray(masteryRecords.studentId, studentIds))
  }

  // Fetch student names
  const studentRows = await db
    .select({ id: users.id, name: users.name })
    .from(users)
    .where(inArray(users.id, studentIds))

  const studentMap = new Map(studentRows.map((s) => [s.id, s.name ?? 'Unknown']))

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

  // Group by student, then by standard, taking the most recent record per (student, standard)
  const studentMastery: Record<string, {
    studentId: string
    studentName: string
    standards: Record<string, {
      standardId: string
      standardCode: string
      standardDescription: string
      level: string
      score: number
      status: 'red' | 'yellow' | 'green'
      assessedAt: string
    }>
  }> = {}

  for (const record of records) {
    if (!studentMastery[record.studentId]) {
      studentMastery[record.studentId] = {
        studentId: record.studentId,
        studentName: studentMap.get(record.studentId) ?? 'Unknown',
        standards: {},
      }
    }

    const existing = studentMastery[record.studentId].standards[record.standardId]
    if (!existing || new Date(record.assessedAt) > new Date(existing.assessedAt)) {
      const std = standardMap.get(record.standardId)
      studentMastery[record.studentId].standards[record.standardId] = {
        standardId: record.standardId,
        standardCode: std?.code ?? 'Unknown',
        standardDescription: std?.description ?? '',
        level: record.level,
        score: record.score,
        status: trafficLight(record.level),
        assessedAt: record.assessedAt.toISOString(),
      }
    }
  }

  return NextResponse.json({
    students: Object.values(studentMastery).map((s) => ({
      ...s,
      standards: Object.values(s.standards),
    })),
    standardsList: standardRows.map((s) => ({
      id: s.id,
      code: s.code,
      description: s.description,
      subject: s.subject,
      gradeLevel: s.gradeLevel,
      domain: s.domain,
    })),
  })
}
