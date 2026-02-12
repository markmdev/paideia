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

vi.mock('@/lib/ai/generate-quiz', () => ({
  generateQuiz: vi.fn().mockResolvedValue({
    title: 'Test Quiz',
    questions: [
      {
        type: 'multiple_choice',
        questionText: 'What is 2+2?',
        options: ['3', '4', '5', '6'],
        correctAnswer: '4',
        explanation: 'Basic addition',
        bloomsLevel: 'remember',
        points: 10,
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

import { GET } from '@/app/api/quizzes/route'
import { POST } from '@/app/api/quizzes/generate/route'
import { auth } from '@/lib/auth'

describe('Quizzes API', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    selectCallIndex = 0
    selectResults = [[]]
    insertResult = []
  })

  describe('GET /api/quizzes', () => {
    it('returns 401 when not authenticated', async () => {
      mockNoAuth(vi.mocked(auth))
      const response = await GET()
      const data = await response.json()
      expect(response.status).toBe(401)
      expect(data.error).toBe('Unauthorized')
    })

    it('returns quiz list for authenticated teacher', async () => {
      mockAuthSession(vi.mocked(auth), TEST_TEACHER)

      const mockQuizzes = [
        {
          id: 'q1',
          title: 'Math Quiz: Fractions',
          subject: 'Math',
          gradeLevel: '4',
          standards: 'CCSS.MATH.4.NF',
          createdAt: new Date('2026-01-15'),
        },
      ]

      const mockQuestions = [
        { quizId: 'q1' },
        { quizId: 'q1' },
        { quizId: 'q1' },
      ]

      // GET quizzes route: 1. select quizzes, 2. select quizQuestions
      selectResults = [mockQuizzes, mockQuestions]

      const response = await GET()
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data).toHaveLength(1)
      expect(data[0].title).toBe('Math Quiz: Fractions')
      expect(data[0].questionCount).toBe(3)
    })

    it('returns empty array when no quizzes exist', async () => {
      mockAuthSession(vi.mocked(auth), TEST_TEACHER)
      selectResults = [[]]

      const response = await GET()
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data).toEqual([])
    })
  })

  describe('POST /api/quizzes/generate', () => {
    it('returns 401 when not authenticated', async () => {
      mockNoAuth(vi.mocked(auth))
      const req = createPostRequest('/api/quizzes/generate', {
        topic: 'Fractions',
        gradeLevel: '4',
        subject: 'Math',
      })

      const response = await POST(req)
      const data = await response.json()
      expect(response.status).toBe(401)
      expect(data.error).toBe('Unauthorized')
    })

    it('returns 400 when required fields are missing', async () => {
      mockAuthSession(vi.mocked(auth), TEST_TEACHER)
      const req = createPostRequest('/api/quizzes/generate', {
        topic: 'Fractions',
      })

      const response = await POST(req)
      const data = await response.json()
      expect(response.status).toBe(400)
      expect(data.error).toContain('Missing required fields')
    })

    it('returns 400 when topic is missing', async () => {
      mockAuthSession(vi.mocked(auth), TEST_TEACHER)
      const req = createPostRequest('/api/quizzes/generate', {
        gradeLevel: '4',
        subject: 'Math',
      })

      const response = await POST(req)
      const data = await response.json()
      expect(response.status).toBe(400)
      expect(data.error).toContain('Missing required fields')
    })

    it('returns generated quiz for teacher', async () => {
      mockAuthSession(vi.mocked(auth), TEST_TEACHER)

      const createdQuiz = {
        id: 'quiz-001',
        title: 'Test Quiz',
        subject: 'Math',
        gradeLevel: '4',
        standards: null,
      }

      const createdQuestions = [
        {
          id: 'qq-001',
          quizId: 'quiz-001',
          type: 'multiple_choice',
          questionText: 'What is 2+2?',
          options: JSON.stringify(['3', '4', '5', '6']),
          correctAnswer: '4',
          explanation: 'Basic addition',
          bloomsLevel: 'remember',
          points: 10,
          orderIndex: 0,
        },
      ]

      // The generate route does: insert quiz, insert questions
      // Both use db.insert().values().returning()
      // The mock returns insertResult for both calls
      // We need the first insert to return createdQuiz and the second to return createdQuestions
      let insertCallIndex = 0
      const insertResults = [[createdQuiz], createdQuestions]

      const { db } = await import('@/lib/db')
      vi.mocked(db.insert).mockImplementation(() => {
        const result = insertResults[insertCallIndex] ?? []
        insertCallIndex++
        return createChainMock(result) as any
      })

      const req = createPostRequest('/api/quizzes/generate', {
        topic: 'Fractions',
        gradeLevel: '4',
        subject: 'Math',
      })

      const response = await POST(req)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.quiz).toBeDefined()
      expect(data.quiz.id).toBe('quiz-001')
      expect(data.quiz.title).toBe('Test Quiz')
      expect(data.questions).toBeDefined()
      expect(data.questions).toHaveLength(1)
      expect(data.questions[0].questionText).toBe('What is 2+2?')
      expect(data.questions[0].options).toEqual(['3', '4', '5', '6'])
    })
  })
})
