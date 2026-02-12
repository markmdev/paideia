import { auth } from '@/lib/auth'
import { db } from '@/lib/db'
import {
  users,
  classMembers,
  classes,
  submissions,
  masteryRecords,
} from '@/lib/db/schema'
import { eq, sql, ilike, or } from 'drizzle-orm'
import { NextResponse } from 'next/server'

export async function GET(req: Request) {
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

    const { searchParams } = new URL(req.url)
    const search = searchParams.get('search')

    // Build student query with optional search filter
    let studentQuery = db
      .select({
        id: users.id,
        name: users.name,
        email: users.email,
      })
      .from(users)
      .where(eq(users.role, 'student'))
      .$dynamic()

    if (search) {
      studentQuery = studentQuery.where(
        sql`${users.role} = 'student' and (${users.name} ilike ${'%' + search + '%'} or ${users.email} ilike ${'%' + search + '%'})`
      )
    }

    const allStudents = await studentQuery

    const studentData = await Promise.all(
      allStudents.map(async (student) => {
        // Get classes and grade level
        const studentClasses = await db
          .select({
            classId: classMembers.classId,
            className: classes.name,
            gradeLevel: classes.gradeLevel,
          })
          .from(classMembers)
          .innerJoin(classes, eq(classMembers.classId, classes.id))
          .where(
            sql`${classMembers.userId} = ${student.id} and ${classMembers.role} = 'student'`
          )

        const gradeLevel =
          studentClasses.length > 0 ? studentClasses[0].gradeLevel : null

        // Average score across submissions
        const [scoreResult] = await db
          .select({
            avgScore: sql<number>`avg(case when ${submissions.totalScore} is not null and ${submissions.maxScore} is not null and ${submissions.maxScore} > 0 then (${submissions.totalScore}::float / ${submissions.maxScore}::float) * 100 else null end)`,
          })
          .from(submissions)
          .where(eq(submissions.studentId, student.id))

        // Mastery level distribution
        const masteryDist = await db
          .select({
            level: masteryRecords.level,
            count: sql<number>`count(*)`,
          })
          .from(masteryRecords)
          .where(eq(masteryRecords.studentId, student.id))
          .groupBy(masteryRecords.level)

        const mastery: Record<string, number> = {}
        for (const m of masteryDist) {
          mastery[m.level] = Number(m.count)
        }

        return {
          id: student.id,
          name: student.name,
          email: student.email,
          gradeLevel,
          classesEnrolled: studentClasses.length,
          avgScore: scoreResult.avgScore
            ? Math.round(Number(scoreResult.avgScore) * 100) / 100
            : null,
          mastery,
        }
      })
    )

    return NextResponse.json({ students: studentData })
  } catch (error) {
    console.error('Admin students error:', error)
    return NextResponse.json(
      { error: 'Failed to fetch students data' },
      { status: 500 }
    )
  }
}
