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

import { GET, POST } from '@/app/api/rubrics/route'
import { auth } from '@/lib/auth'
import { db } from '@/lib/db'

describe('Rubrics API', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    selectCallIndex = 0
    selectResults = [[]]
  })

  describe('GET /api/rubrics', () => {
    it('returns 401 when not authenticated', async () => {
      mockNoAuth(vi.mocked(auth))
      const response = await GET()
      const data = await response.json()
      expect(response.status).toBe(401)
      expect(data.error).toBe('Unauthorized')
    })

    it('returns rubrics for authenticated teacher', async () => {
      mockAuthSession(vi.mocked(auth), TEST_TEACHER)

      const mockRubrics = [
        {
          id: 'r1',
          title: 'Essay Rubric',
          description: 'For essays',
          type: 'analytical',
          levels: JSON.stringify(['Beginning', 'Developing', 'Proficient', 'Advanced']),
          teacherId: TEST_TEACHER.id,
          isTemplate: false,
          createdAt: new Date(),
        },
      ]

      selectResults = [mockRubrics, [{ rubricId: 'r1' }, { rubricId: 'r1' }]]

      const response = await GET()
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data).toHaveLength(1)
      expect(data[0].title).toBe('Essay Rubric')
      expect(data[0].levels).toEqual(['Beginning', 'Developing', 'Proficient', 'Advanced'])
      expect(data[0].criteriaCount).toBe(2)
    })

    it('returns empty array when teacher has no rubrics', async () => {
      mockAuthSession(vi.mocked(auth), TEST_TEACHER)
      selectResults = [[]]

      const response = await GET()
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data).toEqual([])
    })
  })

  describe('POST /api/rubrics', () => {
    it('returns 401 when not authenticated', async () => {
      mockNoAuth(vi.mocked(auth))
      const req = createPostRequest('/api/rubrics', {
        title: 'Test Rubric',
        levels: ['Beginning', 'Proficient'],
      })

      const response = await POST(req)
      const data = await response.json()
      expect(response.status).toBe(401)
      expect(data.error).toBe('Unauthorized')
    })

    it('returns 400 when required fields are missing', async () => {
      mockAuthSession(vi.mocked(auth), TEST_TEACHER)
      const req = createPostRequest('/api/rubrics', {
        description: 'Some rubric',
      })

      const response = await POST(req)
      const data = await response.json()
      expect(response.status).toBe(400)
      expect(data.error).toContain('Missing required fields')
    })

    it('returns 400 when levels is empty array', async () => {
      mockAuthSession(vi.mocked(auth), TEST_TEACHER)
      const req = createPostRequest('/api/rubrics', {
        title: 'Test Rubric',
        levels: [],
      })

      const response = await POST(req)
      const data = await response.json()
      expect(response.status).toBe(400)
      expect(data.error).toContain('Missing required fields')
    })

    it('creates rubric with criteria', async () => {
      mockAuthSession(vi.mocked(auth), TEST_TEACHER)

      const createdRubric = {
        id: 'new-r1',
        title: 'Essay Rubric',
        description: null,
        type: 'analytical',
        levels: JSON.stringify(['Beginning', 'Developing', 'Proficient', 'Advanced']),
        teacherId: TEST_TEACHER.id,
        isTemplate: false,
        createdAt: new Date(),
      }

      const savedCriteria = [
        {
          id: 'c1',
          rubricId: 'new-r1',
          name: 'Thesis',
          description: 'Has a clear thesis',
          weight: 0.5,
          standardId: null,
          descriptors: JSON.stringify({ Beginning: 'No thesis', Proficient: 'Clear thesis' }),
        },
      ]

      vi.mocked(db.insert).mockImplementation(() => createChainMock([createdRubric]) as any)
      selectResults = [savedCriteria]

      const req = createPostRequest('/api/rubrics', {
        title: 'Essay Rubric',
        levels: ['Beginning', 'Developing', 'Proficient', 'Advanced'],
        criteria: [
          {
            name: 'Thesis',
            description: 'Has a clear thesis',
            weight: 0.5,
            descriptors: { Beginning: 'No thesis', Proficient: 'Clear thesis' },
          },
        ],
      })

      const response = await POST(req)
      const data = await response.json()

      expect(response.status).toBe(201)
      expect(data.title).toBe('Essay Rubric')
      expect(data.levels).toEqual(['Beginning', 'Developing', 'Proficient', 'Advanced'])
    })
  })
})
