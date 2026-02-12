import { describe, it, expect, vi, beforeEach } from 'vitest'
import {
  mockAuthSession,
  mockNoAuth,
  TEST_TEACHER,
  createGetRequest,
  createPostRequest,
} from '../helpers'

vi.mock('@/lib/auth', () => ({
  auth: vi.fn(),
}))

vi.mock('@/lib/ai/grade-submission', () => ({
  gradeSubmission: vi.fn(),
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
      update: vi.fn(() => createChainMock([])),
      query: {},
    },
  }
})

import { GET, POST } from '@/app/api/grading/route'
import { auth } from '@/lib/auth'
import { gradeSubmission } from '@/lib/ai/grade-submission'

describe('Grading API', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    selectCallIndex = 0
    selectResults = [[]]
  })

  describe('GET /api/grading', () => {
    it('returns 401 when not authenticated', async () => {
      mockNoAuth(vi.mocked(auth))
      const req = createGetRequest('/api/grading')
      const response = await GET(req)
      const data = await response.json()
      expect(response.status).toBe(401)
      expect(data.error).toBe('Unauthorized')
    })

    it('returns empty array when teacher has no assignments', async () => {
      mockAuthSession(vi.mocked(auth), TEST_TEACHER)
      selectResults = [[]]

      const req = createGetRequest('/api/grading')
      const response = await GET(req)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data).toEqual([])
    })

    it('returns submissions for teacher assignments', async () => {
      mockAuthSession(vi.mocked(auth), TEST_TEACHER)

      const mockSubmissions = [
        {
          id: 'sub-1',
          assignmentId: 'a1',
          studentId: 'student-001',
          studentName: 'Aisha Torres',
          assignmentTitle: 'Essay Assignment',
          content: 'Student essay text...',
          status: 'submitted',
          totalScore: null,
          maxScore: null,
          letterGrade: null,
          submittedAt: new Date().toISOString(),
          gradedAt: null,
        },
      ]

      selectResults = [
        [{ id: 'a1' }],
        mockSubmissions,
      ]

      const req = createGetRequest('/api/grading')
      const response = await GET(req)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data).toHaveLength(1)
      expect(data[0].studentName).toBe('Aisha Torres')
    })
  })

  describe('POST /api/grading', () => {
    it('returns 401 when not authenticated', async () => {
      mockNoAuth(vi.mocked(auth))
      const req = createPostRequest('/api/grading', {
        submissionId: 'sub-1',
      })
      const response = await POST(req)
      const data = await response.json()
      expect(response.status).toBe(401)
      expect(data.error).toBe('Unauthorized')
    })

    it('returns 400 when neither submissionId nor required fields are provided', async () => {
      mockAuthSession(vi.mocked(auth), TEST_TEACHER)
      const req = createPostRequest('/api/grading', {})

      const response = await POST(req)
      const data = await response.json()
      expect(response.status).toBe(400)
      expect(data.error).toContain('submissionId')
    })

    it('returns 404 when submission is not found', async () => {
      mockAuthSession(vi.mocked(auth), TEST_TEACHER)
      selectResults = [[]]

      const req = createPostRequest('/api/grading', {
        submissionId: 'nonexistent-sub',
      })

      const response = await POST(req)
      const data = await response.json()
      expect(response.status).toBe(404)
      expect(data.error).toBe('Submission not found')
    })

    it('returns 403 when teacher does not own the assignment', async () => {
      mockAuthSession(vi.mocked(auth), TEST_TEACHER)
      selectResults = [
        [{ id: 'sub-1', assignmentId: 'a1', content: 'Essay text' }],
        [],
      ]

      const req = createPostRequest('/api/grading', {
        submissionId: 'sub-1',
      })

      const response = await POST(req)
      const data = await response.json()
      expect(response.status).toBe(403)
      expect(data.error).toContain('do not have access')
    })

    it('returns 400 when assignment has no rubric', async () => {
      mockAuthSession(vi.mocked(auth), TEST_TEACHER)
      selectResults = [
        [{ id: 'sub-1', assignmentId: 'a1', content: 'Essay text' }],
        [{ id: 'a1', teacherId: TEST_TEACHER.id, rubricId: null }],
      ]

      const req = createPostRequest('/api/grading', {
        submissionId: 'sub-1',
      })

      const response = await POST(req)
      const data = await response.json()
      expect(response.status).toBe(400)
      expect(data.error).toContain('no rubric')
    })

    it('grades a submission successfully with AI', async () => {
      mockAuthSession(vi.mocked(auth), TEST_TEACHER)

      const mockSubmission = {
        id: 'sub-1',
        assignmentId: 'a1',
        studentId: 'student-001',
        content: 'My essay about the American Dream...',
      }

      const mockAssignment = {
        id: 'a1',
        teacherId: TEST_TEACHER.id,
        rubricId: 'r1',
        title: 'Essay Assignment',
        description: 'Write an essay',
        instructions: null,
        subject: 'ELA',
        gradeLevel: '8',
      }

      const mockRubric = {
        id: 'r1',
        title: 'Essay Rubric',
        levels: JSON.stringify(['Beginning', 'Developing', 'Proficient', 'Advanced']),
      }

      const mockCriteria = [
        {
          id: 'c1',
          name: 'Thesis',
          description: 'Clear thesis statement',
          weight: 0.5,
          descriptors: JSON.stringify({ Beginning: 'No thesis', Advanced: 'Excellent thesis' }),
        },
      ]

      selectResults = [
        [mockSubmission],
        [mockAssignment],
        [mockRubric],
        mockCriteria,
      ]

      vi.mocked(gradeSubmission).mockResolvedValue({
        totalScore: 85,
        maxScore: 100,
        letterGrade: 'B',
        overallFeedback: 'Good essay with strong thesis.',
        strengths: ['Clear argument', 'Good evidence'],
        improvements: ['Analyze evidence more deeply'],
        nextSteps: ['Practice close reading'],
        misconceptions: [],
        criterionScores: [
          {
            criterionId: 'c1',
            criterionName: 'Thesis',
            level: 'Proficient',
            score: 85,
            maxScore: 100,
            justification: 'Solid thesis statement.',
          },
        ],
      })

      const req = createPostRequest('/api/grading', {
        submissionId: 'sub-1',
      })

      const response = await POST(req)
      const data = await response.json()

      expect(response.status).toBe(201)
      expect(data.totalScore).toBe(85)
      expect(data.maxScore).toBe(100)
      expect(data.letterGrade).toBe('B')
      expect(data.feedback).toBe('Good essay with strong thesis.')
      expect(data.strengths).toEqual(['Clear argument', 'Good evidence'])
      expect(data.criterionScores).toHaveLength(1)
    })
  })
})
