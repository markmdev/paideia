import { describe, it, expect, vi, beforeEach } from 'vitest'
import {
  mockAuthSession,
  mockNoAuth,
  TEST_TEACHER,
  TEST_SPED_TEACHER,
  TEST_STUDENT,
  TEST_PARENT,
  createPostRequest,
} from '../helpers'

vi.mock('@/lib/auth', () => ({
  auth: vi.fn(),
}))

vi.mock('@/lib/ai/generate-exit-ticket', () => ({
  generateExitTicket: vi.fn().mockResolvedValue({
    title: 'Exit Ticket: Fractions',
    questions: [
      {
        questionText: 'What is 1/2 + 1/4?',
        questionType: 'multiple_choice',
        options: ['1/4', '3/4', '1/2', '2/4'],
        correctAnswer: '3/4',
        explanation: 'Find common denominator',
        targetSkill: 'Adding fractions',
      },
    ],
  }),
}))

import { POST } from '@/app/api/exit-tickets/generate/route'
import { auth } from '@/lib/auth'

describe('Exit Tickets API', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('POST /api/exit-tickets/generate', () => {
    it('returns 401 when not authenticated', async () => {
      mockNoAuth(vi.mocked(auth))
      const req = createPostRequest('/api/exit-tickets/generate', {
        topic: 'Fractions',
        gradeLevel: '4',
        subject: 'Math',
      })

      const response = await POST(req)
      const data = await response.json()
      expect(response.status).toBe(401)
      expect(data.error).toBe('Unauthorized')
    })

    it('returns 403 for student role', async () => {
      mockAuthSession(vi.mocked(auth), TEST_STUDENT)
      const req = createPostRequest('/api/exit-tickets/generate', {
        topic: 'Fractions',
        gradeLevel: '4',
        subject: 'Math',
      })

      const response = await POST(req)
      const data = await response.json()
      expect(response.status).toBe(403)
      expect(data.error).toContain('Only teachers')
    })

    it('returns 403 for parent role', async () => {
      mockAuthSession(vi.mocked(auth), TEST_PARENT)
      const req = createPostRequest('/api/exit-tickets/generate', {
        topic: 'Fractions',
        gradeLevel: '4',
        subject: 'Math',
      })

      const response = await POST(req)
      const data = await response.json()
      expect(response.status).toBe(403)
      expect(data.error).toContain('Only teachers')
    })

    it('returns 400 when required fields are missing', async () => {
      mockAuthSession(vi.mocked(auth), TEST_TEACHER)
      const req = createPostRequest('/api/exit-tickets/generate', {
        topic: 'Fractions',
      })

      const response = await POST(req)
      const data = await response.json()
      expect(response.status).toBe(400)
      expect(data.error).toContain('Missing required fields')
    })

    it('returns generated exit ticket for teacher', async () => {
      mockAuthSession(vi.mocked(auth), TEST_TEACHER)
      const req = createPostRequest('/api/exit-tickets/generate', {
        topic: 'Fractions',
        gradeLevel: '4',
        subject: 'Math',
        numberOfQuestions: 3,
      })

      const response = await POST(req)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.title).toBe('Exit Ticket: Fractions')
      expect(data.questions).toHaveLength(1)
      expect(data.questions[0].questionText).toBe('What is 1/2 + 1/4?')
      expect(data.questions[0].questionType).toBe('multiple_choice')
      expect(data.questions[0].correctAnswer).toBe('3/4')
      expect(data.questions[0].targetSkill).toBe('Adding fractions')
    })

    it('returns generated exit ticket for sped_teacher', async () => {
      mockAuthSession(vi.mocked(auth), TEST_SPED_TEACHER)
      const req = createPostRequest('/api/exit-tickets/generate', {
        topic: 'Reading Comprehension',
        gradeLevel: '6',
        subject: 'ELA',
      })

      const response = await POST(req)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.title).toBe('Exit Ticket: Fractions')
      expect(data.questions).toBeDefined()
      expect(data.questions).toHaveLength(1)
    })
  })
})
