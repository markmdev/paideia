import { auth } from '@/lib/auth'
import { db } from '@/lib/db'
import {
  classes,
  classMembers,
  masteryRecords,
  standards,
  users,
} from '@/lib/db/schema'
import { eq, and, inArray, desc } from 'drizzle-orm'
import { redirect, notFound } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft } from 'lucide-react'
import { formatGradeLevel } from '@/lib/format'
import { Button } from '@/components/ui/button'
import { MasteryHeatmap } from '@/components/mastery/mastery-heatmap'
import { GapAnalysisButton } from '@/components/mastery/gap-analysis-button'

export default async function ClassMasteryPage({
  params,
}: {
  params: Promise<{ classId: string }>
}) {
  const session = await auth()
  if (!session?.user) {
    redirect('/login')
  }

  const { classId } = await params

  // Verify the teacher belongs to this class
  const membership = await db
    .select({ userId: classMembers.userId })
    .from(classMembers)
    .where(
      and(
        eq(classMembers.classId, classId),
        eq(classMembers.userId, session.user.id),
        eq(classMembers.role, 'teacher')
      )
    )

  if (membership.length === 0) {
    notFound()
  }

  // Fetch class info
  const classRows = await db
    .select()
    .from(classes)
    .where(eq(classes.id, classId))

  if (classRows.length === 0) {
    notFound()
  }

  const cls = classRows[0]

  // Get students
  const studentMembers = await db
    .select({ userId: classMembers.userId })
    .from(classMembers)
    .where(
      and(
        eq(classMembers.classId, classId),
        eq(classMembers.role, 'student')
      )
    )

  const studentIds = studentMembers.map((m) => m.userId)

  let studentRows: { id: string; name: string | null }[] = []
  if (studentIds.length > 0) {
    studentRows = await db
      .select({ id: users.id, name: users.name })
      .from(users)
      .where(inArray(users.id, studentIds))
  }

  // Get mastery records
  let records: {
    id: string
    studentId: string
    standardId: string
    level: string
    score: number
    assessedAt: Date
    source: string
    notes: string | null
  }[] = []

  if (studentIds.length > 0) {
    records = await db
      .select()
      .from(masteryRecords)
      .where(inArray(masteryRecords.studentId, studentIds))
      .orderBy(desc(masteryRecords.assessedAt))
  }

  // Get latest per (student, standard)
  const latestByKey = new Map<string, typeof records[number]>()
  for (const record of records) {
    const key = `${record.studentId}:${record.standardId}`
    if (!latestByKey.has(key)) {
      latestByKey.set(key, record)
    }
  }

  // Get standards info
  const standardIdSet = [...new Set([...latestByKey.values()].map((r) => r.standardId))]
  let standardRows: {
    id: string
    code: string
    description: string
    subject: string
    gradeLevel: string
    domain: string | null
  }[] = []

  if (standardIdSet.length > 0) {
    standardRows = await db
      .select()
      .from(standards)
      .where(inArray(standards.id, standardIdSet))
  }

  // Build heatmap data
  const heatmapStudents = studentRows
    .map((s) => ({
      id: s.id,
      name: s.name ?? 'Unknown',
    }))
    .sort((a, b) => a.name.localeCompare(b.name))

  const heatmapStandards = standardRows
    .sort((a, b) => a.code.localeCompare(b.code))
    .map((s) => ({
      id: s.id,
      code: s.code,
      description: s.description,
      domain: s.domain,
    }))

  type HeatmapCell = {
    studentId: string
    standardId: string
    level: string
    score: number
    assessedAt: string
  }

  const heatmapCells: HeatmapCell[] = [...latestByKey.values()].map((r) => ({
    studentId: r.studentId,
    standardId: r.standardId,
    level: r.level,
    score: r.score,
    assessedAt: r.assessedAt.toISOString(),
  }))

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" asChild className="text-stone-500">
          <Link href="/dashboard/reports">
            <ArrowLeft className="size-4" />
          </Link>
        </Button>
        <div>
          <h1 className="font-serif text-2xl font-bold tracking-tight text-stone-900">
            {cls.name}
          </h1>
          <p className="text-stone-500 text-sm">
            {cls.subject} | {formatGradeLevel(cls.gradeLevel)}
            {cls.period ? ` | Period ${cls.period}` : ''} |{' '}
            {studentRows.length} students | {standardRows.length} standards
          </p>
        </div>
      </div>

      {/* Legend */}
      <div className="flex items-center gap-4 text-xs text-stone-600">
        <span className="font-medium">Mastery:</span>
        <span className="flex items-center gap-1.5">
          <span className="inline-block size-3 rounded bg-rose-400" />
          Beginning
        </span>
        <span className="flex items-center gap-1.5">
          <span className="inline-block size-3 rounded bg-amber-400" />
          Developing
        </span>
        <span className="flex items-center gap-1.5">
          <span className="inline-block size-3 rounded bg-emerald-400" />
          Proficient
        </span>
        <span className="flex items-center gap-1.5">
          <span className="inline-block size-3 rounded bg-blue-400" />
          Advanced
        </span>
        <span className="flex items-center gap-1.5">
          <span className="inline-block size-3 rounded bg-stone-100 border border-stone-200" />
          No data
        </span>
      </div>

      {/* Gap analysis button */}
      <GapAnalysisButton classId={classId} />

      {/* Heatmap */}
      {heatmapStudents.length === 0 || heatmapStandards.length === 0 ? (
        <div className="rounded-lg border border-dashed border-stone-300 bg-stone-50 p-12 text-center">
          <p className="text-stone-500">
            No mastery data available yet. Grade assignments with rubrics to see
            student mastery here.
          </p>
        </div>
      ) : (
        <MasteryHeatmap
          students={heatmapStudents}
          standards={heatmapStandards}
          cells={heatmapCells}
          classId={classId}
        />
      )}
    </div>
  )
}
