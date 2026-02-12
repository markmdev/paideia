import { describe, it, expect, vi, beforeEach } from 'vitest'
import {
  mockAuthSession,
  mockNoAuth,
  TEST_TEACHER,
  TEST_STUDENT,
  TEST_PARENT,
  createPostRequest,
  createGetRequest,
} from '../helpers'

vi.mock('@/lib/auth', () => ({
  auth: vi.fn(),
}))

vi.mock('@/lib/ai/grade-submission', () => ({
  batchGradeSubmissions: vi.fn(),
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

import { POST as batchPOST } from '@/app/api/grading/batch/route'
import { GET as analyticsGET } from '@/app/api/grading/analytics/route'
import { auth } from '@/lib/auth'
import { batchGradeSubmissions } from '@/lib/ai/grade-submission'

describe('Batch Grading API - POST /api/grading/batch', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    selectCallIndex = 0
    selectResults = [[]]
  })

  it('returns 401 when not authenticated', async () => {
    mockNoAuth(vi.mocked(auth))
    const req = createPostRequest('/api/grading/batch', {
      assignmentId: 'a1',
    })
    const response = await batchPOST(req)
    const data = await response.json()
    expect(response.status).toBe(401)
    expect(data.error).toBe('Unauthorized')
  })

  it('returns 403 when a student tries to batch grade', async () => {
    mockAuthSession(vi.mocked(auth), TEST_STUDENT)
    // Student won't own any assignment, so ownership check returns empty
    selectResults = [[]]

    const req = createPostRequest('/api/grading/batch', {
      assignmentId: 'a1',
    })
    const response = await batchPOST(req)
    const data = await response.json()
    expect(response.status).toBe(403)
    expect(data.error).toContain('do not have access')
  })

  it('returns 403 when a parent tries to batch grade', async () => {
    mockAuthSession(vi.mocked(auth), TEST_PARENT)
    // Parent won't own any assignment, so ownership check returns empty
    selectResults = [[]]

    const req = createPostRequest('/api/grading/batch', {
      assignmentId: 'a1',
    })
    const response = await batchPOST(req)
    const data = await response.json()
    expect(response.status).toBe(403)
    expect(data.error).toContain('do not have access')
  })

  it('returns 400 when assignmentId is missing', async () => {
    mockAuthSession(vi.mocked(auth), TEST_TEACHER)
    const req = createPostRequest('/api/grading/batch', {})
    const response = await batchPOST(req)
    const data = await response.json()
    expect(response.status).toBe(400)
    expect(data.error).toContain('assignmentId')
  })

  it('batch grades submissions and returns results', async () => {
    mockAuthSession(vi.mocked(auth), TEST_TEACHER)

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

    const mockUngraded = [
      { id: 'sub-1', assignmentId: 'a1', studentId: 's1', content: 'Essay 1...', status: 'submitted' },
      { id: 'sub-2', assignmentId: 'a1', studentId: 's2', content: 'Essay 2...', status: 'submitted' },
    ]

    // select call order: assignment, rubric, criteria, ungraded submissions
    selectResults = [
      [mockAssignment],
      [mockRubric],
      mockCriteria,
      mockUngraded,
    ]

    vi.mocked(batchGradeSubmissions).mockResolvedValue([
      {
        submissionId: 'sub-1',
        result: {
          totalScore: 85,
          maxScore: 100,
          letterGrade: 'B',
          overallFeedback: 'Good essay.',
          strengths: ['Clear argument'],
          improvements: ['More evidence'],
          nextSteps: ['Practice analysis'],
          misconceptions: [],
          criterionScores: [
            { criterionId: 'c1', criterionName: 'Thesis', level: 'Proficient', score: 85, maxScore: 100, justification: 'Solid.' },
          ],
        },
      },
      {
        submissionId: 'sub-2',
        result: {
          totalScore: 72,
          maxScore: 100,
          letterGrade: 'C',
          overallFeedback: 'Needs improvement.',
          strengths: ['Organized'],
          improvements: ['Thesis clarity'],
          nextSteps: ['Review rubric'],
          misconceptions: [],
          criterionScores: [
            { criterionId: 'c1', criterionName: 'Thesis', level: 'Developing', score: 72, maxScore: 100, justification: 'Weak thesis.' },
          ],
        },
      },
    ])

    const req = createPostRequest('/api/grading/batch', {
      assignmentId: 'a1',
    })
    const response = await batchPOST(req)
    const data = await response.json()

    expect(response.status).toBe(200)
    expect(data.total).toBe(2)
    expect(data.graded).toBe(2)
    expect(data.failed).toBe(0)
  })
})

describe('Grading Analytics API - GET /api/grading/analytics', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    selectCallIndex = 0
    selectResults = [[]]
  })

  it('returns 401 when not authenticated', async () => {
    mockNoAuth(vi.mocked(auth))
    const req = createGetRequest('/api/grading/analytics', {
      assignmentId: 'a1',
    })
    const response = await analyticsGET(req)
    const data = await response.json()
    expect(response.status).toBe(401)
    expect(data.error).toBe('Unauthorized')
  })

  it('returns 400 when assignmentId query param is missing', async () => {
    mockAuthSession(vi.mocked(auth), TEST_TEACHER)
    const req = createGetRequest('/api/grading/analytics')
    const response = await analyticsGET(req)
    const data = await response.json()
    expect(response.status).toBe(400)
    expect(data.error).toContain('assignmentId')
  })

  it('returns analytics data for a graded assignment', async () => {
    mockAuthSession(vi.mocked(auth), TEST_TEACHER)

    const mockAssignment = {
      id: 'a1',
      teacherId: TEST_TEACHER.id,
      title: 'Essay Assignment',
    }

    const mockGradedSubmissions = [
      {
        id: 'sub-1',
        studentId: 's1',
        studentName: 'Aisha Torres',
        totalScore: 85,
        maxScore: 100,
        letterGrade: 'B',
        status: 'graded',
      },
      {
        id: 'sub-2',
        studentId: 's2',
        studentName: 'DeShawn Williams',
        totalScore: 92,
        maxScore: 100,
        letterGrade: 'A',
        status: 'graded',
      },
    ]

    const mockCriterionScores = [
      { criterionId: 'c1', criterionName: 'Thesis', score: 22, maxScore: 25, submissionId: 'sub-1' },
      { criterionId: 'c1', criterionName: 'Thesis', score: 24, maxScore: 25, submissionId: 'sub-2' },
    ]

    const mockFeedback = [
      {
        submissionId: 'sub-1',
        aiMetadata: JSON.stringify({ misconceptions: ['Summarizes rather than analyzes'] }),
      },
      {
        submissionId: 'sub-2',
        aiMetadata: JSON.stringify({ misconceptions: [] }),
      },
    ]

    // select call order: assignment, graded submissions, criterion scores, feedback drafts
    selectResults = [
      [mockAssignment],
      mockGradedSubmissions,
      mockCriterionScores,
      mockFeedback,
    ]

    const req = createGetRequest('/api/grading/analytics', {
      assignmentId: 'a1',
    })
    const response = await analyticsGET(req)
    const data = await response.json()

    expect(response.status).toBe(200)
    expect(data.assignmentId).toBe('a1')
    expect(data.assignmentTitle).toBe('Essay Assignment')
    expect(data.totalSubmissions).toBe(2)
    expect(data.gradedCount).toBe(2)
    expect(data.averageScore).toBeGreaterThan(0)
    expect(data.scoreDistribution).toBeDefined()
    expect(data.letterGradeDistribution).toBeDefined()
    expect(data.classPerformance).toHaveLength(2)
  })
})
