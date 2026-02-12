import { anthropic, AI_MODEL } from '@/lib/ai'

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface DistrictSnapshot {
  schools: number
  teachers: number
  students: number
  classes: number
  assignments: number
  submissions: number
  gradedSubmissions: number
  aiFeedbackGenerated: number
  ungradedSubmissions: number
  masteryDistribution: Record<string, number>
  subjectScores: { subject: string; avgScore: number | null; submissions: number }[]
  gradingCompletionRate: number
  teacherEngagement: {
    totalTeachers: number
    withAssignments: number
    withLessonPlans: number
    withRubrics: number
    withFeedbackDrafts: number
  }
}

export interface DistrictInsights {
  executiveSummary: string
  keyFindings: string[]
  concerns: string[]
  recommendations: string[]
}

// ---------------------------------------------------------------------------
// Generate district insights using Claude Opus with tool_use
// ---------------------------------------------------------------------------

export async function generateDistrictInsights(
  snapshot: DistrictSnapshot
): Promise<DistrictInsights> {
  const response = await anthropic.messages.create({
    model: AI_MODEL,
    max_tokens: 16000,
    thinking: { type: 'adaptive' },
    system: `You are a district education analyst for a K-12 school district using an AI-powered teaching platform. You analyze aggregate data and generate actionable insights for district administrators. Your analysis is data-driven, specific, and focused on improving student outcomes and teacher effectiveness. Reference exact numbers from the data. Prioritize findings by impact.`,
    tools: [
      {
        name: 'district_insights',
        description:
          'Generate structured district intelligence insights from aggregate education data. Provides executive summary, key findings, concerns, and recommendations for district administrators.',
        input_schema: {
          type: 'object' as const,
          properties: {
            executiveSummary: {
              type: 'string',
              description:
                'A concise 2-3 sentence executive summary of the district\'s current state, referencing key metrics and overall health.',
            },
            keyFindings: {
              type: 'array',
              items: { type: 'string' },
              description:
                'Three to five key findings from the data, each a specific insight backed by numbers. Focus on patterns in student performance, teacher engagement, AI adoption, and grading workflows.',
            },
            concerns: {
              type: 'array',
              items: { type: 'string' },
              description:
                'Two to three areas of concern that require attention. Focus on gaps, bottlenecks, underperformance, or equity issues visible in the data.',
            },
            recommendations: {
              type: 'array',
              items: { type: 'string' },
              description:
                'Three to five actionable recommendations for district leadership. Each should be specific, implementable, and tied to a finding or concern.',
            },
          },
          required: [
            'executiveSummary',
            'keyFindings',
            'concerns',
            'recommendations',
          ],
        },
      },
    ],
    tool_choice: { type: 'tool', name: 'district_insights' },
    messages: [
      {
        role: 'user',
        content: `Analyze the following district data snapshot and generate structured insights for district administrators.

District Data:
${JSON.stringify(snapshot, null, 2)}

Key metrics to analyze:
- Overall platform adoption: ${snapshot.teachers} teachers, ${snapshot.students} students across ${snapshot.schools} schools
- Teacher engagement: ${snapshot.teacherEngagement.withAssignments} of ${snapshot.teacherEngagement.totalTeachers} teachers have created assignments, ${snapshot.teacherEngagement.withFeedbackDrafts} have used AI feedback
- Grading pipeline: ${snapshot.gradedSubmissions} graded of ${snapshot.submissions} total submissions (${snapshot.gradingCompletionRate}% completion rate), ${snapshot.ungradedSubmissions} ungraded
- Student mastery: ${JSON.stringify(snapshot.masteryDistribution)}
- Subject performance: ${snapshot.subjectScores.map((s) => `${s.subject}: ${s.avgScore ?? 'N/A'}% avg (${s.submissions} submissions)`).join('; ')}

Generate 3-5 key findings, 2-3 concerns, and 3-5 recommendations. Be specific and reference the data.`,
      },
    ],
  })

  const toolUseBlock = response.content.find(
    (block): block is Extract<typeof block, { type: 'tool_use' }> =>
      block.type === 'tool_use'
  )

  if (!toolUseBlock) {
    throw new Error(
      'AI did not return structured district insights. Please try again.'
    )
  }

  return toolUseBlock.input as DistrictInsights
}
