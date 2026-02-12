import { redirect } from 'next/navigation'
import { auth } from '@/lib/auth'
import { db } from '@/lib/db'
import {
  users,
  schools,
  classes,
  classMembers,
  assignments,
  submissions,
  parentChildren,
  tutorSessions,
  messages,
} from '@/lib/db/schema'
import { eq, and, sql, ne, inArray } from 'drizzle-orm'
import {
  TeacherDashboard,
  StudentDashboard,
  ParentDashboard,
  AdminDashboard,
} from '@/components/dashboard/role-dashboards'
import type {
  TeacherStats,
  StudentStats,
  ParentStats,
  AdminStats,
} from '@/components/dashboard/role-dashboards'

async function getTeacherStats(userId: string): Promise<TeacherStats> {
  // Count classes where this user is a teacher
  const [classCount] = await db
    .select({ count: sql<number>`count(*)` })
    .from(classMembers)
    .where(and(eq(classMembers.userId, userId), eq(classMembers.role, 'teacher')))

  // Count assignments created by this teacher
  const [assignmentCount] = await db
    .select({ count: sql<number>`count(*)` })
    .from(assignments)
    .where(eq(assignments.teacherId, userId))

  // Get assignment IDs for this teacher to find pending grading
  const teacherAssignments = await db
    .select({ id: assignments.id })
    .from(assignments)
    .where(eq(assignments.teacherId, userId))

  let pendingGrading = 0
  if (teacherAssignments.length > 0) {
    const assignmentIds = teacherAssignments.map((a) => a.id)
    const [ungradedCount] = await db
      .select({ count: sql<number>`count(*)` })
      .from(submissions)
      .where(
        and(
          inArray(submissions.assignmentId, assignmentIds),
          ne(submissions.status, 'graded')
        )
      )
    pendingGrading = Number(ungradedCount.count)
  }

  // Count students across teacher's classes
  const teacherClassIds = await db
    .select({ classId: classMembers.classId })
    .from(classMembers)
    .where(and(eq(classMembers.userId, userId), eq(classMembers.role, 'teacher')))

  let studentCount = 0
  if (teacherClassIds.length > 0) {
    const cIds = teacherClassIds.map((c) => c.classId)
    const [sCount] = await db
      .select({ count: sql<number>`count(distinct ${classMembers.userId})` })
      .from(classMembers)
      .where(
        and(
          inArray(classMembers.classId, cIds),
          eq(classMembers.role, 'student')
        )
      )
    studentCount = Number(sCount.count)
  }

  return {
    classes: Number(classCount.count),
    pendingGrading,
    assignments: Number(assignmentCount.count),
    students: studentCount,
  }
}

async function getStudentStats(userId: string): Promise<StudentStats> {
  // Count classes enrolled in
  const [classCount] = await db
    .select({ count: sql<number>`count(*)` })
    .from(classMembers)
    .where(and(eq(classMembers.userId, userId), eq(classMembers.role, 'student')))

  // Count completed (graded) assignments
  const [completedCount] = await db
    .select({ count: sql<number>`count(*)` })
    .from(submissions)
    .where(and(eq(submissions.studentId, userId), eq(submissions.status, 'graded')))

  // Average score across graded submissions (percentage)
  const avgResult = await db
    .select({
      avgPct: sql<number>`avg(case when ${submissions.maxScore} > 0 then (${submissions.totalScore} / ${submissions.maxScore}) * 100 else null end)`,
    })
    .from(submissions)
    .where(and(eq(submissions.studentId, userId), eq(submissions.status, 'graded')))

  const averageScore = avgResult[0]?.avgPct !== null ? Math.round(Number(avgResult[0].avgPct)) : null

  // Count tutor sessions
  const [sessionCount] = await db
    .select({ count: sql<number>`count(*)` })
    .from(tutorSessions)
    .where(eq(tutorSessions.studentId, userId))

  return {
    classes: Number(classCount.count),
    completedAssignments: Number(completedCount.count),
    averageScore,
    tutorSessions: Number(sessionCount.count),
  }
}

async function getParentStats(userId: string): Promise<ParentStats> {
  // Get children with their names
  const children = await db
    .select({
      childId: parentChildren.childId,
      childName: users.name,
    })
    .from(parentChildren)
    .innerJoin(users, eq(parentChildren.childId, users.id))
    .where(eq(parentChildren.parentId, userId))

  // Count unread messages
  const [unreadCount] = await db
    .select({ count: sql<number>`count(*)` })
    .from(messages)
    .where(
      and(
        eq(messages.receiverId, userId),
        ne(messages.status, 'read')
      )
    )

  return {
    children: children.length,
    childrenNames: children.map((c) => c.childName ?? 'Unknown').filter(Boolean),
    unreadMessages: Number(unreadCount.count),
  }
}

async function getAdminStats(): Promise<AdminStats> {
  const [schoolCount] = await db
    .select({ count: sql<number>`count(*)` })
    .from(schools)

  const [teacherCount] = await db
    .select({ count: sql<number>`count(*)` })
    .from(users)
    .where(eq(users.role, 'teacher'))

  const [spedTeacherCount] = await db
    .select({ count: sql<number>`count(*)` })
    .from(users)
    .where(eq(users.role, 'sped_teacher'))

  const [studentCount] = await db
    .select({ count: sql<number>`count(*)` })
    .from(users)
    .where(eq(users.role, 'student'))

  const [classCount] = await db
    .select({ count: sql<number>`count(*)` })
    .from(classes)

  const [ungradedCount] = await db
    .select({ count: sql<number>`count(*)` })
    .from(submissions)
    .where(eq(submissions.status, 'submitted'))

  return {
    schools: Number(schoolCount.count),
    teachers: Number(teacherCount.count) + Number(spedTeacherCount.count),
    students: Number(studentCount.count),
    classes: Number(classCount.count),
    ungradedSubmissions: Number(ungradedCount.count),
  }
}

export default async function DashboardPage() {
  const session = await auth()

  if (!session?.user) {
    redirect('/login')
  }

  const { role, name, id: userId } = session.user
  const firstName = name?.split(' ')[0] ?? 'there'

  switch (role) {
    case 'student': {
      const stats = await getStudentStats(userId)
      return <StudentDashboard firstName={firstName} stats={stats} />
    }
    case 'parent': {
      const stats = await getParentStats(userId)
      return <ParentDashboard firstName={firstName} stats={stats} />
    }
    case 'admin':
    case 'district_admin': {
      const stats = await getAdminStats()
      return <AdminDashboard firstName={firstName} stats={stats} />
    }
    case 'teacher':
    case 'sped_teacher':
    default: {
      const stats = await getTeacherStats(userId)
      return <TeacherDashboard firstName={firstName} role={role} stats={stats} />
    }
  }
}
