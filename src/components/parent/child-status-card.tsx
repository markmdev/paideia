'use client'

import Link from 'next/link'
import { Users, TrendingUp, BookOpen, ChevronRight } from 'lucide-react'
import { Card, CardContent, CardHeader } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { formatGradeLevel } from '@/lib/format'

interface ChildStatusCardProps {
  child: {
    id: string
    name: string | null
    gradeLevel: string | null
    overallStatus: 'good' | 'watch' | 'concern'
    averageScore: number | null
    subjects: { subject: string; averageMastery: number | null }[]
    enrolledClasses: { name: string; subject: string }[]
    recentGrades: {
      assignment: string
      subject: string
      letterGrade: string | null
    }[]
  }
}

const statusConfig = {
  good: {
    label: 'On Track',
    color: 'bg-emerald-100 text-emerald-800 border-emerald-200',
    dot: 'bg-emerald-500',
    border: 'border-emerald-200 hover:border-emerald-300',
  },
  watch: {
    label: 'Needs Attention',
    color: 'bg-amber-100 text-amber-800 border-amber-200',
    dot: 'bg-amber-500',
    border: 'border-amber-200 hover:border-amber-300',
  },
  concern: {
    label: 'Falling Behind',
    color: 'bg-rose-100 text-rose-800 border-rose-200',
    dot: 'bg-rose-500',
    border: 'border-rose-200 hover:border-rose-300',
  },
}

export function ChildStatusCard({ child }: ChildStatusCardProps) {
  const status = statusConfig[child.overallStatus]

  return (
    <Link href={`/dashboard/children/${child.id}`}>
      <Card
        className={`group relative overflow-hidden transition-all hover:shadow-md cursor-pointer h-full ${status.border}`}
      >
        <div
          className={`absolute top-0 left-0 w-1.5 h-full ${status.dot} opacity-80`}
        />
        <CardHeader className="pb-3 pl-6">
          <div className="flex items-start justify-between gap-2">
            <div className="flex items-center gap-3">
              <div className="rounded-full bg-stone-100 p-2.5">
                <Users className="size-5 text-stone-600" />
              </div>
              <div>
                <h3 className="font-serif font-semibold text-base leading-tight">
                  {child.name}
                </h3>
                {child.gradeLevel && (
                  <p className="text-xs text-muted-foreground mt-0.5">
                    {formatGradeLevel(child.gradeLevel)}
                  </p>
                )}
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Badge className={`text-[11px] px-2 py-0.5 ${status.color} border`}>
                <span className={`inline-block size-1.5 rounded-full ${status.dot} mr-1.5`} />
                {status.label}
              </Badge>
              <ChevronRight className="size-4 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-3 pl-6">
          {child.averageScore !== null && (
            <div className="flex items-center gap-2 text-sm">
              <TrendingUp className="size-3.5 text-stone-500" />
              <span className="text-muted-foreground">Average:</span>
              <span className="font-medium">{child.averageScore}%</span>
            </div>
          )}

          {child.enrolledClasses.length > 0 && (
            <div className="flex items-start gap-2 text-sm">
              <BookOpen className="size-3.5 text-stone-500 mt-0.5" />
              <div className="flex flex-wrap gap-1">
                {child.enrolledClasses.slice(0, 4).map((c) => (
                  <Badge
                    key={c.name}
                    variant="outline"
                    className="text-[10px] font-normal px-1.5 py-0"
                  >
                    {c.subject}
                  </Badge>
                ))}
                {child.enrolledClasses.length > 4 && (
                  <Badge
                    variant="outline"
                    className="text-[10px] font-normal px-1.5 py-0"
                  >
                    +{child.enrolledClasses.length - 4} more
                  </Badge>
                )}
              </div>
            </div>
          )}

          {child.recentGrades.length > 0 && (
            <div className="pt-2 border-t">
              <p className="text-[11px] text-muted-foreground mb-1.5">
                Recent Grades
              </p>
              <div className="space-y-1">
                {child.recentGrades.slice(0, 3).map((g, i) => (
                  <div
                    key={i}
                    className="flex items-center justify-between text-xs"
                  >
                    <span className="text-muted-foreground truncate max-w-[180px]">
                      {g.assignment}
                    </span>
                    <span className="font-medium">{g.letterGrade ?? 'N/A'}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </Link>
  )
}
