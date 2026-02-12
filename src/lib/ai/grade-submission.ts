import { anthropic, AI_MODEL } from '@/lib/ai'

export interface GradeSubmissionInput {
  studentWork: string
  rubric: {
    title: string
    levels: string[]
    criteria: {
      id: string
      name: string
      description: string
      weight: number
      descriptors: Record<string, string>
    }[]
  }
  assignment: {
    title: string
    description: string
    instructions?: string
    subject: string
    gradeLevel: string
    standards?: string[]
  }
  feedbackTone?: 'encouraging' | 'direct' | 'socratic' | 'growth_mindset'
  teacherGuidance?: string
}

export interface GradingResult {
  criterionScores: {
    criterionId: string
    criterionName: string
    level: string
    score: number
    maxScore: number
    justification: string
  }[]
  totalScore: number
  maxScore: number
  letterGrade: string
  overallFeedback: string
  strengths: string[]
  improvements: string[]
  nextSteps: string[]
  misconceptions?: string[]
}

const TONE_INSTRUCTIONS: Record<string, string> = {
  encouraging:
    'Use a warm, encouraging tone. Lead with what the student did well. Frame areas for improvement as opportunities for growth. Use phrases like "You\'re on the right track," "Great effort on," and "A next step could be."',
  direct:
    'Use a clear, direct tone. State what the student demonstrated and what is missing. Be specific and factual without sugar-coating. Use phrases like "This essay demonstrates," "This section lacks," and "To improve, you need to."',
  socratic:
    'Use a Socratic tone that prompts reflection. Ask guiding questions that lead the student to identify their own strengths and gaps. Use phrases like "What do you think would happen if," "How might you strengthen," and "What evidence could support."',
  growth_mindset:
    'Use a growth-mindset tone that emphasizes effort, strategy, and learning from mistakes. Frame abilities as developable. Use phrases like "Your effort shows in," "One strategy to try is," "Mistakes here are learning opportunities because," and "You haven\'t mastered this yet, but."',
}

function buildSystemMessage(input: GradeSubmissionInput) {
  const toneInstruction =
    TONE_INSTRUCTIONS[input.feedbackTone ?? 'encouraging'] ??
    TONE_INSTRUCTIONS.encouraging

  const teacherGuidanceSection = input.teacherGuidance
    ? `\n\nTEACHER GUIDANCE:\n${input.teacherGuidance}`
    : ''

  return `You are an expert K-12 teacher grading student work. You evaluate each submission carefully against the provided rubric, criterion by criterion. Your feedback is specific, referencing the student's actual words and ideas rather than offering generic observations. You identify patterns that suggest common misconceptions.

FEEDBACK TONE:
${toneInstruction}

GRADING INSTRUCTIONS:
1. Read the student's work thoroughly.
2. Evaluate each rubric criterion independently, selecting the proficiency level that best matches the student's demonstrated performance.
3. Assign a numeric score for each criterion: the level index (0-based from lowest to highest) divided by the number of levels minus one, scaled to the criterion's weight. For example, with 4 levels (Beginning=0, Developing=1, Proficient=2, Advanced=3), a "Proficient" score is 2/3 of the criterion's max score.
4. Write a justification for each criterion that cites specific evidence from the student's work.
5. Identify overall strengths, specific improvements, actionable next steps, and any misconceptions.
6. Assign a letter grade based on the total percentage: A (90-100%), B (80-89%), C (70-79%), D (60-69%), F (below 60%).${teacherGuidanceSection}`
}

function buildCachedSystemMessage(input: GradeSubmissionInput) {
  const toneInstruction =
    TONE_INSTRUCTIONS[input.feedbackTone ?? 'encouraging'] ??
    TONE_INSTRUCTIONS.encouraging

  const teacherGuidanceSection = input.teacherGuidance
    ? `\n\nTEACHER GUIDANCE:\n${input.teacherGuidance}`
    : ''

  return [
    {
      type: 'text' as const,
      text: `You are an expert K-12 teacher grading student work. You evaluate each submission carefully against the provided rubric, criterion by criterion. Your feedback is specific, referencing the student's actual words and ideas rather than offering generic observations. You identify patterns that suggest common misconceptions.

FEEDBACK TONE:
${toneInstruction}

GRADING INSTRUCTIONS:
1. Read the student's work thoroughly.
2. Evaluate each rubric criterion independently, selecting the proficiency level that best matches the student's demonstrated performance.
3. Assign a numeric score for each criterion: the level index (0-based from lowest to highest) divided by the number of levels minus one, scaled to the criterion's weight. For example, with 4 levels (Beginning=0, Developing=1, Proficient=2, Advanced=3), a "Proficient" score is 2/3 of the criterion's max score.
4. Write a justification for each criterion that cites specific evidence from the student's work.
5. Identify overall strengths, specific improvements, actionable next steps, and any misconceptions.
6. Assign a letter grade based on the total percentage: A (90-100%), B (80-89%), C (70-79%), D (60-69%), F (below 60%).${teacherGuidanceSection}`,
    },
    {
      type: 'text' as const,
      text: `RUBRIC:\n${JSON.stringify(input.rubric)}\n\nASSIGNMENT:\n${JSON.stringify(input.assignment)}`,
      cache_control: { type: 'ephemeral' as const },
    },
  ]
}

function buildGradingTool(input: GradeSubmissionInput) {
  return {
    name: 'grade_student_work',
    description:
      'Grade a student submission against a rubric, providing per-criterion scores with justifications, overall feedback, strengths, improvements, next steps, and detected misconceptions.',
    input_schema: {
      type: 'object' as const,
      properties: {
        criterionScores: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              criterionId: {
                type: 'string',
                description: 'The ID of the rubric criterion being scored.',
              },
              criterionName: {
                type: 'string',
                description: 'The name of the rubric criterion.',
              },
              level: {
                type: 'string',
                description:
                  'The proficiency level achieved (must be one of the rubric levels).',
              },
              score: {
                type: 'number',
                description:
                  'Numeric score for this criterion (0 to maxScore).',
              },
              maxScore: {
                type: 'number',
                description:
                  'Maximum possible score for this criterion, equal to the criterion weight times 100.',
              },
              justification: {
                type: 'string',
                description:
                  'Specific justification for the score, referencing the student\'s actual work.',
              },
            },
            required: [
              'criterionId',
              'criterionName',
              'level',
              'score',
              'maxScore',
              'justification',
            ],
          },
          description: `Scores for each of the ${input.rubric.criteria.length} rubric criteria. You must score every criterion: ${input.rubric.criteria.map((c) => `"${c.name}" (id: ${c.id}, weight: ${c.weight})`).join(', ')}.`,
        },
        totalScore: {
          type: 'number',
          description: 'Sum of all criterion scores.',
        },
        maxScore: {
          type: 'number',
          description: 'Sum of all criterion max scores (should be 100).',
        },
        letterGrade: {
          type: 'string',
          enum: ['A+', 'A', 'A-', 'B+', 'B', 'B-', 'C+', 'C', 'C-', 'D+', 'D', 'D-', 'F'],
          description: 'Letter grade based on total percentage.',
        },
        overallFeedback: {
          type: 'string',
          description:
            'A 2-4 sentence overall assessment of the student\'s work that synthesizes the criterion-level analysis.',
        },
        strengths: {
          type: 'array',
          items: { type: 'string' },
          description:
            'Specific strengths demonstrated in the student\'s work (2-4 items). Each should reference concrete evidence from the submission.',
        },
        improvements: {
          type: 'array',
          items: { type: 'string' },
          description:
            'Specific areas for improvement (2-4 items). Each should be actionable and reference specific parts of the submission.',
        },
        nextSteps: {
          type: 'array',
          items: { type: 'string' },
          description:
            'Concrete next steps the student can take to improve (2-3 items). These should be specific, actionable activities or practices.',
        },
        misconceptions: {
          type: 'array',
          items: { type: 'string' },
          description:
            'Common misconceptions detected in the student\'s work (0-3 items). Only include if the work reveals misunderstandings of key concepts.',
        },
      },
      required: [
        'criterionScores',
        'totalScore',
        'maxScore',
        'letterGrade',
        'overallFeedback',
        'strengths',
        'improvements',
        'nextSteps',
      ],
    },
  }
}

export async function gradeSubmission(
  input: GradeSubmissionInput
): Promise<GradingResult> {
  const systemText = buildSystemMessage(input)
  const tool = buildGradingTool(input)

  const response = await anthropic.messages.create({
    model: AI_MODEL,
    max_tokens: 4096,
    system: `${systemText}\n\nRUBRIC:\n${JSON.stringify(input.rubric)}\n\nASSIGNMENT:\n${JSON.stringify(input.assignment)}`,
    tools: [tool],
    tool_choice: { type: 'tool', name: 'grade_student_work' },
    messages: [
      {
        role: 'user',
        content: `Grade this student's work:\n\n${input.studentWork}`,
      },
    ],
  })

  const toolUseBlock = response.content.find(
    (block): block is Extract<typeof block, { type: 'tool_use' }> =>
      block.type === 'tool_use'
  )

  if (!toolUseBlock) {
    throw new Error(
      'AI did not return structured grading data. Please try again.'
    )
  }

  return toolUseBlock.input as GradingResult
}

export interface BatchSubmission {
  id: string
  studentWork: string
}

export interface BatchGradingResult {
  submissionId: string
  result: GradingResult
}

export async function batchGradeSubmissions(
  submissions: BatchSubmission[],
  rubric: GradeSubmissionInput['rubric'],
  assignment: GradeSubmissionInput['assignment'],
  options?: {
    feedbackTone?: GradeSubmissionInput['feedbackTone']
    teacherGuidance?: string
  }
): Promise<BatchGradingResult[]> {
  const input: GradeSubmissionInput = {
    studentWork: '',
    rubric,
    assignment,
    feedbackTone: options?.feedbackTone,
    teacherGuidance: options?.teacherGuidance,
  }

  const systemMessage = buildCachedSystemMessage(input)
  const tool = buildGradingTool(input)

  const results: BatchGradingResult[] = []

  for (const submission of submissions) {
    const response = await anthropic.messages.create({
      model: AI_MODEL,
      max_tokens: 4096,
      system: systemMessage,
      tools: [tool],
      tool_choice: { type: 'tool', name: 'grade_student_work' },
      messages: [
        {
          role: 'user',
          content: `Grade this student's work:\n\n${submission.studentWork}`,
        },
      ],
    })

    const toolUseBlock = response.content.find(
      (block): block is Extract<typeof block, { type: 'tool_use' }> =>
        block.type === 'tool_use'
    )

    if (!toolUseBlock) {
      throw new Error(
        `AI did not return structured grading data for submission ${submission.id}. Please try again.`
      )
    }

    results.push({
      submissionId: submission.id,
      result: toolUseBlock.input as GradingResult,
    })
  }

  return results
}
