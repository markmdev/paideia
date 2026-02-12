import { redirect, notFound } from 'next/navigation'
import Link from 'next/link'
import { auth } from '@/lib/auth'
import { db } from '@/lib/db'
import { ieps, iepGoals, users } from '@/lib/db/schema'
import { eq } from 'drizzle-orm'
import { ArrowLeft } from 'lucide-react'
import { EditIepForm } from './edit-iep-form'

interface PageProps {
  params: Promise<{ iepId: string }>
}

export default async function EditIepPage({ params }: PageProps) {
  const { iepId } = await params
  const session = await auth()
  if (!session?.user) {
    redirect('/login')
  }

  const iep = await db.query.ieps.findFirst({
    where: eq(ieps.id, iepId),
  })

  if (!iep) {
    notFound()
  }

  const student = await db.query.users.findFirst({
    where: eq(users.id, iep.studentId),
    columns: { id: true, name: true },
  })

  const goals = await db
    .select()
    .from(iepGoals)
    .where(eq(iepGoals.iepId, iepId))

  interface Accommodation {
    type: string
    description: string
  }

  const accommodations: Accommodation[] = iep.accommodations
    ? (JSON.parse(iep.accommodations) as Accommodation[])
    : []

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <div className="flex items-center gap-3">
        <Link
          href={`/dashboard/iep/${iepId}`}
          className="p-1 rounded-md hover:bg-stone-100 transition-colors"
        >
          <ArrowLeft className="size-5 text-stone-500" />
        </Link>
        <div>
          <h1 className="font-serif text-2xl font-bold tracking-tight text-stone-900">
            Edit IEP: {student?.name ?? 'Student'}
          </h1>
          <p className="text-stone-500 text-sm mt-1">
            Update present levels, goals, and accommodations.
          </p>
        </div>
      </div>

      <EditIepForm
        iep={{
          id: iep.id,
          presentLevels: iep.presentLevels ?? '',
          disabilityCategory: iep.disabilityCategory ?? '',
          status: iep.status,
          studentId: iep.studentId,
        }}
        existingGoals={goals.map((g) => ({
          id: g.id,
          area: g.area,
          goalText: g.goalText,
          baseline: g.baseline ?? '',
          target: g.target ?? '',
          measureMethod: g.measureMethod ?? '',
          frequency: g.frequency ?? '',
          status: g.status,
          aiGenerated: g.aiGenerated,
        }))}
        existingAccommodations={accommodations.map((a, i) => ({
          id: `existing-${i}`,
          type: a.type,
          description: a.description,
        }))}
      />
    </div>
  )
}
