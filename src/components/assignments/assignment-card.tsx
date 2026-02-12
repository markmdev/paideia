'use client'

import Link from 'next/link'
import { format } from 'date-fns'
import {
  FileText,
  BookOpen,
  FlaskConical,
  Presentation,
  PenLine,
  Calendar,
  CheckCircle2,
  Clock,
  GraduationCap,
} from 'lucide-react'
import { Card, CardContent, CardHeader } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'

function formatGradeLevel(grade: string | number | null): string {
  if (!grade) return 'N/A'
  const n = typeof grade === 'string' ? parseInt(grade, 10) : grade
  if (isNaN(n)) return String(grade)
  const suffixes: Record<number, string> = { 1: 'st', 2: 'nd', 3: 'rd' }
  const suffix = (n % 100 >= 11 && n % 100 <= 13) ? 'th' : (suffixes[n % 10] || 'th')
  return `${n}${suffix} Grade`
}

const typeConfig: Record<
  string,
  { label: string; icon: React.ComponentType<{ className?: string }>; color: string }
> = {
  essay: { label: 'Essay', icon: PenLine, color: 'bg-amber-100 text-amber-800' },
  quiz: { label: 'Quiz', icon: BookOpen, color: 'bg-sky-100 text-sky-800' },
  short_answer: { label: 'Short Answer', icon: FileText, color: 'bg-emerald-100 text-emerald-800' },
  project: { label: 'Project', icon: Presentation, color: 'bg-violet-100 text-violet-800' },
  lab_report: { label: 'Lab Report', icon: FlaskConical, color: 'bg-rose-100 text-rose-800' },
}

const statusConfig: Record<string, { label: string; color: string }> = {
  draft: { label: 'Draft', color: 'bg-slate-100 text-slate-700' },
  published: { label: 'Published', color: 'bg-emerald-100 text-emerald-700' },
  grading: { label: 'Grading', color: 'bg-amber-100 text-amber-700' },
  completed: { label: 'Completed', color: 'bg-sky-100 text-sky-700' },
}

interface AssignmentCardProps {
  assignment: {
    id: string
    title: string
    description: string
    type: string
    gradeLevel: string
    subject: string
    status: string
    dueDate: string | Date | null
    rubricId: string | null
    createdAt: string | Date
  }
  className?: string | null
  rubricTitle?: string | null
}

export function AssignmentCard({
  assignment,
  className,
  rubricTitle,
}: AssignmentCardProps) {
  const typeInfo = typeConfig[assignment.type] ?? typeConfig.essay
  const statusInfo = statusConfig[assignment.status] ?? statusConfig.draft
  const TypeIcon = typeInfo.icon

  return (
    <Link href={`/dashboard/assignments/${assignment.id}`}>
      <Card className="group relative overflow-hidden transition-all hover:shadow-md hover:border-amber-200 cursor-pointer h-full">
        <div className="absolute top-0 left-0 w-1 h-full bg-amber-400 opacity-0 group-hover:opacity-100 transition-opacity" />
        <CardHeader className="pb-3">
          <div className="flex items-start justify-between gap-2">
            <div className="flex items-center gap-2 min-w-0">
              <div className={`rounded-lg p-1.5 ${typeInfo.color}`}>
                <TypeIcon className="size-3.5" />
              </div>
              <h3 className="font-semibold text-sm leading-tight line-clamp-2">
                {assignment.title}
              </h3>
            </div>
            <Badge
              className={`shrink-0 text-[10px] px-1.5 py-0.5 ${statusInfo.color} border-0`}
            >
              {statusInfo.label}
            </Badge>
          </div>
        </CardHeader>
        <CardContent className="space-y-3">
          <p className="text-xs text-muted-foreground line-clamp-2">
            {assignment.description}
          </p>

          <div className="flex flex-wrap gap-1.5">
            <Badge variant="outline" className="text-[10px] font-normal px-1.5 py-0">
              {assignment.subject}
            </Badge>
            <Badge variant="outline" className="text-[10px] font-normal px-1.5 py-0">
              <GraduationCap className="size-2.5 mr-0.5" />
              {formatGradeLevel(assignment.gradeLevel)}
            </Badge>
          </div>

          <div className="flex items-center justify-between pt-1 border-t text-[11px] text-muted-foreground">
            <div className="flex items-center gap-3">
              {className && (
                <span className="flex items-center gap-1">
                  <BookOpen className="size-3" />
                  {className}
                </span>
              )}
              {assignment.dueDate && (
                <span className="flex items-center gap-1">
                  <Calendar className="size-3" />
                  {format(new Date(assignment.dueDate), 'MMM d')}
                </span>
              )}
            </div>
            {assignment.rubricId && (
              <span className="flex items-center gap-1 text-amber-600">
                <CheckCircle2 className="size-3" />
                Rubric
              </span>
            )}
          </div>
        </CardContent>
      </Card>
    </Link>
  )
}
