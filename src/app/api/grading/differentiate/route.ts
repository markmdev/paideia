import { auth } from '@/lib/auth'
import { db } from '@/lib/db'
import { assignments, submissions, users } from '@/lib/db/schema'
import { eq, and } from 'drizzle-orm'
import { NextResponse } from 'next/server'
import {
  assessmentDrivenDifferentiation,
  type TierActivity,
} from '@/lib/ai/differentiate'

interface DifferentiatedTier {
  level: 'below_grade' | 'on_grade' | 'above_grade'
  label: string
  studentCount: number
  students: Array<{ name: string; score: number }>
  activity: TierActivity
}

export async function POST(req: Request) {
  const session = await auth()
  if (!session?.user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  if (session.user.role !== 'teacher' && session.user.role !== 'sped_teacher') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const body = await req.json()
  const { assignmentId } = body as { assignmentId?: string }

  if (!assignmentId) {
    return NextResponse.json(
      { error: 'Missing required field: assignmentId' },
      { status: 400 }
    )
  }

  // Fetch the assignment
  const [assignment] = await db
    .select({
      id: assignments.id,
      title: assignments.title,
      instructions: assignments.instructions,
      subject: assignments.subject,
      gradeLevel: assignments.gradeLevel,
    })
    .from(assignments)
    .where(
      and(
        eq(assignments.id, assignmentId),
        eq(assignments.teacherId, session.user.id)
      )
    )
    .limit(1)

  if (!assignment) {
    return NextResponse.json(
      { error: 'Assignment not found or you do not have access' },
      { status: 403 }
    )
  }

  // Fetch all submissions with scores, joined with student names
  const allSubmissions = await db
    .select({
      studentName: users.name,
      totalScore: submissions.totalScore,
      maxScore: submissions.maxScore,
    })
    .from(submissions)
    .innerJoin(users, eq(submissions.studentId, users.id))
    .where(eq(submissions.assignmentId, assignmentId))

  // Filter to scored submissions and compute percentages
  const scoredStudents = allSubmissions
    .filter((s) => s.totalScore !== null && s.maxScore !== null && s.maxScore! > 0)
    .map((s) => ({
      name: s.studentName ?? 'Unknown Student',
      score: Math.round(((s.totalScore ?? 0) / (s.maxScore ?? 100)) * 100),
    }))

  if (scoredStudents.length === 0) {
    return NextResponse.json(
      { error: 'No graded submissions found for this assignment' },
      { status: 400 }
    )
  }

  // Cluster students into 3 tiers
  const belowGrade = scoredStudents.filter((s) => s.score < 60)
  const onGrade = scoredStudents.filter((s) => s.score >= 60 && s.score < 85)
  const aboveGrade = scoredStudents.filter((s) => s.score >= 85)

  // Call AI service to generate differentiated follow-up activities
  const avgScore = (arr: { score: number }[]) =>
    arr.length > 0 ? Math.round(arr.reduce((s, st) => s + st.score, 0) / arr.length) : 0

  const aiResult = await assessmentDrivenDifferentiation({
    assignmentTitle: assignment.title,
    subject: assignment.subject,
    gradeLevel: assignment.gradeLevel,
    instructions: assignment.instructions,
    belowGrade: { count: belowGrade.length, avgScore: avgScore(belowGrade) },
    onGrade: { count: onGrade.length, avgScore: avgScore(onGrade) },
    aboveGrade: { count: aboveGrade.length, avgScore: avgScore(aboveGrade) },
  })

  const tiers: DifferentiatedTier[] = [
    {
      level: 'below_grade',
      label: 'Below Grade',
      studentCount: belowGrade.length,
      students: belowGrade.sort((a, b) => a.score - b.score),
      activity: aiResult.below_grade,
    },
    {
      level: 'on_grade',
      label: 'On Grade',
      studentCount: onGrade.length,
      students: onGrade.sort((a, b) => a.score - b.score),
      activity: aiResult.on_grade,
    },
    {
      level: 'above_grade',
      label: 'Above Grade',
      studentCount: aboveGrade.length,
      students: aboveGrade.sort((a, b) => b.score - a.score),
      activity: aiResult.above_grade,
    },
  ]

  return NextResponse.json({ tiers })
}
