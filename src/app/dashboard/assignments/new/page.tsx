import { redirect } from 'next/navigation'
import { auth } from '@/lib/auth'
import { db } from '@/lib/db'
import { classes, classMembers } from '@/lib/db/schema'
import { eq, and } from 'drizzle-orm'
import { GenerationForm } from '@/components/assignments/generation-form'

export default async function NewAssignmentPage() {
  const session = await auth()
  if (!session?.user) {
    redirect('/login')
  }

  // Get teacher's classes
  const teacherClasses = await db
    .select({
      id: classes.id,
      name: classes.name,
      subject: classes.subject,
      gradeLevel: classes.gradeLevel,
    })
    .from(classes)
    .innerJoin(
      classMembers,
      and(
        eq(classMembers.classId, classes.id),
        eq(classMembers.userId, session.user.id),
        eq(classMembers.role, 'teacher')
      )
    )

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-serif font-bold tracking-tight">
          Create Assignment
        </h1>
        <p className="text-muted-foreground text-sm">
          Use the Smart Assignment Creator to generate a complete assignment
          package powered by AI.
        </p>
      </div>

      <GenerationForm classes={teacherClasses} />
    </div>
  )
}
