import { redirect } from 'next/navigation'
import { auth } from '@/lib/auth'
import { db } from '@/lib/db'
import { users, classMembers, classes } from '@/lib/db/schema'
import { eq, and, inArray } from 'drizzle-orm'
import { NewIepForm } from './new-iep-form'

export default async function NewIepPage() {
  const session = await auth()
  if (!session?.user) {
    redirect('/login')
  }

  // Get all classes this teacher teaches
  const teacherClasses = await db
    .select({ classId: classMembers.classId })
    .from(classMembers)
    .where(
      and(
        eq(classMembers.userId, session.user.id),
        eq(classMembers.role, 'teacher')
      )
    )

  const classIds = teacherClasses.map((c) => c.classId)

  // Get all students in those classes
  let studentList: Array<{ id: string; name: string | null }> = []
  if (classIds.length > 0) {
    const studentMembers = await db
      .select({ userId: classMembers.userId })
      .from(classMembers)
      .where(
        and(
          inArray(classMembers.classId, classIds),
          eq(classMembers.role, 'student')
        )
      )

    const studentIds = [...new Set(studentMembers.map((s) => s.userId))]

    if (studentIds.length > 0) {
      studentList = await db
        .select({ id: users.id, name: users.name })
        .from(users)
        .where(inArray(users.id, studentIds))
    }
  }

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <div>
        <h1 className="font-serif text-2xl font-bold tracking-tight text-stone-900">
          Create New IEP
        </h1>
        <p className="text-stone-500 text-sm mt-1">
          Set up a new Individualized Education Program for a student on your caseload.
        </p>
      </div>

      <NewIepForm
        students={studentList.map((s) => ({
          id: s.id,
          name: s.name ?? 'Unnamed Student',
        }))}
        teacherId={session.user.id}
      />
    </div>
  )
}
