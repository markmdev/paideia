import { describe, it, expect, vi, beforeEach } from 'vitest'
import {
  mockAuthSession,
  mockNoAuth,
  TEST_PARENT,
  TEST_TEACHER,
  TEST_STUDENT,
  TEST_ADMIN,
  TEST_SPED_TEACHER,
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

import { GET } from '@/app/api/parent/children/[childId]/route'
import { auth } from '@/lib/auth'

function makeParams(childId: string) {
  return { params: Promise.resolve({ childId }) }
}

describe('Parent Children Detail API', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    selectCallIndex = 0
    selectResults = [[]]
  })

  describe('GET /api/parent/children/[childId]', () => {
    it('returns 401 when not authenticated', async () => {
      mockNoAuth(vi.mocked(auth))
      const req = new Request('http://localhost:3000/api/parent/children/child-1')
      const response = await GET(req, makeParams('child-1'))
      const data = await response.json()
      expect(response.status).toBe(401)
      expect(data.error).toBe('Unauthorized')
    })

    it('returns 403 when user is a teacher', async () => {
      mockAuthSession(vi.mocked(auth), TEST_TEACHER)
      const req = new Request('http://localhost:3000/api/parent/children/child-1')
      const response = await GET(req, makeParams('child-1'))
      const data = await response.json()
      expect(response.status).toBe(403)
      expect(data.error).toBe('Forbidden')
    })

    it('returns 403 when user is a student', async () => {
      mockAuthSession(vi.mocked(auth), TEST_STUDENT)
      const req = new Request('http://localhost:3000/api/parent/children/child-1')
      const response = await GET(req, makeParams('child-1'))
      const data = await response.json()
      expect(response.status).toBe(403)
      expect(data.error).toBe('Forbidden')
    })

    it('returns 403 when user is an admin', async () => {
      mockAuthSession(vi.mocked(auth), TEST_ADMIN)
      const req = new Request('http://localhost:3000/api/parent/children/child-1')
      const response = await GET(req, makeParams('child-1'))
      const data = await response.json()
      expect(response.status).toBe(403)
      expect(data.error).toBe('Forbidden')
    })

    it('returns 403 when child is not linked to this parent', async () => {
      mockAuthSession(vi.mocked(auth), TEST_PARENT)
      // parentChildren link query returns empty
      selectResults = [
        [],
      ]

      const req = new Request('http://localhost:3000/api/parent/children/other-child')
      const response = await GET(req, makeParams('other-child'))
      const data = await response.json()
      expect(response.status).toBe(403)
      expect(data.error).toBe('Child not found or not authorized')
    })

    it('returns 404 when child user record does not exist', async () => {
      mockAuthSession(vi.mocked(auth), TEST_PARENT)
      // parentChildren link exists
      // child user lookup returns empty
      selectResults = [
        [{ parentId: TEST_PARENT.id, childId: 'ghost-child' }],
        [],
      ]

      const req = new Request('http://localhost:3000/api/parent/children/ghost-child')
      const response = await GET(req, makeParams('ghost-child'))
      const data = await response.json()
      expect(response.status).toBe(404)
      expect(data.error).toBe('Child not found')
    })

    it('returns child details with enrollments, submissions, and mastery', async () => {
      mockAuthSession(vi.mocked(auth), TEST_PARENT)

      const childId = 'student-001'

      const mockLink = { parentId: TEST_PARENT.id, childId }

      const mockChild = {
        id: childId,
        name: 'Aisha Torres',
        email: 'aisha@student.edu',
      }

      const mockEnrollments = [
        {
          classId: 'class-1',
          className: '8th ELA',
          subject: 'ELA',
          gradeLevel: '8',
          period: '1',
        },
        {
          classId: 'class-2',
          className: '8th Math',
          subject: 'Math',
          gradeLevel: '8',
          period: '3',
        },
      ]

      const mockSubmissions = [
        {
          id: 'sub-1',
          assignmentTitle: 'Essay on The American Dream',
          subject: 'ELA',
          totalScore: 92,
          maxScore: 100,
          letterGrade: 'A',
          status: 'graded',
          submittedAt: new Date('2026-01-15'),
          gradedAt: new Date('2026-01-16'),
        },
        {
          id: 'sub-2',
          assignmentTitle: 'Linear Equations Quiz',
          subject: 'Math',
          totalScore: 65,
          maxScore: 100,
          letterGrade: 'D',
          status: 'graded',
          submittedAt: new Date('2026-01-14'),
          gradedAt: new Date('2026-01-15'),
        },
      ]

      const mockFeedback = [
        {
          submissionId: 'sub-1',
          strengths: '["Clear thesis statement","Well-organized paragraphs"]',
          improvements: '["Analyze evidence rather than summarize"]',
          finalFeedback: 'Strong essay with room for deeper analysis.',
        },
        {
          submissionId: 'sub-2',
          strengths: '["Correct setup of equations"]',
          improvements: '["Check sign errors","Show all work"]',
          finalFeedback: null,
        },
      ]

      const mockMastery = [
        {
          standardId: 'std-1',
          standardCode: 'ELA.W.8.1',
          standardDescription: 'Write arguments to support claims',
          subject: 'ELA',
          level: 'proficient',
          score: 85,
          assessedAt: new Date('2026-01-16'),
        },
        {
          standardId: 'std-2',
          standardCode: 'MATH.8.EE.7',
          standardDescription: 'Solve linear equations',
          subject: 'Math',
          level: 'developing',
          score: 62,
          assessedAt: new Date('2026-01-15'),
        },
      ]

      // Query order: link, child, enrollments, submissions, feedback, mastery
      selectResults = [
        [mockLink],
        [mockChild],
        mockEnrollments,
        mockSubmissions,
        mockFeedback,
        mockMastery,
      ]

      const req = new Request(`http://localhost:3000/api/parent/children/${childId}`)
      const response = await GET(req, makeParams(childId))
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.child.id).toBe(childId)
      expect(data.child.name).toBe('Aisha Torres')
      expect(data.child.email).toBe('aisha@student.edu')
      expect(data.child.gradeLevel).toBe('8')
      expect(data.enrolledClasses).toHaveLength(2)
      expect(data.enrolledClasses[0].className).toBe('8th ELA')
      expect(data.enrolledClasses[1].subject).toBe('Math')
      expect(data.recentSubmissions).toHaveLength(2)
      expect(data.recentSubmissions[0].assignmentTitle).toBe('Essay on The American Dream')
      expect(data.recentSubmissions[0].feedback.strengths).toEqual([
        'Clear thesis statement',
        'Well-organized paragraphs',
      ])
      expect(data.recentSubmissions[0].feedback.improvements).toEqual([
        'Analyze evidence rather than summarize',
      ])
      expect(data.recentSubmissions[0].feedback.summary).toBe(
        'Strong essay with room for deeper analysis.'
      )
      expect(data.mastery).toHaveProperty('ELA')
      expect(data.mastery).toHaveProperty('Math')
      expect(data.mastery.ELA[0].standard).toBe('ELA.W.8.1')
      expect(data.mastery.ELA[0].level).toBe('proficient')
      expect(data.mastery.Math[0].standard).toBe('MATH.8.EE.7')
      expect(data.mastery.Math[0].level).toBe('developing')
    })

    it('returns child with no submissions and no mastery data', async () => {
      mockAuthSession(vi.mocked(auth), TEST_PARENT)

      const childId = 'student-new'

      selectResults = [
        [{ parentId: TEST_PARENT.id, childId }],
        [{ id: childId, name: 'New Student', email: 'new@student.edu' }],
        [{ classId: 'c1', className: 'Intro Art', subject: 'Art', gradeLevel: '6', period: '2' }],
        [],  // no submissions
        // feedback query is skipped when gradedIds is empty
        [],  // no mastery
      ]

      const req = new Request(`http://localhost:3000/api/parent/children/${childId}`)
      const response = await GET(req, makeParams(childId))
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.child.name).toBe('New Student')
      expect(data.child.gradeLevel).toBe('6')
      expect(data.enrolledClasses).toHaveLength(1)
      expect(data.recentSubmissions).toHaveLength(0)
      expect(data.mastery).toEqual({})
    })

    it('prevents a different parent from accessing another parents child', async () => {
      const otherParent = {
        id: 'parent-999',
        role: 'parent' as const,
        email: 'other.parent@email.com',
        name: 'Other Parent',
      }
      mockAuthSession(vi.mocked(auth), otherParent)
      // Link query returns empty because this parent is not linked to the child
      selectResults = [
        [],
      ]

      const req = new Request('http://localhost:3000/api/parent/children/student-001')
      const response = await GET(req, makeParams('student-001'))
      const data = await response.json()
      expect(response.status).toBe(403)
      expect(data.error).toBe('Child not found or not authorized')
    })
  })
})
