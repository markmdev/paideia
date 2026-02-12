import Link from 'next/link'
import { format } from 'date-fns'
import { Calendar, Target, TrendingUp, User } from 'lucide-react'
import { Card, CardContent, CardHeader } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { ComplianceBadge } from '@/components/iep/compliance-badge'

const statusConfig: Record<string, { label: string; color: string }> = {
  draft: { label: 'Draft', color: 'bg-stone-100 text-stone-700' },
  review: { label: 'In Review', color: 'bg-amber-100 text-amber-700' },
  active: { label: 'Active', color: 'bg-emerald-100 text-emerald-700' },
  archived: { label: 'Archived', color: 'bg-stone-200 text-stone-500' },
}

interface IepCardProps {
  iep: {
    id: string
    status: string
    disabilityCategory: string | null
    endDate: Date | null
  }
  student: {
    name: string | null
  }
  goalCount: number
  goalsMetCount: number
  latestProgressSummary?: string | null
}

export function IepCard({ iep, student, goalCount, goalsMetCount }: IepCardProps) {
  const statusInfo = statusConfig[iep.status] ?? statusConfig.draft
  const progressPercent = goalCount > 0 ? Math.round((goalsMetCount / goalCount) * 100) : 0

  return (
    <Link href={`/dashboard/iep/${iep.id}`}>
      <Card className="group relative overflow-hidden transition-all hover:shadow-md hover:border-amber-200 cursor-pointer h-full bg-stone-50/50 rounded-xl">
        <div className="absolute top-0 left-0 w-1 h-full bg-amber-400 opacity-0 group-hover:opacity-100 transition-opacity" />
        <CardHeader className="pb-3">
          <div className="flex items-start justify-between gap-2">
            <div className="flex items-center gap-2 min-w-0">
              <div className="rounded-full bg-amber-50 p-2">
                <User className="size-4 text-amber-600" />
              </div>
              <div className="min-w-0">
                <h3 className="font-semibold text-sm leading-tight text-stone-900 truncate">
                  {student.name ?? 'Unknown Student'}
                </h3>
                {iep.disabilityCategory && (
                  <p className="text-[11px] text-stone-500 truncate mt-0.5">
                    {iep.disabilityCategory}
                  </p>
                )}
              </div>
            </div>
            <Badge className={`shrink-0 text-[10px] px-1.5 py-0.5 border-0 ${statusInfo.color}`}>
              {statusInfo.label}
            </Badge>
          </div>
        </CardHeader>
        <CardContent className="space-y-3">
          {/* Goal progress */}
          <div>
            <div className="flex items-center justify-between text-[11px] text-stone-500 mb-1.5">
              <span className="flex items-center gap-1">
                <Target className="size-3" />
                {goalCount} goal{goalCount !== 1 ? 's' : ''}
              </span>
              <span className="flex items-center gap-1">
                <TrendingUp className="size-3" />
                {goalsMetCount} met
              </span>
            </div>
            <div className="h-1.5 bg-stone-200 rounded-full overflow-hidden">
              <div
                className="h-full bg-emerald-500 rounded-full transition-all"
                style={{ width: `${progressPercent}%` }}
              />
            </div>
          </div>

          {/* Deadline and meta */}
          <div className="flex items-center justify-between pt-1 border-t border-stone-200 text-[11px] text-stone-500">
            {iep.endDate ? (
              <span className="flex items-center gap-1">
                <Calendar className="size-3" />
                Review: {format(new Date(iep.endDate), 'MMM d, yyyy')}
              </span>
            ) : (
              <span className="text-stone-400">No review date set</span>
            )}
            {iep.endDate && (
              <ComplianceBadge dueDate={new Date(iep.endDate)} />
            )}
          </div>
        </CardContent>
      </Card>
    </Link>
  )
}
