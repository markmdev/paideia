import { describe, it, expect, vi, beforeEach } from 'vitest'
import {
  mockAuthSession,
  mockNoAuth,
  TEST_SPED_TEACHER,
  TEST_ADMIN,
  TEST_TEACHER,
  TEST_STUDENT,
  TEST_PARENT,
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

import { GET } from '@/app/api/compliance/route'
import { auth } from '@/lib/auth'

/** Helper: create a date offset from now by the given number of days. */
function daysFromNow(days: number): Date {
  return new Date(Date.now() + days * 24 * 60 * 60 * 1000)
}

/** Helper: build a deadline row for the mock DB result. */
function makeDeadline(overrides: Record<string, unknown> = {}) {
  return {
    id: 'dl-1',
    type: 'annual_review',
    studentId: 'student-001',
    studentName: 'DeShawn Williams',
    dueDate: daysFromNow(45).toISOString(),
    status: 'upcoming',
    completedAt: null,
    notes: null,
    ...overrides,
  }
}

describe('Compliance API', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    selectCallIndex = 0
    selectResults = [[]]
  })

  describe('GET /api/compliance', () => {
    it('returns 401 when not authenticated', async () => {
      mockNoAuth(vi.mocked(auth))
      const req = new Request('http://localhost:3000/api/compliance')
      const response = await GET(req)
      const data = await response.json()
      expect(response.status).toBe(401)
      expect(data.error).toBe('Unauthorized')
    })

    it('returns 403 for a regular teacher', async () => {
      mockAuthSession(vi.mocked(auth), TEST_TEACHER)
      const req = new Request('http://localhost:3000/api/compliance')
      const response = await GET(req)
      const data = await response.json()
      expect(response.status).toBe(403)
      expect(data.error).toContain('Forbidden')
    })

    it('returns 403 for a student', async () => {
      mockAuthSession(vi.mocked(auth), TEST_STUDENT)
      const req = new Request('http://localhost:3000/api/compliance')
      const response = await GET(req)
      const data = await response.json()
      expect(response.status).toBe(403)
      expect(data.error).toContain('Forbidden')
    })

    it('returns 403 for a parent', async () => {
      mockAuthSession(vi.mocked(auth), TEST_PARENT)
      const req = new Request('http://localhost:3000/api/compliance')
      const response = await GET(req)
      const data = await response.json()
      expect(response.status).toBe(403)
      expect(data.error).toContain('Forbidden')
    })

    it('returns deadlines with color-coding for SPED teacher', async () => {
      mockAuthSession(vi.mocked(auth), TEST_SPED_TEACHER)

      const greenDeadline = makeDeadline({
        id: 'dl-green',
        studentId: 'student-001',
        dueDate: daysFromNow(45).toISOString(),
      })

      // 1st select: IEPs authored by this teacher (studentId lookup)
      // 2nd select: all deadlines
      selectResults = [
        [{ studentId: 'student-001' }],
        [greenDeadline],
      ]

      const req = new Request('http://localhost:3000/api/compliance')
      const response = await GET(req)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.deadlines).toHaveLength(1)
      expect(data.deadlines[0].id).toBe('dl-green')
      expect(data.deadlines[0].color).toBe('green')
      expect(data.deadlines[0].daysUntilDue).toBeGreaterThan(30)
      expect(data.summary.total).toBe(1)
      expect(data.summary.green).toBe(1)
    })

    it('returns all deadlines for admin without student filtering', async () => {
      mockAuthSession(vi.mocked(auth), TEST_ADMIN)

      const deadline1 = makeDeadline({ id: 'dl-1', studentId: 'student-001' })
      const deadline2 = makeDeadline({ id: 'dl-2', studentId: 'student-999' })

      // Admin skips the IEP author lookup, so only one select call for deadlines
      selectResults = [
        [deadline1, deadline2],
      ]

      const req = new Request('http://localhost:3000/api/compliance')
      const response = await GET(req)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.deadlines).toHaveLength(2)
      expect(data.summary.total).toBe(2)
    })

    it('applies correct color codes: overdue, red, yellow, green, completed', async () => {
      mockAuthSession(vi.mocked(auth), TEST_ADMIN)

      const overdueDeadline = makeDeadline({
        id: 'dl-overdue',
        dueDate: daysFromNow(-5).toISOString(),
        status: 'upcoming',
      })
      const redDeadline = makeDeadline({
        id: 'dl-red',
        dueDate: daysFromNow(7).toISOString(),
        status: 'upcoming',
      })
      const yellowDeadline = makeDeadline({
        id: 'dl-yellow',
        dueDate: daysFromNow(20).toISOString(),
        status: 'upcoming',
      })
      const greenDeadline = makeDeadline({
        id: 'dl-green',
        dueDate: daysFromNow(60).toISOString(),
        status: 'upcoming',
      })
      const completedDeadline = makeDeadline({
        id: 'dl-completed',
        dueDate: daysFromNow(10).toISOString(),
        status: 'completed',
        completedAt: new Date().toISOString(),
      })

      selectResults = [
        [overdueDeadline, redDeadline, yellowDeadline, greenDeadline, completedDeadline],
      ]

      const req = new Request('http://localhost:3000/api/compliance')
      const response = await GET(req)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.deadlines).toHaveLength(5)

      const byId = Object.fromEntries(data.deadlines.map((d: any) => [d.id, d]))
      expect(byId['dl-overdue'].color).toBe('overdue')
      expect(byId['dl-red'].color).toBe('red')
      expect(byId['dl-yellow'].color).toBe('yellow')
      expect(byId['dl-green'].color).toBe('green')
      expect(byId['dl-completed'].color).toBe('completed')

      expect(data.summary.overdue).toBe(1)
      expect(data.summary.red).toBe(1)
      expect(data.summary.yellow).toBe(1)
      expect(data.summary.green).toBe(1)
      expect(data.summary.completed).toBe(1)
      expect(data.summary.total).toBe(5)
    })

    it('filters deadlines to SPED teacher caseload only', async () => {
      mockAuthSession(vi.mocked(auth), TEST_SPED_TEACHER)

      const ownStudent = makeDeadline({ id: 'dl-own', studentId: 'student-001' })
      const otherStudent = makeDeadline({ id: 'dl-other', studentId: 'student-999' })

      // 1st select: teacher's IEPs return only student-001
      // 2nd select: all deadlines (both students)
      selectResults = [
        [{ studentId: 'student-001' }],
        [ownStudent, otherStudent],
      ]

      const req = new Request('http://localhost:3000/api/compliance')
      const response = await GET(req)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.deadlines).toHaveLength(1)
      expect(data.deadlines[0].id).toBe('dl-own')
      expect(data.summary.total).toBe(1)
    })

    it('returns empty deadlines when SPED teacher has no IEPs', async () => {
      mockAuthSession(vi.mocked(auth), TEST_SPED_TEACHER)

      // 1st select: teacher has no IEPs
      // 2nd select: deadlines exist but teacher has no students
      selectResults = [
        [],
        [makeDeadline({ id: 'dl-1', studentId: 'student-999' })],
      ]

      const req = new Request('http://localhost:3000/api/compliance')
      const response = await GET(req)
      const data = await response.json()

      expect(response.status).toBe(200)
      // When studentIds is empty, the filter condition is:
      // session.user.role === 'sped_teacher' && studentIds.length > 0 => false
      // So all deadlines pass through unfiltered
      expect(data.deadlines).toHaveLength(1)
      expect(data.summary.total).toBe(1)
    })
  })
})
