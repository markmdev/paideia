import { describe, it, expect, vi, beforeEach } from 'vitest'
import { NextRequest } from 'next/server'
import {
  mockAuthSession,
  mockNoAuth,
  TEST_TEACHER,
  TEST_ADMIN,
  TEST_STUDENT,
  TEST_PARENT,
} from '../helpers'

vi.mock('@/lib/auth', () => ({
  auth: vi.fn(),
}))

vi.mock('@/lib/ai/early-warning', () => ({
  generateStudentInterventions: vi.fn().mockResolvedValue({
    students: [
      {
        studentLabel: 'Student A',
        recommendations: [
          'Provide targeted practice on linear equations',
          'Schedule a one-on-one check-in',
        ],
      },
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

import { GET } from '@/app/api/early-warning/route'
import { auth } from '@/lib/auth'

describe('Early Warning API', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    selectCallIndex = 0
    selectResults = [[]]
  })

  describe('GET /api/early-warning', () => {
    it('returns 401 when not authenticated', async () => {
      mockNoAuth(vi.mocked(auth))
      const req = new NextRequest('http://localhost:3000/api/early-warning')
      const response = await GET(req)
      const data = await response.json()
      expect(response.status).toBe(401)
      expect(data.error).toBe('Unauthorized')
    })

    it('returns 403 for student role', async () => {
      mockAuthSession(vi.mocked(auth), TEST_STUDENT)
      const req = new NextRequest('http://localhost:3000/api/early-warning')
      const response = await GET(req)
      const data = await response.json()
      expect(response.status).toBe(403)
      expect(data.error).toBe('Forbidden')
    })

    it('returns 403 for parent role', async () => {
      mockAuthSession(vi.mocked(auth), TEST_PARENT)
      const req = new NextRequest('http://localhost:3000/api/early-warning')
      const response = await GET(req)
      const data = await response.json()
      expect(response.status).toBe(403)
      expect(data.error).toBe('Forbidden')
    })

    it('returns student risk data for teacher', async () => {
      mockAuthSession(vi.mocked(auth), TEST_TEACHER)

      const now = new Date()

      // Teacher flow DB calls:
      // 1. teacherClasses: get classes this teacher belongs to
      // 2. student members in those classes
      // 3. student info from users table
      // 4. recent mastery records
      // 5. recent assignments
      // 6. all student submissions
      selectResults = [
        // 1. teacherClasses
        [{ classId: 'c1' }],
        // 2. student members
        [{ userId: 'stu-1' }],
        // 3. student info
        [{ id: 'stu-1', name: 'Aisha Torres', email: 'aisha@student.edu' }],
        // 4. mastery records (below proficient)
        [
          { studentId: 'stu-1', standardId: 'std-1', score: 55, level: 'beginning', assessedAt: now },
          { studentId: 'stu-1', standardId: 'std-2', score: 60, level: 'developing', assessedAt: now },
        ],
        // 5. recent assignments
        [{ id: 'a1' }, { id: 'a2' }],
        // 6. all student submissions (one graded low, one missing)
        [
          {
            id: 'sub-1',
            studentId: 'stu-1',
            assignmentId: 'a1',
            totalScore: 50,
            maxScore: 100,
            status: 'graded',
            submittedAt: now,
          },
        ],
      ]

      const req = new NextRequest('http://localhost:3000/api/early-warning')
      const response = await GET(req)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.students).toBeDefined()
      expect(data.students).toHaveLength(1)
      expect(data.students[0].name).toBe('Aisha Torres')
      expect(data.students[0].riskLevel).toBeDefined()
      expect(['high_risk', 'moderate_risk', 'on_track']).toContain(data.students[0].riskLevel)
      expect(data.students[0].indicators).toBeDefined()
      expect(Array.isArray(data.students[0].indicators)).toBe(true)
      expect(data.students[0].recentScores).toBeDefined()
      expect(data.students[0].trendDirection).toBeDefined()
    })

    it('returns student risk data for admin', async () => {
      mockAuthSession(vi.mocked(auth), TEST_ADMIN)

      const now = new Date()

      // Admin flow (no schoolId filter):
      // 1. all students with role='student'
      // 2. student info from users table
      // 3. mastery records
      // 4. recent assignments
      // 5. all student submissions
      selectResults = [
        // 1. allStudents
        [{ id: 'stu-1' }, { id: 'stu-2' }],
        // 2. student info
        [
          { id: 'stu-1', name: 'Aisha Torres', email: 'aisha@student.edu' },
          { id: 'stu-2', name: 'DeShawn Williams', email: 'deshawn@student.edu' },
        ],
        // 3. mastery records
        [
          { studentId: 'stu-1', standardId: 'std-1', score: 90, level: 'proficient', assessedAt: now },
        ],
        // 4. recent assignments
        [{ id: 'a1' }],
        // 5. all student submissions
        [
          {
            id: 'sub-1',
            studentId: 'stu-1',
            assignmentId: 'a1',
            totalScore: 90,
            maxScore: 100,
            status: 'graded',
            submittedAt: now,
          },
          {
            id: 'sub-2',
            studentId: 'stu-2',
            assignmentId: 'a1',
            totalScore: 85,
            maxScore: 100,
            status: 'graded',
            submittedAt: now,
          },
        ],
      ]

      const req = new NextRequest('http://localhost:3000/api/early-warning')
      const response = await GET(req)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.students).toBeDefined()
      expect(data.students).toHaveLength(2)
    })

    it('returns correct structure with riskLevel, indicators, recentScores, and trendDirection', async () => {
      mockAuthSession(vi.mocked(auth), TEST_TEACHER)

      const now = new Date()

      // Set up a student with enough data to trigger risk indicators
      selectResults = [
        // 1. teacherClasses
        [{ classId: 'c1' }],
        // 2. student members
        [{ userId: 'stu-1' }],
        // 3. student info
        [{ id: 'stu-1', name: 'Aisha Torres', email: 'aisha@student.edu' }],
        // 4. mastery records (below proficient triggers indicator)
        [
          { studentId: 'stu-1', standardId: 'std-1', score: 40, level: 'beginning', assessedAt: now },
          { studentId: 'stu-1', standardId: 'std-2', score: 50, level: 'developing', assessedAt: now },
          { studentId: 'stu-1', standardId: 'std-3', score: 45, level: 'beginning', assessedAt: now },
        ],
        // 5. recent assignments with classId (3 assignments in class c1)
        [{ id: 'a1', classId: 'c1' }, { id: 'a2', classId: 'c1' }, { id: 'a3', classId: 'c1' }],
        // 6. student class memberships (student enrolled in c1)
        [{ userId: 'stu-1', classId: 'c1' }],
        // 7. submissions (only 1 graded, low score -- missing 2 submissions + low average)
        [
          {
            id: 'sub-1',
            studentId: 'stu-1',
            assignmentId: 'a1',
            totalScore: 45,
            maxScore: 100,
            status: 'graded',
            submittedAt: now,
          },
        ],
      ]

      const req = new NextRequest('http://localhost:3000/api/early-warning')
      const response = await GET(req)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.students).toHaveLength(1)

      const student = data.students[0]
      expect(student.id).toBe('stu-1')
      expect(student.name).toBe('Aisha Torres')
      expect(student.email).toBe('aisha@student.edu')
      expect(student.riskLevel).toBe('high_risk')
      expect(student.indicators.length).toBeGreaterThanOrEqual(3)
      expect(student.recentScores).toEqual([45])
      expect(student.trendDirection).toBeDefined()
      expect(['declining', 'stable', 'improving']).toContain(student.trendDirection)
      // AI recommendations should be attached for flagged students
      expect(student.recommendations).toBeDefined()
      expect(Array.isArray(student.recommendations)).toBe(true)
    })

    it('returns empty students array when teacher has no classes', async () => {
      mockAuthSession(vi.mocked(auth), TEST_TEACHER)

      // Teacher has no classes
      selectResults = [
        [], // teacherClasses: empty
      ]

      const req = new NextRequest('http://localhost:3000/api/early-warning')
      const response = await GET(req)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.students).toEqual([])
    })
  })
})
