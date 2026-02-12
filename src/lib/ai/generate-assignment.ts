import { anthropic, AI_MODEL } from '@/lib/ai'
import type { GeneratedRubric } from './generate-rubric'

export interface SmartAssignmentInput {
  objective: string
  subject: string
  gradeLevel: string
  type: 'essay' | 'short_answer' | 'project' | 'lab_report'
  standards?: string[]
  additionalContext?: string
}

export interface GeneratedSmartAssignment {
  assignment: {
    title: string
    description: string
    instructions: string
  }
  rubric: GeneratedRubric
  successCriteria: string[]
  differentiatedVersions: {
    belowGrade: { title: string; content: string; scaffolds: string[] }
    onGrade: { title: string; content: string; scaffolds: string[] }
    aboveGrade: { title: string; content: string; scaffolds: string[] }
  }
}

export async function generateSmartAssignment(input: SmartAssignmentInput): Promise<GeneratedSmartAssignment> {
  const response = await anthropic.messages.create({
    model: AI_MODEL,
    max_tokens: 8192,
    system: `You are an expert K-12 curriculum designer specializing in standards-aligned assignment creation. You design assignments that are rigorous, engaging, and accessible to all learners. Your signature approach combines the assignment itself with a matching rubric, student-facing success criteria, and three differentiated versions (below grade, on grade, above grade) -- all in a single cohesive package. Every component aligns to the same learning objectives and standards. Differentiated versions maintain the same core learning goal while varying the complexity, scaffolding, and entry points. Rubric criteria are specific and observable, with descriptors that distinguish performance levels clearly.`,
    tools: [
      {
        name: 'create_smart_assignment',
        description: 'Create a complete Smart Assignment package: the assignment itself, a standards-aligned rubric, student-facing success criteria, and three differentiated versions for below-grade, on-grade, and above-grade learners.',
        input_schema: {
          type: 'object' as const,
          properties: {
            assignment: {
              type: 'object',
              properties: {
                title: {
                  type: 'string',
                  description: 'A clear, engaging title for the assignment.',
                },
                description: {
                  type: 'string',
                  description: 'An overview of the assignment purpose and what students will produce.',
                },
                instructions: {
                  type: 'string',
                  description: 'Step-by-step instructions for completing the assignment, written in student-friendly language.',
                },
              },
              required: ['title', 'description', 'instructions'],
              description: 'The core assignment that students will complete.',
            },
            rubric: {
              type: 'object',
              properties: {
                title: {
                  type: 'string',
                  description: 'The rubric title, matching the assignment.',
                },
                description: {
                  type: 'string',
                  description: 'What this rubric assesses.',
                },
                type: {
                  type: 'string',
                  enum: ['analytical', 'holistic'],
                  description: 'Rubric format.',
                },
                levels: {
                  type: 'array',
                  items: { type: 'string' },
                  description: 'Proficiency levels from lowest to highest.',
                },
                criteria: {
                  type: 'array',
                  items: {
                    type: 'object',
                    properties: {
                      name: { type: 'string', description: 'Criterion name.' },
                      description: { type: 'string', description: 'What this criterion measures.' },
                      weight: { type: 'number', description: 'Relative weight (all weights sum to 1.0).' },
                      standardCode: { type: 'string', description: 'Aligned standard code, if applicable.' },
                      descriptors: {
                        type: 'object',
                        description: 'Level name to performance descriptor mapping.',
                        additionalProperties: { type: 'string' },
                      },
                    },
                    required: ['name', 'description', 'weight', 'descriptors'],
                  },
                  description: 'Rubric criteria with per-level descriptors.',
                },
                successCriteria: {
                  type: 'array',
                  items: { type: 'string' },
                  description: 'Student-facing "I can" statements for the rubric.',
                },
              },
              required: ['title', 'description', 'type', 'levels', 'criteria', 'successCriteria'],
              description: 'A standards-aligned rubric that matches the assignment.',
            },
            successCriteria: {
              type: 'array',
              items: { type: 'string' },
              description: 'Top-level student-facing "I can" statements describing what successful completion looks like.',
            },
            differentiatedVersions: {
              type: 'object',
              properties: {
                belowGrade: {
                  type: 'object',
                  properties: {
                    title: { type: 'string', description: 'Title for the below-grade version.' },
                    content: { type: 'string', description: 'Modified assignment content with reduced complexity and additional scaffolding.' },
                    scaffolds: {
                      type: 'array',
                      items: { type: 'string' },
                      description: 'Specific scaffolds provided: graphic organizers, sentence starters, word banks, etc.',
                    },
                  },
                  required: ['title', 'content', 'scaffolds'],
                  description: 'Version for students performing below grade level.',
                },
                onGrade: {
                  type: 'object',
                  properties: {
                    title: { type: 'string', description: 'Title for the on-grade version.' },
                    content: { type: 'string', description: 'The standard assignment content at grade level.' },
                    scaffolds: {
                      type: 'array',
                      items: { type: 'string' },
                      description: 'Light scaffolds available as optional supports.',
                    },
                  },
                  required: ['title', 'content', 'scaffolds'],
                  description: 'Version for students performing at grade level.',
                },
                aboveGrade: {
                  type: 'object',
                  properties: {
                    title: { type: 'string', description: 'Title for the above-grade version.' },
                    content: { type: 'string', description: 'Extended assignment content with additional complexity and depth.' },
                    scaffolds: {
                      type: 'array',
                      items: { type: 'string' },
                      description: 'Extensions and enrichment challenges.',
                    },
                  },
                  required: ['title', 'content', 'scaffolds'],
                  description: 'Version for students performing above grade level.',
                },
              },
              required: ['belowGrade', 'onGrade', 'aboveGrade'],
              description: 'Three differentiated versions of the assignment maintaining the same learning objective.',
            },
          },
          required: ['assignment', 'rubric', 'successCriteria', 'differentiatedVersions'],
        },
      },
    ],
    tool_choice: { type: 'tool', name: 'create_smart_assignment' },
    messages: [
      {
        role: 'user',
        content: `Create a complete Smart Assignment package for the following:

Learning Objective: ${input.objective}
Subject: ${input.subject}
Grade Level: ${input.gradeLevel}
Assignment Type: ${input.type}
${input.standards?.length ? `Standards: ${input.standards.join(', ')}` : ''}
${input.additionalContext ? `Additional Context: ${input.additionalContext}` : ''}

Generate all four components in a single response:
1. The assignment (title, description, step-by-step instructions)
2. A matching analytical rubric with 4 proficiency levels (Beginning, Developing, Proficient, Advanced), 3-6 weighted criteria with specific descriptors, and "I can" success criteria
3. Top-level student-facing success criteria
4. Three differentiated versions (below grade with heavy scaffolds, on grade with optional supports, above grade with extensions) that all target the same learning objective`,
      },
    ],
  })

  const toolUseBlock = response.content.find(
    (block): block is Extract<typeof block, { type: 'tool_use' }> => block.type === 'tool_use'
  )

  if (!toolUseBlock) {
    throw new Error('AI did not return structured assignment data. Please try again.')
  }

  return toolUseBlock.input as GeneratedSmartAssignment
}
