import { redirect } from 'next/navigation'
import { auth } from '@/lib/auth'
import { db } from '@/lib/db'
import { complianceDeadlines, ieps, users } from '@/lib/db/schema'
import { eq, inArray } from 'drizzle-orm'
import { format } from 'date-fns'
import { ShieldCheck, AlertTriangle, Clock, CheckCircle2 } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { ComplianceBadge, getComplianceStatus } from '@/components/iep/compliance-badge'

const deadlineTypeLabels: Record<string, string> = {
  initial_eval: 'Initial Evaluation',
  annual_review: 'Annual Review',
  triennial: 'Triennial Re-evaluation',
}

export default async function ComplianceDashboardPage() {
  const session = await auth()
  if (!session?.user) {
    redirect('/login')
  }

  // Get all IEPs authored by this teacher to find their student IDs
  const teacherIeps = await db
    .select({ studentId: ieps.studentId })
    .from(ieps)
    .where(eq(ieps.authorId, session.user.id))

  const studentIds = [...new Set(teacherIeps.map((i) => i.studentId))]

  if (studentIds.length === 0) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="font-serif text-2xl font-bold tracking-tight text-stone-900">
            Compliance Dashboard
          </h1>
          <p className="text-stone-500 text-sm mt-1">
            Track IEP compliance deadlines across your caseload.
          </p>
        </div>
        <div className="flex flex-col items-center justify-center py-16 text-center">
          <div className="rounded-full bg-amber-50 p-6 mb-4">
            <ShieldCheck className="size-10 text-amber-400" />
          </div>
          <h3 className="text-lg font-semibold text-stone-800 mb-1">No compliance data</h3>
          <p className="text-sm text-stone-500 max-w-md">
            Create IEPs for your students to start tracking compliance deadlines.
          </p>
        </div>
      </div>
    )
  }

  // Get all deadlines for caseload students
  const deadlines = await db
    .select()
    .from(complianceDeadlines)
    .where(inArray(complianceDeadlines.studentId, studentIds))

  // Get student names
  const studentData = await db
    .select({ id: users.id, name: users.name })
    .from(users)
    .where(inArray(users.id, studentIds))

  const studentMap = new Map(studentData.map((s) => [s.id, s.name ?? 'Unknown']))

  // Compute stats
  const now = new Date()
  const stats = {
    total: deadlines.length,
    overdue: 0,
    critical: 0,
    warning: 0,
    ok: 0,
    complete: 0,
  }

  const enrichedDeadlines = deadlines
    .map((d) => {
      const status = getComplianceStatus(d.dueDate, d.completedAt)
      if (status.level === 'overdue') stats.overdue++
      else if (status.level === 'critical') stats.critical++
      else if (status.level === 'warning') stats.warning++
      else if (status.level === 'complete') stats.complete++
      else stats.ok++

      return {
        ...d,
        studentName: studentMap.get(d.studentId) ?? 'Unknown',
        complianceStatus: status,
      }
    })
    .sort((a, b) => {
      // Sort: overdue first, then by due date ascending
      const aLevel = a.complianceStatus.level
      const bLevel = b.complianceStatus.level
      const levelOrder = { overdue: 0, critical: 1, warning: 2, ok: 3, complete: 4 }
      const aOrder = levelOrder[aLevel] ?? 5
      const bOrder = levelOrder[bLevel] ?? 5
      if (aOrder !== bOrder) return aOrder - bOrder
      return new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime()
    })

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-serif text-2xl font-bold tracking-tight text-stone-900">
          Compliance Dashboard
        </h1>
        <p className="text-stone-500 text-sm mt-1">
          Track IEP compliance deadlines across your caseload.
        </p>
      </div>

      {/* Summary stats */}
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
        <div className="rounded-xl p-4 bg-stone-100 text-stone-700">
          <p className="text-2xl font-bold">{stats.total}</p>
          <p className="text-xs font-medium opacity-80">Total Deadlines</p>
        </div>
        <div className="rounded-xl p-4 bg-stone-800 text-white">
          <div className="flex items-center gap-1">
            <AlertTriangle className="size-4" />
            <p className="text-2xl font-bold">{stats.overdue}</p>
          </div>
          <p className="text-xs font-medium opacity-80">Overdue</p>
        </div>
        <div className="rounded-xl p-4 bg-rose-50 text-rose-700">
          <p className="text-2xl font-bold">{stats.critical}</p>
          <p className="text-xs font-medium opacity-80">&lt;15 Days</p>
        </div>
        <div className="rounded-xl p-4 bg-amber-50 text-amber-700">
          <p className="text-2xl font-bold">{stats.warning}</p>
          <p className="text-xs font-medium opacity-80">15-30 Days</p>
        </div>
        <div className="rounded-xl p-4 bg-emerald-50 text-emerald-700">
          <p className="text-2xl font-bold">{stats.ok + stats.complete}</p>
          <p className="text-xs font-medium opacity-80">On Track</p>
        </div>
      </div>

      {/* Deadline table */}
      <Card className="bg-white rounded-xl">
        <CardHeader>
          <CardTitle className="font-serif text-lg text-stone-800">All Deadlines</CardTitle>
        </CardHeader>
        <CardContent>
          {enrichedDeadlines.length === 0 ? (
            <p className="text-sm text-stone-400 text-center py-8">No deadlines tracked.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-stone-200 text-left">
                    <th className="py-2 px-3 text-xs font-medium text-stone-500 uppercase tracking-wider">Student</th>
                    <th className="py-2 px-3 text-xs font-medium text-stone-500 uppercase tracking-wider">Type</th>
                    <th className="py-2 px-3 text-xs font-medium text-stone-500 uppercase tracking-wider">Due Date</th>
                    <th className="py-2 px-3 text-xs font-medium text-stone-500 uppercase tracking-wider">Status</th>
                    <th className="py-2 px-3 text-xs font-medium text-stone-500 uppercase tracking-wider">Notes</th>
                  </tr>
                </thead>
                <tbody>
                  {enrichedDeadlines.map((d) => {
                    const rowColor =
                      d.complianceStatus.level === 'overdue'
                        ? 'bg-stone-50'
                        : d.complianceStatus.level === 'critical'
                          ? 'bg-rose-50/30'
                          : d.complianceStatus.level === 'warning'
                            ? 'bg-amber-50/30'
                            : ''

                    return (
                      <tr key={d.id} className={`border-b border-stone-100 ${rowColor}`}>
                        <td className="py-3 px-3 font-medium text-stone-800">
                          {d.studentName}
                        </td>
                        <td className="py-3 px-3 text-stone-600">
                          {deadlineTypeLabels[d.type] ?? d.type}
                        </td>
                        <td className="py-3 px-3 text-stone-600">
                          {format(new Date(d.dueDate), 'MMM d, yyyy')}
                        </td>
                        <td className="py-3 px-3">
                          <ComplianceBadge
                            dueDate={d.dueDate}
                            completedAt={d.completedAt}
                          />
                        </td>
                        <td className="py-3 px-3 text-stone-400 text-xs max-w-[200px] truncate">
                          {d.notes ?? 'N/A'}
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
