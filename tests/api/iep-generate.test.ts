import { describe, it, expect, vi, beforeEach } from 'vitest'
import {
  mockAuthSession,
  mockNoAuth,
  TEST_SPED_TEACHER,
  TEST_STUDENT,
  TEST_PARENT,
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

vi.mock('@/lib/ai/iep-service', () => ({
  generatePresentLevels: vi.fn().mockResolvedValue({
    academicPerformance: 'DeShawn reads at a 5th-grade level...',
    functionalPerformance: 'DeShawn demonstrates strong verbal communication...',
    strengths: ['Strong verbal reasoning', 'Motivated learner'],
    areasOfNeed: ['Decoding multisyllabic words', 'Written expression'],
    impactOfDisability: 'DeShawn\'s SLD in reading impacts his ability to access grade-level texts independently.',
    baselineData: [
      { area: 'Reading Fluency', baseline: '85 wpm', source: 'curriculum-based measure' },
    ],
    draftNotice: 'DRAFT \u2014 Requires IEP Team Review',
    audit: { modelVersion: 'claude-opus-4-6', generatedAt: '2026-01-15T00:00:00Z' },
  }),
  generateIEPGoals: vi.fn().mockResolvedValue({
    goals: [
      {
        area: 'Reading Fluency',
        goalText: 'By the end of the annual IEP period, DeShawn will read grade-level passages at 110 wpm with 95% accuracy.',
        baseline: '85 wpm',
        target: '110 wpm',
        measureMethod: 'curriculum-based measure',
        frequency: 'bi-weekly',
        timeline: 'by the end of the annual IEP period',
        similarityFlag: false,
      },
    ],
    audit: { modelVersion: 'claude-opus-4-6', generatedAt: '2026-01-15T00:00:00Z' },
  }),
  generateAccommodations: vi.fn().mockResolvedValue({
    instructional: [{ accommodation: 'Chunked directions', rationale: 'Reduces cognitive load' }],
    assessment: [{ accommodation: 'Extended time (1.5x)', rationale: 'Allows processing time' }],
    environmental: [{ accommodation: 'Preferential seating', rationale: 'Reduces distractions' }],
    behavioral: [{ accommodation: 'Movement breaks', rationale: 'Supports self-regulation' }],
    audit: { modelVersion: 'claude-opus-4-6', generatedAt: '2026-01-15T00:00:00Z' },
  }),
}))

import { POST as generatePresentLevels } from '@/app/api/iep/generate/present-levels/route'
import { POST as generateGoals } from '@/app/api/iep/generate/goals/route'
import { POST as generateAccommodations } from '@/app/api/iep/generate/accommodations/route'
import { auth } from '@/lib/auth'

describe('IEP AI Generation Endpoints', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    selectCallIndex = 0
    selectResults = [[]]
    insertResult = []
  })

  // ---------------------------------------------------------------------------
  // POST /api/iep/generate/present-levels
  // ---------------------------------------------------------------------------

  describe('POST /api/iep/generate/present-levels', () => {
    const validBody = {
      studentId: 'student-001',
      teacherObservations: 'DeShawn participates actively in class discussions.',
      classroomPerformance: 'Struggles with independent reading tasks.',
      disabilityCategory: 'SLD',
      gradeLevel: '10',
    }

    it('returns 401 when not authenticated', async () => {
      mockNoAuth(vi.mocked(auth))
      const req = createPostRequest('/api/iep/generate/present-levels', validBody)

      const response = await generatePresentLevels(req)
      const data = await response.json()
      expect(response.status).toBe(401)
      expect(data.error).toBe('Unauthorized')
    })

    it('returns 403 for student role', async () => {
      mockAuthSession(vi.mocked(auth), TEST_STUDENT)
      const req = createPostRequest('/api/iep/generate/present-levels', validBody)

      const response = await generatePresentLevels(req)
      const data = await response.json()
      expect(response.status).toBe(403)
      expect(data.error).toContain('Forbidden')
    })

    it('returns 403 for parent role', async () => {
      mockAuthSession(vi.mocked(auth), TEST_PARENT)
      const req = createPostRequest('/api/iep/generate/present-levels', validBody)

      const response = await generatePresentLevels(req)
      const data = await response.json()
      expect(response.status).toBe(403)
      expect(data.error).toContain('Forbidden')
    })

    it('returns 201 with AI-generated present levels for SPED teacher', async () => {
      mockAuthSession(vi.mocked(auth), TEST_SPED_TEACHER)

      // 1. Student lookup returns a student
      // 2. Mastery records query
      selectResults = [
        [{ id: 'student-001', name: 'DeShawn Williams' }],
        [{ level: 'developing', score: 65, standardCode: 'RL.10.1', standardDescription: 'Cite textual evidence' }],
      ]

      const req = createPostRequest('/api/iep/generate/present-levels', validBody)
      const response = await generatePresentLevels(req)
      const data = await response.json()

      expect(response.status).toBe(201)
      expect(data.academicPerformance).toBeDefined()
      expect(data.strengths).toBeInstanceOf(Array)
      expect(data.areasOfNeed).toBeInstanceOf(Array)
      expect(data.impactOfDisability).toBeDefined()
      expect(data.baselineData).toBeInstanceOf(Array)
      expect(data.draftNotice).toContain('DRAFT')
      expect(data.audit.modelVersion).toBe('claude-opus-4-6')
    })
  })

  // ---------------------------------------------------------------------------
  // POST /api/iep/generate/goals
  // ---------------------------------------------------------------------------

  describe('POST /api/iep/generate/goals', () => {
    const validBody = {
      iepId: 'iep-001',
      area: 'Reading',
      gradeLevel: '10',
      subject: 'ELA',
    }

    it('returns 401 when not authenticated', async () => {
      mockNoAuth(vi.mocked(auth))
      const req = createPostRequest('/api/iep/generate/goals', validBody)

      const response = await generateGoals(req)
      const data = await response.json()
      expect(response.status).toBe(401)
      expect(data.error).toBe('Unauthorized')
    })

    it('returns 403 for student role', async () => {
      mockAuthSession(vi.mocked(auth), TEST_STUDENT)
      const req = createPostRequest('/api/iep/generate/goals', validBody)

      const response = await generateGoals(req)
      const data = await response.json()
      expect(response.status).toBe(403)
      expect(data.error).toContain('Forbidden')
    })

    it('returns 201 with AI-generated goals for SPED teacher', async () => {
      mockAuthSession(vi.mocked(auth), TEST_SPED_TEACHER)

      // 1. IEP lookup (verified by authorId for sped_teacher)
      // 2. Existing caseload goals query
      selectResults = [
        [{
          id: 'iep-001',
          studentId: 'student-001',
          authorId: TEST_SPED_TEACHER.id,
          disabilityCategory: 'SLD',
          presentLevels: 'DeShawn reads at a 5th-grade level.',
          accommodations: null,
          status: 'draft',
        }],
        [{ goalText: 'Prior goal from another IEP on this caseload.' }],
      ]

      const req = createPostRequest('/api/iep/generate/goals', validBody)
      const response = await generateGoals(req)
      const data = await response.json()

      expect(response.status).toBe(201)
      expect(data.goals).toBeInstanceOf(Array)
      expect(data.goals).toHaveLength(1)
      expect(data.goals[0].area).toBe('Reading Fluency')
      expect(data.goals[0].goalText).toBeDefined()
      expect(data.goals[0].baseline).toBe('85 wpm')
      expect(data.goals[0].target).toBe('110 wpm')
      expect(data.goals[0].similarityFlag).toBe(false)
      expect(data.audit.modelVersion).toBe('claude-opus-4-6')
    })
  })

  // ---------------------------------------------------------------------------
  // POST /api/iep/generate/accommodations
  // ---------------------------------------------------------------------------

  describe('POST /api/iep/generate/accommodations', () => {
    const validBody = { iepId: 'iep-001' }

    it('returns 401 when not authenticated', async () => {
      mockNoAuth(vi.mocked(auth))
      const req = createPostRequest('/api/iep/generate/accommodations', validBody)

      const response = await generateAccommodations(req)
      const data = await response.json()
      expect(response.status).toBe(401)
      expect(data.error).toBe('Unauthorized')
    })

    it('returns 403 for parent role', async () => {
      mockAuthSession(vi.mocked(auth), TEST_PARENT)
      const req = createPostRequest('/api/iep/generate/accommodations', validBody)

      const response = await generateAccommodations(req)
      const data = await response.json()
      expect(response.status).toBe(403)
      expect(data.error).toContain('Forbidden')
    })

    it('returns 201 with AI-generated accommodations for SPED teacher', async () => {
      mockAuthSession(vi.mocked(auth), TEST_SPED_TEACHER)

      // 1. IEP lookup
      selectResults = [
        [{
          id: 'iep-001',
          studentId: 'student-001',
          authorId: TEST_SPED_TEACHER.id,
          disabilityCategory: 'SLD',
          presentLevels: 'DeShawn reads at a 5th-grade level.',
          accommodations: null,
          status: 'draft',
        }],
      ]

      const req = createPostRequest('/api/iep/generate/accommodations', validBody)
      const response = await generateAccommodations(req)
      const data = await response.json()

      expect(response.status).toBe(201)
      expect(data.instructional).toBeInstanceOf(Array)
      expect(data.instructional[0].accommodation).toBe('Chunked directions')
      expect(data.assessment).toBeInstanceOf(Array)
      expect(data.assessment[0].accommodation).toBe('Extended time (1.5x)')
      expect(data.environmental).toBeInstanceOf(Array)
      expect(data.behavioral).toBeInstanceOf(Array)
      expect(data.audit.modelVersion).toBe('claude-opus-4-6')
    })
  })
})
