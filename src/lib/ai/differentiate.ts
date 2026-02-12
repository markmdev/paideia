import { anthropic, AI_MODEL } from '@/lib/ai'

export interface DifferentiateInput {
  content: string
  gradeLevel: string
  subject: string
  contentType: 'reading_passage' | 'activity' | 'assessment'
}

export interface DifferentiatedContent {
  belowGrade: { content: string; scaffolds: string[]; lexileAdjustment: string }
  onGrade: { content: string; scaffolds: string[] }
  aboveGrade: { content: string; extensions: string[] }
}

export async function differentiateContent(input: DifferentiateInput): Promise<DifferentiatedContent> {
  const response = await anthropic.messages.create({
    model: AI_MODEL,
    max_tokens: 4096,
    system: `You are an expert K-12 differentiation specialist. You transform instructional content into three tiers that serve students at different performance levels while maintaining the same core learning objective. For the below-grade tier, you simplify vocabulary, shorten sentences, add scaffolds (graphic organizers, sentence starters, word banks), and note the approximate Lexile adjustment. For the on-grade tier, you provide the content as intended with optional scaffolds. For the above-grade tier, you extend the complexity, add depth, and include enrichment challenges. All three tiers preserve the essential concepts and learning goals.`,
    tools: [
      {
        name: 'differentiate_content',
        description: 'Transform a single piece of instructional content into three differentiated tiers (below grade, on grade, above grade) that maintain the same learning objective while varying complexity, scaffolding, and depth.',
        input_schema: {
          type: 'object' as const,
          properties: {
            belowGrade: {
              type: 'object',
              properties: {
                content: {
                  type: 'string',
                  description: 'The content modified for below-grade-level students: simplified vocabulary, shorter sentences, reduced complexity, additional context clues.',
                },
                scaffolds: {
                  type: 'array',
                  items: { type: 'string' },
                  description: 'Specific scaffolds provided: graphic organizers, sentence starters, word banks, visual supports, chunked instructions, etc.',
                },
                lexileAdjustment: {
                  type: 'string',
                  description: 'Description of how the reading level was adjusted (e.g., "Reduced from approximately 950L to 650L by simplifying sentence structure and replacing academic vocabulary with common equivalents").',
                },
              },
              required: ['content', 'scaffolds', 'lexileAdjustment'],
              description: 'Content adapted for students performing below grade level.',
            },
            onGrade: {
              type: 'object',
              properties: {
                content: {
                  type: 'string',
                  description: 'The content at grade level, with minor enhancements for clarity.',
                },
                scaffolds: {
                  type: 'array',
                  items: { type: 'string' },
                  description: 'Optional scaffolds available on request: vocabulary glossary, guiding questions, etc.',
                },
              },
              required: ['content', 'scaffolds'],
              description: 'Content at grade level with optional supports.',
            },
            aboveGrade: {
              type: 'object',
              properties: {
                content: {
                  type: 'string',
                  description: 'The content with increased complexity, richer vocabulary, deeper analysis expectations, and additional primary sources or data.',
                },
                extensions: {
                  type: 'array',
                  items: { type: 'string' },
                  description: 'Enrichment activities and extension challenges: research tasks, cross-curricular connections, leadership roles, creative applications.',
                },
              },
              required: ['content', 'extensions'],
              description: 'Content extended for students performing above grade level.',
            },
          },
          required: ['belowGrade', 'onGrade', 'aboveGrade'],
        },
      },
    ],
    tool_choice: { type: 'tool', name: 'differentiate_content' },
    messages: [
      {
        role: 'user',
        content: `Differentiate the following ${input.contentType} into three tiers for a ${input.gradeLevel} ${input.subject} class:

---
${input.content}
---

Create three versions:
1. Below grade: simplified language, added scaffolds, lower reading level
2. On grade: the content at grade level with optional supports
3. Above grade: extended complexity with enrichment challenges

All three tiers must maintain the same core learning objective and essential content.`,
      },
    ],
  })

  const toolUseBlock = response.content.find(
    (block): block is Extract<typeof block, { type: 'tool_use' }> => block.type === 'tool_use'
  )

  if (!toolUseBlock) {
    throw new Error('AI did not return structured differentiation data. Please try again.')
  }

  return toolUseBlock.input as DifferentiatedContent
}
