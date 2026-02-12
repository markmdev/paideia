import { auth } from '@/lib/auth'
import { db } from '@/lib/db'
import { rubrics, rubricCriteria } from '@/lib/db/schema'
import { eq, and } from 'drizzle-orm'
import { redirect, notFound } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft, Pencil, Trash2, FileText } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { RubricGrid } from '@/components/rubrics/rubric-grid'
import { RubricDetailActions } from './rubric-detail-actions'

export default async function RubricDetailPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const session = await auth()
  if (!session?.user) {
    redirect('/login')
  }

  const { id } = await params

  const [rubric] = await db
    .select()
    .from(rubrics)
    .where(and(eq(rubrics.id, id), eq(rubrics.teacherId, session.user.id)))
    .limit(1)

  if (!rubric) {
    notFound()
  }

  const criteria = await db
    .select()
    .from(rubricCriteria)
    .where(eq(rubricCriteria.rubricId, id))

  const rubricData = {
    id: rubric.id,
    title: rubric.title,
    description: rubric.description,
    type: rubric.type,
    levels: JSON.parse(rubric.levels) as string[],
    criteria: criteria.map((c) => ({
      id: c.id,
      name: c.name,
      description: c.description,
      weight: c.weight,
      descriptors: JSON.parse(c.descriptors) as Record<string, string>,
    })),
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div className="flex items-start gap-3">
          <Button variant="ghost" size="icon" asChild className="mt-1">
            <Link href="/dashboard/rubrics">
              <ArrowLeft className="size-4" />
            </Link>
          </Button>
          <div>
            <div className="flex items-center gap-3 mb-1">
              <h1 className="text-2xl font-bold tracking-tight">
                {rubric.title}
              </h1>
              <Badge variant="secondary" className="capitalize">
                {rubric.type}
              </Badge>
              {rubric.isTemplate && (
                <Badge variant="outline">Template</Badge>
              )}
            </div>
            {rubric.description && (
              <p className="text-muted-foreground text-sm max-w-2xl">
                {rubric.description}
              </p>
            )}
            <p className="text-xs text-muted-foreground mt-2">
              Created{' '}
              {rubric.createdAt.toLocaleDateString('en-US', {
                month: 'long',
                day: 'numeric',
                year: 'numeric',
              })}
              {' \u00b7 '}
              {criteria.length} {criteria.length === 1 ? 'criterion' : 'criteria'}
              {' \u00b7 '}
              {rubricData.levels.length} proficiency levels
            </p>
          </div>
        </div>

        <RubricDetailActions rubricId={rubric.id} />
      </div>

      {/* Rubric grid */}
      <RubricGrid rubric={rubricData} />
    </div>
  )
}
