import { redirect } from 'next/navigation'
import Link from 'next/link'
import { auth } from '@/lib/auth'
import { db } from '@/lib/db'
import { ieps, iepGoals, users } from '@/lib/db/schema'
import { eq, sql, inArray } from 'drizzle-orm'
import { ShieldCheck, Plus } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { IepCard } from '@/components/iep/iep-card'

export default async function IepCaseloadPage() {
  const session = await auth()
  if (!session?.user) {
    redirect('/login')
  }

  // Fetch all IEPs authored by this SPED teacher
  const teacherIeps = await db
    .select({
      id: ieps.id,
      status: ieps.status,
      disabilityCategory: ieps.disabilityCategory,
      endDate: ieps.endDate,
      studentId: ieps.studentId,
      startDate: ieps.startDate,
    })
    .from(ieps)
    .where(eq(ieps.authorId, session.user.id))

  if (teacherIeps.length === 0) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="font-serif text-2xl font-bold tracking-tight text-stone-900">
              IEP Management
            </h1>
            <p className="text-stone-500 text-sm mt-1">
              Manage your caseload of Individualized Education Programs.
            </p>
          </div>
          <Button asChild className="bg-amber-600 hover:bg-amber-700 text-white gap-2">
            <Link href="/dashboard/iep/new">
              <Plus className="size-4" />
              New IEP
            </Link>
          </Button>
        </div>
        <div className="flex flex-col items-center justify-center py-16 text-center">
          <div className="rounded-full bg-amber-50 p-6 mb-4">
            <ShieldCheck className="size-10 text-amber-400" />
          </div>
          <h3 className="text-lg font-semibold text-stone-800 mb-1">No IEPs on your caseload</h3>
          <p className="text-sm text-stone-500 max-w-md mb-6">
            Create your first IEP to start managing student goals,
            progress monitoring, and compliance tracking.
          </p>
          <Button asChild className="bg-amber-600 hover:bg-amber-700 text-white gap-2">
            <Link href="/dashboard/iep/new">
              <Plus className="size-4" />
              Create First IEP
            </Link>
          </Button>
        </div>
      </div>
    )
  }

  // Get student info for each IEP
  const studentIds = [...new Set(teacherIeps.map((i) => i.studentId))]
  const studentData = await db
    .select({ id: users.id, name: users.name })
    .from(users)
    .where(inArray(users.id, studentIds))

  const studentMap = new Map(studentData.map((s) => [s.id, s]))

  // Get goal counts per IEP
  const iepIds = teacherIeps.map((i) => i.id)
  const goalStats = await db
    .select({
      iepId: iepGoals.iepId,
      totalGoals: sql<number>`count(*)`.as('total_goals'),
      metGoals: sql<number>`count(*) filter (where ${iepGoals.status} = 'met')`.as('met_goals'),
    })
    .from(iepGoals)
    .where(inArray(iepGoals.iepId, iepIds))
    .groupBy(iepGoals.iepId)

  const goalStatsMap = new Map(goalStats.map((g) => [g.iepId, g]))

  // Separate active vs. other IEPs
  const activeIeps = teacherIeps.filter((i) => i.status === 'active')
  const otherIeps = teacherIeps.filter((i) => i.status !== 'active')

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-serif text-2xl font-bold tracking-tight text-stone-900">
            IEP Management
          </h1>
          <p className="text-stone-500 text-sm mt-1">
            {teacherIeps.length} student{teacherIeps.length !== 1 ? 's' : ''} on your caseload
          </p>
        </div>
        <Button asChild className="bg-amber-600 hover:bg-amber-700 text-white gap-2">
          <Link href="/dashboard/iep/new">
            <Plus className="size-4" />
            New IEP
          </Link>
        </Button>
      </div>

      {/* Summary stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          { label: 'Total Caseload', value: teacherIeps.length, color: 'bg-stone-100 text-stone-700' },
          { label: 'Active IEPs', value: activeIeps.length, color: 'bg-emerald-50 text-emerald-700' },
          { label: 'In Draft/Review', value: teacherIeps.filter((i) => i.status === 'draft' || i.status === 'review').length, color: 'bg-amber-50 text-amber-700' },
          {
            label: 'Upcoming Deadlines',
            value: teacherIeps.filter((i) => {
              if (!i.endDate) return false
              const days = Math.ceil((new Date(i.endDate).getTime() - Date.now()) / (1000 * 60 * 60 * 24))
              return days >= 0 && days <= 30
            }).length,
            color: 'bg-rose-50 text-rose-700',
          },
        ].map((stat) => (
          <div key={stat.label} className={`rounded-xl p-4 ${stat.color}`}>
            <p className="text-2xl font-bold">{stat.value}</p>
            <p className="text-xs font-medium opacity-80 mt-0.5">{stat.label}</p>
          </div>
        ))}
      </div>

      {/* Active IEPs */}
      {activeIeps.length > 0 && (
        <div>
          <h2 className="font-serif text-lg font-semibold text-stone-800 mb-3">Active IEPs</h2>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {activeIeps.map((iep) => {
              const student = studentMap.get(iep.studentId)
              const stats = goalStatsMap.get(iep.id)
              return (
                <IepCard
                  key={iep.id}
                  iep={iep}
                  student={{ name: student?.name ?? null }}
                  goalCount={stats?.totalGoals ?? 0}
                  goalsMetCount={stats?.metGoals ?? 0}
                />
              )
            })}
          </div>
        </div>
      )}

      {/* Draft/Review/Archived IEPs */}
      {otherIeps.length > 0 && (
        <div>
          <h2 className="font-serif text-lg font-semibold text-stone-800 mb-3">Drafts & Archived</h2>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {otherIeps.map((iep) => {
              const student = studentMap.get(iep.studentId)
              const stats = goalStatsMap.get(iep.id)
              return (
                <IepCard
                  key={iep.id}
                  iep={iep}
                  student={{ name: student?.name ?? null }}
                  goalCount={stats?.totalGoals ?? 0}
                  goalsMetCount={stats?.metGoals ?? 0}
                />
              )
            })}
          </div>
        </div>
      )}
    </div>
  )
}
