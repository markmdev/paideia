import { describe, it, expect, vi, beforeEach } from 'vitest'
import {
  mockAuthSession,
  mockNoAuth,
  TEST_TEACHER,
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

import { GET, POST } from '@/app/api/lesson-plans/route'
import { auth } from '@/lib/auth'

describe('Lesson Plans API', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    selectResult = []
    insertResult = []
  })

  describe('GET /api/lesson-plans', () => {
    it('returns 401 when not authenticated', async () => {
      mockNoAuth(vi.mocked(auth))
      const response = await GET()
      const data = await response.json()
      expect(response.status).toBe(401)
      expect(data.error).toBe('Unauthorized')
    })

    it('returns lesson plans for authenticated teacher', async () => {
      mockAuthSession(vi.mocked(auth), TEST_TEACHER)

      const mockPlans = [
        {
          id: 'lp-1',
          title: 'Introduction to Persuasive Writing',
          subject: 'ELA',
          gradeLevel: '8',
          duration: '45 min',
          standards: JSON.stringify(['CCSS.ELA-LITERACY.W.8.1']),
          objectives: JSON.stringify(['Students will write a persuasive paragraph']),
          warmUp: 'Debate warm-up',
          directInstruction: 'Model persuasive techniques',
          guidedPractice: 'Group writing exercise',
          independentPractice: 'Solo paragraph',
          closure: 'Share and reflect',
          materials: JSON.stringify(['Whiteboard', 'Handouts']),
          differentiation: JSON.stringify({ below: 'Sentence starters', above: 'Extended essay' }),
          assessmentPlan: 'Rubric-based grading',
          teacherId: TEST_TEACHER.id,
          aiMetadata: JSON.stringify({ model: 'claude-opus-4-6' }),
          createdAt: new Date('2026-01-15'),
          updatedAt: new Date('2026-01-15'),
        },
      ]
      selectResult = mockPlans

      const response = await GET()
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data).toHaveLength(1)
      expect(data[0].title).toBe('Introduction to Persuasive Writing')
      expect(data[0].standards).toEqual(['CCSS.ELA-LITERACY.W.8.1'])
      expect(data[0].objectives).toEqual(['Students will write a persuasive paragraph'])
      expect(data[0].materials).toEqual(['Whiteboard', 'Handouts'])
      expect(data[0].differentiation).toEqual({ below: 'Sentence starters', above: 'Extended essay' })
      expect(data[0].aiMetadata).toEqual({ model: 'claude-opus-4-6' })
    })

    it('returns empty array when no lesson plans exist', async () => {
      mockAuthSession(vi.mocked(auth), TEST_TEACHER)
      selectResult = []

      const response = await GET()
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data).toEqual([])
    })

    it('handles plans with null optional fields', async () => {
      mockAuthSession(vi.mocked(auth), TEST_TEACHER)

      const mockPlans = [
        {
          id: 'lp-2',
          title: 'Quick Lesson',
          subject: 'Math',
          gradeLevel: '5',
          duration: null,
          standards: null,
          objectives: JSON.stringify(['Learn fractions']),
          warmUp: null,
          directInstruction: null,
          guidedPractice: null,
          independentPractice: null,
          closure: null,
          materials: null,
          differentiation: null,
          assessmentPlan: null,
          teacherId: TEST_TEACHER.id,
          aiMetadata: null,
          createdAt: new Date('2026-02-01'),
          updatedAt: new Date('2026-02-01'),
        },
      ]
      selectResult = mockPlans

      const response = await GET()
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data).toHaveLength(1)
      expect(data[0].standards).toEqual([])
      expect(data[0].materials).toEqual([])
      expect(data[0].differentiation).toBeNull()
      expect(data[0].aiMetadata).toBeNull()
    })
  })

  describe('POST /api/lesson-plans', () => {
    it('returns 401 when not authenticated', async () => {
      mockNoAuth(vi.mocked(auth))
      const req = createPostRequest('/api/lesson-plans', {
        title: 'Test Plan',
        subject: 'ELA',
        gradeLevel: '8',
        objectives: ['Write an essay'],
      })

      const response = await POST(req)
      const data = await response.json()
      expect(response.status).toBe(401)
      expect(data.error).toBe('Unauthorized')
    })

    it('returns 400 when required fields are missing', async () => {
      mockAuthSession(vi.mocked(auth), TEST_TEACHER)
      const req = createPostRequest('/api/lesson-plans', {
        title: 'Incomplete Plan',
      })

      const response = await POST(req)
      const data = await response.json()
      expect(response.status).toBe(400)
      expect(data.error).toContain('Missing required fields')
    })

    it('returns 400 when title is missing', async () => {
      mockAuthSession(vi.mocked(auth), TEST_TEACHER)
      const req = createPostRequest('/api/lesson-plans', {
        subject: 'ELA',
        gradeLevel: '8',
        objectives: ['Write an essay'],
      })

      const response = await POST(req)
      const data = await response.json()
      expect(response.status).toBe(400)
      expect(data.error).toContain('Missing required fields')
    })

    it('creates a lesson plan with all fields', async () => {
      mockAuthSession(vi.mocked(auth), TEST_TEACHER)

      const createdPlan = {
        id: 'new-lp-1',
        title: 'Persuasive Writing',
        subject: 'ELA',
        gradeLevel: '8',
        duration: '45 min',
        standards: JSON.stringify(['CCSS.ELA-LITERACY.W.8.1']),
        objectives: JSON.stringify(['Write a persuasive paragraph']),
        warmUp: 'Quick debate',
        directInstruction: 'Model techniques',
        guidedPractice: 'Partner work',
        independentPractice: 'Solo writing',
        closure: 'Gallery walk',
        materials: JSON.stringify(['Handouts', 'Rubric']),
        differentiation: JSON.stringify({ below: 'Sentence starters', above: 'Extended response' }),
        assessmentPlan: 'Rubric scoring',
        teacherId: TEST_TEACHER.id,
        aiMetadata: JSON.stringify({ model: 'claude-opus-4-6' }),
        createdAt: new Date('2026-02-10'),
        updatedAt: new Date('2026-02-10'),
      }
      insertResult = [createdPlan]

      const req = createPostRequest('/api/lesson-plans', {
        title: 'Persuasive Writing',
        subject: 'ELA',
        gradeLevel: '8',
        duration: '45 min',
        standards: ['CCSS.ELA-LITERACY.W.8.1'],
        objectives: ['Write a persuasive paragraph'],
        warmUp: 'Quick debate',
        directInstruction: 'Model techniques',
        guidedPractice: 'Partner work',
        independentPractice: 'Solo writing',
        closure: 'Gallery walk',
        materials: ['Handouts', 'Rubric'],
        differentiation: { below: 'Sentence starters', above: 'Extended response' },
        assessmentPlan: 'Rubric scoring',
        aiMetadata: { model: 'claude-opus-4-6' },
      })

      const response = await POST(req)
      const data = await response.json()

      expect(response.status).toBe(201)
      expect(data.id).toBe('new-lp-1')
      expect(data.title).toBe('Persuasive Writing')
      expect(data.standards).toEqual(['CCSS.ELA-LITERACY.W.8.1'])
      expect(data.objectives).toEqual(['Write a persuasive paragraph'])
      expect(data.materials).toEqual(['Handouts', 'Rubric'])
      expect(data.differentiation).toEqual({ below: 'Sentence starters', above: 'Extended response' })
      expect(data.aiMetadata).toEqual({ model: 'claude-opus-4-6' })
    })

    it('creates a lesson plan with only required fields', async () => {
      mockAuthSession(vi.mocked(auth), TEST_TEACHER)

      const createdPlan = {
        id: 'new-lp-2',
        title: 'Basic Math',
        subject: 'Math',
        gradeLevel: '5',
        duration: null,
        standards: null,
        objectives: JSON.stringify(['Learn addition']),
        warmUp: null,
        directInstruction: null,
        guidedPractice: null,
        independentPractice: null,
        closure: null,
        materials: null,
        differentiation: null,
        assessmentPlan: null,
        teacherId: TEST_TEACHER.id,
        aiMetadata: null,
        createdAt: new Date('2026-02-10'),
        updatedAt: new Date('2026-02-10'),
      }
      insertResult = [createdPlan]

      const req = createPostRequest('/api/lesson-plans', {
        title: 'Basic Math',
        subject: 'Math',
        gradeLevel: '5',
        objectives: ['Learn addition'],
      })

      const response = await POST(req)
      const data = await response.json()

      expect(response.status).toBe(201)
      expect(data.id).toBe('new-lp-2')
      expect(data.title).toBe('Basic Math')
      expect(data.standards).toEqual([])
      expect(data.materials).toEqual([])
      expect(data.differentiation).toBeNull()
      expect(data.aiMetadata).toBeNull()
    })
  })
})
