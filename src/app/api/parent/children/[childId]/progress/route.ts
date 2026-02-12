import { auth } from '@/lib/auth'
import { db } from '@/lib/db'
import {
  parentChildren,
  users,
  messages,
  submissions,
  assignments,
  masteryRecords,
  standards,
} from '@/lib/db/schema'
import { eq, desc, and } from 'drizzle-orm'
import { NextResponse } from 'next/server'
import { generateParentProgressNarrative } from '@/lib/ai/parent-communication'

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ childId: string }> }
) {
  const session = await auth()
  if (!session?.user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
  if (session.user.role !== 'parent') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const { childId } = await params

  // Verify parent-child link
  const [link] = await db
    .select()
    .from(parentChildren)
    .where(
      and(
        eq(parentChildren.parentId, session.user.id),
        eq(parentChildren.childId, childId)
      )
    )
    .limit(1)

  if (!link) {
    return NextResponse.json(
      { error: 'Child not found or not authorized' },
      { status: 403 }
    )
  }

  try {
    // Get existing progress narratives (stored as messages of type progress_update)
    const narratives = await db
      .select({
        id: messages.id,
        subject: messages.subject,
        content: messages.content,
        metadata: messages.metadata,
        isAIGenerated: messages.isAIGenerated,
        createdAt: messages.createdAt,
      })
      .from(messages)
      .where(
        and(
          eq(messages.receiverId, session.user.id),
          eq(messages.type, 'progress_update')
        )
      )
      .orderBy(desc(messages.createdAt))
      .limit(20)

    // Filter narratives for this child by metadata
    const childNarratives = narratives.filter((n) => {
      if (!n.metadata) return false
      try {
        const meta = JSON.parse(n.metadata)
        return meta.childId === childId
      } catch {
        return false
      }
    })

    return NextResponse.json({ narratives: childNarratives })
  } catch (error) {
    console.error('Failed to load progress narratives:', error)
    return NextResponse.json(
      { error: 'Failed to load progress narratives' },
      { status: 500 }
    )
  }
}

export async function POST(
  req: Request,
  { params }: { params: Promise<{ childId: string }> }
) {
  const session = await auth()
  if (!session?.user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  // Teachers or parents can trigger generation
  if (!['teacher', 'sped_teacher', 'parent'].includes(session.user.role)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const { childId } = await params

  try {
    const body = await req.json()
    const { subject, gradingPeriod } = body

    if (!subject || !gradingPeriod) {
      return NextResponse.json(
        { error: 'subject and gradingPeriod are required' },
        { status: 400 }
      )
    }

    // Get child info
    const [child] = await db
      .select({ id: users.id, name: users.name })
      .from(users)
      .where(eq(users.id, childId))
      .limit(1)

    if (!child) {
      return NextResponse.json({ error: 'Student not found' }, { status: 404 })
    }

    // If parent, verify link
    if (session.user.role === 'parent') {
      const [link] = await db
        .select()
        .from(parentChildren)
        .where(
          and(
            eq(parentChildren.parentId, session.user.id),
            eq(parentChildren.childId, childId)
          )
        )
        .limit(1)

      if (!link) {
        return NextResponse.json(
          { error: 'Not authorized for this child' },
          { status: 403 }
        )
      }
    }

    // Gather recent scores
    const recentSubs = await db
      .select({
        assignmentTitle: assignments.title,
        totalScore: submissions.totalScore,
        maxScore: submissions.maxScore,
        gradedAt: submissions.gradedAt,
      })
      .from(submissions)
      .innerJoin(assignments, eq(submissions.assignmentId, assignments.id))
      .where(
        and(
          eq(submissions.studentId, childId),
          eq(assignments.subject, subject)
        )
      )
      .orderBy(desc(submissions.gradedAt))
      .limit(10)

    const recentScores = recentSubs
      .filter((s) => s.totalScore !== null && s.maxScore !== null)
      .map((s) => ({
        assignment: s.assignmentTitle,
        score: s.totalScore!,
        maxScore: s.maxScore!,
        date: s.gradedAt?.toISOString().split('T')[0] ?? '',
      }))

    // Gather mastery data
    const masteryData = await db
      .select({
        standardDescription: standards.description,
        level: masteryRecords.level,
        score: masteryRecords.score,
        code: standards.code,
      })
      .from(masteryRecords)
      .innerJoin(standards, eq(masteryRecords.standardId, standards.id))
      .where(
        and(
          eq(masteryRecords.studentId, childId),
          eq(standards.subject, subject)
        )
      )
      .orderBy(desc(masteryRecords.assessedAt))
      .limit(20)

    // Deduplicate by standard (keep latest)
    const seenCodes = new Set<string>()
    const uniqueMastery = masteryData.filter((m) => {
      if (seenCodes.has(m.code)) return false
      seenCodes.add(m.code)
      return true
    })

    // Generate AI narrative
    const narrative = await generateParentProgressNarrative({
      studentName: child.name ?? 'Student',
      subject,
      gradingPeriod,
      recentScores,
      masteryData: uniqueMastery.map((m) => ({
        standard: m.code,
        standardDescription: m.standardDescription,
        level: m.level,
        score: m.score,
      })),
    })

    // Find the parent for this child to store the message
    const parentLinks = await db
      .select({ parentId: parentChildren.parentId })
      .from(parentChildren)
      .where(eq(parentChildren.childId, childId))

    // Store as a message for each parent
    const createdMessages = []
    for (const pl of parentLinks) {
      const [msg] = await db
        .insert(messages)
        .values({
          senderId: session.user.id,
          receiverId: pl.parentId,
          subject: `${child.name}'s ${subject} Progress - ${gradingPeriod}`,
          content: JSON.stringify(narrative),
          type: 'progress_update',
          isAIGenerated: true,
          status: 'sent',
          metadata: JSON.stringify({
            childId,
            subject,
            gradingPeriod,
            overallStatus: narrative.overallStatus,
          }),
        })
        .returning()
      createdMessages.push(msg)
    }

    return NextResponse.json(
      { narrative, messages: createdMessages },
      { status: 201 }
    )
  } catch (error) {
    console.error('Failed to generate progress narrative:', error)
    return NextResponse.json(
      { error: 'Failed to generate progress narrative' },
      { status: 500 }
    )
  }
}
