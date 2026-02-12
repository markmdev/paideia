import { auth } from '@/lib/auth'
import { db } from '@/lib/db'
import { reportCards, classMembers, classes, users } from '@/lib/db/schema'
import { eq, and } from 'drizzle-orm'
import { NextResponse } from 'next/server'

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth()
  if (!session?.user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  if (session.user.role !== 'teacher' && session.user.role !== 'sped_teacher') {
    return NextResponse.json({ error: 'Forbidden: teacher role required' }, { status: 403 })
  }

  const { id } = await params

  const [reportCard] = await db
    .select({
      id: reportCards.id,
      studentId: reportCards.studentId,
      studentName: users.name,
      classId: reportCards.classId,
      className: classes.name,
      subject: classes.subject,
      gradeLevel: classes.gradeLevel,
      gradingPeriod: reportCards.gradingPeriod,
      narrative: reportCards.narrative,
      strengths: reportCards.strengths,
      areasForGrowth: reportCards.areasForGrowth,
      recommendations: reportCards.recommendations,
      gradeRecommendation: reportCards.gradeRecommendation,
      status: reportCards.status,
      generatedAt: reportCards.generatedAt,
      approvedAt: reportCards.approvedAt,
      approvedBy: reportCards.approvedBy,
    })
    .from(reportCards)
    .innerJoin(users, eq(reportCards.studentId, users.id))
    .innerJoin(classes, eq(reportCards.classId, classes.id))
    .where(eq(reportCards.id, id))
    .limit(1)

  if (!reportCard) {
    return NextResponse.json({ error: 'Report card not found' }, { status: 404 })
  }

  // Verify teacher has access to this class
  const [membership] = await db
    .select()
    .from(classMembers)
    .where(
      and(
        eq(classMembers.classId, reportCard.classId),
        eq(classMembers.userId, session.user.id),
        eq(classMembers.role, 'teacher')
      )
    )
    .limit(1)

  if (!membership) {
    return NextResponse.json(
      { error: 'You do not have access to this report card' },
      { status: 403 }
    )
  }

  return NextResponse.json({
    ...reportCard,
    strengths: reportCard.strengths ? JSON.parse(reportCard.strengths) : [],
    areasForGrowth: reportCard.areasForGrowth ? JSON.parse(reportCard.areasForGrowth) : [],
    recommendations: reportCard.recommendations ? JSON.parse(reportCard.recommendations) : [],
  })
}

export async function PUT(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth()
  if (!session?.user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  if (session.user.role !== 'teacher' && session.user.role !== 'sped_teacher') {
    return NextResponse.json({ error: 'Forbidden: teacher role required' }, { status: 403 })
  }

  const { id } = await params

  try {
    const body = await req.json()
    const { narrative, strengths, areasForGrowth, recommendations, gradeRecommendation, action } =
      body

    // Fetch the existing report card
    const [existing] = await db
      .select()
      .from(reportCards)
      .where(eq(reportCards.id, id))
      .limit(1)

    if (!existing) {
      return NextResponse.json({ error: 'Report card not found' }, { status: 404 })
    }

    // Verify teacher has access
    const [membership] = await db
      .select()
      .from(classMembers)
      .where(
        and(
          eq(classMembers.classId, existing.classId),
          eq(classMembers.userId, session.user.id),
          eq(classMembers.role, 'teacher')
        )
      )
      .limit(1)

    if (!membership) {
      return NextResponse.json(
        { error: 'You do not have access to this report card' },
        { status: 403 }
      )
    }

    if (action === 'approve') {
      const [updated] = await db
        .update(reportCards)
        .set({
          status: 'approved',
          approvedAt: new Date(),
          approvedBy: session.user.id,
          // Apply any edits provided along with approval
          ...(narrative !== undefined ? { narrative } : {}),
          ...(strengths !== undefined ? { strengths: JSON.stringify(strengths) } : {}),
          ...(areasForGrowth !== undefined ? { areasForGrowth: JSON.stringify(areasForGrowth) } : {}),
          ...(recommendations !== undefined ? { recommendations: JSON.stringify(recommendations) } : {}),
          ...(gradeRecommendation !== undefined ? { gradeRecommendation } : {}),
        })
        .where(eq(reportCards.id, id))
        .returning()

      return NextResponse.json({
        ...updated,
        strengths: updated.strengths ? JSON.parse(updated.strengths) : [],
        areasForGrowth: updated.areasForGrowth ? JSON.parse(updated.areasForGrowth) : [],
        recommendations: updated.recommendations ? JSON.parse(updated.recommendations) : [],
      })
    }

    // Default: update/edit the report card
    const updateValues: Record<string, unknown> = {}

    if (narrative !== undefined) updateValues.narrative = narrative
    if (strengths !== undefined) updateValues.strengths = JSON.stringify(strengths)
    if (areasForGrowth !== undefined) updateValues.areasForGrowth = JSON.stringify(areasForGrowth)
    if (recommendations !== undefined) updateValues.recommendations = JSON.stringify(recommendations)
    if (gradeRecommendation !== undefined) updateValues.gradeRecommendation = gradeRecommendation

    if (Object.keys(updateValues).length === 0) {
      return NextResponse.json(
        { error: 'No fields to update' },
        { status: 400 }
      )
    }

    const [updated] = await db
      .update(reportCards)
      .set(updateValues)
      .where(eq(reportCards.id, id))
      .returning()

    return NextResponse.json({
      ...updated,
      strengths: updated.strengths ? JSON.parse(updated.strengths) : [],
      areasForGrowth: updated.areasForGrowth ? JSON.parse(updated.areasForGrowth) : [],
      recommendations: updated.recommendations ? JSON.parse(updated.recommendations) : [],
    })
  } catch (error) {
    console.error('Failed to update report card:', error)
    return NextResponse.json(
      { error: 'Failed to update report card' },
      { status: 500 }
    )
  }
}
