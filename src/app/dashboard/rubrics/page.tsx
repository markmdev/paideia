import { auth } from '@/lib/auth'
import { db } from '@/lib/db'
import { rubrics, rubricCriteria } from '@/lib/db/schema'
import { eq, desc } from 'drizzle-orm'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { Plus, ClipboardList, Calendar } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'

export default async function RubricsPage() {
  const session = await auth()
  if (!session?.user) {
    redirect('/login')
  }

  const allRubrics = await db
    .select()
    .from(rubrics)
    .where(eq(rubrics.teacherId, session.user.id))
    .orderBy(desc(rubrics.createdAt))

  const allCriteria = await db
    .select({ rubricId: rubricCriteria.rubricId })
    .from(rubricCriteria)

  const criteriaCountMap: Record<string, number> = {}
  for (const c of allCriteria) {
    criteriaCountMap[c.rubricId] = (criteriaCountMap[c.rubricId] ?? 0) + 1
  }

  const myRubrics = allRubrics.filter((r) => !r.isTemplate)
  const templateRubrics = allRubrics.filter((r) => r.isTemplate)

  return (
    <div className="space-y-8">
      {/* Page header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Rubrics</h1>
          <p className="text-muted-foreground">
            Create, manage, and reuse assessment rubrics across your assignments.
          </p>
        </div>
        <Button asChild>
          <Link href="/dashboard/rubrics/new">
            <Plus className="size-4" />
            Create Rubric
          </Link>
        </Button>
      </div>

      {/* My rubrics */}
      {myRubrics.length === 0 && templateRubrics.length === 0 ? (
        <Card className="border-dashed">
          <CardContent className="flex flex-col items-center justify-center py-16 text-center">
            <div className="rounded-full bg-muted p-4 mb-4">
              <ClipboardList className="size-8 text-muted-foreground" />
            </div>
            <h2 className="text-lg font-semibold mb-1">No rubrics yet</h2>
            <p className="text-sm text-muted-foreground max-w-md mb-6">
              Rubrics help you assess student work consistently. Create one from
              scratch or let AI generate a standards-aligned rubric for your
              next assignment.
            </p>
            <Button asChild>
              <Link href="/dashboard/rubrics/new">
                <Plus className="size-4" />
                Create Your First Rubric
              </Link>
            </Button>
          </CardContent>
        </Card>
      ) : (
        <>
          {myRubrics.length > 0 && (
            <div>
              <h2 className="text-lg font-semibold mb-4">My Rubrics</h2>
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {myRubrics.map((rubric) => {
                  const levels = JSON.parse(rubric.levels) as string[]
                  const count = criteriaCountMap[rubric.id] ?? 0
                  return (
                    <Link key={rubric.id} href={`/dashboard/rubrics/${rubric.id}`}>
                      <Card className="h-full hover:bg-accent/50 transition-colors cursor-pointer">
                        <CardHeader className="pb-3">
                          <div className="flex items-start justify-between gap-2">
                            <CardTitle className="text-base leading-tight">
                              {rubric.title}
                            </CardTitle>
                            <Badge
                              variant="secondary"
                              className="shrink-0 text-xs capitalize"
                            >
                              {rubric.type}
                            </Badge>
                          </div>
                          {rubric.description && (
                            <CardDescription className="line-clamp-2 text-xs">
                              {rubric.description}
                            </CardDescription>
                          )}
                        </CardHeader>
                        <CardContent className="pt-0">
                          <div className="flex items-center gap-4 text-xs text-muted-foreground">
                            <span className="flex items-center gap-1">
                              <ClipboardList className="size-3" />
                              {count} {count === 1 ? 'criterion' : 'criteria'}
                            </span>
                            <span className="flex items-center gap-1">
                              {levels.length} levels
                            </span>
                            <span className="flex items-center gap-1 ml-auto">
                              <Calendar className="size-3" />
                              {rubric.createdAt.toLocaleDateString('en-US', {
                                month: 'short',
                                day: 'numeric',
                                year: 'numeric',
                              })}
                            </span>
                          </div>
                        </CardContent>
                      </Card>
                    </Link>
                  )
                })}
              </div>
            </div>
          )}

          {templateRubrics.length > 0 && (
            <div>
              <h2 className="text-lg font-semibold mb-4">Templates</h2>
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {templateRubrics.map((rubric) => {
                  const levels = JSON.parse(rubric.levels) as string[]
                  const count = criteriaCountMap[rubric.id] ?? 0
                  return (
                    <Link key={rubric.id} href={`/dashboard/rubrics/${rubric.id}`}>
                      <Card className="h-full hover:bg-accent/50 transition-colors cursor-pointer border-dashed">
                        <CardHeader className="pb-3">
                          <div className="flex items-start justify-between gap-2">
                            <CardTitle className="text-base leading-tight">
                              {rubric.title}
                            </CardTitle>
                            <Badge variant="outline" className="shrink-0 text-xs">
                              Template
                            </Badge>
                          </div>
                          {rubric.description && (
                            <CardDescription className="line-clamp-2 text-xs">
                              {rubric.description}
                            </CardDescription>
                          )}
                        </CardHeader>
                        <CardContent className="pt-0">
                          <div className="flex items-center gap-4 text-xs text-muted-foreground">
                            <span className="flex items-center gap-1">
                              <ClipboardList className="size-3" />
                              {count} {count === 1 ? 'criterion' : 'criteria'}
                            </span>
                            <span className="flex items-center gap-1">
                              {levels.length} levels
                            </span>
                          </div>
                        </CardContent>
                      </Card>
                    </Link>
                  )
                })}
              </div>
            </div>
          )}
        </>
      )}
    </div>
  )
}
