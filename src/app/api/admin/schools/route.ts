import { auth } from '@/lib/auth'
import { db } from '@/lib/db'
import {
  schools,
  districts,
  classes,
  classMembers,
  assignments,
  submissions,
} from '@/lib/db/schema'
import { eq, sql, and } from 'drizzle-orm'
import { NextResponse } from 'next/server'

export async function GET() {
  const session = await auth()
  if (!session?.user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  if (session.user.role !== 'admin' && session.user.role !== 'district_admin') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const allSchools = await db
    .select({
      id: schools.id,
      name: schools.name,
      districtId: schools.districtId,
      address: schools.address,
      districtName: districts.name,
    })
    .from(schools)
    .leftJoin(districts, eq(schools.districtId, districts.id))

  const schoolData = await Promise.all(
    allSchools.map(async (school) => {
      // Classes in this school
      const schoolClasses = await db
        .select({ id: classes.id })
        .from(classes)
        .where(eq(classes.schoolId, school.id))

      const classIds = schoolClasses.map((c) => c.id)

      // Teacher count (unique teachers in classes of this school)
      let teacherCount = 0
      let studentCount = 0
      if (classIds.length > 0) {
        const [teachers] = await db
          .select({ count: sql<number>`count(distinct ${classMembers.userId})` })
          .from(classMembers)
          .where(
            and(
              sql`${classMembers.classId} = any(${classIds})`,
              eq(classMembers.role, 'teacher')
            )
          )
        teacherCount = Number(teachers.count)

        const [students] = await db
          .select({ count: sql<number>`count(distinct ${classMembers.userId})` })
          .from(classMembers)
          .where(
            and(
              sql`${classMembers.classId} = any(${classIds})`,
              eq(classMembers.role, 'student')
            )
          )
        studentCount = Number(students.count)
      }

      // Assignment count
      let assignmentCount = 0
      let avgScore: number | null = null
      if (classIds.length > 0) {
        const [aCount] = await db
          .select({ count: sql<number>`count(*)` })
          .from(assignments)
          .where(sql`${assignments.classId} = any(${classIds})`)
        assignmentCount = Number(aCount.count)

        const [scoreResult] = await db
          .select({
            avgScore: sql<number>`avg(case when ${submissions.totalScore} is not null and ${submissions.maxScore} is not null and ${submissions.maxScore} > 0 then (${submissions.totalScore}::float / ${submissions.maxScore}::float) * 100 else null end)`,
          })
          .from(submissions)
          .innerJoin(assignments, eq(submissions.assignmentId, assignments.id))
          .where(sql`${assignments.classId} = any(${classIds})`)
        avgScore = scoreResult.avgScore
          ? Math.round(Number(scoreResult.avgScore) * 100) / 100
          : null
      }

      return {
        id: school.id,
        name: school.name,
        district: school.districtName,
        address: school.address,
        classCount: classIds.length,
        teacherCount,
        studentCount,
        assignmentCount,
        avgScore,
      }
    })
  )

  return NextResponse.json({ schools: schoolData })
}
