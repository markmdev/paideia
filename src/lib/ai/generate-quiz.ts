import { anthropic, AI_MODEL } from '@/lib/ai'

export interface QuizInput {
  subject: string
  gradeLevel: string
  topic: string
  numQuestions?: number
  questionTypes?: ('multiple_choice' | 'short_answer' | 'essay')[]
  standards?: string[]
  difficultyLevel?: string
}

export interface GeneratedQuiz {
  title: string
  questions: {
    type: string
    questionText: string
    options?: string[]
    correctAnswer: string
    explanation: string
    bloomsLevel: 'remember' | 'understand' | 'apply' | 'analyze' | 'evaluate' | 'create'
    standardCode?: string
    points: number
  }[]
}

export async function generateQuiz(input: QuizInput): Promise<GeneratedQuiz> {
  const numQuestions = input.numQuestions ?? 10
  const questionTypes = input.questionTypes ?? ['multiple_choice', 'short_answer']

  const response = await anthropic.messages.create({
    model: AI_MODEL,
    max_tokens: 4096,
    system: `You are an expert K-12 assessment designer. You create quiz questions that assess genuine understanding across all levels of Bloom's taxonomy -- from recall to creation. For multiple-choice questions, you write plausible distractors based on common student misconceptions, not obviously wrong answers. Every question includes a clear explanation of the correct answer. You distribute questions across Bloom's levels to provide a balanced assessment, with a mix of lower-order (remember, understand) and higher-order (apply, analyze, evaluate, create) items.`,
    tools: [
      {
        name: 'create_quiz',
        description: 'Create a complete quiz with standards-aligned questions tagged by Bloom\'s taxonomy level, including answer keys and explanations.',
        input_schema: {
          type: 'object' as const,
          properties: {
            title: {
              type: 'string',
              description: 'A descriptive title for the quiz.',
            },
            questions: {
              type: 'array',
              items: {
                type: 'object',
                properties: {
                  type: {
                    type: 'string',
                    enum: ['multiple_choice', 'short_answer', 'essay'],
                    description: 'The question format.',
                  },
                  questionText: {
                    type: 'string',
                    description: 'The question prompt, written clearly and unambiguously.',
                  },
                  options: {
                    type: 'array',
                    items: { type: 'string' },
                    description: 'Answer choices for multiple-choice questions (typically 4 options labeled A-D). Omit for short answer and essay.',
                  },
                  correctAnswer: {
                    type: 'string',
                    description: 'The correct answer. For multiple choice, the full text of the correct option. For short answer, the expected response. For essay, key points that should be addressed.',
                  },
                  explanation: {
                    type: 'string',
                    description: 'A clear explanation of why the answer is correct, suitable for student review.',
                  },
                  bloomsLevel: {
                    type: 'string',
                    enum: ['remember', 'understand', 'apply', 'analyze', 'evaluate', 'create'],
                    description: 'The Bloom\'s taxonomy cognitive level this question assesses.',
                  },
                  standardCode: {
                    type: 'string',
                    description: 'The academic standard this question aligns to, if applicable.',
                  },
                  points: {
                    type: 'number',
                    description: 'Point value for this question. Multiple choice typically 1-2 points, short answer 2-5 points, essay 5-10 points.',
                  },
                },
                required: ['type', 'questionText', 'correctAnswer', 'explanation', 'bloomsLevel', 'points'],
              },
              description: 'The quiz questions with answer keys, explanations, and Bloom\'s taxonomy tags.',
            },
          },
          required: ['title', 'questions'],
        },
      },
    ],
    tool_choice: { type: 'tool', name: 'create_quiz' },
    messages: [
      {
        role: 'user',
        content: `Create a quiz for the following:

Subject: ${input.subject}
Grade Level: ${input.gradeLevel}
Topic: ${input.topic}
Number of Questions: ${numQuestions}
Question Types: ${questionTypes.join(', ')}
${input.difficultyLevel ? `Difficulty Level: ${input.difficultyLevel}` : ''}
${input.standards?.length ? `Standards: ${input.standards.join(', ')}` : ''}

Generate ${numQuestions} questions that span Bloom's taxonomy levels.${input.difficultyLevel ? ` Target an overall difficulty of "${input.difficultyLevel}" -- adjust question complexity, vocabulary, and required reasoning depth accordingly.` : ''} For multiple-choice questions, include 4 options with plausible distractors based on common misconceptions. Include an answer key with explanations for every question.`,
      },
    ],
  })

  const toolUseBlock = response.content.find(
    (block): block is Extract<typeof block, { type: 'tool_use' }> => block.type === 'tool_use'
  )

  if (!toolUseBlock) {
    throw new Error('AI did not return structured quiz data. Please try again.')
  }

  return toolUseBlock.input as GeneratedQuiz
}
