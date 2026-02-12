import { auth } from '@/lib/auth'
import { db } from '@/lib/db'
import { users, masteryRecords, standards, auditLogs } from '@/lib/db/schema'
import { eq } from 'drizzle-orm'
import { NextResponse } from 'next/server'
import { generatePresentLevels } from '@/lib/ai/iep-service'

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
    const {
      studentId,
      teacherObservations,
      classroomPerformance,
      disabilityCategory,
      gradeLevel,
    } = body

    if (!studentId || !teacherObservations || !classroomPerformance) {
      return NextResponse.json(
        {
          error:
            'Missing required fields: studentId, teacherObservations, classroomPerformance',
        },
        { status: 400 }
      )
    }

    // Fetch student info
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

    // Fetch student mastery data
    const mastery = await db
      .select({
        level: masteryRecords.level,
        score: masteryRecords.score,
        standardCode: standards.code,
        standardDescription: standards.description,
      })
      .from(masteryRecords)
      .innerJoin(standards, eq(masteryRecords.standardId, standards.id))
      .where(eq(masteryRecords.studentId, studentId))

    const assessmentData = mastery.map((m) => ({
      standard: m.standardCode,
      level: m.level,
      score: m.score,
    }))

    const result = await generatePresentLevels({
      studentName: student.name ?? 'Student',
      gradeLevel: gradeLevel ?? '',
      disabilityCategory: disabilityCategory ?? '',
      assessmentData,
      teacherObservations,
      classroomPerformance,
    })

    // Log to audit trail
    await db.insert(auditLogs).values({
      entityType: 'iep_present_levels',
      entityId: studentId,
      action: 'ai_generate',
      userId: session.user.id,
      after: JSON.stringify(result),
      aiModel: result.audit.modelVersion,
      aiPrompt: 'generatePresentLevels',
    })

    return NextResponse.json(result, { status: 201 })
  } catch (error) {
    console.error('Failed to generate present levels:', error)
    return NextResponse.json(
      { error: 'Failed to generate present levels' },
      { status: 500 }
    )
  }
}
