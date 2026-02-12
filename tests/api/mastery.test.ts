import { describe, it, expect, vi, beforeEach } from 'vitest'
import {
  mockAuthSession,
  mockNoAuth,
  TEST_TEACHER,
  createGetRequest,
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

import { GET } from '@/app/api/mastery/route'
import { auth } from '@/lib/auth'

describe('Mastery API', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    selectCallIndex = 0
    selectResults = [[]]
  })

  describe('GET /api/mastery', () => {
    it('returns 401 when not authenticated', async () => {
      mockNoAuth(vi.mocked(auth))
      const req = createGetRequest('/api/mastery')
      const response = await GET(req as any)
      const data = await response.json()
      expect(response.status).toBe(401)
      expect(data.error).toBe('Unauthorized')
    })

    it('returns 400 when neither classId nor studentId is provided', async () => {
      mockAuthSession(vi.mocked(auth), TEST_TEACHER)
      const req = createGetRequest('/api/mastery')
      const response = await GET(req as any)
      const data = await response.json()
      expect(response.status).toBe(400)
      expect(data.error).toContain('classId or studentId')
    })

    it('returns 403 when teacher is not a member of the class', async () => {
      mockAuthSession(vi.mocked(auth), TEST_TEACHER)
      selectResults = [[]]

      const req = createGetRequest('/api/mastery', { classId: 'class-001' })
      const response = await GET(req as any)
      const data = await response.json()
      expect(response.status).toBe(403)
      expect(data.error).toContain('Not a teacher')
    })

    it('returns mastery data for a specific student', async () => {
      mockAuthSession(vi.mocked(auth), TEST_TEACHER)

      const now = new Date()
      const mockRecords = [
        {
          id: 'mr-1',
          studentId: 'student-001',
          standardId: 'std-1',
          level: 'proficient',
          score: 85,
          assessedAt: now,
        },
      ]
      const mockStudentRows = [{ id: 'student-001', name: 'Aisha Torres' }]
      const mockStandards = [
        {
          id: 'std-1',
          code: 'ELA.W.8.1',
          description: 'Write arguments',
          subject: 'ELA',
          gradeLevel: '8',
          domain: 'Writing',
        },
      ]

      selectResults = [mockRecords, mockStudentRows, mockStandards]

      const req = createGetRequest('/api/mastery', { studentId: 'student-001' })
      const response = await GET(req as any)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.students).toHaveLength(1)
      expect(data.students[0].studentId).toBe('student-001')
      expect(data.students[0].studentName).toBe('Aisha Torres')
      expect(data.students[0].standards).toHaveLength(1)
      expect(data.students[0].standards[0].standardCode).toBe('ELA.W.8.1')
      expect(data.students[0].standards[0].status).toBe('green')
    })

    it('returns empty students when no students found in class', async () => {
      mockAuthSession(vi.mocked(auth), TEST_TEACHER)
      selectResults = [
        [{ userId: TEST_TEACHER.id }],
        [],
      ]

      const req = createGetRequest('/api/mastery', { classId: 'class-001' })
      const response = await GET(req as any)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.students).toEqual([])
      expect(data.standards).toEqual([])
    })

    it('returns mastery data for a class with traffic-light statuses', async () => {
      mockAuthSession(vi.mocked(auth), TEST_TEACHER)

      const now = new Date()
      const mockRecords = [
        { studentId: 'student-001', standardId: 'std-1', level: 'advanced', score: 95, assessedAt: now },
        { studentId: 'student-002', standardId: 'std-1', level: 'beginning', score: 30, assessedAt: now },
      ]
      const mockStudentRows = [
        { id: 'student-001', name: 'Aisha Torres' },
        { id: 'student-002', name: 'DeShawn Williams' },
      ]
      const mockStandards = [
        { id: 'std-1', code: 'ELA.W.8.1', description: 'Write arguments', subject: 'ELA', gradeLevel: '8', domain: 'Writing' },
      ]

      selectResults = [
        [{ userId: TEST_TEACHER.id }],
        [{ userId: 'student-001' }, { userId: 'student-002' }],
        mockRecords,
        mockStudentRows,
        mockStandards,
      ]

      const req = createGetRequest('/api/mastery', { classId: 'class-001' })
      const response = await GET(req as any)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.students).toHaveLength(2)

      const aisha = data.students.find((s: any) => s.studentId === 'student-001')
      const deshawn = data.students.find((s: any) => s.studentId === 'student-002')

      expect(aisha.standards[0].status).toBe('green')
      expect(deshawn.standards[0].status).toBe('red')
    })
  })
})
