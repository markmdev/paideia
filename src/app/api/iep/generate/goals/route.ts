import { auth } from '@/lib/auth'
import { db } from '@/lib/db'
import { ieps, iepGoals, auditLogs } from '@/lib/db/schema'
import { eq, and, ne } from 'drizzle-orm'
import { NextResponse } from 'next/server'
import { generateIEPGoals } from '@/lib/ai/iep-service'
import type { GeneratedPresentLevels } from '@/lib/ai/iep-service'

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
    const { iepId, area, existingCaseloadGoals, gradeLevel, subject } = body

    if (!iepId || !area) {
      return NextResponse.json(
        { error: 'Missing required fields: iepId, area' },
        { status: 400 }
      )
    }

    // Verify IEP access
    const iepConditions = [eq(ieps.id, iepId)]
    if (session.user.role === 'sped_teacher') {
      iepConditions.push(eq(ieps.authorId, session.user.id))
    }

    const [iep] = await db
      .select()
      .from(ieps)
      .where(and(...iepConditions))
      .limit(1)

    if (!iep) {
      return NextResponse.json({ error: 'IEP not found' }, { status: 404 })
    }

    // Build present levels input from IEP data
    const presentLevels: GeneratedPresentLevels = iep.presentLevels
      ? {
          academicPerformance: iep.presentLevels,
          functionalPerformance: '',
          strengths: [],
          areasOfNeed: [],
          impactOfDisability: '',
          baselineData: [],
          draftNotice: '',
        }
      : {
          academicPerformance: 'No present levels data available.',
          functionalPerformance: '',
          strengths: [],
          areasOfNeed: [],
          impactOfDisability: '',
          baselineData: [],
          draftNotice: '',
        }

    // Gather existing caseload goals for similarity detection
    let caseloadGoals = existingCaseloadGoals ?? []
    if (caseloadGoals.length === 0 && session.user.role === 'sped_teacher') {
      // Fetch goals from other IEPs by this author
      const otherIepGoals = await db
        .select({ goalText: iepGoals.goalText })
        .from(iepGoals)
        .innerJoin(ieps, eq(iepGoals.iepId, ieps.id))
        .where(
          and(
            eq(ieps.authorId, session.user.id),
            ne(ieps.id, iepId)
          )
        )

      caseloadGoals = otherIepGoals.map((g) => g.goalText)
    }

    const result = await generateIEPGoals({
      presentLevels,
      gradeLevel: gradeLevel ?? '',
      subject: subject ?? area,
      disabilityCategory: iep.disabilityCategory ?? '',
      existingCaseloadGoals: caseloadGoals,
    })

    // Log to audit trail
    await db.insert(auditLogs).values({
      entityType: 'iep_goal',
      entityId: iepId,
      action: 'ai_generate',
      userId: session.user.id,
      after: JSON.stringify(result.goals),
      aiModel: result.audit.modelVersion,
      aiPrompt: 'generateIEPGoals',
    })

    return NextResponse.json(result, { status: 201 })
  } catch (error) {
    console.error('Failed to generate IEP goals:', error)
    return NextResponse.json(
      { error: 'Failed to generate IEP goals' },
      { status: 500 }
    )
  }
}
