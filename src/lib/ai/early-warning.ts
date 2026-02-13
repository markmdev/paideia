import { anthropic, AI_MODEL } from '@/lib/ai'

export interface FlaggedStudent {
  anonId: string
  riskLevel: string
  indicators: string[]
  recentScores: number[]
  trendDirection: string
}

export interface StudentIntervention {
  studentLabel: string
  recommendations: string[]
}

export interface StudentInterventionsResult {
  students: StudentIntervention[]
}

export async function generateStudentInterventions(
  flaggedStudents: FlaggedStudent[]
): Promise<StudentInterventionsResult> {
  const studentSummaries = flaggedStudents
    .map(
      (s) =>
        `Student: ${s.anonId}\nRisk Level: ${s.riskLevel.replace('_', ' ')}\nIndicators: ${s.indicators.join(', ')}\nRecent Scores: ${s.recentScores.join(', ') || 'No scores'}\nTrend: ${s.trendDirection}`
    )
    .join('\n\n')

  const response = await anthropic.messages.create({
    model: AI_MODEL,
    max_tokens: 4096,
    system:
      'You are an expert K-12 education interventionist. Based on student performance data, generate specific, actionable intervention recommendations for teachers. Students are identified by anonymized labels (e.g. "Student A", "Student B"). Use these exact labels in your response.',
    tools: [
      {
        name: 'student_interventions',
        description:
          'Generate intervention recommendations for at-risk students based on their performance data.',
        input_schema: {
          type: 'object' as const,
          properties: {
            students: {
              type: 'array',
              items: {
                type: 'object',
                properties: {
                  studentLabel: {
                    type: 'string',
                    description:
                      'The anonymized student label exactly as provided (e.g. "Student A").',
                  },
                  recommendations: {
                    type: 'array',
                    items: { type: 'string' },
                    description:
                      '2-3 specific, actionable intervention recommendations for this student.',
                  },
                },
                required: ['studentLabel', 'recommendations'],
              },
            },
          },
          required: ['students'],
        },
      },
    ],
    tool_choice: { type: 'tool', name: 'student_interventions' },
    messages: [
      {
        role: 'user',
        content: `The following students have been flagged as at-risk based on their recent performance data. Please generate 2-3 specific intervention recommendations for each student.\n\n${studentSummaries}`,
      },
    ],
  })

  const toolUseBlock = response.content.find(
    (block): block is Extract<typeof block, { type: 'tool_use' }> =>
      block.type === 'tool_use'
  )

  if (!toolUseBlock) {
    throw new Error(
      'AI did not return structured intervention data. Please try again.'
    )
  }

  return toolUseBlock.input as StudentInterventionsResult
}
