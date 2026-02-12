import { auth } from '@/lib/auth'
import { db } from '@/lib/db'
import { assignments, submissions, users } from '@/lib/db/schema'
import { eq, and } from 'drizzle-orm'
import { NextResponse } from 'next/server'
import { anthropic, AI_MODEL } from '@/lib/ai'

interface TierActivity {
  title: string
  description: string
  instructions: string
  scaffolds?: string[]
  extensions?: string[]
}

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

  // Call Claude to generate differentiated follow-up activities
  const response = await anthropic.messages.create({
    model: AI_MODEL,
    max_tokens: 4096,
    system: 'You are an expert K-12 instructional designer. Based on student performance data from a graded assignment, generate differentiated follow-up activities for three performance tiers. Each activity should target the same learning objective but at different complexity levels. The below-grade activity should include scaffolds (sentence starters, graphic organizers, word banks, etc). The above-grade activity should include extensions (research tasks, creative applications, leadership roles, etc). The on-grade activity should reinforce the core concepts at the appropriate level.',
    tools: [
      {
        name: 'differentiated_activities',
        description:
          'Generate three differentiated follow-up activities based on student performance tiers from a graded assignment.',
        input_schema: {
          type: 'object' as const,
          properties: {
            below_grade: {
              type: 'object',
              properties: {
                title: {
                  type: 'string',
                  description: 'Title of the follow-up activity for struggling students.',
                },
                description: {
                  type: 'string',
                  description:
                    'Brief description of what this activity addresses and why.',
                },
                instructions: {
                  type: 'string',
                  description:
                    'Step-by-step instructions for students, written in accessible language.',
                },
                scaffolds: {
                  type: 'array',
                  items: { type: 'string' },
                  description:
                    'Specific scaffolds: sentence starters, graphic organizers, word banks, chunked steps, visual aids.',
                },
              },
              required: ['title', 'description', 'instructions', 'scaffolds'],
            },
            on_grade: {
              type: 'object',
              properties: {
                title: {
                  type: 'string',
                  description:
                    'Title of the follow-up activity for students meeting expectations.',
                },
                description: {
                  type: 'string',
                  description:
                    'Brief description of what this activity reinforces.',
                },
                instructions: {
                  type: 'string',
                  description: 'Step-by-step instructions for students.',
                },
              },
              required: ['title', 'description', 'instructions'],
            },
            above_grade: {
              type: 'object',
              properties: {
                title: {
                  type: 'string',
                  description:
                    'Title of the follow-up activity for students exceeding expectations.',
                },
                description: {
                  type: 'string',
                  description:
                    'Brief description of the enrichment focus.',
                },
                instructions: {
                  type: 'string',
                  description: 'Step-by-step instructions for students.',
                },
                extensions: {
                  type: 'array',
                  items: { type: 'string' },
                  description:
                    'Extension challenges: research tasks, cross-curricular connections, creative applications, leadership roles.',
                },
              },
              required: ['title', 'description', 'instructions', 'extensions'],
            },
          },
          required: ['below_grade', 'on_grade', 'above_grade'],
        },
      },
    ],
    tool_choice: { type: 'tool', name: 'differentiated_activities' },
    messages: [
      {
        role: 'user',
        content: `Generate differentiated follow-up activities for a graded assignment.

Assignment Details:
- Title: ${assignment.title}
- Subject: ${assignment.subject}
- Grade Level: ${assignment.gradeLevel}
- Instructions: ${assignment.instructions ?? 'N/A'}

Student Performance Data:
- Below Grade (score < 60%): ${belowGrade.length} students${belowGrade.length > 0 ? ` — average score: ${Math.round(belowGrade.reduce((s, st) => s + st.score, 0) / belowGrade.length)}%` : ''}
- On Grade (60-84%): ${onGrade.length} students${onGrade.length > 0 ? ` — average score: ${Math.round(onGrade.reduce((s, st) => s + st.score, 0) / onGrade.length)}%` : ''}
- Above Grade (85%+): ${aboveGrade.length} students${aboveGrade.length > 0 ? ` — average score: ${Math.round(aboveGrade.reduce((s, st) => s + st.score, 0) / aboveGrade.length)}%` : ''}

Generate three targeted follow-up activities that address the same learning objective at different complexity levels. The below-grade activity should provide additional scaffolding and practice on foundational skills. The on-grade activity should deepen understanding. The above-grade activity should challenge students with extensions and higher-order thinking.`,
      },
    ],
  })

  const toolUseBlock = response.content.find(
    (block): block is Extract<typeof block, { type: 'tool_use' }> =>
      block.type === 'tool_use'
  )

  if (!toolUseBlock) {
    return NextResponse.json(
      { error: 'AI did not return structured differentiation data. Please try again.' },
      { status: 500 }
    )
  }

  const aiResult = toolUseBlock.input as {
    below_grade: TierActivity
    on_grade: TierActivity
    above_grade: TierActivity
  }

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
