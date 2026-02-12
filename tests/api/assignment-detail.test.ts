import { describe, it, expect, vi, beforeEach } from 'vitest'
import {
  mockAuthSession,
  mockNoAuth,
  TEST_TEACHER,
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
let updateResult: unknown = []
let deleteChain: ReturnType<typeof createChainMock> | null = null

vi.mock('@/lib/db', () => {
  return {
    db: {
      select: vi.fn(() => {
        const result = selectResults[selectCallIndex] ?? []
        selectCallIndex++
        return createChainMock(result)
      }),
      insert: vi.fn(() => createChainMock([])),
      update: vi.fn(() => createChainMock(updateResult)),
      delete: vi.fn(() => {
        if (deleteChain) return deleteChain
        return createChainMock([])
      }),
      query: {},
    },
  }
})

import { GET, PUT, DELETE } from '@/app/api/assignments/[id]/route'
import { auth } from '@/lib/auth'
import { db } from '@/lib/db'

const OTHER_TEACHER = {
  id: 'teacher-999',
  role: 'teacher',
  email: 'other@school.edu',
  name: 'Other Teacher',
}

function makeParams(id: string) {
  return { params: Promise.resolve({ id }) }
}

describe('Assignment Detail API', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    selectCallIndex = 0
    selectResults = [[]]
    updateResult = []
    deleteChain = null
  })

  describe('GET /api/assignments/[id]', () => {
    it('returns 401 when not authenticated', async () => {
      mockNoAuth(vi.mocked(auth))
      const req = new Request('http://localhost:3000/api/assignments/a1')
      const response = await GET(req, makeParams('a1'))
      const data = await response.json()
      expect(response.status).toBe(401)
      expect(data.error).toBe('Unauthorized')
    })

    it('returns 404 when assignment does not exist', async () => {
      mockAuthSession(vi.mocked(auth), TEST_TEACHER)
      // Main assignment query returns empty
      selectResults = [
        [],
      ]

      const req = new Request('http://localhost:3000/api/assignments/nonexistent')
      const response = await GET(req, makeParams('nonexistent'))
      const data = await response.json()
      expect(response.status).toBe(404)
      expect(data.error).toBe('Assignment not found')
    })

    it('returns 404 when assignment belongs to another teacher', async () => {
      mockAuthSession(vi.mocked(auth), OTHER_TEACHER)
      // The query filters by teacherId, so another teacher's assignment returns empty
      selectResults = [
        [],
      ]

      const req = new Request('http://localhost:3000/api/assignments/a1')
      const response = await GET(req, makeParams('a1'))
      const data = await response.json()
      expect(response.status).toBe(404)
      expect(data.error).toBe('Assignment not found')
    })

    it('returns assignment with rubric, criteria, and versions', async () => {
      mockAuthSession(vi.mocked(auth), TEST_TEACHER)

      const mockAssignment = {
        assignment: {
          id: 'a1',
          title: 'Essay Assignment',
          description: 'Write an essay',
          teacherId: TEST_TEACHER.id,
          rubricId: 'r1',
          classId: 'c1',
          status: 'published',
        },
        className: '8th ELA',
        classSubject: 'ELA',
      }

      const mockRubric = {
        id: 'r1',
        title: 'Essay Rubric',
        type: 'analytical',
        teacherId: TEST_TEACHER.id,
      }

      const mockCriteria = [
        { id: 'cr1', rubricId: 'r1', name: 'Thesis', weight: 0.25 },
        { id: 'cr2', rubricId: 'r1', name: 'Evidence', weight: 0.25 },
      ]

      const mockVersions = [
        { id: 'v1', assignmentId: 'a1', tier: 'below', content: 'Simplified' },
        { id: 'v2', assignmentId: 'a1', tier: 'on', content: 'Standard' },
      ]

      selectResults = [
        [mockAssignment],  // main assignment query
        [mockRubric],      // rubric query
        mockCriteria,      // criteria query
        mockVersions,      // versions query
      ]

      const req = new Request('http://localhost:3000/api/assignments/a1')
      const response = await GET(req, makeParams('a1'))
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.assignment.id).toBe('a1')
      expect(data.assignment.title).toBe('Essay Assignment')
      expect(data.className).toBe('8th ELA')
      expect(data.classSubject).toBe('ELA')
      expect(data.rubric.id).toBe('r1')
      expect(data.criteria).toHaveLength(2)
      expect(data.versions).toHaveLength(2)
    })
  })

  describe('PUT /api/assignments/[id]', () => {
    it('returns 401 when not authenticated', async () => {
      mockNoAuth(vi.mocked(auth))
      const req = new Request('http://localhost:3000/api/assignments/a1', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title: 'Updated' }),
      })

      const response = await PUT(req, makeParams('a1'))
      const data = await response.json()
      expect(response.status).toBe(401)
      expect(data.error).toBe('Unauthorized')
    })

    it('returns 404 when assignment does not exist or belongs to another teacher', async () => {
      mockAuthSession(vi.mocked(auth), TEST_TEACHER)
      // Ownership check returns empty
      selectResults = [
        [],
      ]

      const req = new Request('http://localhost:3000/api/assignments/nonexistent', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title: 'Updated' }),
      })

      const response = await PUT(req, makeParams('nonexistent'))
      const data = await response.json()
      expect(response.status).toBe(404)
      expect(data.error).toBe('Assignment not found')
    })

    it('updates assignment fields successfully', async () => {
      mockAuthSession(vi.mocked(auth), TEST_TEACHER)

      const existingAssignment = {
        id: 'a1',
        title: 'Original Title',
        description: 'Original description',
        teacherId: TEST_TEACHER.id,
        status: 'draft',
      }

      const updatedAssignment = {
        id: 'a1',
        title: 'Updated Title',
        description: 'Updated description',
        teacherId: TEST_TEACHER.id,
        status: 'published',
      }

      // Ownership check returns existing assignment
      selectResults = [
        [existingAssignment],
      ]
      updateResult = [updatedAssignment]

      const req = new Request('http://localhost:3000/api/assignments/a1', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: 'Updated Title',
          description: 'Updated description',
          status: 'published',
        }),
      })

      const response = await PUT(req, makeParams('a1'))
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.id).toBe('a1')
      expect(data.title).toBe('Updated Title')
      expect(data.status).toBe('published')
    })
  })

  describe('DELETE /api/assignments/[id]', () => {
    it('returns 401 when not authenticated', async () => {
      mockNoAuth(vi.mocked(auth))
      const req = new Request('http://localhost:3000/api/assignments/a1', {
        method: 'DELETE',
      })

      const response = await DELETE(req, makeParams('a1'))
      const data = await response.json()
      expect(response.status).toBe(401)
      expect(data.error).toBe('Unauthorized')
    })

    it('returns 404 when assignment does not exist or belongs to another teacher', async () => {
      mockAuthSession(vi.mocked(auth), TEST_TEACHER)
      // Ownership check returns empty
      selectResults = [
        [],
      ]

      const req = new Request('http://localhost:3000/api/assignments/nonexistent', {
        method: 'DELETE',
      })

      const response = await DELETE(req, makeParams('nonexistent'))
      const data = await response.json()
      expect(response.status).toBe(404)
      expect(data.error).toBe('Assignment not found')
    })

    it('deletes assignment and its differentiated versions', async () => {
      mockAuthSession(vi.mocked(auth), TEST_TEACHER)

      const existingAssignment = {
        id: 'a1',
        title: 'Essay Assignment',
        teacherId: TEST_TEACHER.id,
      }

      // Ownership check returns existing assignment
      selectResults = [
        [existingAssignment],
      ]

      const req = new Request('http://localhost:3000/api/assignments/a1', {
        method: 'DELETE',
      })

      const response = await DELETE(req, makeParams('a1'))
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.success).toBe(true)
      // Verify db.delete was called twice (versions + assignment)
      expect(vi.mocked(db.delete)).toHaveBeenCalledTimes(2)
    })
  })
})
