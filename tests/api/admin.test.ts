import { describe, it, expect, vi, beforeEach } from 'vitest'
import {
  mockAuthSession,
  mockNoAuth,
  TEST_ADMIN,
  TEST_TEACHER,
  TEST_STUDENT,
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

import { GET as overviewGET } from '@/app/api/admin/overview/route'
import { GET as analyticsGET } from '@/app/api/admin/analytics/route'
import { GET as schoolsGET } from '@/app/api/admin/schools/route'
import { GET as teachersGET } from '@/app/api/admin/teachers/route'
import { GET as studentsGET } from '@/app/api/admin/students/route'
import { auth } from '@/lib/auth'

describe('Admin API', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    selectCallIndex = 0
    selectResults = [[]]
  })

  describe('GET /api/admin/overview', () => {
    it('returns 401 when not authenticated', async () => {
      mockNoAuth(vi.mocked(auth))
      const response = await overviewGET()
      const data = await response.json()
      expect(response.status).toBe(401)
      expect(data.error).toBe('Unauthorized')
    })

    it('returns 403 when non-admin role', async () => {
      mockAuthSession(vi.mocked(auth), TEST_TEACHER)
      const response = await overviewGET()
      const data = await response.json()
      expect(response.status).toBe(403)
      expect(data.error).toBe('Forbidden')
    })

    it('returns 200 with overview data for admin', async () => {
      mockAuthSession(vi.mocked(auth), TEST_ADMIN)

      // The overview route makes 8 sequential db.select() calls:
      // 1. schoolCount, 2. teacherCount, 3. spedTeacherCount, 4. studentCount,
      // 5. classCount, 6. assignmentCount, 7. submissionCount,
      // 8. recentAssignments, 9. recentGraded, 10. ungradedCount
      selectResults = [
        [{ count: 2 }],   // schools
        [{ count: 3 }],   // teachers
        [{ count: 1 }],   // sped_teachers
        [{ count: 22 }],  // students
        [{ count: 5 }],   // classes
        [{ count: 10 }],  // assignments
        [{ count: 30 }],  // submissions
        [{ count: 3 }],   // recent assignments
        [{ count: 8 }],   // recent graded
        [{ count: 5 }],   // ungraded
      ]

      const response = await overviewGET()
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.totals).toBeDefined()
      expect(data.totals.schools).toBe(2)
      expect(data.totals.teachers).toBe(4) // 3 teachers + 1 sped
      expect(data.totals.students).toBe(22)
      expect(data.totals.classes).toBe(5)
      expect(data.totals.assignments).toBe(10)
      expect(data.totals.submissions).toBe(30)
      expect(data.recentActivity).toBeDefined()
      expect(data.recentActivity.assignmentsCreatedThisWeek).toBe(3)
      expect(data.recentActivity.submissionsGradedThisWeek).toBe(8)
      expect(data.gradingPipeline).toBeDefined()
      expect(data.gradingPipeline.ungradedSubmissions).toBe(5)
    })
  })

  describe('GET /api/admin/analytics', () => {
    it('returns 401 when not authenticated', async () => {
      mockNoAuth(vi.mocked(auth))
      const response = await analyticsGET()
      const data = await response.json()
      expect(response.status).toBe(401)
      expect(data.error).toBe('Unauthorized')
    })

    it('returns 403 when non-admin role', async () => {
      mockAuthSession(vi.mocked(auth), TEST_STUDENT)
      const response = await analyticsGET()
      const data = await response.json()
      expect(response.status).toBe(403)
      expect(data.error).toBe('Forbidden')
    })

    it('returns 200 with analytics data for admin', async () => {
      mockAuthSession(vi.mocked(auth), TEST_ADMIN)

      // Analytics route makes multiple db.select() calls:
      // 1. masteryDistribution, 2. subjectScores,
      // 3. totalSubmissions, 4. gradedSubmissions,
      // 5. teacherEngagement, 6. teachersWithAssignments,
      // 7. teachersWithLessonPlans, 8. teachersWithRubrics,
      // 9. teachersWithFeedback, 10. totalTeachers
      selectResults = [
        [{ level: 'proficient', count: 10 }, { level: 'developing', count: 5 }],
        [{ subject: 'ELA', avgScore: 82.5, submissionCount: 15 }],
        [{ count: 30 }],
        [{ count: 20 }],
        [{ teacherId: 't1', teacherName: 'Ms. Rivera', teacherEmail: 'rivera@school.edu', assignmentCount: 5, submissionCount: 10, gradedCount: 8, feedbackCount: 6 }],
        [{ count: 3 }],
        [{ count: 2 }],
        [{ count: 2 }],
        [{ count: 1 }],
        [{ count: 5 }],
      ]

      const response = await analyticsGET()
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.masteryDistribution).toBeDefined()
      expect(data.masteryDistribution).toHaveLength(2)
      expect(data.masteryDistribution[0].level).toBe('proficient')
      expect(data.masteryDistribution[0].count).toBe(10)
      expect(data.subjectScores).toBeDefined()
      expect(data.subjectScores).toHaveLength(1)
      expect(data.subjectScores[0].subject).toBe('ELA')
      expect(data.gradingCompletion).toBeDefined()
      expect(data.gradingCompletion.total).toBe(30)
      expect(data.gradingCompletion.graded).toBe(20)
      expect(data.teacherEngagement).toBeDefined()
      expect(data.teacherEngagement.totalTeachers).toBe(5)
    })
  })

  describe('GET /api/admin/schools', () => {
    it('returns 401 when not authenticated', async () => {
      mockNoAuth(vi.mocked(auth))
      const response = await schoolsGET()
      const data = await response.json()
      expect(response.status).toBe(401)
      expect(data.error).toBe('Unauthorized')
    })

    it('returns 403 when non-admin role', async () => {
      mockAuthSession(vi.mocked(auth), TEST_TEACHER)
      const response = await schoolsGET()
      const data = await response.json()
      expect(response.status).toBe(403)
      expect(data.error).toBe('Forbidden')
    })

    it('returns 200 with schools data for admin', async () => {
      mockAuthSession(vi.mocked(auth), TEST_ADMIN)

      // schools route:
      // 1. allSchools query
      // Then for each school: classes, teachers, students, assignment count, avg score
      selectResults = [
        // 1. allSchools
        [{ id: 's1', name: 'Lincoln Middle School', districtId: 'd1', address: '123 Main St', districtName: 'Springfield USD' }],
        // 2. schoolClasses for s1
        [{ id: 'c1' }, { id: 'c2' }],
        // 3. teacher count for s1
        [{ count: 2 }],
        // 4. student count for s1
        [{ count: 15 }],
        // 5. assignment count for s1
        [{ count: 6 }],
        // 6. avg score for s1
        [{ avgScore: 78.5 }],
      ]

      const response = await schoolsGET()
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.schools).toBeDefined()
      expect(data.schools).toHaveLength(1)
      expect(data.schools[0].name).toBe('Lincoln Middle School')
      expect(data.schools[0].district).toBe('Springfield USD')
      expect(data.schools[0].classCount).toBe(2)
      expect(data.schools[0].teacherCount).toBe(2)
      expect(data.schools[0].studentCount).toBe(15)
    })
  })

  describe('GET /api/admin/teachers', () => {
    it('returns 401 when not authenticated', async () => {
      mockNoAuth(vi.mocked(auth))
      const response = await teachersGET()
      const data = await response.json()
      expect(response.status).toBe(401)
      expect(data.error).toBe('Unauthorized')
    })

    it('returns 403 when non-admin role', async () => {
      mockAuthSession(vi.mocked(auth), TEST_STUDENT)
      const response = await teachersGET()
      const data = await response.json()
      expect(response.status).toBe(403)
      expect(data.error).toBe('Forbidden')
    })

    it('returns 200 with teachers data for admin', async () => {
      mockAuthSession(vi.mocked(auth), TEST_ADMIN)

      // teachers route:
      // 1. allTeachers query
      // Then for each teacher: classInfo, classCount, assignmentCount, gradedCount, feedbackCount
      selectResults = [
        // 1. allTeachers
        [{ id: 't1', name: 'Ms. Rivera', email: 'rivera@school.edu', role: 'teacher' }],
        // 2. teacherClassInfo for t1
        [{ schoolName: 'Lincoln Middle School' }],
        // 3. classCount for t1
        [{ count: 2 }],
        // 4. assignmentCount for t1
        [{ count: 5 }],
        // 5. gradedCount for t1
        [{ count: 12 }],
        // 6. feedbackCount for t1
        [{ count: 8 }],
      ]

      const response = await teachersGET()
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.teachers).toBeDefined()
      expect(data.teachers).toHaveLength(1)
      expect(data.teachers[0].name).toBe('Ms. Rivera')
      expect(data.teachers[0].school).toBe('Lincoln Middle School')
      expect(data.teachers[0].classesTaught).toBe(2)
      expect(data.teachers[0].assignmentsCreated).toBe(5)
      expect(data.teachers[0].submissionsGraded).toBe(12)
      expect(data.teachers[0].feedbackDraftsCreated).toBe(8)
    })
  })

  describe('GET /api/admin/students', () => {
    it('returns 401 when not authenticated', async () => {
      mockNoAuth(vi.mocked(auth))
      const req = new Request('http://localhost:3000/api/admin/students')
      const response = await studentsGET(req)
      const data = await response.json()
      expect(response.status).toBe(401)
      expect(data.error).toBe('Unauthorized')
    })

    it('returns 403 when non-admin role', async () => {
      mockAuthSession(vi.mocked(auth), TEST_TEACHER)
      const req = new Request('http://localhost:3000/api/admin/students')
      const response = await studentsGET(req)
      const data = await response.json()
      expect(response.status).toBe(403)
      expect(data.error).toBe('Forbidden')
    })

    it('returns 200 with students data for admin', async () => {
      mockAuthSession(vi.mocked(auth), TEST_ADMIN)

      // students route:
      // 1. allStudents (with $dynamic)
      // Then for each student: classes, avgScore, masteryDist
      selectResults = [
        // 1. allStudents
        [{ id: 'stu1', name: 'Aisha Torres', email: 'aisha@student.edu' }],
        // 2. studentClasses for stu1
        [{ classId: 'c1', className: '8th ELA', gradeLevel: '8' }],
        // 3. avgScore for stu1
        [{ avgScore: 85.2 }],
        // 4. masteryDist for stu1
        [{ level: 'proficient', count: 3 }, { level: 'developing', count: 1 }],
      ]

      const req = new Request('http://localhost:3000/api/admin/students')
      const response = await studentsGET(req)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.students).toBeDefined()
      expect(data.students).toHaveLength(1)
      expect(data.students[0].name).toBe('Aisha Torres')
      expect(data.students[0].gradeLevel).toBe('8')
      expect(data.students[0].classesEnrolled).toBe(1)
      expect(data.students[0].avgScore).toBe(85.2)
      expect(data.students[0].mastery).toBeDefined()
      expect(data.students[0].mastery.proficient).toBe(3)
    })
  })
})
