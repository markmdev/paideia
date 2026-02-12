import { anthropic, AI_MODEL } from '@/lib/ai'

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface ReportCardInput {
  studentName: string
  className: string
  subject: string
  gradeLevel: string
  gradingPeriod: string
  submissions: {
    assignmentTitle: string
    score: number | null
    maxScore: number | null
    letterGrade: string | null
    submittedAt: string
  }[]
  masteryData: {
    standardCode: string
    standardDescription: string
    level: string
    score: number
  }[]
  feedbackHighlights: string[]
}

export interface GeneratedReportCard {
  overallNarrative: string
  strengths: string[]
  areasForGrowth: string[]
  recommendations: string[]
  gradeRecommendation: string
}

// ---------------------------------------------------------------------------
// generateReportCardNarrative
// ---------------------------------------------------------------------------

export async function generateReportCardNarrative(
  input: ReportCardInput
): Promise<GeneratedReportCard> {
  const submissionsSection = input.submissions.length
    ? input.submissions
        .map(
          (s) =>
            `- ${s.assignmentTitle}: ${s.score !== null && s.maxScore !== null ? `${s.score}/${s.maxScore}` : 'Not graded'}${s.letterGrade ? ` (${s.letterGrade})` : ''} (${s.submittedAt})`
        )
        .join('\n')
    : 'No submissions this grading period.'

  const masterySection = input.masteryData.length
    ? input.masteryData
        .map(
          (m) =>
            `- ${m.standardDescription} (${m.standardCode}): ${m.level} (${m.score}%)`
        )
        .join('\n')
    : 'No mastery data available.'

  const feedbackSection = input.feedbackHighlights.length
    ? input.feedbackHighlights.map((f) => `- ${f}`).join('\n')
    : 'No prior feedback highlights.'

  const response = await anthropic.messages.create({
    model: AI_MODEL,
    max_tokens: 4096,
    system: `You are an experienced K-12 educator writing report card narratives for parents. Your language is clear, specific, evidence-based, and parent-friendly. You avoid educational jargon and standards codes in the narrative -- use plain descriptions of skills and concepts instead. Write in a warm, professional tone that conveys genuine knowledge of the student. Every claim should be grounded in the data provided. Frame growth areas constructively as opportunities, not deficits. Recommendations should be specific and actionable for both home and school settings.`,
    tools: [
      {
        name: 'generate_report_card',
        description:
          'Generate a comprehensive report card narrative with structured sections for a student based on their longitudinal performance data.',
        input_schema: {
          type: 'object' as const,
          properties: {
            overallNarrative: {
              type: 'string',
              description:
                'A 2-3 paragraph narrative summarizing the student\'s performance this grading period. Use plain language appropriate for parents. Reference specific assignments, skills, and growth patterns from the data. Write as if addressing the parent directly.',
            },
            strengths: {
              type: 'array',
              items: { type: 'string' },
              description:
                'Specific strengths demonstrated this grading period (3-5 items). Each strength should cite concrete evidence from submissions, scores, or mastery data. Use plain language.',
            },
            areasForGrowth: {
              type: 'array',
              items: { type: 'string' },
              description:
                'Areas where the student can improve (2-3 items). Frame constructively as growth opportunities with specific skill descriptions. Avoid deficit language.',
            },
            recommendations: {
              type: 'array',
              items: { type: 'string' },
              description:
                'Actionable suggestions for supporting the student (2-3 items). Include a mix of home activities and school-based strategies. Each recommendation should be specific and practical.',
            },
            gradeRecommendation: {
              type: 'string',
              enum: [
                'A+', 'A', 'A-',
                'B+', 'B', 'B-',
                'C+', 'C', 'C-',
                'D+', 'D', 'D-',
                'F',
              ],
              description:
                'Letter grade recommendation based on the overall data. Use standard grading scale: A (90-100%), B (80-89%), C (70-79%), D (60-69%), F (below 60%).',
            },
          },
          required: [
            'overallNarrative',
            'strengths',
            'areasForGrowth',
            'recommendations',
            'gradeRecommendation',
          ],
        },
      },
    ],
    tool_choice: { type: 'tool', name: 'generate_report_card' },
    messages: [
      {
        role: 'user',
        content: `Generate a report card narrative for this student:

Student: ${input.studentName}
Class: ${input.className}
Subject: ${input.subject}
Grade Level: ${input.gradeLevel}
Grading Period: ${input.gradingPeriod}

Submissions and Scores:
${submissionsSection}

Standards Mastery Data:
${masterySection}

Prior Feedback Highlights:
${feedbackSection}

Write a comprehensive, evidence-based report card narrative. Include specific strengths with concrete examples from the data, constructive growth areas, actionable recommendations for home and school, and a letter grade recommendation based on the scores and mastery data.`,
      },
    ],
  })

  const toolUseBlock = response.content.find(
    (block): block is Extract<typeof block, { type: 'tool_use' }> =>
      block.type === 'tool_use'
  )

  if (!toolUseBlock) {
    throw new Error(
      'AI did not return structured report card narrative. Please try again.'
    )
  }

  return toolUseBlock.input as GeneratedReportCard
}
