import { anthropic, AI_MODEL } from '@/lib/ai'

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface ProgressNarrativeInput {
  studentName: string
  subject: string
  gradingPeriod: string
  recentScores: { assignment: string; score: number; maxScore: number; date: string }[]
  masteryData: { standard: string; standardDescription: string; level: string; score: number }[]
}

export interface GeneratedParentProgressNarrative {
  summary: string
  strengths: string[]
  areasToGrow: string[]
  homeActivity: string
  overallStatus: 'good' | 'watch' | 'concern'
}

export interface WeeklyDigestInput {
  studentName: string
  weekOf: string
  activities: {
    subject: string
    assignments: { title: string; score?: number; maxScore?: number; status: string }[]
    masteryHighlights?: string[]
  }[]
}

export interface GeneratedWeeklyDigest {
  greeting: string
  highlights: string[]
  concerns: string[]
  upcomingWork: string[]
  encouragement: string
}

export interface TranslationInput {
  text: string
  targetLanguage: string
}

export interface TranslatedContent {
  translatedText: string
  targetLanguage: string
  originalLanguage: string
}

// ---------------------------------------------------------------------------
// 1. generateProgressNarrative
// ---------------------------------------------------------------------------

export async function generateParentProgressNarrative(
  input: ProgressNarrativeInput
): Promise<GeneratedParentProgressNarrative> {
  const scoresSection = input.recentScores.length
    ? input.recentScores
        .map((s) => `- ${s.assignment}: ${s.score}/${s.maxScore} (${s.date})`)
        .join('\n')
    : 'No recent scores available.'

  const masterySection = input.masteryData.length
    ? input.masteryData
        .map((m) => `- ${m.standardDescription}: ${m.level} (${m.score}%)`)
        .join('\n')
    : 'No mastery data available.'

  const response = await anthropic.messages.create({
    model: AI_MODEL,
    max_tokens: 2048,
    system: `You are a warm, supportive K-12 educator writing progress updates for parents. Your language is clear, specific, and jargon-free. Never use standards codes (like "CCSS.ELA-LITERACY.W.8.1") -- always use plain English descriptions of what a skill means. Speak as if talking directly to a caring parent at a conference. Focus on what the child is doing well, what they can improve, and one concrete activity the parent can do at home.`,
    tools: [
      {
        name: 'create_progress_narrative',
        description:
          'Create a plain-language progress narrative for a parent about their child\'s learning.',
        input_schema: {
          type: 'object' as const,
          properties: {
            summary: {
              type: 'string',
              description:
                'A 3-5 sentence summary of the child\'s progress in this subject. Plain language, no jargon, warm tone.',
            },
            strengths: {
              type: 'array',
              items: { type: 'string' },
              description:
                'What the child is doing well (2-4 items). Use plain language describing observable skills.',
            },
            areasToGrow: {
              type: 'array',
              items: { type: 'string' },
              description:
                'Areas where the child can improve (1-3 items). Frame positively as growth opportunities, not deficits.',
            },
            homeActivity: {
              type: 'string',
              description:
                'One specific, practical activity the parent can do at home to support learning. Should take 10-15 minutes and use everyday materials.',
            },
            overallStatus: {
              type: 'string',
              enum: ['good', 'watch', 'concern'],
              description:
                'Overall status: "good" if meeting or exceeding expectations, "watch" if some areas need attention, "concern" if falling behind in multiple areas.',
            },
          },
          required: ['summary', 'strengths', 'areasToGrow', 'homeActivity', 'overallStatus'],
        },
      },
    ],
    tool_choice: { type: 'tool', name: 'create_progress_narrative' },
    messages: [
      {
        role: 'user',
        content: `Write a progress narrative for a parent about their child:

Student: ${input.studentName}
Subject: ${input.subject}
Grading Period: ${input.gradingPeriod}

Recent Scores:
${scoresSection}

Mastery Data (skills and current level):
${masterySection}

Write a warm, encouraging summary in plain language. Identify strengths and growth areas. Suggest one specific home activity. Determine overall status (good/watch/concern) based on the data.`,
      },
    ],
  })

  const toolUseBlock = response.content.find(
    (block): block is Extract<typeof block, { type: 'tool_use' }> =>
      block.type === 'tool_use'
  )

  if (!toolUseBlock) {
    throw new Error('AI did not return structured progress narrative. Please try again.')
  }

  return toolUseBlock.input as GeneratedParentProgressNarrative
}

// ---------------------------------------------------------------------------
// 2. generateWeeklyDigest
// ---------------------------------------------------------------------------

export async function generateWeeklyDigest(
  input: WeeklyDigestInput
): Promise<GeneratedWeeklyDigest> {
  const activitiesSection = input.activities
    .map((a) => {
      const assignmentLines = a.assignments
        .map(
          (asg) =>
            `  - ${asg.title}: ${asg.status}${asg.score !== undefined ? ` (${asg.score}/${asg.maxScore})` : ''}`
        )
        .join('\n')
      const masteryLines = a.masteryHighlights?.length
        ? `  Mastery highlights: ${a.masteryHighlights.join(', ')}`
        : ''
      return `${a.subject}:\n${assignmentLines}${masteryLines ? '\n' + masteryLines : ''}`
    })
    .join('\n\n')

  const response = await anthropic.messages.create({
    model: AI_MODEL,
    max_tokens: 2048,
    system: `You are a warm, supportive K-12 educator writing a weekly digest for parents. Your tone is conversational and encouraging. Use plain language -- no educational jargon or standards codes. Focus on giving parents a quick, clear picture of what their child did this week, what went well, anything to watch, and what is coming up.`,
    tools: [
      {
        name: 'create_weekly_digest',
        description:
          'Create a structured weekly summary of a student\'s activities for their parent.',
        input_schema: {
          type: 'object' as const,
          properties: {
            greeting: {
              type: 'string',
              description: 'A brief, warm greeting that mentions the student by name.',
            },
            highlights: {
              type: 'array',
              items: { type: 'string' },
              description:
                'Positive highlights from the week (2-4 items). Celebrate accomplishments.',
            },
            concerns: {
              type: 'array',
              items: { type: 'string' },
              description:
                'Any areas of concern, phrased gently and constructively (0-2 items). Empty if none.',
            },
            upcomingWork: {
              type: 'array',
              items: { type: 'string' },
              description:
                'Upcoming assignments or topics for the next week (1-3 items).',
            },
            encouragement: {
              type: 'string',
              description: 'A brief encouraging closing statement.',
            },
          },
          required: ['greeting', 'highlights', 'concerns', 'upcomingWork', 'encouragement'],
        },
      },
    ],
    tool_choice: { type: 'tool', name: 'create_weekly_digest' },
    messages: [
      {
        role: 'user',
        content: `Create a weekly digest for a parent:

Student: ${input.studentName}
Week of: ${input.weekOf}

Activities This Week:
${activitiesSection}

Summarize the week's activities in an approachable, parent-friendly way. Highlight accomplishments, note any concerns gently, and mention upcoming work.`,
      },
    ],
  })

  const toolUseBlock = response.content.find(
    (block): block is Extract<typeof block, { type: 'tool_use' }> =>
      block.type === 'tool_use'
  )

  if (!toolUseBlock) {
    throw new Error('AI did not return structured weekly digest. Please try again.')
  }

  return toolUseBlock.input as GeneratedWeeklyDigest
}

// ---------------------------------------------------------------------------
// 3. translateCommunication
// ---------------------------------------------------------------------------

export async function translateCommunication(
  input: TranslationInput
): Promise<TranslatedContent> {
  const response = await anthropic.messages.create({
    model: AI_MODEL,
    max_tokens: 4096,
    system: `You are an expert multilingual translator specializing in K-12 education communication. You translate school-related messages between languages while preserving the warm, supportive tone appropriate for parent communication. You understand education-specific vocabulary and translate it naturally -- for example, "rubric" might become a culturally appropriate equivalent, and grade levels should be expressed in the target language's educational system conventions when relevant. Maintain the original formatting, paragraph structure, and emphasis. Do not add or remove content.`,
    tools: [
      {
        name: 'translate_text',
        description:
          'Translate educational communication text to a target language with education-specific vocabulary awareness.',
        input_schema: {
          type: 'object' as const,
          properties: {
            translatedText: {
              type: 'string',
              description:
                'The full translated text in the target language, preserving formatting and tone.',
            },
            targetLanguage: {
              type: 'string',
              description: 'The language the text was translated into.',
            },
            originalLanguage: {
              type: 'string',
              description: 'The detected language of the original text.',
            },
          },
          required: ['translatedText', 'targetLanguage', 'originalLanguage'],
        },
      },
    ],
    tool_choice: { type: 'tool', name: 'translate_text' },
    messages: [
      {
        role: 'user',
        content: `Translate the following school communication to ${input.targetLanguage}. Preserve the tone, formatting, and education-specific terminology:

${input.text}`,
      },
    ],
  })

  const toolUseBlock = response.content.find(
    (block): block is Extract<typeof block, { type: 'tool_use' }> =>
      block.type === 'tool_use'
  )

  if (!toolUseBlock) {
    throw new Error('AI did not return translated text. Please try again.')
  }

  return toolUseBlock.input as TranslatedContent
}
