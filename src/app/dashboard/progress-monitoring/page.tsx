import { redirect } from 'next/navigation'
import { auth } from '@/lib/auth'
import { db } from '@/lib/db'
import { ieps, iepGoals, progressDataPoints, users } from '@/lib/db/schema'
import { eq, inArray, desc } from 'drizzle-orm'
import { TrendingUp } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { ProgressMonitoringClient } from './progress-monitoring-client'

export default async function ProgressMonitoringPage() {
  const session = await auth()
  if (!session?.user) {
    redirect('/login')
  }

  // Get all active IEPs authored by this teacher
  const teacherIeps = await db
    .select({
      id: ieps.id,
      studentId: ieps.studentId,
      status: ieps.status,
    })
    .from(ieps)
    .where(eq(ieps.authorId, session.user.id))

  const activeIeps = teacherIeps.filter((i) => i.status === 'active' || i.status === 'review')

  if (activeIeps.length === 0) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="font-serif text-2xl font-bold tracking-tight text-stone-900">
            Progress Monitoring
          </h1>
          <p className="text-stone-500 text-sm mt-1">
            Track student progress toward IEP goals and enter data points.
          </p>
        </div>
        <div className="flex flex-col items-center justify-center py-16 text-center">
          <div className="rounded-full bg-amber-50 p-6 mb-4">
            <TrendingUp className="size-10 text-amber-400" />
          </div>
          <h3 className="text-lg font-semibold text-stone-800 mb-1">No active IEPs</h3>
          <p className="text-sm text-stone-500 max-w-md">
            Create and activate IEPs for your students to start progress monitoring.
          </p>
        </div>
      </div>
    )
  }

  // Get student names
  const studentIds = [...new Set(activeIeps.map((i) => i.studentId))]
  const studentData = await db
    .select({ id: users.id, name: users.name })
    .from(users)
    .where(inArray(users.id, studentIds))

  const studentMap = new Map(studentData.map((s) => [s.id, s.name ?? 'Unknown']))

  // Get all goals for active IEPs
  const iepIds = activeIeps.map((i) => i.id)
  const allGoals = await db
    .select()
    .from(iepGoals)
    .where(inArray(iepGoals.iepId, iepIds))

  // Get data points for all goals
  const goalIds = allGoals.map((g) => g.id)
  let allDataPoints: Array<{
    id: string
    goalId: string
    value: number
    unit: string
    date: Date
    notes: string | null
  }> = []

  if (goalIds.length > 0) {
    const results = await Promise.all(
      goalIds.map((gId) =>
        db
          .select({
            id: progressDataPoints.id,
            goalId: progressDataPoints.goalId,
            value: progressDataPoints.value,
            unit: progressDataPoints.unit,
            date: progressDataPoints.date,
            notes: progressDataPoints.notes,
          })
          .from(progressDataPoints)
          .where(eq(progressDataPoints.goalId, gId))
          .orderBy(desc(progressDataPoints.date))
      )
    )
    allDataPoints = results.flat()
  }

  // Build per-student data
  const studentProgress = activeIeps.map((iep) => {
    const studentGoals = allGoals.filter((g) => g.iepId === iep.id)
    const goalsWithData = studentGoals.map((goal) => {
      const points = allDataPoints.filter((dp) => dp.goalId === goal.id)
      const sorted = [...points].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
      let trend: 'up' | 'down' | 'flat' | null = null
      if (sorted.length >= 3) {
        const recent = sorted.slice(-3)
        const diff = recent[recent.length - 1].value - recent[0].value
        if (Math.abs(diff) < 0.5) trend = 'flat'
        else trend = diff > 0 ? 'up' : 'down'
      }

      return {
        id: goal.id,
        area: goal.area,
        goalText: goal.goalText,
        baseline: goal.baseline,
        target: goal.target,
        status: goal.status,
        dataPoints: sorted.map((dp) => ({
          ...dp,
          date: dp.date.toISOString(),
        })),
        latestValue: sorted.length > 0 ? sorted[sorted.length - 1].value : null,
        latestUnit: sorted.length > 0 ? sorted[sorted.length - 1].unit : null,
        trend,
      }
    })

    return {
      iepId: iep.id,
      studentId: iep.studentId,
      studentName: studentMap.get(iep.studentId) ?? 'Unknown',
      goals: goalsWithData,
    }
  })

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-serif text-2xl font-bold tracking-tight text-stone-900">
          Progress Monitoring
        </h1>
        <p className="text-stone-500 text-sm mt-1">
          Track student progress toward IEP goals and enter data points.
        </p>
      </div>

      <ProgressMonitoringClient studentProgress={studentProgress} />
    </div>
  )
}
