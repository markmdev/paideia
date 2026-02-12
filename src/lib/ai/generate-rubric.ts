import { anthropic, AI_MODEL } from '@/lib/ai'

export interface RubricInput {
  title: string
  subject: string
  gradeLevel: string
  assignmentDescription: string
  standards?: string[]
  levels?: string[]
}

export interface GeneratedRubric {
  title: string
  description: string
  type: 'analytical' | 'holistic'
  levels: string[]
  criteria: {
    name: string
    description: string
    weight: number
    standardCode?: string
    descriptors: Record<string, string>
  }[]
  successCriteria: string[]
}

const DEFAULT_LEVELS = ['Beginning', 'Developing', 'Proficient', 'Advanced']

export async function generateRubric(input: RubricInput): Promise<GeneratedRubric> {
  const levels = input.levels ?? DEFAULT_LEVELS

  const response = await anthropic.messages.create({
    model: AI_MODEL,
    max_tokens: 4096,
    system: `You are an expert K-12 curriculum designer and assessment specialist. You create standards-aligned rubrics that are clear, measurable, and pedagogically sound. Your rubrics follow best practices for formative and summative assessment, with descriptors that are specific, observable, and progression-based across proficiency levels. Always write student-facing success criteria as "I can" statements grounded in the learning objectives.`,
    tools: [
      {
        name: 'create_rubric',
        description: 'Create a complete, standards-aligned rubric with criteria, proficiency level descriptors, and student-facing success criteria for a K-12 assignment.',
        input_schema: {
          type: 'object' as const,
          properties: {
            title: {
              type: 'string',
              description: 'A clear, descriptive title for the rubric.',
            },
            description: {
              type: 'string',
              description: 'A brief summary of what the rubric assesses and its intended use.',
            },
            type: {
              type: 'string',
              enum: ['analytical', 'holistic'],
              description: 'Analytical rubrics score each criterion independently. Holistic rubrics provide a single overall score.',
            },
            levels: {
              type: 'array',
              items: { type: 'string' },
              description: 'The proficiency levels in order from lowest to highest.',
            },
            criteria: {
              type: 'array',
              items: {
                type: 'object',
                properties: {
                  name: {
                    type: 'string',
                    description: 'The name of this criterion (e.g., "Thesis Statement", "Evidence Use").',
                  },
                  description: {
                    type: 'string',
                    description: 'What this criterion measures and why it matters.',
                  },
                  weight: {
                    type: 'number',
                    description: 'Relative weight of this criterion as a decimal (all weights should sum to 1.0).',
                  },
                  standardCode: {
                    type: 'string',
                    description: 'The relevant academic standard code, if applicable (e.g., "CCSS.ELA-LITERACY.W.8.1").',
                  },
                  descriptors: {
                    type: 'object',
                    description: 'A mapping from each proficiency level name to a specific, observable descriptor of student performance at that level.',
                    additionalProperties: { type: 'string' },
                  },
                },
                required: ['name', 'description', 'weight', 'descriptors'],
              },
              description: 'The individual criteria that make up the rubric. Each criterion has descriptors for every proficiency level.',
            },
            successCriteria: {
              type: 'array',
              items: { type: 'string' },
              description: 'Student-facing "I can" statements that describe what proficient performance looks like for each key aspect of the assignment.',
            },
          },
          required: ['title', 'description', 'type', 'levels', 'criteria', 'successCriteria'],
        },
      },
    ],
    tool_choice: { type: 'tool', name: 'create_rubric' },
    messages: [
      {
        role: 'user',
        content: `Create a rubric for the following assignment:

Title: ${input.title}
Subject: ${input.subject}
Grade Level: ${input.gradeLevel}
Assignment Description: ${input.assignmentDescription}
Proficiency Levels: ${levels.join(', ')}
${input.standards?.length ? `Standards to align to: ${input.standards.join(', ')}` : ''}

Generate a detailed, standards-aligned rubric with specific, observable descriptors for each criterion at each proficiency level. Include 3-6 criteria with weights that sum to 1.0. Write student-facing "I can" statements as success criteria.`,
      },
    ],
  })

  const toolUseBlock = response.content.find(
    (block): block is Extract<typeof block, { type: 'tool_use' }> => block.type === 'tool_use'
  )

  if (!toolUseBlock) {
    throw new Error('AI did not return structured rubric data. Please try again.')
  }

  return toolUseBlock.input as GeneratedRubric
}
