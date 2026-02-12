'use client'

import Link from 'next/link'
import { format } from 'date-fns'
import { User, Loader2 } from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'

const statusConfig: Record<string, { label: string; color: string; spinning?: boolean }> = {
  submitted: { label: 'Submitted', color: 'bg-blue-100 text-blue-700' },
  grading: { label: 'Grading', color: 'bg-amber-100 text-amber-700', spinning: true },
  graded: { label: 'Graded', color: 'bg-emerald-100 text-emerald-700' },
  returned: { label: 'Returned', color: 'bg-stone-100 text-stone-600' },
}

interface SubmissionCardProps {
  submission: {
    id: string
    status: string
    submittedAt: string
    totalScore: number | null
    maxScore: number | null
  }
  studentName: string | null
  assignmentId: string
}

export function SubmissionCard({
  submission,
  studentName,
  assignmentId,
}: SubmissionCardProps) {
  const status = statusConfig[submission.status] ?? statusConfig.submitted
  const initials = studentName
    ? studentName
        .split(' ')
        .map((n) => n[0])
        .join('')
        .toUpperCase()
        .slice(0, 2)
    : '??'

  const scorePercent =
    submission.totalScore != null && submission.maxScore != null && submission.maxScore > 0
      ? Math.round((submission.totalScore / submission.maxScore) * 100)
      : null

  return (
    <Link href={`/dashboard/grading/${assignmentId}/${submission.id}`}>
      <Card className="group transition-all hover:shadow-sm hover:border-amber-200 cursor-pointer bg-stone-50/50">
        <CardContent className="flex items-center gap-3 py-3 px-4">
          {/* Student avatar */}
          <div className="flex-shrink-0 size-9 rounded-full bg-amber-100 text-amber-700 flex items-center justify-center text-xs font-semibold">
            {initials}
          </div>

          {/* Name and date */}
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-stone-800 truncate">
              {studentName ?? 'Unknown Student'}
            </p>
            <p className="text-[11px] text-stone-500">
              Submitted {format(new Date(submission.submittedAt), 'MMM d, h:mm a')}
            </p>
          </div>

          {/* Score */}
          {scorePercent != null && (
            <div className="flex-shrink-0 text-right mr-2">
              <p className="text-sm font-semibold text-stone-800">{scorePercent}%</p>
              <p className="text-[10px] text-stone-500">
                {submission.totalScore}/{submission.maxScore}
              </p>
            </div>
          )}

          {/* Status badge */}
          <Badge className={`shrink-0 text-[10px] px-2 py-0.5 border-0 gap-1 ${status.color}`}>
            {status.spinning && <Loader2 className="size-3 animate-spin" />}
            {status.label}
          </Badge>
        </CardContent>
      </Card>
    </Link>
  )
}
