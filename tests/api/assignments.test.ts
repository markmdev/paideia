import { describe, it, expect, vi, beforeEach } from 'vitest'
import {
  mockAuthSession,
  mockNoAuth,
  TEST_TEACHER,
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

let selectResult: unknown = []
let insertResult: unknown = []

vi.mock('@/lib/db', () => {
  return {
    db: {
      select: vi.fn(() => createChainMock(selectResult)),
      insert: vi.fn(() => createChainMock(insertResult)),
      query: {},
    },
  }
})

import { GET, POST } from '@/app/api/assignments/route'
import { auth } from '@/lib/auth'
import { db } from '@/lib/db'

describe('Assignments API', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    selectResult = []
    insertResult = []
  })

  describe('GET /api/assignments', () => {
    it('returns 401 when not authenticated', async () => {
      mockNoAuth(vi.mocked(auth))
      const response = await GET()
      const data = await response.json()
      expect(response.status).toBe(401)
      expect(data.error).toBe('Unauthorized')
    })

    it('returns assignments for authenticated teacher', async () => {
      mockAuthSession(vi.mocked(auth), TEST_TEACHER)
      const mockAssignments = [
        {
          assignment: {
            id: 'a1',
            title: 'Essay Assignment',
            description: 'Write an essay',
            teacherId: TEST_TEACHER.id,
          },
          className: '8th ELA',
          rubricTitle: 'Essay Rubric',
        },
      ]
      selectResult = mockAssignments

      const response = await GET()
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data).toEqual(mockAssignments)
    })

    it('returns empty array when teacher has no assignments', async () => {
      mockAuthSession(vi.mocked(auth), TEST_TEACHER)
      selectResult = []

      const response = await GET()
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data).toEqual([])
    })
  })

  describe('POST /api/assignments', () => {
    it('returns 401 when not authenticated', async () => {
      mockNoAuth(vi.mocked(auth))
      const req = createPostRequest('/api/assignments', {
        title: 'Test',
        description: 'Test desc',
        classId: 'c1',
        gradeLevel: '8',
        subject: 'ELA',
      })

      const response = await POST(req)
      const data = await response.json()
      expect(response.status).toBe(401)
      expect(data.error).toBe('Unauthorized')
    })

    it('returns 400 when required fields are missing', async () => {
      mockAuthSession(vi.mocked(auth), TEST_TEACHER)
      const req = createPostRequest('/api/assignments', {
        title: 'Test',
      })

      const response = await POST(req)
      const data = await response.json()
      expect(response.status).toBe(400)
      expect(data.error).toContain('Missing required fields')
    })

    it('returns 403 when teacher does not have access to the class', async () => {
      mockAuthSession(vi.mocked(auth), TEST_TEACHER)
      selectResult = []

      const req = createPostRequest('/api/assignments', {
        title: 'Test Assignment',
        description: 'A description',
        classId: 'class-001',
        gradeLevel: '8',
        subject: 'ELA',
      })

      const response = await POST(req)
      const data = await response.json()
      expect(response.status).toBe(403)
      expect(data.error).toContain('do not have access')
    })

    it('creates assignment when teacher has class membership', async () => {
      mockAuthSession(vi.mocked(auth), TEST_TEACHER)

      const createdAssignment = {
        id: 'new-a1',
        title: 'Test Assignment',
        description: 'A description',
        classId: 'class-001',
        teacherId: TEST_TEACHER.id,
        status: 'draft',
      }

      // Class membership check returns a member
      selectResult = [{ classId: 'class-001', userId: TEST_TEACHER.id, role: 'teacher' }]
      insertResult = [createdAssignment]

      const req = createPostRequest('/api/assignments', {
        title: 'Test Assignment',
        description: 'A description',
        classId: 'class-001',
        gradeLevel: '8',
        subject: 'ELA',
      })

      const response = await POST(req)
      const data = await response.json()
      expect(response.status).toBe(201)
      expect(data.id).toBe('new-a1')
      expect(data.status).toBe('draft')
    })
  })
})
