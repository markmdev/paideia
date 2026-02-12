import { describe, it, expect, vi, beforeEach } from 'vitest'
import {
  mockAuthSession,
  mockNoAuth,
  TEST_TEACHER,
  TEST_STUDENT,
  TEST_PARENT,
  TEST_SPED_TEACHER,
  createPostRequest,
} from '../helpers'

vi.mock('@/lib/auth', () => ({
  auth: vi.fn(),
}))

vi.mock('@/lib/ai', () => ({
  anthropic: {
    messages: {
      create: vi.fn().mockResolvedValue({
        content: [
          {
            type: 'tool_use',
            name: 'differentiated_activities',
            input: {
              below_grade: {
                title: 'Review Basics',
                description: 'Practice fundamentals',
                instructions: 'Complete worksheet',
                scaffolds: ['Use graphic organizer'],
              },
              on_grade: {
                title: 'Apply Concepts',
                description: 'Apply to new problems',
                instructions: 'Solve practice set',
              },
              above_grade: {
                title: 'Challenge Extension',
                description: 'Advanced application',
                instructions: 'Create your own problems',
                extensions: ['Research real-world applications'],
              },
            },
          },
        ],
      }),
    },
  },
  AI_MODEL: 'claude-opus-4-6',
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

import { POST } from '@/app/api/grading/differentiate/route'
import { auth } from '@/lib/auth'

describe('Differentiate API', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    selectCallIndex = 0
    selectResults = [[]]
  })

  describe('POST /api/grading/differentiate', () => {
    it('returns 401 when not authenticated', async () => {
      mockNoAuth(vi.mocked(auth))
      const req = createPostRequest('/api/grading/differentiate', {
        assignmentId: 'a1',
      })
      const response = await POST(req)
      const data = await response.json()
      expect(response.status).toBe(401)
      expect(data.error).toBe('Unauthorized')
    })

    it('returns 403 for student role', async () => {
      mockAuthSession(vi.mocked(auth), TEST_STUDENT)
      const req = createPostRequest('/api/grading/differentiate', {
        assignmentId: 'a1',
      })
      const response = await POST(req)
      const data = await response.json()
      expect(response.status).toBe(403)
      expect(data.error).toBe('Forbidden')
    })

    it('returns 403 for parent role', async () => {
      mockAuthSession(vi.mocked(auth), TEST_PARENT)
      const req = createPostRequest('/api/grading/differentiate', {
        assignmentId: 'a1',
      })
      const response = await POST(req)
      const data = await response.json()
      expect(response.status).toBe(403)
      expect(data.error).toBe('Forbidden')
    })

    it('returns 400 for missing assignmentId', async () => {
      mockAuthSession(vi.mocked(auth), TEST_TEACHER)
      const req = createPostRequest('/api/grading/differentiate', {})
      const response = await POST(req)
      const data = await response.json()
      expect(response.status).toBe(400)
      expect(data.error).toContain('assignmentId')
    })

    it('returns 403 when assignment not found', async () => {
      mockAuthSession(vi.mocked(auth), TEST_TEACHER)
      selectResults = [
        [], // assignment query returns empty
      ]

      const req = createPostRequest('/api/grading/differentiate', {
        assignmentId: 'nonexistent',
      })
      const response = await POST(req)
      const data = await response.json()
      expect(response.status).toBe(403)
      expect(data.error).toContain('not found')
    })

    it('returns differentiated activities for teacher', async () => {
      mockAuthSession(vi.mocked(auth), TEST_TEACHER)

      const mockAssignment = {
        id: 'a1',
        title: 'Essay Assignment',
        instructions: 'Write an essay about the American Dream',
        subject: 'ELA',
        gradeLevel: '8',
      }

      const mockSubmissions = [
        { studentName: 'Student A', totalScore: 45, maxScore: 100 },
        { studentName: 'Student B', totalScore: 55, maxScore: 100 },
        { studentName: 'Student C', totalScore: 70, maxScore: 100 },
        { studentName: 'Student D', totalScore: 75, maxScore: 100 },
        { studentName: 'Student E', totalScore: 90, maxScore: 100 },
        { studentName: 'Student F', totalScore: 95, maxScore: 100 },
      ]

      selectResults = [
        [mockAssignment],
        mockSubmissions,
      ]

      const req = createPostRequest('/api/grading/differentiate', {
        assignmentId: 'a1',
      })
      const response = await POST(req)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.tiers).toBeDefined()
      expect(data.tiers).toHaveLength(3)

      const [belowTier, onTier, aboveTier] = data.tiers
      expect(belowTier.level).toBe('below_grade')
      expect(belowTier.label).toBe('Below Grade')
      expect(belowTier.studentCount).toBe(2)
      expect(belowTier.activity.title).toBe('Review Basics')
      expect(belowTier.activity.scaffolds).toEqual(['Use graphic organizer'])

      expect(onTier.level).toBe('on_grade')
      expect(onTier.label).toBe('On Grade')
      expect(onTier.studentCount).toBe(2)
      expect(onTier.activity.title).toBe('Apply Concepts')

      expect(aboveTier.level).toBe('above_grade')
      expect(aboveTier.label).toBe('Above Grade')
      expect(aboveTier.studentCount).toBe(2)
      expect(aboveTier.activity.title).toBe('Challenge Extension')
      expect(aboveTier.activity.extensions).toEqual(['Research real-world applications'])
    })

    it('allows sped_teacher role', async () => {
      mockAuthSession(vi.mocked(auth), TEST_SPED_TEACHER)

      const mockAssignment = {
        id: 'a1',
        title: 'Reading Comprehension',
        instructions: 'Read and answer questions',
        subject: 'ELA',
        gradeLevel: '5',
      }

      const mockSubmissions = [
        { studentName: 'Student A', totalScore: 80, maxScore: 100 },
      ]

      selectResults = [
        [mockAssignment],
        mockSubmissions,
      ]

      const req = createPostRequest('/api/grading/differentiate', {
        assignmentId: 'a1',
      })
      const response = await POST(req)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.tiers).toBeDefined()
    })

    it('returns 400 when no graded submissions exist', async () => {
      mockAuthSession(vi.mocked(auth), TEST_TEACHER)

      const mockAssignment = {
        id: 'a1',
        title: 'Essay Assignment',
        instructions: 'Write an essay',
        subject: 'ELA',
        gradeLevel: '8',
      }

      selectResults = [
        [mockAssignment],
        [], // no submissions
      ]

      const req = createPostRequest('/api/grading/differentiate', {
        assignmentId: 'a1',
      })
      const response = await POST(req)
      const data = await response.json()

      expect(response.status).toBe(400)
      expect(data.error).toContain('No graded submissions')
    })
  })
})
