import { anthropic, AI_MODEL } from '@/lib/ai'

export interface ExitTicketInput {
  topic: string
  gradeLevel: string
  subject: string
  numberOfQuestions?: number
  lessonContext?: string
}

export interface GeneratedExitTicket {
  title: string
  questions: Array<{
    questionText: string
    questionType: 'multiple_choice' | 'short_answer' | 'true_false'
    options?: string[]
    correctAnswer: string
    explanation: string
    targetSkill: string
  }>
}

export async function generateExitTicket(input: ExitTicketInput): Promise<GeneratedExitTicket> {
  const numberOfQuestions = input.numberOfQuestions ?? 3

  const response = await anthropic.messages.create({
    model: AI_MODEL,
    max_tokens: 4096,
    system: `You are an expert K-12 teacher creating formative exit tickets to check student understanding at the end of a lesson. Generate quick, focused questions that assess the key concepts of the topic. Questions should take 2-5 minutes total for students to complete.`,
    tools: [
      {
        name: 'exit_ticket',
        description: 'Create a formative exit ticket with quick-check questions to assess student understanding at the end of a lesson.',
        input_schema: {
          type: 'object' as const,
          properties: {
            title: {
              type: 'string',
              description: 'A concise, descriptive title for the exit ticket.',
            },
            questions: {
              type: 'array',
              items: {
                type: 'object',
                properties: {
                  questionText: {
                    type: 'string',
                    description: 'The question prompt, written clearly for the target grade level.',
                  },
                  questionType: {
                    type: 'string',
                    enum: ['multiple_choice', 'short_answer', 'true_false'],
                    description: 'The format of the question.',
                  },
                  options: {
                    type: 'array',
                    items: { type: 'string' },
                    description: 'Answer choices for multiple-choice questions (typically 4 options). Omit for short answer and true/false.',
                  },
                  correctAnswer: {
                    type: 'string',
                    description: 'The correct answer. For multiple choice, the full text of the correct option. For true/false, "True" or "False". For short answer, a concise expected response.',
                  },
                  explanation: {
                    type: 'string',
                    description: 'A brief explanation of why this is the correct answer, suitable for teacher reference or student review.',
                  },
                  targetSkill: {
                    type: 'string',
                    description: 'The specific skill or concept this question assesses (e.g., "Identifying main idea", "Solving two-step equations").',
                  },
                },
                required: ['questionText', 'questionType', 'correctAnswer', 'explanation', 'targetSkill'],
              },
              description: 'The exit ticket questions with answer keys and explanations.',
            },
          },
          required: ['title', 'questions'],
        },
      },
    ],
    tool_choice: { type: 'tool', name: 'exit_ticket' },
    messages: [
      {
        role: 'user',
        content: `Create a formative exit ticket for the following:

Topic: ${input.topic}
Subject: ${input.subject}
Grade Level: ${input.gradeLevel}
Number of Questions: ${numberOfQuestions}
${input.lessonContext ? `Lesson Context: ${input.lessonContext}` : ''}

Generate ${numberOfQuestions} quick-check questions that assess the key concepts. Use a mix of question types (multiple choice, short answer, true/false) appropriate for the grade level. Each question should target a specific skill or concept from the lesson. Questions should be answerable in under a minute each.`,
      },
    ],
  })

  const toolUseBlock = response.content.find(
    (block): block is Extract<typeof block, { type: 'tool_use' }> => block.type === 'tool_use'
  )

  if (!toolUseBlock) {
    throw new Error('AI did not return structured exit ticket data. Please try again.')
  }

  return toolUseBlock.input as GeneratedExitTicket
}
