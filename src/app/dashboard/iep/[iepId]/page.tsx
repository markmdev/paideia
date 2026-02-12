import { redirect, notFound } from 'next/navigation'
import Link from 'next/link'
import { auth } from '@/lib/auth'
import { db } from '@/lib/db'
import { ieps, iepGoals, progressDataPoints, complianceDeadlines, users } from '@/lib/db/schema'
import { eq, and, desc } from 'drizzle-orm'
import { Pencil, ArrowLeft } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { ClaudeBadge } from '@/components/ui/claude-badge'
import { IepDetailTabs } from './iep-detail-tabs'

interface PageProps {
  params: Promise<{ iepId: string }>
}

export default async function IepDetailPage({ params }: PageProps) {
  const { iepId } = await params
  const session = await auth()
  if (!session?.user) {
    redirect('/login')
  }

  // Fetch IEP
  const iep = await db.query.ieps.findFirst({
    where: eq(ieps.id, iepId),
  })

  if (!iep) {
    notFound()
  }

  // Fetch student name
  const student = await db.query.users.findFirst({
    where: eq(users.id, iep.studentId),
    columns: { id: true, name: true },
  })

  // Fetch goals
  const goals = await db
    .select()
    .from(iepGoals)
    .where(eq(iepGoals.iepId, iepId))

  // Fetch progress data points for all goals
  const goalIds = goals.map((g) => g.id)
  let allDataPoints: Array<{
    id: string
    goalId: string
    studentId: string
    value: number
    unit: string
    date: Date
    notes: string | null
    recordedBy: string | null
  }> = []

  if (goalIds.length > 0) {
    const results = await Promise.all(
      goalIds.map((gId) =>
        db
          .select()
          .from(progressDataPoints)
          .where(eq(progressDataPoints.goalId, gId))
          .orderBy(desc(progressDataPoints.date))
      )
    )
    allDataPoints = results.flat()
  }

  // Fetch compliance deadlines for this student
  const deadlines = await db
    .select()
    .from(complianceDeadlines)
    .where(eq(complianceDeadlines.studentId, iep.studentId))

  // Parse JSON fields safely
  function parseJson<T>(value: string | null): T | null {
    if (!value) return null
    try {
      return JSON.parse(value) as T
    } catch {
      return null
    }
  }

  interface Accommodation {
    type: string
    description: string
  }

  interface Modification {
    type: string
    description: string
  }

  interface RelatedService {
    service: string
    frequency: string
    location: string
    provider: string
  }

  const accommodations = parseJson<Accommodation[]>(iep.accommodations) ?? []
  const modifications = parseJson<Modification[]>(iep.modifications) ?? []
  const relatedServices = parseJson<RelatedService[]>(iep.relatedServices) ?? []

  const statusConfig: Record<string, { label: string; color: string }> = {
    draft: { label: 'Draft', color: 'bg-stone-100 text-stone-700' },
    review: { label: 'In Review', color: 'bg-amber-100 text-amber-700' },
    active: { label: 'Active', color: 'bg-emerald-100 text-emerald-700' },
    archived: { label: 'Archived', color: 'bg-stone-200 text-stone-500' },
  }

  const statusInfo = statusConfig[iep.status] ?? statusConfig.draft

  // Group data points by goal
  const dataPointsByGoal = new Map<string, typeof allDataPoints>()
  for (const dp of allDataPoints) {
    const existing = dataPointsByGoal.get(dp.goalId) ?? []
    existing.push(dp)
    dataPointsByGoal.set(dp.goalId, existing)
  }

  // Compute trend per goal
  function computeTrend(points: typeof allDataPoints): 'up' | 'down' | 'flat' | null {
    if (points.length < 3) return null
    const sorted = [...points].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
    const recent = sorted.slice(-3)
    const first = recent[0].value
    const last = recent[recent.length - 1].value
    const diff = last - first
    if (Math.abs(diff) < 0.5) return 'flat'
    return diff > 0 ? 'up' : 'down'
  }

  // Prepare serializable data for the client component
  const goalsData = goals.map((g) => {
    const points = dataPointsByGoal.get(g.id) ?? []
    const latestPoint = points.length > 0 ? points[0] : null
    return {
      ...g,
      createdAt: g.createdAt.toISOString(),
      dataPoints: points.map((dp) => ({
        ...dp,
        date: dp.date.toISOString(),
      })),
      latestDataPoint: latestPoint
        ? { value: latestPoint.value, unit: latestPoint.unit, date: latestPoint.date.toISOString() }
        : null,
      dataPointCount: points.length,
      trend: computeTrend(points),
    }
  })

  const deadlinesData = deadlines.map((d) => ({
    ...d,
    dueDate: d.dueDate.toISOString(),
    completedAt: d.completedAt?.toISOString() ?? null,
  }))

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div className="flex items-start gap-3">
          <Link
            href="/dashboard/iep"
            className="mt-1 p-1 rounded-md hover:bg-stone-100 transition-colors"
          >
            <ArrowLeft className="size-5 text-stone-500" />
          </Link>
          <div>
            <div className="flex items-center gap-2 mb-1">
              <h1 className="font-serif text-2xl font-bold tracking-tight text-stone-900">
                {student?.name ?? 'Student'}
              </h1>
              <Badge className={`text-xs px-2 py-0.5 border-0 ${statusInfo.color}`}>
                {statusInfo.label}
              </Badge>
            </div>
            <div className="flex items-center gap-3 text-sm text-stone-500">
              {iep.disabilityCategory && (
                <span>{iep.disabilityCategory}</span>
              )}
              {iep.startDate && iep.endDate && (
                <span>
                  {new Date(iep.startDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                  {' \u2013 '}
                  {new Date(iep.endDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                </span>
              )}
            </div>
          </div>
        </div>
        <Button asChild variant="outline" className="gap-2 border-stone-300">
          <Link href={`/dashboard/iep/${iepId}/edit`}>
            <Pencil className="size-4" />
            Edit IEP
          </Link>
        </Button>
      </div>

      {/* Tabbed content */}
      <IepDetailTabs
        iep={{
          id: iep.id,
          presentLevels: iep.presentLevels,
          status: iep.status,
          studentId: iep.studentId,
        }}
        goals={goalsData}
        accommodations={accommodations}
        modifications={modifications}
        relatedServices={relatedServices}
        deadlines={deadlinesData}
        studentName={student?.name ?? 'Student'}
      />
    </div>
  )
}
