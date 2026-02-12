import { describe, it, expect, vi, beforeEach } from 'vitest'
import {
  mockAuthSession,
  mockNoAuth,
  TEST_STUDENT,
  TEST_TEACHER,
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

let selectResult: unknown = []

vi.mock('@/lib/db', () => {
  return {
    db: {
      select: vi.fn(() => createChainMock(selectResult)),
      query: {},
    },
  }
})

import { GET } from '@/app/api/tutor/sessions/route'
import { auth } from '@/lib/auth'

describe('Tutor Sessions API', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    selectResult = []
  })

  describe('GET /api/tutor/sessions', () => {
    it('returns 401 when not authenticated', async () => {
      mockNoAuth(vi.mocked(auth))
      const response = await GET()
      const data = await response.json()
      expect(response.status).toBe(401)
      expect(data.error).toBe('Unauthorized')
    })

    it('returns 403 when user is a teacher', async () => {
      mockAuthSession(vi.mocked(auth), TEST_TEACHER)
      const response = await GET()
      const data = await response.json()
      expect(response.status).toBe(403)
      expect(data.error).toContain('only students')
    })

    it('returns 403 when user is a parent', async () => {
      mockAuthSession(vi.mocked(auth), TEST_PARENT)
      const response = await GET()
      const data = await response.json()
      expect(response.status).toBe(403)
      expect(data.error).toContain('only students')
    })

    it('returns sessions for authenticated student', async () => {
      mockAuthSession(vi.mocked(auth), TEST_STUDENT)

      const now = new Date()
      const mockSessions = [
        {
          id: 'session-1',
          studentId: TEST_STUDENT.id,
          subject: 'Math',
          topic: 'Linear Equations',
          startedAt: now,
          endedAt: null,
          messages: JSON.stringify([
            { role: 'user', content: 'Help me solve 2x + 5 = 13', timestamp: now.toISOString() },
            { role: 'assistant', content: 'Let us start by thinking about what operation to undo first.', timestamp: now.toISOString() },
          ]),
        },
      ]

      selectResult = mockSessions

      const response = await GET()
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data).toHaveLength(1)
      expect(data[0].id).toBe('session-1')
      expect(data[0].subject).toBe('Math')
      expect(data[0].topic).toBe('Linear Equations')
      expect(data[0].messageCount).toBe(2)
      expect(data[0].lastMessage).toContain('what operation to undo first')
    })

    it('returns empty array when student has no sessions', async () => {
      mockAuthSession(vi.mocked(auth), TEST_STUDENT)
      selectResult = []

      const response = await GET()
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data).toEqual([])
    })

    it('handles session with empty messages array', async () => {
      mockAuthSession(vi.mocked(auth), TEST_STUDENT)

      const now = new Date()
      selectResult = [
        {
          id: 'session-2',
          studentId: TEST_STUDENT.id,
          subject: 'Science',
          topic: 'Photosynthesis',
          startedAt: now,
          endedAt: null,
          messages: JSON.stringify([]),
        },
      ]

      const response = await GET()
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data[0].messageCount).toBe(0)
      expect(data[0].lastMessage).toBeNull()
    })
  })
})
