import { anthropic, AI_MODEL } from '@/lib/ai'

export interface GapData {
  standardCode: string
  standardDescription: string
  classSize: number
  belowProficientCount: number
  averageScore: number
  studentsBelow: { studentName: string; level: string; score: number }[]
}

export interface ReteachRecommendation {
  standardCode: string
  activities: string[]
  groupingStrategy: string
}

export interface ReteachActivitiesResult {
  recommendations: ReteachRecommendation[]
}

export async function generateReteachActivities(
  gapData: GapData[]
): Promise<ReteachActivitiesResult> {
  const gapSummary = gapData
    .map(
      (g) =>
        `Standard ${g.standardCode}: "${g.standardDescription}" - ${g.belowProficientCount}/${g.classSize} students below proficient (avg score: ${g.averageScore}). Students below: ${g.studentsBelow.map((s) => `${s.studentName} (${s.level}, ${s.score}%)`).join(', ')}`
    )
    .join('\n')

  const response = await anthropic.messages.create({
    model: AI_MODEL,
    max_tokens: 2048,
    system:
      'You are an experienced K-12 instructional coach. Generate specific, practical reteaching activity suggestions based on standards gap data. Each activity should be classroom-ready and take 15-45 minutes. Include student grouping strategies.',
    tools: [
      {
        name: 'suggest_reteach_activities',
        description:
          'Suggest reteaching activities for standards where students are struggling.',
        input_schema: {
          type: 'object' as const,
          properties: {
            recommendations: {
              type: 'array',
              items: {
                type: 'object',
                properties: {
                  standardCode: {
                    type: 'string',
                    description:
                      'The standard code this recommendation addresses.',
                  },
                  activities: {
                    type: 'array',
                    items: { type: 'string' },
                    description:
                      '2-3 specific classroom activities for reteaching this standard.',
                  },
                  groupingStrategy: {
                    type: 'string',
                    description:
                      'How to group students for this reteach (e.g., small group, pairs, whole class mini-lesson).',
                  },
                },
                required: ['standardCode', 'activities', 'groupingStrategy'],
              },
            },
          },
          required: ['recommendations'],
        },
      },
    ],
    tool_choice: { type: 'tool', name: 'suggest_reteach_activities' },
    messages: [
      {
        role: 'user',
        content: `Here is the standards gap analysis for my class. Please suggest reteaching activities for the standards where more than half the class is below proficient.\n\n${gapSummary}`,
      },
    ],
  })

  const toolUseBlock = response.content.find(
    (block): block is Extract<typeof block, { type: 'tool_use' }> =>
      block.type === 'tool_use'
  )

  if (!toolUseBlock) {
    throw new Error(
      'AI did not return structured reteach data. Please try again.'
    )
  }

  return toolUseBlock.input as ReteachActivitiesResult
}
