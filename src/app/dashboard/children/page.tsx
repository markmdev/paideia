import { redirect } from 'next/navigation'
import { auth } from '@/lib/auth'
import { db } from '@/lib/db'
import {
  parentChildren,
  users,
  classMembers,
  classes,
  submissions,
  assignments,
  masteryRecords,
  standards,
} from '@/lib/db/schema'
import { eq, desc, and, inArray, avg } from 'drizzle-orm'
import { Users } from 'lucide-react'
import { ChildStatusCard } from '@/components/parent/child-status-card'

export default async function ChildrenPage() {
  const session = await auth()
  if (!session?.user) {
    redirect('/login')
  }
  if (session.user.role !== 'parent') {
    redirect('/dashboard')
  }

  // Get parent's children
  const children = await db
    .select({
      childId: parentChildren.childId,
      childName: users.name,
      childEmail: users.email,
    })
    .from(parentChildren)
    .innerJoin(users, eq(parentChildren.childId, users.id))
    .where(eq(parentChildren.parentId, session.user.id))

  if (children.length === 0) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-serif font-bold tracking-tight">
            My Children
          </h1>
          <p className="text-muted-foreground text-sm">
            See how your children are doing in school.
          </p>
        </div>
        <div className="flex flex-col items-center justify-center py-16 text-center">
          <div className="rounded-full bg-stone-100 p-6 mb-4">
            <Users className="size-10 text-stone-400" />
          </div>
          <h3 className="text-lg font-semibold mb-1">No children linked</h3>
          <p className="text-sm text-muted-foreground max-w-md">
            Your account is not yet linked to any students. Please contact your
            school to set up the parent-student connection.
          </p>
        </div>
      </div>
    )
  }

  const childIds = children.map((c) => c.childId)

  // Get class enrollments
  const enrollments = await db
    .select({
      userId: classMembers.userId,
      className: classes.name,
      subject: classes.subject,
      gradeLevel: classes.gradeLevel,
    })
    .from(classMembers)
    .innerJoin(classes, eq(classMembers.classId, classes.id))
    .where(
      and(
        inArray(classMembers.userId, childIds),
        eq(classMembers.role, 'student')
      )
    )

  // Get recent submissions
  const recentSubmissions = await db
    .select({
      studentId: submissions.studentId,
      assignmentTitle: assignments.title,
      subject: assignments.subject,
      totalScore: submissions.totalScore,
      maxScore: submissions.maxScore,
      letterGrade: submissions.letterGrade,
    })
    .from(submissions)
    .innerJoin(assignments, eq(submissions.assignmentId, assignments.id))
    .where(inArray(submissions.studentId, childIds))
    .orderBy(desc(submissions.submittedAt))
    .limit(30)

  // Get mastery averages by subject
  const masterySnapshot = await db
    .select({
      studentId: masteryRecords.studentId,
      subject: standards.subject,
      avgScore: avg(masteryRecords.score),
    })
    .from(masteryRecords)
    .innerJoin(standards, eq(masteryRecords.standardId, standards.id))
    .where(inArray(masteryRecords.studentId, childIds))
    .groupBy(masteryRecords.studentId, standards.subject)

  // Build child data
  const childData = children.map((child) => {
    const childEnrollments = enrollments.filter((e) => e.userId === child.childId)
    const childSubmissions = recentSubmissions.filter(
      (s) => s.studentId === child.childId
    )
    const childMastery = masterySnapshot.filter(
      (m) => m.studentId === child.childId
    )

    const gradedSubmissions = childSubmissions.filter(
      (s) => s.totalScore !== null && s.maxScore !== null
    )
    const avgPercentage =
      gradedSubmissions.length > 0
        ? gradedSubmissions.reduce(
            (sum, s) => sum + (s.totalScore! / s.maxScore!) * 100,
            0
          ) / gradedSubmissions.length
        : null

    let overallStatus: 'good' | 'watch' | 'concern' = 'good'
    if (avgPercentage !== null) {
      if (avgPercentage < 60) overallStatus = 'concern'
      else if (avgPercentage < 75) overallStatus = 'watch'
    } else if (childMastery.length > 0) {
      const masteryScores = childMastery
        .map((m) => (m.avgScore ? Number(m.avgScore) : null))
        .filter((s): s is number => s !== null)
      if (masteryScores.length > 0) {
        const avgMastery =
          masteryScores.reduce((sum, s) => sum + s, 0) / masteryScores.length
        if (avgMastery < 60) overallStatus = 'concern'
        else if (avgMastery < 75) overallStatus = 'watch'
      }
    }

    return {
      id: child.childId,
      name: child.childName,
      gradeLevel:
        childEnrollments.length > 0 ? childEnrollments[0].gradeLevel : null,
      overallStatus,
      averageScore: avgPercentage !== null ? Math.round(avgPercentage) : null,
      recentGrades: childSubmissions.slice(0, 3).map((s) => ({
        assignment: s.assignmentTitle,
        subject: s.subject,
        letterGrade: s.letterGrade,
      })),
      subjects: childMastery.map((m) => ({
        subject: m.subject,
        averageMastery: m.avgScore ? Math.round(Number(m.avgScore)) : null,
      })),
      enrolledClasses: childEnrollments.map((e) => ({
        name: e.className,
        subject: e.subject,
      })),
    }
  })

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-serif font-bold tracking-tight">
          My Children
        </h1>
        <p className="text-muted-foreground text-sm">
          See how your children are doing in school. Click a card for details.
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        {childData.map((child) => (
          <ChildStatusCard key={child.id} child={child} />
        ))}
      </div>
    </div>
  )
}
