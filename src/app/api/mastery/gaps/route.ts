import { auth } from '@/lib/auth'
import { db } from '@/lib/db'
import { masteryRecords, standards, classMembers, users } from '@/lib/db/schema'
import { eq, and, inArray, desc } from 'drizzle-orm'
import { NextRequest, NextResponse } from 'next/server'
import { generateReteachActivities } from '@/lib/ai/mastery-gaps'

export async function GET(req: NextRequest) {
  const session = await auth()
  if (!session?.user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { searchParams } = new URL(req.url)
  const classId = searchParams.get('classId')
  const withRecommendations = searchParams.get('withRecommendations') === 'true'

  if (!classId) {
    return NextResponse.json(
      { error: 'Missing required parameter: classId' },
      { status: 400 }
    )
  }

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

  // Get all students in the class
  const members = await db
    .select({ userId: classMembers.userId })
    .from(classMembers)
    .where(
      and(
        eq(classMembers.classId, classId),
        eq(classMembers.role, 'student')
      )
    )

  const studentIds = members.map((m) => m.userId)

  if (studentIds.length === 0) {
    return NextResponse.json({ gaps: [], classSize: 0 })
  }

  // Fetch student names
  const studentRows = await db
    .select({ id: users.id, name: users.name })
    .from(users)
    .where(inArray(users.id, studentIds))

  const studentMap = new Map(studentRows.map((s) => [s.id, s.name ?? 'Unknown']))

  // Fetch all mastery records for these students
  const records = await db
    .select()
    .from(masteryRecords)
    .where(inArray(masteryRecords.studentId, studentIds))
    .orderBy(desc(masteryRecords.assessedAt))

  // Get most recent record per (student, standard)
  const latestByStudentStandard = new Map<string, typeof records[number]>()
  for (const record of records) {
    const key = `${record.studentId}:${record.standardId}`
    if (!latestByStudentStandard.has(key)) {
      latestByStudentStandard.set(key, record)
    }
  }

  // Group by standard
  const byStandard: Record<string, typeof records> = {}
  for (const record of latestByStudentStandard.values()) {
    if (!byStandard[record.standardId]) {
      byStandard[record.standardId] = []
    }
    byStandard[record.standardId].push(record)
  }

  // Fetch standards info
  const standardIdSet = Object.keys(byStandard)
  let standardRows: { id: string; code: string; description: string; subject: string; gradeLevel: string; domain: string | null }[] = []
  if (standardIdSet.length > 0) {
    standardRows = await db
      .select()
      .from(standards)
      .where(inArray(standards.id, standardIdSet))
  }

  const standardInfoMap = new Map(standardRows.map((s) => [s.id, s]))

  // Analyze gaps: standards where majority of class is below proficient
  const gaps = Object.entries(byStandard)
    .map(([stdId, stdRecords]) => {
      const std = standardInfoMap.get(stdId)
      const belowProficient = stdRecords.filter(
        (r) => r.level === 'beginning' || r.level === 'developing'
      )
      const proficientOrAbove = stdRecords.filter(
        (r) => r.level === 'proficient' || r.level === 'advanced'
      )

      const avgScore =
        stdRecords.reduce((sum, r) => sum + r.score, 0) / stdRecords.length

      const studentsBelow = belowProficient.map((r) => ({
        studentId: r.studentId,
        studentName: studentMap.get(r.studentId) ?? 'Unknown',
        level: r.level,
        score: r.score,
      }))

      const belowPct = (belowProficient.length / studentIds.length) * 100

      return {
        standardId: stdId,
        standardCode: std?.code ?? 'Unknown',
        standardDescription: std?.description ?? '',
        subject: std?.subject ?? '',
        domain: std?.domain ?? null,
        classSize: studentIds.length,
        assessedCount: stdRecords.length,
        belowProficientCount: belowProficient.length,
        proficientOrAboveCount: proficientOrAbove.length,
        belowProficientPercent: Math.round(belowPct),
        averageScore: Math.round(avgScore * 10) / 10,
        studentsBelow,
        isGap: belowPct > 50,
      }
    })
    .sort((a, b) => b.belowProficientPercent - a.belowProficientPercent)

  // If withRecommendations is true, use Claude to generate reteach suggestions
  let recommendations: {
    standardCode: string
    activities: string[]
    groupingStrategy: string
  }[] = []

  if (withRecommendations && gaps.filter((g) => g.isGap).length > 0) {
    const gapInput = gaps
      .filter((g) => g.isGap)
      .map((g) => ({
        standardCode: g.standardCode,
        standardDescription: g.standardDescription,
        classSize: g.classSize,
        belowProficientCount: g.belowProficientCount,
        averageScore: g.averageScore,
        studentsBelow: g.studentsBelow.map((s) => ({
          studentName: s.studentName,
          level: s.level,
          score: s.score,
        })),
      }))

    try {
      const result = await generateReteachActivities(gapInput)
      recommendations = result.recommendations
    } catch (error) {
      console.error('Failed to generate reteach recommendations:', error)
      // Continue without recommendations rather than failing the entire request
    }
  }

  return NextResponse.json({
    classSize: studentIds.length,
    gaps,
    recommendations,
  })
}
