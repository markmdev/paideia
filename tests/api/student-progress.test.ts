import { describe, it, expect, vi, beforeEach } from 'vitest'
import {
  mockAuthSession,
  mockNoAuth,
  TEST_STUDENT,
  TEST_TEACHER,
  TEST_PARENT,
  TEST_ADMIN,
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

import { GET } from '@/app/api/student/progress/route'
import { auth } from '@/lib/auth'

describe('Student Progress API', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    selectCallIndex = 0
    selectResults = [[]]
  })

  describe('GET /api/student/progress', () => {
    it('returns 401 when not authenticated', async () => {
      mockNoAuth(vi.mocked(auth))
      const response = await GET()
      const data = await response.json()
      expect(response.status).toBe(401)
      expect(data.error).toBe('Unauthorized')
    })

    it('returns 403 for teacher role', async () => {
      mockAuthSession(vi.mocked(auth), TEST_TEACHER)
      const response = await GET()
      const data = await response.json()
      expect(response.status).toBe(403)
      expect(data.error).toContain('student role required')
    })

    it('returns 403 for parent role', async () => {
      mockAuthSession(vi.mocked(auth), TEST_PARENT)
      const response = await GET()
      const data = await response.json()
      expect(response.status).toBe(403)
      expect(data.error).toContain('student role required')
    })

    it('returns 403 for admin role', async () => {
      mockAuthSession(vi.mocked(auth), TEST_ADMIN)
      const response = await GET()
      const data = await response.json()
      expect(response.status).toBe(403)
      expect(data.error).toContain('student role required')
    })

    it('returns progress data for student', async () => {
      mockAuthSession(vi.mocked(auth), TEST_STUDENT)

      const now = new Date()

      // The route makes 5 sequential db.select() calls:
      // 1. masteryData (innerJoin standards)
      // 2. subjectAverages (innerJoin standards, groupBy)
      // 3. recentSubmissions (innerJoin assignments)
      // 4. totalGraded (count)
      // 5. overallAvgResult (avg)
      selectResults = [
        // 1. masteryData
        [
          {
            subject: 'ELA',
            level: 'proficient',
            score: 85,
            assessedAt: now,
            standardId: 'std-1',
            standardDescription: 'Cite textual evidence',
          },
          {
            subject: 'ELA',
            level: 'developing',
            score: 55,
            assessedAt: new Date(now.getTime() - 86400000),
            standardId: 'std-2',
            standardDescription: 'Analyze central ideas',
          },
          {
            subject: 'Math',
            level: 'proficient',
            score: 82,
            assessedAt: now,
            standardId: 'std-3',
            standardDescription: 'Solve linear equations',
          },
        ],
        // 2. subjectAverages
        [
          { subject: 'ELA', avgScore: '70' },
          { subject: 'Math', avgScore: '82' },
        ],
        // 3. recentSubmissions
        [
          {
            assignmentTitle: 'Essay Assignment',
            subject: 'ELA',
            totalScore: 85,
            maxScore: 100,
            submittedAt: now,
            gradedAt: now,
          },
        ],
        // 4. totalGraded
        [{ total: 5 }],
        // 5. overallAvgResult
        [{ avgScore: '78' }],
      ]

      const response = await GET()
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.overallAverage).toBe(78)
      expect(data.totalCompleted).toBe(5)
      expect(data.masteryTrend).toBe('stable')
      expect(data.subjectMastery).toHaveLength(2)
      expect(data.recentSubmissions).toHaveLength(1)
      expect(data.recentSubmissions[0].assignmentTitle).toBe('Essay Assignment')
      expect(data.recentSubmissions[0].score).toBe(85)
      expect(data.strengths).toBeDefined()
      expect(data.areasForGrowth).toBeDefined()
    })

    it('returns correct structure with all expected fields', async () => {
      mockAuthSession(vi.mocked(auth), TEST_STUDENT)

      const now = new Date()
      const olderDate = new Date(now.getTime() - 7 * 86400000)

      // Build mastery data with enough records to trigger trend calculation (>= 4)
      selectResults = [
        // 1. masteryData (ordered by assessedAt desc)
        [
          { subject: 'ELA', level: 'proficient', score: 90, assessedAt: now, standardId: 'std-1', standardDescription: 'Cite textual evidence' },
          { subject: 'ELA', level: 'proficient', score: 88, assessedAt: now, standardId: 'std-2', standardDescription: 'Determine theme' },
          { subject: 'ELA', level: 'developing', score: 50, assessedAt: olderDate, standardId: 'std-3', standardDescription: 'Analyze central ideas' },
          { subject: 'Math', level: 'beginning', score: 40, assessedAt: olderDate, standardId: 'std-4', standardDescription: 'Solve linear equations' },
        ],
        // 2. subjectAverages
        [
          { subject: 'ELA', avgScore: '76' },
          { subject: 'Math', avgScore: '40' },
        ],
        // 3. recentSubmissions
        [
          {
            assignmentTitle: 'Essay',
            subject: 'ELA',
            totalScore: 90,
            maxScore: 100,
            submittedAt: now,
            gradedAt: now,
          },
          {
            assignmentTitle: 'Math Quiz',
            subject: 'Math',
            totalScore: 40,
            maxScore: 100,
            submittedAt: olderDate,
            gradedAt: olderDate,
          },
        ],
        // 4. totalGraded
        [{ total: 10 }],
        // 5. overallAvgResult
        [{ avgScore: '65' }],
      ]

      const response = await GET()
      const data = await response.json()

      expect(response.status).toBe(200)

      // Verify all top-level fields exist
      expect(data).toHaveProperty('overallAverage')
      expect(data).toHaveProperty('totalCompleted')
      expect(data).toHaveProperty('masteryTrend')
      expect(data).toHaveProperty('subjectMastery')
      expect(data).toHaveProperty('recentSubmissions')
      expect(data).toHaveProperty('strengths')
      expect(data).toHaveProperty('areasForGrowth')

      // Verify types
      expect(typeof data.overallAverage).toBe('number')
      expect(typeof data.totalCompleted).toBe('number')
      expect(['improving', 'stable', 'declining']).toContain(data.masteryTrend)
      expect(Array.isArray(data.subjectMastery)).toBe(true)
      expect(Array.isArray(data.recentSubmissions)).toBe(true)
      expect(Array.isArray(data.strengths)).toBe(true)
      expect(Array.isArray(data.areasForGrowth)).toBe(true)

      // Verify computed values
      expect(data.overallAverage).toBe(65)
      expect(data.totalCompleted).toBe(10)

      // Mastery trend: recent half avg = (90+88)/2 = 89, older half avg = (50+40)/2 = 45
      // diff = 89 - 45 = 44 > 5, so trend = 'improving'
      expect(data.masteryTrend).toBe('improving')

      // Strengths: scores >= 80 -> std-1 (90), std-2 (88)
      expect(data.strengths).toContain('Cite textual evidence')
      expect(data.strengths).toContain('Determine theme')

      // Areas for growth: scores < 60 -> std-3 (50), std-4 (40)
      expect(data.areasForGrowth).toContain('Analyze central ideas')
      expect(data.areasForGrowth).toContain('Solve linear equations')

      // Subject mastery structure
      for (const sm of data.subjectMastery) {
        expect(sm).toHaveProperty('subject')
        expect(sm).toHaveProperty('masteryLevel')
        expect(sm).toHaveProperty('score')
      }

      // Recent submissions structure
      for (const rs of data.recentSubmissions) {
        expect(rs).toHaveProperty('assignmentTitle')
        expect(rs).toHaveProperty('subject')
        expect(rs).toHaveProperty('score')
        expect(rs).toHaveProperty('submittedAt')
      }
    })

    it('returns null overallAverage when no graded submissions exist', async () => {
      mockAuthSession(vi.mocked(auth), TEST_STUDENT)

      selectResults = [
        [], // masteryData: empty
        [], // subjectAverages: empty
        [], // recentSubmissions: empty
        [{ total: 0 }], // totalGraded: 0
        [{ avgScore: null }], // overallAvgResult: null
      ]

      const response = await GET()
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.overallAverage).toBeNull()
      expect(data.totalCompleted).toBe(0)
      expect(data.masteryTrend).toBe('stable')
      expect(data.subjectMastery).toEqual([])
      expect(data.recentSubmissions).toEqual([])
      expect(data.strengths).toEqual([])
      expect(data.areasForGrowth).toEqual([])
    })
  })
})
