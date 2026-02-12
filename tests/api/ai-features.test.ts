import { describe, it, expect, vi, beforeEach } from 'vitest'
import {
  mockAuthSession,
  mockNoAuth,
  TEST_TEACHER,
  TEST_STUDENT,
  TEST_PARENT,
  TEST_ADMIN,
  createPostRequest,
} from '../helpers'

vi.mock('@/lib/auth', () => ({
  auth: vi.fn(),
}))

vi.mock('@/lib/ai/parent-communication', () => ({
  translateCommunication: vi.fn().mockResolvedValue({
    translatedText: 'Hola, su hijo est\u00e1 progresando bien en clase.',
    targetLanguage: 'Spanish',
    originalLanguage: 'English',
  }),
}))

vi.mock('@/lib/ai/district-insights', () => ({
  generateDistrictInsights: vi.fn().mockResolvedValue({
    executiveSummary: 'The district shows strong AI adoption across 2 schools with 5 teachers actively using the platform.',
    keyFindings: [
      '80% of teachers have created assignments',
      'Grading completion rate is 66.7%',
      'Mastery distribution skews toward proficient',
    ],
    concerns: [
      'Ungraded submissions are accumulating',
      'Not all teachers have adopted AI feedback',
    ],
    recommendations: [
      'Provide PD sessions on AI feedback workflows',
      'Set grading turnaround targets',
      'Expand platform to remaining schools',
    ],
  }),
}))

function createChainMock(result: unknown = []) {
  const chain: Record<string, any> = {}
  const methods = [
    'select', 'from', 'leftJoin', 'innerJoin', 'where',
    'orderBy', 'limit', 'insert', 'values', 'returning',
    'update', 'set', 'delete', 'groupBy',
  ]
  for (const method of methods) {
    chain[method] = vi.fn().mockReturnValue(chain)
  }
  chain.then = (resolve: (v: unknown) => void, reject?: (e: unknown) => void) => {
    return Promise.resolve(result).then(resolve, reject)
  }
  return chain
}

let selectCallIndex = 0
let selectResults: unknown[][] = [[]]

vi.mock('@/lib/db', () => {
  return {
    db: {
      select: vi.fn(() => {
        const result = selectResults[selectCallIndex] ?? []
        selectCallIndex++
        return createChainMock(result)
      }),
      insert: vi.fn(() => createChainMock([])),
      query: {},
    },
  }
})

import { POST as translatePOST } from '@/app/api/messages/translate/route'
import { POST as insightsPOST } from '@/app/api/admin/insights/route'
import { auth } from '@/lib/auth'

describe('AI Features API', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    selectCallIndex = 0
    selectResults = [[]]
  })

  // -------------------------------------------------------------------------
  // POST /api/messages/translate
  // -------------------------------------------------------------------------
  describe('POST /api/messages/translate', () => {
    it('returns 401 when not authenticated', async () => {
      mockNoAuth(vi.mocked(auth))
      const req = createPostRequest('/api/messages/translate', {
        text: 'Hello, your child is doing well.',
        targetLanguage: 'Spanish',
      })

      const response = await translatePOST(req)
      const data = await response.json()
      expect(response.status).toBe(401)
      expect(data.error).toBe('Unauthorized')
    })

    it('returns 400 when text is missing', async () => {
      mockAuthSession(vi.mocked(auth), TEST_PARENT)
      const req = createPostRequest('/api/messages/translate', {
        targetLanguage: 'Spanish',
      })

      const response = await translatePOST(req)
      const data = await response.json()
      expect(response.status).toBe(400)
      expect(data.error).toContain('text and targetLanguage are required')
    })

    it('returns 400 when targetLanguage is missing', async () => {
      mockAuthSession(vi.mocked(auth), TEST_PARENT)
      const req = createPostRequest('/api/messages/translate', {
        text: 'Hello, your child is doing well.',
      })

      const response = await translatePOST(req)
      const data = await response.json()
      expect(response.status).toBe(400)
      expect(data.error).toContain('text and targetLanguage are required')
    })

    it('returns translated text for authenticated user', async () => {
      mockAuthSession(vi.mocked(auth), TEST_TEACHER)
      const req = createPostRequest('/api/messages/translate', {
        text: 'Hello, your child is doing well in class.',
        targetLanguage: 'Spanish',
      })

      const response = await translatePOST(req)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.translatedText).toBe('Hola, su hijo est\u00e1 progresando bien en clase.')
      expect(data.targetLanguage).toBe('Spanish')
      expect(data.originalLanguage).toBe('English')
    })
  })

  // -------------------------------------------------------------------------
  // POST /api/admin/insights
  // -------------------------------------------------------------------------
  describe('POST /api/admin/insights', () => {
    it('returns 401 when not authenticated', async () => {
      mockNoAuth(vi.mocked(auth))
      const response = await insightsPOST()
      const data = await response.json()
      expect(response.status).toBe(401)
      expect(data.error).toBe('Unauthorized')
    })

    it('returns 403 for teacher role', async () => {
      mockAuthSession(vi.mocked(auth), TEST_TEACHER)
      const response = await insightsPOST()
      const data = await response.json()
      expect(response.status).toBe(403)
      expect(data.error).toBe('Forbidden')
    })

    it('returns 403 for student role', async () => {
      mockAuthSession(vi.mocked(auth), TEST_STUDENT)
      const response = await insightsPOST()
      const data = await response.json()
      expect(response.status).toBe(403)
      expect(data.error).toBe('Forbidden')
    })

    it('returns AI-generated insights for admin', async () => {
      mockAuthSession(vi.mocked(auth), TEST_ADMIN)

      // The insights route makes many sequential db.select() calls:
      // 1. schoolCount, 2. teacherCount, 3. studentCount, 4. classCount,
      // 5. assignmentCount, 6. submissionCount, 7. gradedCount, 8. ungradedCount,
      // 9. feedbackCount, 10. masteryDist, 11. subjectScores,
      // 12. teachersWithAssignments, 13. teachersWithLessonPlans,
      // 14. teachersWithRubrics, 15. teachersWithFeedback
      selectResults = [
        [{ count: 2 }],   // schools
        [{ count: 5 }],   // teachers
        [{ count: 22 }],  // students
        [{ count: 8 }],   // classes
        [{ count: 12 }],  // assignments
        [{ count: 30 }],  // submissions
        [{ count: 20 }],  // graded
        [{ count: 10 }],  // ungraded
        [{ count: 15 }],  // feedback drafts
        [{ level: 'proficient', count: 10 }, { level: 'developing', count: 5 }], // mastery
        [{ subject: 'ELA', avgScore: 82.5, count: 15 }], // subject scores
        [{ count: 4 }],   // teachers with assignments
        [{ count: 3 }],   // teachers with lesson plans
        [{ count: 3 }],   // teachers with rubrics
        [{ count: 2 }],   // teachers with feedback
      ]

      const response = await insightsPOST()
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.insights).toBeDefined()
      expect(data.insights.executiveSummary).toContain('district')
      expect(data.insights.keyFindings).toHaveLength(3)
      expect(data.insights.concerns).toHaveLength(2)
      expect(data.insights.recommendations).toHaveLength(3)
      expect(data.snapshot).toBeDefined()
      expect(data.snapshot.schools).toBe(2)
      expect(data.snapshot.teachers).toBe(5)
      expect(data.snapshot.students).toBe(22)
      expect(data.generatedAt).toBeDefined()
    })
  })
})
