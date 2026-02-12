import { auth } from '@/lib/auth'
import { db } from '@/lib/db'
import {
  assignments,
  rubrics,
  rubricCriteria,
  differentiatedVersions,
  classMembers,
} from '@/lib/db/schema'
import { eq, and } from 'drizzle-orm'
import { NextResponse } from 'next/server'
import Anthropic from '@anthropic-ai/sdk'

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })

export async function POST(req: Request) {
  const session = await auth()
  if (!session?.user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const { objective, subject, gradeLevel, type, standards, classId } =
      await req.json()

    if (!objective || !subject || !gradeLevel || !classId) {
      return NextResponse.json(
        {
          error:
            'Missing required fields: objective, subject, gradeLevel, classId',
        },
        { status: 400 }
      )
    }

    // Verify teacher access to the class
    const membership = await db
      .select()
      .from(classMembers)
      .where(
        and(
          eq(classMembers.classId, classId),
          eq(classMembers.userId, session.user.id),
          eq(classMembers.role, 'teacher')
        )
      )
      .limit(1)

    if (membership.length === 0) {
      return NextResponse.json(
        { error: 'You do not have access to this class' },
        { status: 403 }
      )
    }

    const promptText = `You are an expert K-12 curriculum designer. Create a complete, standards-aligned assignment based on the following:

Learning Objective: ${objective}
Subject: ${subject}
Grade Level: ${gradeLevel}
Assignment Type: ${type || 'essay'}
${standards ? `Standards to Address: ${standards}` : ''}

Generate a comprehensive assignment package that includes:
1. A clear, engaging assignment with detailed instructions
2. An analytical rubric with 3-5 criteria, each with descriptors for four proficiency levels (Beginning, Developing, Proficient, Advanced)
3. Student-facing "I can" success criteria statements
4. Three differentiated versions:
   - Below Grade Level: with additional scaffolding, simplified language, and structured support
   - On Grade Level: the standard version of the assignment
   - Above Grade Level: with extensions, deeper analysis, and increased complexity

Make the assignment engaging, age-appropriate, and pedagogically sound. Ensure all rubric criteria are specific, measurable, and directly aligned to the learning objective.`

    const response = await anthropic.messages.create({
      model: 'claude-opus-4-6',
      max_tokens: 4096,
      tool_choice: { type: 'tool', name: 'create_smart_assignment' },
      tools: [
        {
          name: 'create_smart_assignment',
          description:
            'Generate a complete standards-aligned assignment with rubric, success criteria, and differentiated versions',
          input_schema: {
            type: 'object' as const,
            properties: {
              assignment: {
                type: 'object' as const,
                properties: {
                  title: { type: 'string' as const },
                  description: { type: 'string' as const },
                  instructions: { type: 'string' as const },
                },
                required: ['title', 'description', 'instructions'],
              },
              rubric: {
                type: 'object' as const,
                properties: {
                  title: { type: 'string' as const },
                  description: { type: 'string' as const },
                  criteria: {
                    type: 'array' as const,
                    items: {
                      type: 'object' as const,
                      properties: {
                        name: { type: 'string' as const },
                        description: { type: 'string' as const },
                        weight: { type: 'number' as const },
                        descriptors: {
                          type: 'object' as const,
                          description:
                            'Map of level name to performance descriptor',
                        },
                      },
                      required: [
                        'name',
                        'description',
                        'weight',
                        'descriptors',
                      ],
                    },
                  },
                },
                required: ['title', 'description', 'criteria'],
              },
              successCriteria: {
                type: 'array' as const,
                items: { type: 'string' as const },
                description: 'Student-facing I can statements',
              },
              differentiatedVersions: {
                type: 'object' as const,
                properties: {
                  belowGrade: {
                    type: 'object' as const,
                    properties: {
                      title: { type: 'string' as const },
                      content: { type: 'string' as const },
                      scaffolds: {
                        type: 'array' as const,
                        items: { type: 'string' as const },
                      },
                    },
                    required: ['title', 'content', 'scaffolds'],
                  },
                  onGrade: {
                    type: 'object' as const,
                    properties: {
                      title: { type: 'string' as const },
                      content: { type: 'string' as const },
                      scaffolds: {
                        type: 'array' as const,
                        items: { type: 'string' as const },
                      },
                    },
                    required: ['title', 'content', 'scaffolds'],
                  },
                  aboveGrade: {
                    type: 'object' as const,
                    properties: {
                      title: { type: 'string' as const },
                      content: { type: 'string' as const },
                      scaffolds: {
                        type: 'array' as const,
                        items: { type: 'string' as const },
                      },
                    },
                    required: ['title', 'content', 'scaffolds'],
                  },
                },
                required: ['belowGrade', 'onGrade', 'aboveGrade'],
              },
            },
            required: [
              'assignment',
              'rubric',
              'successCriteria',
              'differentiatedVersions',
            ],
          },
        },
      ],
      messages: [{ role: 'user', content: promptText }],
    })

    // Extract tool use result
    const toolUseBlock = response.content.find(
      (block) => block.type === 'tool_use'
    )
    if (!toolUseBlock || toolUseBlock.type !== 'tool_use') {
      return NextResponse.json(
        { error: 'AI generation failed: no structured output returned' },
        { status: 500 }
      )
    }

    const generated = toolUseBlock.input as {
      assignment: { title: string; description: string; instructions: string }
      rubric: {
        title: string
        description: string
        criteria: Array<{
          name: string
          description: string
          weight: number
          descriptors: Record<string, string>
        }>
      }
      successCriteria: string[]
      differentiatedVersions: {
        belowGrade: {
          title: string
          content: string
          scaffolds: string[]
        }
        onGrade: { title: string; content: string; scaffolds: string[] }
        aboveGrade: {
          title: string
          content: string
          scaffolds: string[]
        }
      }
    }

    // Save everything to the database
    const rubricLevels = ['Beginning', 'Developing', 'Proficient', 'Advanced']

    // 1. Create the rubric
    const [createdRubric] = await db
      .insert(rubrics)
      .values({
        title: generated.rubric.title,
        description: generated.rubric.description,
        type: 'analytical',
        levels: JSON.stringify(rubricLevels),
        teacherId: session.user.id,
        isTemplate: false,
      })
      .returning()

    // 2. Create rubric criteria
    const criteriaToInsert = generated.rubric.criteria.map((criterion) => ({
      rubricId: createdRubric.id,
      name: criterion.name,
      description: criterion.description,
      weight: criterion.weight,
      descriptors: JSON.stringify(criterion.descriptors),
    }))

    const createdCriteria = await db
      .insert(rubricCriteria)
      .values(criteriaToInsert)
      .returning()

    // 3. Create the assignment
    const [createdAssignment] = await db
      .insert(assignments)
      .values({
        title: generated.assignment.title,
        description: generated.assignment.description,
        instructions: generated.assignment.instructions,
        type: type || 'essay',
        gradeLevel,
        subject,
        classId,
        teacherId: session.user.id,
        rubricId: createdRubric.id,
        successCriteria: JSON.stringify(generated.successCriteria),
        aiMetadata: JSON.stringify({
          generatedAt: new Date().toISOString(),
          model: 'claude-opus-4-6',
          objective,
          standards: standards || null,
        }),
        status: 'draft',
      })
      .returning()

    // 4. Create differentiated versions
    const versionEntries = [
      {
        assignmentId: createdAssignment.id,
        tier: 'below_grade',
        title: generated.differentiatedVersions.belowGrade.title,
        content: generated.differentiatedVersions.belowGrade.content,
        scaffolds: JSON.stringify(
          generated.differentiatedVersions.belowGrade.scaffolds
        ),
      },
      {
        assignmentId: createdAssignment.id,
        tier: 'on_grade',
        title: generated.differentiatedVersions.onGrade.title,
        content: generated.differentiatedVersions.onGrade.content,
        scaffolds: JSON.stringify(
          generated.differentiatedVersions.onGrade.scaffolds
        ),
      },
      {
        assignmentId: createdAssignment.id,
        tier: 'above_grade',
        title: generated.differentiatedVersions.aboveGrade.title,
        content: generated.differentiatedVersions.aboveGrade.content,
        scaffolds: JSON.stringify(
          generated.differentiatedVersions.aboveGrade.scaffolds
        ),
      },
    ]

    const createdVersions = await db
      .insert(differentiatedVersions)
      .values(versionEntries)
      .returning()

    return NextResponse.json({
      assignment: createdAssignment,
      rubric: createdRubric,
      criteria: createdCriteria,
      versions: createdVersions,
      successCriteria: generated.successCriteria,
    })
  } catch (error) {
    console.error('AI generation failed:', error)
    return NextResponse.json(
      { error: 'AI generation failed. Please try again.' },
      { status: 500 }
    )
  }
}
