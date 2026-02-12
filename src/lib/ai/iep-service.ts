import { anthropic, AI_MODEL } from '@/lib/ai'

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface PresentLevelsInput {
  studentName: string
  gradeLevel: string
  disabilityCategory: string
  assessmentData?: { standard: string; level: string; score: number }[]
  priorIEP?: { presentLevels: string; goals: string[] }
  teacherObservations?: string
  classroomPerformance?: string
}

export interface GeneratedPresentLevels {
  academicPerformance: string
  functionalPerformance: string
  strengths: string[]
  areasOfNeed: string[]
  impactOfDisability: string
  baselineData: { area: string; baseline: string; source: string }[]
  draftNotice: string
}

export interface IEPGoalInput {
  presentLevels: GeneratedPresentLevels
  gradeLevel: string
  subject: string
  disabilityCategory: string
  priorGoals?: { goalText: string; status: string; progress?: string }[]
  existingCaseloadGoals?: string[]
}

export interface GeneratedIEPGoal {
  area: string
  goalText: string
  baseline: string
  target: string
  measureMethod: string
  frequency: string
  timeline: string
  similarityFlag: boolean
  similarityNote?: string
}

export interface AccommodationsInput {
  disabilityCategory: string
  areasOfNeed: string[]
  gradeLevel: string
  currentAccommodations?: string[]
}

export interface GeneratedAccommodations {
  instructional: { accommodation: string; rationale: string }[]
  assessment: { accommodation: string; rationale: string }[]
  environmental: { accommodation: string; rationale: string }[]
  behavioral: { accommodation: string; rationale: string }[]
}

export interface ProgressNarrativeInput {
  goalText: string
  dataPoints: { date: string; value: number; notes?: string }[]
  targetValue: number
  unit: string
  studentName: string
}

export interface GeneratedProgressNarrative {
  narrative: string
  trend: 'on_track' | 'at_risk' | 'off_track'
  currentLevel: number
  progressPercent: number
  recommendation: string
}

// ---------------------------------------------------------------------------
// Audit metadata attached to every response
// ---------------------------------------------------------------------------

interface AuditMeta {
  modelVersion: string
  generatedAt: string
}

function auditMeta(): AuditMeta {
  return {
    modelVersion: AI_MODEL,
    generatedAt: new Date().toISOString(),
  }
}

// ---------------------------------------------------------------------------
// 1. generatePresentLevels
// ---------------------------------------------------------------------------

export async function generatePresentLevels(
  input: PresentLevelsInput
): Promise<GeneratedPresentLevels & { audit: AuditMeta }> {
  const assessmentSection = input.assessmentData?.length
    ? `Assessment Data:\n${input.assessmentData.map((a) => `- ${a.standard}: ${a.level} (score: ${a.score})`).join('\n')}`
    : 'No formal assessment data provided.'

  const priorIEPSection = input.priorIEP
    ? `Prior IEP Present Levels:\n${input.priorIEP.presentLevels}\nPrior Goals:\n${input.priorIEP.goals.map((g) => `- ${g}`).join('\n')}`
    : 'No prior IEP data available.'

  const observationsSection = input.teacherObservations
    ? `Teacher Observations:\n${input.teacherObservations}`
    : ''

  const classroomSection = input.classroomPerformance
    ? `Classroom Performance:\n${input.classroomPerformance}`
    : ''

  const response = await anthropic.messages.create({
    model: AI_MODEL,
    max_tokens: 4096,
    system: `You are an expert special education specialist who writes legally compliant IEP Present Levels of Academic Achievement and Functional Performance (PLAAFP). You use strengths-based language, grounding every statement in specific data and observations. You identify both academic and functional performance areas, clearly articulate the impact of the student's disability on access to the general curriculum, and provide measurable baseline data for goal development. All output is a draft requiring IEP team review.`,
    tools: [
      {
        name: 'draft_present_levels',
        description:
          'Draft a comprehensive Present Levels of Academic Achievement and Functional Performance section for an IEP, including academic and functional narratives, strengths, areas of need, impact of disability, and baseline data.',
        input_schema: {
          type: 'object' as const,
          properties: {
            academicPerformance: {
              type: 'string',
              description:
                'Narrative describing the student\'s current academic performance, grounded in assessment data and classroom evidence. Use strengths-based language.',
            },
            functionalPerformance: {
              type: 'string',
              description:
                'Narrative describing the student\'s functional performance including social-emotional skills, communication, self-regulation, and daily living skills as relevant.',
            },
            strengths: {
              type: 'array',
              items: { type: 'string' },
              description:
                'Specific, data-supported strengths the student demonstrates (3-6 items).',
            },
            areasOfNeed: {
              type: 'array',
              items: { type: 'string' },
              description:
                'Specific areas where the student requires support, tied to assessment data or observations (3-6 items).',
            },
            impactOfDisability: {
              type: 'string',
              description:
                'A clear statement of how the student\'s disability impacts their ability to access and make progress in the general education curriculum.',
            },
            baselineData: {
              type: 'array',
              items: {
                type: 'object',
                properties: {
                  area: {
                    type: 'string',
                    description: 'The skill or academic area being measured.',
                  },
                  baseline: {
                    type: 'string',
                    description:
                      'The current measurable performance level in this area.',
                  },
                  source: {
                    type: 'string',
                    description:
                      'The data source for this baseline (e.g., "curriculum-based measure", "classroom observation", "standardized assessment").',
                  },
                },
                required: ['area', 'baseline', 'source'],
              },
              description:
                'Measurable baseline data points that will serve as the foundation for IEP goal development.',
            },
            draftNotice: {
              type: 'string',
              description:
                'Draft notice statement. Must always be "DRAFT \u2014 Requires IEP Team Review".',
            },
          },
          required: [
            'academicPerformance',
            'functionalPerformance',
            'strengths',
            'areasOfNeed',
            'impactOfDisability',
            'baselineData',
            'draftNotice',
          ],
        },
      },
    ],
    tool_choice: { type: 'tool', name: 'draft_present_levels' },
    messages: [
      {
        role: 'user',
        content: `Draft Present Levels of Academic Achievement and Functional Performance for the following student:

Student Name: ${input.studentName}
Grade Level: ${input.gradeLevel}
Disability Category: ${input.disabilityCategory}

${assessmentSection}

${priorIEPSection}

${observationsSection}

${classroomSection}

Write a comprehensive, individualized PLAAFP using strengths-based language. Ground every statement in the data provided. Include measurable baseline data for each area of need. Mark the output as "DRAFT \u2014 Requires IEP Team Review".`,
      },
    ],
  })

  const toolUseBlock = response.content.find(
    (block): block is Extract<typeof block, { type: 'tool_use' }> =>
      block.type === 'tool_use'
  )

  if (!toolUseBlock) {
    throw new Error(
      'AI did not return structured present levels data. Please try again.'
    )
  }

  const result = toolUseBlock.input as GeneratedPresentLevels
  result.draftNotice = 'DRAFT \u2014 Requires IEP Team Review'

  return { ...result, audit: auditMeta() }
}

// ---------------------------------------------------------------------------
// 2. generateIEPGoals
// ---------------------------------------------------------------------------

export async function generateIEPGoals(
  input: IEPGoalInput
): Promise<{ goals: GeneratedIEPGoal[]; audit: AuditMeta }> {
  const priorGoalsSection = input.priorGoals?.length
    ? `Prior Goals and Progress:\n${input.priorGoals.map((g) => `- Goal: ${g.goalText} | Status: ${g.status}${g.progress ? ` | Progress: ${g.progress}` : ''}`).join('\n')}`
    : 'No prior goals available.'

  const existingGoalsSection = input.existingCaseloadGoals?.length
    ? `Existing Caseload Goals (for similarity detection):\n${input.existingCaseloadGoals.map((g, i) => `${i + 1}. ${g}`).join('\n')}`
    : ''

  const response = await anthropic.messages.create({
    model: AI_MODEL,
    max_tokens: 4096,
    system: `You are an expert special education specialist who writes SMART IEP goals. Each goal must be Specific, Measurable, Achievable, Relevant, and Time-bound. Goals are individualized to the student's present levels and include a clear baseline, measurable target, assessment method, monitoring frequency, and timeline. You detect when a goal is generic or overly similar to other goals on the caseload (>80% textual similarity) and flag it with a similarityFlag and explanatory note. Goals must be legally defensible under IDEA.`,
    tools: [
      {
        name: 'draft_iep_goals',
        description:
          'Draft individualized SMART IEP goals based on a student\'s present levels, with similarity detection against existing caseload goals.',
        input_schema: {
          type: 'object' as const,
          properties: {
            goals: {
              type: 'array',
              items: {
                type: 'object',
                properties: {
                  area: {
                    type: 'string',
                    description:
                      'The academic or functional area this goal addresses (e.g., "Reading Fluency", "Written Expression", "Social Skills").',
                  },
                  goalText: {
                    type: 'string',
                    description:
                      'The full SMART goal statement including condition, behavior, and criterion.',
                  },
                  baseline: {
                    type: 'string',
                    description:
                      'The student\'s current measurable performance level in this area.',
                  },
                  target: {
                    type: 'string',
                    description:
                      'The specific, measurable target the student will achieve.',
                  },
                  measureMethod: {
                    type: 'string',
                    description:
                      'How progress toward this goal will be measured (e.g., "curriculum-based measure", "teacher-made assessment", "work sample analysis").',
                  },
                  frequency: {
                    type: 'string',
                    description:
                      'How often progress will be monitored (e.g., "weekly", "bi-weekly", "monthly").',
                  },
                  timeline: {
                    type: 'string',
                    description:
                      'When the goal should be met (e.g., "by the end of the annual IEP period", "within 36 instructional weeks").',
                  },
                  similarityFlag: {
                    type: 'boolean',
                    description:
                      'True if this goal is >80% similar in wording or substance to any of the existing caseload goals provided. False otherwise.',
                  },
                  similarityNote: {
                    type: 'string',
                    description:
                      'If similarityFlag is true, a brief explanation of which existing goal it resembles and how to further individualize it.',
                  },
                },
                required: [
                  'area',
                  'goalText',
                  'baseline',
                  'target',
                  'measureMethod',
                  'frequency',
                  'timeline',
                  'similarityFlag',
                ],
              },
              description:
                'Array of SMART IEP goals, each with baseline, target, measurement method, frequency, timeline, and similarity detection.',
            },
          },
          required: ['goals'],
        },
      },
    ],
    tool_choice: { type: 'tool', name: 'draft_iep_goals' },
    messages: [
      {
        role: 'user',
        content: `Draft individualized IEP goals for the following student:

Grade Level: ${input.gradeLevel}
Subject: ${input.subject}
Disability Category: ${input.disabilityCategory}

Present Levels Summary:
- Academic Performance: ${input.presentLevels.academicPerformance}
- Functional Performance: ${input.presentLevels.functionalPerformance}
- Strengths: ${input.presentLevels.strengths.join('; ')}
- Areas of Need: ${input.presentLevels.areasOfNeed.join('; ')}
- Impact of Disability: ${input.presentLevels.impactOfDisability}
- Baseline Data: ${input.presentLevels.baselineData.map((b) => `${b.area}: ${b.baseline} (${b.source})`).join('; ')}

${priorGoalsSection}

${existingGoalsSection}

Generate 2-4 SMART goals with specific skill targets, measurable criteria, assessment methods, monitoring frequencies, and timelines. Each goal must have a clear baseline and target derived from the present levels data. If any goal is >80% similar in wording or substance to an existing caseload goal, set similarityFlag to true and explain in similarityNote.`,
      },
    ],
  })

  const toolUseBlock = response.content.find(
    (block): block is Extract<typeof block, { type: 'tool_use' }> =>
      block.type === 'tool_use'
  )

  if (!toolUseBlock) {
    throw new Error(
      'AI did not return structured IEP goals data. Please try again.'
    )
  }

  const result = toolUseBlock.input as { goals: GeneratedIEPGoal[] }

  return { goals: result.goals, audit: auditMeta() }
}

// ---------------------------------------------------------------------------
// 3. generateAccommodations
// ---------------------------------------------------------------------------

export async function generateAccommodations(
  input: AccommodationsInput
): Promise<GeneratedAccommodations & { audit: AuditMeta }> {
  const currentSection = input.currentAccommodations?.length
    ? `Current Accommodations:\n${input.currentAccommodations.map((a) => `- ${a}`).join('\n')}`
    : ''

  const response = await anthropic.messages.create({
    model: AI_MODEL,
    max_tokens: 4096,
    system: `You are an expert special education specialist who recommends evidence-based accommodations and modifications for students with disabilities. You organize recommendations into four categories: instructional, assessment, environmental, and behavioral. You clearly distinguish between accommodations (changes in how a student accesses content or demonstrates learning without altering expectations) and modifications (changes that alter the learning expectations or standards). Every recommendation includes a rationale tied to the student's specific needs. Recommendations are practical and implementable in a general education classroom setting.`,
    tools: [
      {
        name: 'recommend_accommodations',
        description:
          'Recommend categorized accommodations for a student with a disability, with rationales for each recommendation. Clearly distinguishes accommodations from modifications.',
        input_schema: {
          type: 'object' as const,
          properties: {
            instructional: {
              type: 'array',
              items: {
                type: 'object',
                properties: {
                  accommodation: {
                    type: 'string',
                    description:
                      'The specific instructional accommodation or strategy.',
                  },
                  rationale: {
                    type: 'string',
                    description:
                      'Why this accommodation is appropriate for this student, tied to their specific area of need.',
                  },
                },
                required: ['accommodation', 'rationale'],
              },
              description:
                'Accommodations related to how instruction is delivered (e.g., preferential seating, visual supports, chunked directions).',
            },
            assessment: {
              type: 'array',
              items: {
                type: 'object',
                properties: {
                  accommodation: {
                    type: 'string',
                    description:
                      'The specific assessment accommodation.',
                  },
                  rationale: {
                    type: 'string',
                    description:
                      'Why this assessment accommodation is needed, tied to the student\'s disability impact.',
                  },
                },
                required: ['accommodation', 'rationale'],
              },
              description:
                'Accommodations related to how the student demonstrates learning on assessments (e.g., extended time, separate setting, read-aloud).',
            },
            environmental: {
              type: 'array',
              items: {
                type: 'object',
                properties: {
                  accommodation: {
                    type: 'string',
                    description: 'The specific environmental accommodation.',
                  },
                  rationale: {
                    type: 'string',
                    description:
                      'Why this environmental change supports the student\'s learning.',
                  },
                },
                required: ['accommodation', 'rationale'],
              },
              description:
                'Accommodations related to the physical or sensory learning environment (e.g., noise-reducing headphones, flexible seating, reduced visual clutter).',
            },
            behavioral: {
              type: 'array',
              items: {
                type: 'object',
                properties: {
                  accommodation: {
                    type: 'string',
                    description: 'The specific behavioral support or accommodation.',
                  },
                  rationale: {
                    type: 'string',
                    description:
                      'Why this behavioral support is appropriate for this student\'s needs.',
                  },
                },
                required: ['accommodation', 'rationale'],
              },
              description:
                'Accommodations related to behavioral support and self-regulation (e.g., movement breaks, visual schedule, check-in/check-out).',
            },
          },
          required: ['instructional', 'assessment', 'environmental', 'behavioral'],
        },
      },
    ],
    tool_choice: { type: 'tool', name: 'recommend_accommodations' },
    messages: [
      {
        role: 'user',
        content: `Recommend accommodations for the following student:

Disability Category: ${input.disabilityCategory}
Grade Level: ${input.gradeLevel}
Areas of Need: ${input.areasOfNeed.join('; ')}

${currentSection}

Provide evidence-based accommodations organized by category: instructional, assessment, environmental, and behavioral. Include 2-4 accommodations per category, each with a clear rationale tied to the student's areas of need. Clearly distinguish accommodations from modifications.`,
      },
    ],
  })

  const toolUseBlock = response.content.find(
    (block): block is Extract<typeof block, { type: 'tool_use' }> =>
      block.type === 'tool_use'
  )

  if (!toolUseBlock) {
    throw new Error(
      'AI did not return structured accommodations data. Please try again.'
    )
  }

  const result = toolUseBlock.input as GeneratedAccommodations

  return { ...result, audit: auditMeta() }
}

// ---------------------------------------------------------------------------
// 4. generateProgressNarrative
// ---------------------------------------------------------------------------

export async function generateProgressNarrative(
  input: ProgressNarrativeInput
): Promise<GeneratedProgressNarrative & { audit: AuditMeta }> {
  const sortedPoints = [...input.dataPoints].sort(
    (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()
  )

  const currentLevel =
    sortedPoints.length > 0
      ? sortedPoints[sortedPoints.length - 1].value
      : 0

  const progressPercent =
    input.targetValue !== 0
      ? Math.round((currentLevel / input.targetValue) * 100)
      : 0

  const dataPointsSummary = sortedPoints
    .map(
      (dp) =>
        `${dp.date}: ${dp.value} ${input.unit}${dp.notes ? ` (${dp.notes})` : ''}`
    )
    .join('\n')

  const response = await anthropic.messages.create({
    model: AI_MODEL,
    max_tokens: 2048,
    system: `You are an expert special education specialist who writes IEP progress reports for parents. Your narratives are written in clear, jargon-free language that any parent can understand. You analyze data trends to determine whether a student is on track, at risk, or off track relative to their aimline. You provide honest, specific, and encouraging progress updates with actionable recommendations. The narrative should be suitable for inclusion in a formal IEP progress report.`,
    tools: [
      {
        name: 'draft_progress_narrative',
        description:
          'Draft a parent-friendly IEP progress narrative based on data points and trend analysis.',
        input_schema: {
          type: 'object' as const,
          properties: {
            narrative: {
              type: 'string',
              description:
                'A 3-5 sentence parent-friendly narrative describing the student\'s progress toward the goal. Uses plain language, references specific data, and communicates the trend clearly.',
            },
            trend: {
              type: 'string',
              enum: ['on_track', 'at_risk', 'off_track'],
              description:
                'The overall progress trend based on aimline analysis: "on_track" if current trajectory meets the target, "at_risk" if progress is slower than needed, "off_track" if progress is stalled or declining.',
            },
            currentLevel: {
              type: 'number',
              description:
                'The student\'s most recent performance level.',
            },
            progressPercent: {
              type: 'number',
              description:
                'Percentage of progress toward the target (current level / target * 100).',
            },
            recommendation: {
              type: 'string',
              description:
                'A specific, actionable recommendation for next steps based on the trend (e.g., continue current approach, adjust instruction, schedule IEP team meeting to discuss changes).',
            },
          },
          required: [
            'narrative',
            'trend',
            'currentLevel',
            'progressPercent',
            'recommendation',
          ],
        },
      },
    ],
    tool_choice: { type: 'tool', name: 'draft_progress_narrative' },
    messages: [
      {
        role: 'user',
        content: `Draft an IEP progress narrative for a parent:

Student Name: ${input.studentName}
Goal: ${input.goalText}
Target: ${input.targetValue} ${input.unit}
Current Level: ${currentLevel} ${input.unit}
Progress: ${progressPercent}% of target

Data Points (chronological):
${dataPointsSummary}

Analyze the data trend relative to the aimline (linear path from first data point to target). Write a parent-friendly narrative that is honest about progress while maintaining an encouraging tone. Include a specific recommendation for next steps.`,
      },
    ],
  })

  const toolUseBlock = response.content.find(
    (block): block is Extract<typeof block, { type: 'tool_use' }> =>
      block.type === 'tool_use'
  )

  if (!toolUseBlock) {
    throw new Error(
      'AI did not return structured progress narrative data. Please try again.'
    )
  }

  const result = toolUseBlock.input as GeneratedProgressNarrative
  // Ensure computed values match our calculations
  result.currentLevel = currentLevel
  result.progressPercent = progressPercent

  return { ...result, audit: auditMeta() }
}
