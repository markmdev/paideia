import { describe, it, expect, vi, beforeEach } from 'vitest'
import {
  mockAuthSession,
  mockNoAuth,
  TEST_PARENT,
  TEST_TEACHER,
  TEST_STUDENT,
} from '../helpers'

vi.mock('@/lib/auth', () => ({
  auth: vi.fn(),
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
      query: {},
    },
  }
})

import { GET } from '@/app/api/parent/dashboard/route'
import { auth } from '@/lib/auth'

describe('Parent Dashboard API', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    selectCallIndex = 0
    selectResults = [[]]
  })

  describe('GET /api/parent/dashboard', () => {
    it('returns 401 when not authenticated', async () => {
      mockNoAuth(vi.mocked(auth))
      const response = await GET()
      const data = await response.json()
      expect(response.status).toBe(401)
      expect(data.error).toBe('Unauthorized')
    })

    it('returns 403 when user is not a parent', async () => {
      mockAuthSession(vi.mocked(auth), TEST_TEACHER)
      const response = await GET()
      const data = await response.json()
      expect(response.status).toBe(403)
      expect(data.error).toBe('Forbidden')
    })

    it('returns 403 when user is a student', async () => {
      mockAuthSession(vi.mocked(auth), TEST_STUDENT)
      const response = await GET()
      const data = await response.json()
      expect(response.status).toBe(403)
      expect(data.error).toBe('Forbidden')
    })

    it('returns empty children array when parent has no linked children', async () => {
      mockAuthSession(vi.mocked(auth), TEST_PARENT)
      selectResults = [[]]

      const response = await GET()
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.children).toEqual([])
    })

    it('returns children data for authenticated parent', async () => {
      mockAuthSession(vi.mocked(auth), TEST_PARENT)

      const mockChildren = [
        { childId: 'student-001', childName: 'Aisha Torres', childEmail: 'aisha@student.edu' },
      ]

      const mockEnrollments = [
        { userId: 'student-001', className: '8th ELA', subject: 'ELA', gradeLevel: '8' },
      ]

      const mockSubmissions = [
        {
          studentId: 'student-001',
          assignmentTitle: 'Essay Assignment',
          subject: 'ELA',
          totalScore: 85,
          maxScore: 100,
          letterGrade: 'B',
          status: 'graded',
          gradedAt: new Date(),
        },
      ]

      const mockMastery = [
        { studentId: 'student-001', subject: 'ELA', avgScore: '82' },
      ]

      selectResults = [mockChildren, mockEnrollments, mockSubmissions, mockMastery]

      const response = await GET()
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.children).toHaveLength(1)
      expect(data.children[0].name).toBe('Aisha Torres')
      expect(data.children[0].gradeLevel).toBe('8')
      expect(data.children[0].overallStatus).toBe('good')
      expect(data.children[0].averageScore).toBe(85)
      expect(data.children[0].recentGrades).toHaveLength(1)
      expect(data.children[0].enrolledClasses).toHaveLength(1)
      expect(data.children[0].enrolledClasses[0].name).toBe('8th ELA')
    })

    it('returns concern status when average score is below 60', async () => {
      mockAuthSession(vi.mocked(auth), TEST_PARENT)

      const mockChildren = [
        { childId: 'student-001', childName: 'Aisha Torres', childEmail: 'aisha@student.edu' },
      ]

      const mockEnrollments = [
        { userId: 'student-001', className: '8th ELA', subject: 'ELA', gradeLevel: '8' },
      ]

      const mockSubmissions = [
        {
          studentId: 'student-001',
          assignmentTitle: 'Essay',
          subject: 'ELA',
          totalScore: 45,
          maxScore: 100,
          letterGrade: 'F',
          status: 'graded',
          gradedAt: new Date(),
        },
      ]

      selectResults = [mockChildren, mockEnrollments, mockSubmissions, []]

      const response = await GET()
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.children[0].overallStatus).toBe('concern')
      expect(data.children[0].averageScore).toBe(45)
    })

    it('returns watch status when average score is between 60-75', async () => {
      mockAuthSession(vi.mocked(auth), TEST_PARENT)

      const mockChildren = [
        { childId: 'student-001', childName: 'Aisha Torres', childEmail: 'aisha@student.edu' },
      ]

      const mockEnrollments = [
        { userId: 'student-001', className: '8th ELA', subject: 'ELA', gradeLevel: '8' },
      ]

      const mockSubmissions = [
        {
          studentId: 'student-001',
          assignmentTitle: 'Essay',
          subject: 'ELA',
          totalScore: 68,
          maxScore: 100,
          letterGrade: 'D',
          status: 'graded',
          gradedAt: new Date(),
        },
      ]

      selectResults = [mockChildren, mockEnrollments, mockSubmissions, []]

      const response = await GET()
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.children[0].overallStatus).toBe('watch')
    })
  })
})
