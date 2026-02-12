import { redirect } from 'next/navigation'
import Link from 'next/link'
import { auth } from '@/lib/auth'
import { db } from '@/lib/db'
import { assignments, classes, classMembers, rubrics } from '@/lib/db/schema'
import { eq, desc, and, inArray } from 'drizzle-orm'
import { FileText, Plus, Sparkles } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { AssignmentCard } from '@/components/assignments/assignment-card'

export default async function AssignmentsPage() {
  const session = await auth()
  if (!session?.user) {
    redirect('/login')
  }

  const isStudent = session.user.role === 'student'

  let results: {
    assignment: typeof assignments.$inferSelect
    className: string | null
    rubricTitle: string | null
  }[]

  if (isStudent) {
    // Find class IDs the student is enrolled in
    const memberships = await db
      .select({ classId: classMembers.classId })
      .from(classMembers)
      .where(
        and(
          eq(classMembers.userId, session.user.id),
          eq(classMembers.role, 'student')
        )
      )

    const classIds = memberships.map((m) => m.classId)

    if (classIds.length === 0) {
      results = []
    } else {
      results = await db
        .select({
          assignment: assignments,
          className: classes.name,
          rubricTitle: rubrics.title,
        })
        .from(assignments)
        .leftJoin(classes, eq(assignments.classId, classes.id))
        .leftJoin(rubrics, eq(assignments.rubricId, rubrics.id))
        .where(inArray(assignments.classId, classIds))
        .orderBy(desc(assignments.createdAt))
    }
  } else {
    results = await db
      .select({
        assignment: assignments,
        className: classes.name,
        rubricTitle: rubrics.title,
      })
      .from(assignments)
      .leftJoin(classes, eq(assignments.classId, classes.id))
      .leftJoin(rubrics, eq(assignments.rubricId, rubrics.id))
      .where(eq(assignments.teacherId, session.user.id))
      .orderBy(desc(assignments.createdAt))
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Assignments</h1>
          <p className="text-muted-foreground text-sm">
            {isStudent
              ? 'View assignments from your classes.'
              : 'Create, manage, and track assignments across your classes.'}
          </p>
        </div>
        {!isStudent && (
          <Button asChild className="bg-amber-600 hover:bg-amber-700 text-white gap-2">
            <Link href="/dashboard/assignments/new">
              <Sparkles className="size-4" />
              Create Assignment
            </Link>
          </Button>
        )}
      </div>

      {results.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 text-center">
          <div className="rounded-full bg-amber-50 p-6 mb-4">
            <FileText className="size-10 text-amber-400" />
          </div>
          <h3 className="text-lg font-semibold mb-1">No assignments yet</h3>
          <p className="text-sm text-muted-foreground max-w-md mb-6">
            {isStudent
              ? 'No assignments yet. Check back when your teachers post new work.'
              : 'Get started by creating your first assignment. The Smart Assignment Creator will generate a complete package with rubric, success criteria, and differentiated versions.'}
          </p>
          {!isStudent && (
            <Button asChild className="bg-amber-600 hover:bg-amber-700 text-white gap-2">
              <Link href="/dashboard/assignments/new">
                <Plus className="size-4" />
                Create Your First Assignment
              </Link>
            </Button>
          )}
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {results.map((row) => (
            <AssignmentCard
              key={row.assignment.id}
              assignment={{
                ...row.assignment,
                dueDate: row.assignment.dueDate?.toISOString() ?? null,
                createdAt: row.assignment.createdAt.toISOString(),
              }}
              className={row.className}
              rubricTitle={row.rubricTitle}
            />
          ))}
        </div>
      )}
    </div>
  )
}
