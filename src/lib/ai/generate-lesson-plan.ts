import { anthropic, AI_MODEL } from '@/lib/ai'

export interface LessonPlanInput {
  subject: string
  gradeLevel: string
  topic: string
  duration?: string
  standards?: string[]
  instructionalModel?: 'direct' | 'inquiry' | 'project' | 'socratic' | 'workshop'
  existingMasteryContext?: string
}

export interface GeneratedLessonPlan {
  title: string
  objectives: string[]
  standards: string[]
  warmUp: string
  directInstruction: string
  guidedPractice: string
  independentPractice: string
  closure: string
  materials: string[]
  differentiation: {
    belowGrade: string
    onGrade: string
    aboveGrade: string
  }
  assessmentPlan: string
  estimatedDuration: string
}

export async function generateLessonPlan(input: LessonPlanInput): Promise<GeneratedLessonPlan> {
  const response = await anthropic.messages.create({
    model: AI_MODEL,
    max_tokens: 4096,
    system: `You are an expert K-12 instructional designer with deep knowledge of evidence-based pedagogy, standards alignment, and differentiated instruction. You create lesson plans that follow a structured format with clear learning objectives, engaging activities, and embedded formative assessment. Every lesson includes differentiation strategies for students performing below, at, and above grade level. When an instructional model is specified, structure the lesson to reflect that pedagogy (e.g., inquiry-based lessons lead with a driving question, workshop model includes mini-lesson + work time + share).`,
    tools: [
      {
        name: 'create_lesson_plan',
        description: 'Create a complete, standards-aligned lesson plan with all instructional components, differentiation strategies, and assessment planning for a K-12 classroom.',
        input_schema: {
          type: 'object' as const,
          properties: {
            title: {
              type: 'string',
              description: 'An engaging, descriptive title for the lesson.',
            },
            objectives: {
              type: 'array',
              items: { type: 'string' },
              description: 'Measurable learning objectives using action verbs from Bloom\'s taxonomy (e.g., "Students will be able to analyze...").',
            },
            standards: {
              type: 'array',
              items: { type: 'string' },
              description: 'Academic standards addressed by this lesson (e.g., "CCSS.MATH.CONTENT.5.NF.A.1").',
            },
            warmUp: {
              type: 'string',
              description: 'A 5-10 minute warm-up or bell-ringer activity that activates prior knowledge and connects to the lesson topic.',
            },
            directInstruction: {
              type: 'string',
              description: 'The explicit teaching component: key concepts, vocabulary, modeling, think-alouds, and examples.',
            },
            guidedPractice: {
              type: 'string',
              description: 'Structured practice with teacher support: partner work, small group activities, or scaffolded exercises with check-ins.',
            },
            independentPractice: {
              type: 'string',
              description: 'Student-driven practice that applies the learning objective independently or in small groups.',
            },
            closure: {
              type: 'string',
              description: 'A 5-10 minute closing that synthesizes learning: exit ticket, reflection prompt, or share-out.',
            },
            materials: {
              type: 'array',
              items: { type: 'string' },
              description: 'All materials, resources, and technology needed for the lesson.',
            },
            differentiation: {
              type: 'object',
              properties: {
                belowGrade: {
                  type: 'string',
                  description: 'Scaffolds and supports for students performing below grade level: modified texts, graphic organizers, sentence starters, reduced quantity, etc.',
                },
                onGrade: {
                  type: 'string',
                  description: 'The core instructional path for students performing at grade level.',
                },
                aboveGrade: {
                  type: 'string',
                  description: 'Extensions and enrichment for students performing above grade level: deeper analysis, leadership roles, advanced applications.',
                },
              },
              required: ['belowGrade', 'onGrade', 'aboveGrade'],
              description: 'Differentiation strategies for three tiers of learners.',
            },
            assessmentPlan: {
              type: 'string',
              description: 'How student understanding will be assessed during and after the lesson: formative checks, exit tickets, observation checklists, or other assessment methods.',
            },
            estimatedDuration: {
              type: 'string',
              description: 'The estimated total time for the lesson (e.g., "45 minutes", "90 minutes").',
            },
          },
          required: [
            'title', 'objectives', 'standards', 'warmUp', 'directInstruction',
            'guidedPractice', 'independentPractice', 'closure', 'materials',
            'differentiation', 'assessmentPlan', 'estimatedDuration',
          ],
        },
      },
    ],
    tool_choice: { type: 'tool', name: 'create_lesson_plan' },
    messages: [
      {
        role: 'user',
        content: `Create a lesson plan for the following:

Subject: ${input.subject}
Grade Level: ${input.gradeLevel}
Topic: ${input.topic}
${input.duration ? `Target Duration: ${input.duration}` : ''}
${input.standards?.length ? `Standards: ${input.standards.join(', ')}` : ''}
${input.instructionalModel ? `Instructional Model: ${input.instructionalModel}` : ''}
${input.existingMasteryContext ? `Class Context (areas students have been struggling with): ${input.existingMasteryContext}` : ''}

Generate a complete lesson plan with clear objectives, engaging activities, embedded formative assessment, and differentiation for below-grade, on-grade, and above-grade learners.`,
      },
    ],
  })

  const toolUseBlock = response.content.find(
    (block): block is Extract<typeof block, { type: 'tool_use' }> => block.type === 'tool_use'
  )

  if (!toolUseBlock) {
    throw new Error('AI did not return structured lesson plan data. Please try again.')
  }

  return toolUseBlock.input as GeneratedLessonPlan
}
