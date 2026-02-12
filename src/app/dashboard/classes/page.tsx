import { redirect } from 'next/navigation'
import { auth } from '@/lib/auth'
import { db } from '@/lib/db'
import { classes, classMembers, users } from '@/lib/db/schema'
import { eq, and, sql, count } from 'drizzle-orm'
import { GraduationCap, BookOpen, Users } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'

export default async function ClassesPage() {
  const session = await auth()
  if (!session?.user) {
    redirect('/login')
  }

  const userId = session.user.id
  const role = session.user.role

  // Get all classes the current user is a member of
  const myClasses = await db
    .select({
      classId: classes.id,
      className: classes.name,
      subject: classes.subject,
      gradeLevel: classes.gradeLevel,
      period: classes.period,
      schoolYear: classes.schoolYear,
      memberRole: classMembers.role,
    })
    .from(classMembers)
    .innerJoin(classes, eq(classMembers.classId, classes.id))
    .where(eq(classMembers.userId, userId))

  // For teachers/sped_teachers: get student counts per class
  // For students: get teacher names per class
  const classIds = myClasses.map((c) => c.classId)

  let studentCounts: Record<string, number> = {}
  let teacherNames: Record<string, string> = {}

  if (classIds.length > 0) {
    if (role === 'teacher' || role === 'sped_teacher' || role === 'admin') {
      const counts = await db
        .select({
          classId: classMembers.classId,
          studentCount: count(classMembers.id),
        })
        .from(classMembers)
        .where(
          and(
            sql`${classMembers.classId} IN ${classIds}`,
            eq(classMembers.role, 'student')
          )
        )
        .groupBy(classMembers.classId)

      for (const row of counts) {
        studentCounts[row.classId] = Number(row.studentCount)
      }
    }

    if (role === 'student') {
      const teachers = await db
        .select({
          classId: classMembers.classId,
          teacherName: users.name,
        })
        .from(classMembers)
        .innerJoin(users, eq(classMembers.userId, users.id))
        .where(
          and(
            sql`${classMembers.classId} IN ${classIds}`,
            eq(classMembers.role, 'teacher')
          )
        )

      for (const row of teachers) {
        if (row.teacherName) {
          teacherNames[row.classId] = row.teacherName
        }
      }
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-serif font-bold tracking-tight">My Classes</h1>
        <p className="text-muted-foreground text-sm">
          {role === 'student'
            ? 'Classes you are enrolled in this school year.'
            : 'Classes you teach this school year.'}
        </p>
      </div>

      {myClasses.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 text-center">
          <div className="rounded-full bg-amber-50 p-6 mb-4">
            <GraduationCap className="size-10 text-amber-400" />
          </div>
          <h3 className="text-lg font-semibold mb-1">No classes yet</h3>
          <p className="text-sm text-muted-foreground max-w-md">
            {role === 'student'
              ? 'You are not enrolled in any classes. Contact your teacher or administrator to get added.'
              : 'You have not been assigned to any classes. Contact your administrator to set up your class roster.'}
          </p>
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {myClasses.map((cls) => (
            <Card key={cls.classId} className="h-full">
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between gap-2">
                  <CardTitle className="text-base leading-tight">
                    {cls.className}
                  </CardTitle>
                  <Badge
                    variant="secondary"
                    className="shrink-0 text-xs"
                  >
                    {cls.gradeLevel}
                  </Badge>
                </div>
              </CardHeader>
              <CardContent className="pt-0">
                <div className="space-y-2 text-sm text-muted-foreground">
                  <div className="flex items-center gap-2">
                    <BookOpen className="size-3.5" />
                    <span>{cls.subject}</span>
                  </div>
                  {cls.period && (
                    <div className="text-xs">Period {cls.period}</div>
                  )}
                  {(role === 'teacher' || role === 'sped_teacher' || role === 'admin') && (
                    <div className="flex items-center gap-2 pt-1">
                      <Users className="size-3.5" />
                      <span>
                        {studentCounts[cls.classId] ?? 0}{' '}
                        {(studentCounts[cls.classId] ?? 0) === 1
                          ? 'student'
                          : 'students'}
                      </span>
                    </div>
                  )}
                  {role === 'student' && teacherNames[cls.classId] && (
                    <div className="flex items-center gap-2 pt-1">
                      <Users className="size-3.5" />
                      <span>{teacherNames[cls.classId]}</span>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  )
}
