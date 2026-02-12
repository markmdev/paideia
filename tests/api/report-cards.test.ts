import { describe, it, expect, vi, beforeEach } from 'vitest'
import {
  mockAuthSession,
  mockNoAuth,
  TEST_TEACHER,
  TEST_STUDENT,
  TEST_PARENT,
  createGetRequest,
  createPostRequest,
} from '../helpers'

vi.mock('@/lib/auth', () => ({
  auth: vi.fn(),
}))

vi.mock('@/lib/ai/report-card', () => ({
  generateReportCardNarrative: vi.fn(),
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
let insertResult: unknown = []

vi.mock('@/lib/db', () => {
  return {
    db: {
      select: vi.fn(() => {
        const result = selectResults[selectCallIndex] ?? []
        selectCallIndex++
        return createChainMock(result)
      }),
      insert: vi.fn(() => createChainMock(insertResult)),
      query: {},
    },
  }
})

import { GET, POST } from '@/app/api/report-cards/route'
import { auth } from '@/lib/auth'
import { generateReportCardNarrative } from '@/lib/ai/report-card'

describe('Report Cards API', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    selectCallIndex = 0
    selectResults = [[]]
    insertResult = []
  })

  describe('GET /api/report-cards', () => {
    it('returns 401 when not authenticated', async () => {
      mockNoAuth(vi.mocked(auth))
      const req = createGetRequest('/api/report-cards')
      const response = await GET(req)
      const data = await response.json()
      expect(response.status).toBe(401)
      expect(data.error).toBe('Unauthorized')
    })

    it('returns 403 for student role', async () => {
      mockAuthSession(vi.mocked(auth), TEST_STUDENT)
      const req = createGetRequest('/api/report-cards')
      const response = await GET(req)
      const data = await response.json()
      expect(response.status).toBe(403)
      expect(data.error).toContain('teacher role required')
    })

    it('returns 403 for parent role', async () => {
      mockAuthSession(vi.mocked(auth), TEST_PARENT)
      const req = createGetRequest('/api/report-cards')
      const response = await GET(req)
      const data = await response.json()
      expect(response.status).toBe(403)
      expect(data.error).toContain('teacher role required')
    })

    it('returns empty array when teacher has no classes', async () => {
      mockAuthSession(vi.mocked(auth), TEST_TEACHER)
      // First select: teacherMemberships returns empty
      selectResults = [[]]

      const req = createGetRequest('/api/report-cards')
      const response = await GET(req)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data).toEqual([])
    })

    it('returns report cards for teacher classes', async () => {
      mockAuthSession(vi.mocked(auth), TEST_TEACHER)

      const mockReportCards = [
        {
          id: 'rc-1',
          studentId: 'student-001',
          studentName: 'Aisha Torres',
          classId: 'class-001',
          className: '8th ELA',
          subject: 'ELA',
          gradeLevel: '8',
          gradingPeriod: 'Q1 2025',
          narrative: 'Aisha has demonstrated strong growth...',
          strengths: JSON.stringify(['Excellent thesis writing', 'Strong evidence use']),
          areasForGrowth: JSON.stringify(['Paragraph transitions']),
          recommendations: JSON.stringify(['Practice outlining before writing']),
          gradeRecommendation: 'B+',
          status: 'draft',
          generatedAt: '2025-01-15T00:00:00.000Z',
          approvedAt: null,
        },
      ]

      selectResults = [
        // 1. teacherMemberships
        [{ classId: 'class-001' }],
        // 2. report cards query
        mockReportCards,
      ]

      const req = createGetRequest('/api/report-cards')
      const response = await GET(req)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data).toHaveLength(1)
      expect(data[0].studentName).toBe('Aisha Torres')
      expect(data[0].narrative).toBe('Aisha has demonstrated strong growth...')
      expect(data[0].strengths).toEqual(['Excellent thesis writing', 'Strong evidence use'])
      expect(data[0].areasForGrowth).toEqual(['Paragraph transitions'])
      expect(data[0].recommendations).toEqual(['Practice outlining before writing'])
      expect(data[0].gradeRecommendation).toBe('B+')
    })
  })

  describe('POST /api/report-cards', () => {
    it('returns 401 when not authenticated', async () => {
      mockNoAuth(vi.mocked(auth))
      const req = createPostRequest('/api/report-cards', {
        studentId: 'student-001',
        classId: 'class-001',
        gradingPeriod: 'Q1 2025',
      })
      const response = await POST(req)
      const data = await response.json()
      expect(response.status).toBe(401)
      expect(data.error).toBe('Unauthorized')
    })

    it('returns 400 when required fields are missing', async () => {
      mockAuthSession(vi.mocked(auth), TEST_TEACHER)
      const req = createPostRequest('/api/report-cards', {
        studentId: 'student-001',
        // missing classId and gradingPeriod
      })

      const response = await POST(req)
      const data = await response.json()
      expect(response.status).toBe(400)
      expect(data.error).toContain('studentId, classId, and gradingPeriod are required')
    })

    it('generates a report card successfully', async () => {
      mockAuthSession(vi.mocked(auth), TEST_TEACHER)

      const generatedNarrative = {
        overallNarrative: 'Aisha has shown remarkable progress in ELA this quarter...',
        strengths: ['Strong analytical writing', 'Excellent vocabulary use'],
        areasForGrowth: ['Citation formatting'],
        recommendations: ['Read 20 minutes daily at home'],
        gradeRecommendation: 'A-',
      }

      vi.mocked(generateReportCardNarrative).mockResolvedValue(generatedNarrative)

      const createdReportCard = {
        id: 'rc-new',
        studentId: 'student-001',
        classId: 'class-001',
        gradingPeriod: 'Q1 2025',
        narrative: generatedNarrative.overallNarrative,
        strengths: JSON.stringify(generatedNarrative.strengths),
        areasForGrowth: JSON.stringify(generatedNarrative.areasForGrowth),
        recommendations: JSON.stringify(generatedNarrative.recommendations),
        gradeRecommendation: 'A-',
        status: 'draft',
        generatedAt: '2025-01-15T00:00:00.000Z',
      }

      selectResults = [
        // 1. Teacher membership check
        [{ classId: 'class-001', userId: TEST_TEACHER.id, role: 'teacher' }],
        // 2. Student membership check
        [{ classId: 'class-001', userId: 'student-001', role: 'student' }],
        // 3. Class info
        [{ id: 'class-001', name: '8th ELA', subject: 'ELA', gradeLevel: '8' }],
        // 4. Student info
        [{ id: 'student-001', name: 'Aisha Torres' }],
        // 5. Class assignments
        [{ id: 'assign-1' }],
        // 6. Student submissions
        [{
          assignmentTitle: 'Essay 1',
          score: 88,
          maxScore: 100,
          letterGrade: 'B+',
          submittedAt: new Date('2025-01-10'),
        }],
        // 7. Mastery records
        [{
          standardCode: 'RL.8.1',
          standardDescription: 'Cite textual evidence',
          level: 'proficient',
          score: 85,
        }],
        // 8. Submission IDs (for feedback)
        [{ id: 'sub-1' }],
        // 9. Feedback drafts
        [{
          aiFeedback: 'Strong thesis with well-chosen evidence.',
          strengths: JSON.stringify(['Clear argument structure']),
        }],
      ]

      insertResult = [createdReportCard]

      const req = createPostRequest('/api/report-cards', {
        studentId: 'student-001',
        classId: 'class-001',
        gradingPeriod: 'Q1 2025',
      })

      const response = await POST(req)
      const data = await response.json()

      expect(response.status).toBe(201)
      expect(data.id).toBe('rc-new')
      expect(data.studentName).toBe('Aisha Torres')
      expect(data.className).toBe('8th ELA')
      expect(data.narrative).toBe(generatedNarrative.overallNarrative)
      expect(data.strengths).toEqual(generatedNarrative.strengths)
      expect(data.areasForGrowth).toEqual(generatedNarrative.areasForGrowth)
      expect(data.recommendations).toEqual(generatedNarrative.recommendations)
      expect(data.gradeRecommendation).toBe('A-')
      expect(data.status).toBe('draft')
      expect(vi.mocked(generateReportCardNarrative)).toHaveBeenCalledOnce()
    })

    it('returns 403 when teacher does not have access to the class', async () => {
      mockAuthSession(vi.mocked(auth), TEST_TEACHER)

      selectResults = [
        // 1. Teacher membership check: empty (no access)
        [],
      ]

      const req = createPostRequest('/api/report-cards', {
        studentId: 'student-001',
        classId: 'class-999',
        gradingPeriod: 'Q1 2025',
      })

      const response = await POST(req)
      const data = await response.json()
      expect(response.status).toBe(403)
      expect(data.error).toContain('do not have access')
    })
  })
})
