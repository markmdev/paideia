import { describe, it, expect, vi, beforeEach } from 'vitest'
import {
  mockAuthSession,
  mockNoAuth,
  TEST_SPED_TEACHER,
  TEST_STUDENT,
  createPostRequest,
} from '../helpers'

vi.mock('@/lib/auth', () => ({
  auth: vi.fn(),
}))

function createChainMock(result: unknown = []) {
  const chain: Record<string, any> = {}
  const methods = [
    'select', 'from', 'leftJoin', 'innerJoin', 'where',
    'orderBy', 'limit', 'insert', 'values', 'returning',
    'update', 'set', 'delete', 'groupBy', '$dynamic', 'as',
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

import { GET, POST } from '@/app/api/iep/route'
import { auth } from '@/lib/auth'

describe('IEP API', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    selectCallIndex = 0
    selectResults = [[]]
    insertResult = []
  })

  describe('GET /api/iep', () => {
    it('returns 401 when not authenticated', async () => {
      mockNoAuth(vi.mocked(auth))
      const req = new Request('http://localhost:3000/api/iep')
      const response = await GET(req)
      const data = await response.json()
      expect(response.status).toBe(401)
      expect(data.error).toBe('Unauthorized')
    })

    it('returns 403 when non-SPED role', async () => {
      mockAuthSession(vi.mocked(auth), TEST_STUDENT)
      const req = new Request('http://localhost:3000/api/iep')
      const response = await GET(req)
      const data = await response.json()
      expect(response.status).toBe(403)
      expect(data.error).toContain('Forbidden')
    })

    it('returns 200 with IEP data for SPED teacher', async () => {
      mockAuthSession(vi.mocked(auth), TEST_SPED_TEACHER)

      // The GET route does a subquery for goal counts, then a main select
      // with innerJoin and leftJoin. The chain mock resolves the whole query.
      // 1. goalCountSubquery (built with db.select but used as subquery via .as())
      // 2. main results query
      selectResults = [
        // goalCountSubquery (called via db.select().from().groupBy().as())
        [], // subquery result is not directly awaited; it's joined
        // main query result
        [
          {
            id: 'iep-1',
            studentId: 'student-001',
            studentName: 'DeShawn Williams',
            authorId: TEST_SPED_TEACHER.id,
            status: 'draft',
            disabilityCategory: 'SLD',
            startDate: '2025-09-01',
            endDate: '2026-06-15',
            meetingDate: null,
            goalCount: 3,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
          },
        ],
      ]

      const req = new Request('http://localhost:3000/api/iep')
      const response = await GET(req)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(Array.isArray(data)).toBe(true)
      expect(data).toHaveLength(1)
      expect(data[0].id).toBe('iep-1')
      expect(data[0].studentName).toBe('DeShawn Williams')
      expect(data[0].status).toBe('draft')
      expect(data[0].disabilityCategory).toBe('SLD')
      expect(data[0].goalCount).toBe(3)
    })

    it('returns empty array when SPED teacher has no IEPs', async () => {
      mockAuthSession(vi.mocked(auth), TEST_SPED_TEACHER)

      selectResults = [
        [], // subquery
        [], // main query returns empty
      ]

      const req = new Request('http://localhost:3000/api/iep')
      const response = await GET(req)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(Array.isArray(data)).toBe(true)
      expect(data).toHaveLength(0)
    })
  })

  describe('POST /api/iep', () => {
    it('returns 401 when not authenticated', async () => {
      mockNoAuth(vi.mocked(auth))
      const req = createPostRequest('/api/iep', {
        studentId: 'student-001',
        disabilityCategory: 'SLD',
      })

      const response = await POST(req)
      const data = await response.json()
      expect(response.status).toBe(401)
      expect(data.error).toBe('Unauthorized')
    })

    it('returns 403 when non-SPED role', async () => {
      mockAuthSession(vi.mocked(auth), TEST_STUDENT)
      const req = createPostRequest('/api/iep', {
        studentId: 'student-001',
        disabilityCategory: 'SLD',
      })

      const response = await POST(req)
      const data = await response.json()
      expect(response.status).toBe(403)
      expect(data.error).toContain('Forbidden')
    })

    it('returns 400 when required fields are missing', async () => {
      mockAuthSession(vi.mocked(auth), TEST_SPED_TEACHER)
      const req = createPostRequest('/api/iep', {
        studentId: 'student-001',
      })

      const response = await POST(req)
      const data = await response.json()
      expect(response.status).toBe(400)
      expect(data.error).toContain('Missing required fields')
    })

    it('returns 404 when student does not exist', async () => {
      mockAuthSession(vi.mocked(auth), TEST_SPED_TEACHER)

      // Student lookup returns empty
      selectResults = [
        [],
      ]

      const req = createPostRequest('/api/iep', {
        studentId: 'nonexistent-student',
        disabilityCategory: 'SLD',
      })

      const response = await POST(req)
      const data = await response.json()
      expect(response.status).toBe(404)
      expect(data.error).toContain('Student not found')
    })

    it('creates IEP for valid SPED teacher request', async () => {
      mockAuthSession(vi.mocked(auth), TEST_SPED_TEACHER)

      // 1. Student lookup returns a student
      selectResults = [
        [{ id: 'student-001', name: 'DeShawn Williams' }],
      ]

      // Insert returns the created IEP
      insertResult = [
        {
          id: 'iep-new',
          studentId: 'student-001',
          authorId: TEST_SPED_TEACHER.id,
          disabilityCategory: 'ADHD',
          startDate: '2025-09-01',
          endDate: '2026-06-15',
          status: 'draft',
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        },
      ]

      const req = createPostRequest('/api/iep', {
        studentId: 'student-001',
        disabilityCategory: 'ADHD',
        startDate: '2025-09-01',
        endDate: '2026-06-15',
      })

      const response = await POST(req)
      const data = await response.json()

      expect(response.status).toBe(201)
      expect(data.id).toBe('iep-new')
      expect(data.studentName).toBe('DeShawn Williams')
      expect(data.status).toBe('draft')
      expect(data.disabilityCategory).toBe('ADHD')
      expect(data.goalCount).toBe(0)
    })
  })
})
