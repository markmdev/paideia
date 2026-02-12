import { auth } from '@/lib/auth'
import { db } from '@/lib/db'
import { users, classMembers, parentChildren } from '@/lib/db/schema'
import { eq, and, inArray } from 'drizzle-orm'
import { NextResponse } from 'next/server'

export async function GET() {
  const session = await auth()
  if (!session?.user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const role = session.user.role
    const userId = session.user.id
    let contactIds: string[] = []

    if (role === 'parent') {
      // Parents can message teachers of their children's classes
      const children = await db
        .select({ childId: parentChildren.childId })
        .from(parentChildren)
        .where(eq(parentChildren.parentId, userId))

      const childIds = children.map((c) => c.childId)

      if (childIds.length > 0) {
        // Find classes these children are in
        const childClasses = await db
          .select({ classId: classMembers.classId })
          .from(classMembers)
          .where(
            and(
              inArray(classMembers.userId, childIds),
              eq(classMembers.role, 'student')
            )
          )

        const classIds = [...new Set(childClasses.map((c) => c.classId))]

        if (classIds.length > 0) {
          // Find teachers of those classes
          const teachers = await db
            .select({ userId: classMembers.userId })
            .from(classMembers)
            .where(
              and(
                inArray(classMembers.classId, classIds),
                eq(classMembers.role, 'teacher')
              )
            )

          contactIds = [...new Set(teachers.map((t) => t.userId))]
        }
      }
    } else if (role === 'teacher' || role === 'sped_teacher') {
      // Teachers can message parents of students in their classes
      const teacherClasses = await db
        .select({ classId: classMembers.classId })
        .from(classMembers)
        .where(
          and(
            eq(classMembers.userId, userId),
            eq(classMembers.role, 'teacher')
          )
        )

      const classIds = teacherClasses.map((c) => c.classId)

      if (classIds.length > 0) {
        // Find students in those classes
        const students = await db
          .select({ userId: classMembers.userId })
          .from(classMembers)
          .where(
            and(
              inArray(classMembers.classId, classIds),
              eq(classMembers.role, 'student')
            )
          )

        const studentIds = students.map((s) => s.userId)

        if (studentIds.length > 0) {
          // Find parents of those students
          const parents = await db
            .select({ parentId: parentChildren.parentId })
            .from(parentChildren)
            .where(inArray(parentChildren.childId, studentIds))

          contactIds = [...new Set(parents.map((p) => p.parentId))]
        }
      }
    } else if (role === 'admin') {
      // Admins can message all teachers
      const teachers = await db
        .select({ id: users.id })
        .from(users)
        .where(eq(users.role, 'teacher'))

      const spedTeachers = await db
        .select({ id: users.id })
        .from(users)
        .where(eq(users.role, 'sped_teacher'))

      contactIds = [
        ...teachers.map((t) => t.id),
        ...spedTeachers.map((t) => t.id),
      ]
    }

    if (contactIds.length === 0) {
      return NextResponse.json([])
    }

    // Fetch contact details
    const contacts = await db
      .select({
        id: users.id,
        name: users.name,
        role: users.role,
      })
      .from(users)
      .where(inArray(users.id, contactIds))

    const result = contacts.map((c) => ({
      id: c.id,
      name: c.name ?? 'Unknown',
      role: c.role,
    }))

    return NextResponse.json(result)
  } catch (error) {
    console.error('Failed to load contacts:', error)
    return NextResponse.json(
      { error: 'Failed to load contacts' },
      { status: 500 }
    )
  }
}
