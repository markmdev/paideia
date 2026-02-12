import { auth } from '@/lib/auth'
import { db } from '@/lib/db'
import {
  users,
  classMembers,
  classes,
  schools,
  assignments,
  submissions,
  feedbackDrafts,
} from '@/lib/db/schema'
import { eq, sql, or } from 'drizzle-orm'
import { NextResponse } from 'next/server'

export async function GET() {
  try {
    const session = await auth()
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    if (
      session.user.role !== 'admin' &&
      session.user.role !== 'district_admin'
    ) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const allTeachers = await db
      .select({
        id: users.id,
        name: users.name,
        email: users.email,
        role: users.role,
      })
      .from(users)
      .where(or(eq(users.role, 'teacher'), eq(users.role, 'sped_teacher')))

    const teacherData = await Promise.all(
      allTeachers.map(async (teacher) => {
        // School via class membership
        const teacherClassInfo = await db
          .select({
            schoolName: schools.name,
          })
          .from(classMembers)
          .innerJoin(classes, eq(classMembers.classId, classes.id))
          .leftJoin(schools, eq(classes.schoolId, schools.id))
          .where(
            sql`${classMembers.userId} = ${teacher.id} and ${classMembers.role} = 'teacher'`
          )
          .limit(1)

        const school = teacherClassInfo[0]?.schoolName ?? null

        // Class count
        const [classCount] = await db
          .select({ count: sql<number>`count(*)` })
          .from(classMembers)
          .where(
            sql`${classMembers.userId} = ${teacher.id} and ${classMembers.role} = 'teacher'`
          )

        // Assignment count
        const [assignmentCount] = await db
          .select({ count: sql<number>`count(*)` })
          .from(assignments)
          .where(eq(assignments.teacherId, teacher.id))

        // Graded submissions count
        const [gradedCount] = await db
          .select({ count: sql<number>`count(*)` })
          .from(submissions)
          .innerJoin(assignments, eq(submissions.assignmentId, assignments.id))
          .where(
            sql`${assignments.teacherId} = ${teacher.id} and ${submissions.status} in ('graded', 'returned')`
          )

        // AI feedback generated count
        const [feedbackCount] = await db
          .select({ count: sql<number>`count(*)` })
          .from(feedbackDrafts)
          .where(eq(feedbackDrafts.teacherId, teacher.id))

        return {
          id: teacher.id,
          name: teacher.name,
          email: teacher.email,
          role: teacher.role,
          school,
          classesTaught: Number(classCount.count),
          assignmentsCreated: Number(assignmentCount.count),
          submissionsGraded: Number(gradedCount.count),
          feedbackDraftsCreated: Number(feedbackCount.count),
        }
      })
    )

    // Sort by most active
    teacherData.sort(
      (a, b) =>
        b.assignmentsCreated +
        b.submissionsGraded -
        (a.assignmentsCreated + a.submissionsGraded)
    )

    return NextResponse.json({ teachers: teacherData })
  } catch (error) {
    console.error('Admin teachers error:', error)
    return NextResponse.json(
      { error: 'Failed to fetch teachers data' },
      { status: 500 }
    )
  }
}
