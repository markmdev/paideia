import { auth } from '@/lib/auth'
import { db } from '@/lib/db'
import { ieps, auditLogs } from '@/lib/db/schema'
import { eq, and } from 'drizzle-orm'
import { NextResponse } from 'next/server'
import { generateAccommodations } from '@/lib/ai/iep-service'

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
    const { iepId } = body

    if (!iepId) {
      return NextResponse.json(
        { error: 'Missing required field: iepId' },
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

    if (!iep.disabilityCategory) {
      return NextResponse.json(
        { error: 'IEP is missing disability category' },
        { status: 400 }
      )
    }

    // Extract areas of need from present levels or use defaults
    const areasOfNeed: string[] = []
    if (iep.presentLevels) {
      areasOfNeed.push('Based on present levels assessment')
    }
    if (iep.disabilityCategory) {
      areasOfNeed.push(iep.disabilityCategory)
    }

    // Parse existing accommodations
    const currentAccommodations: string[] = []
    if (iep.accommodations) {
      try {
        const parsed = JSON.parse(iep.accommodations)
        if (Array.isArray(parsed)) {
          currentAccommodations.push(
            ...parsed.map((a: { accommodation?: string } | string) =>
              typeof a === 'string' ? a : a.accommodation ?? ''
            )
          )
        }
      } catch {
        // Ignore parse errors
      }
    }

    const result = await generateAccommodations({
      disabilityCategory: iep.disabilityCategory,
      areasOfNeed,
      gradeLevel: '',
      currentAccommodations:
        currentAccommodations.length > 0 ? currentAccommodations : undefined,
    })

    // Log to audit trail
    await db.insert(auditLogs).values({
      entityType: 'iep_accommodations',
      entityId: iepId,
      action: 'ai_generate',
      userId: session.user.id,
      after: JSON.stringify(result),
      aiModel: result.audit.modelVersion,
      aiPrompt: 'generateAccommodations',
    })

    return NextResponse.json(result, { status: 201 })
  } catch (error) {
    console.error('Failed to generate accommodations:', error)
    return NextResponse.json(
      { error: 'Failed to generate accommodations' },
      { status: 500 }
    )
  }
}
