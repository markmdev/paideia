import { Badge } from '@/components/ui/badge'

interface ComplianceBadgeProps {
  dueDate: Date
  completedAt?: Date | null
  className?: string
}

function getDaysUntil(dueDate: Date): number {
  const now = new Date()
  now.setHours(0, 0, 0, 0)
  const due = new Date(dueDate)
  due.setHours(0, 0, 0, 0)
  return Math.ceil((due.getTime() - now.getTime()) / (1000 * 60 * 60 * 24))
}

export function getComplianceStatus(dueDate: Date, completedAt?: Date | null) {
  if (completedAt) {
    return { label: 'Complete', color: 'bg-emerald-100 text-emerald-800', level: 'complete' as const }
  }
  const days = getDaysUntil(dueDate)
  if (days < 0) {
    return { label: 'Overdue', color: 'bg-stone-800 text-white', level: 'overdue' as const }
  }
  if (days < 15) {
    return { label: `${days}d left`, color: 'bg-rose-100 text-rose-800', level: 'critical' as const }
  }
  if (days <= 30) {
    return { label: `${days}d left`, color: 'bg-amber-100 text-amber-800', level: 'warning' as const }
  }
  return { label: `${days}d left`, color: 'bg-emerald-100 text-emerald-800', level: 'ok' as const }
}

export function ComplianceBadge({ dueDate, completedAt, className }: ComplianceBadgeProps) {
  const status = getComplianceStatus(dueDate, completedAt)

  return (
    <Badge className={`text-[10px] px-2 py-0.5 border-0 font-medium ${status.color} ${className ?? ''}`}>
      {status.label}
    </Badge>
  )
}
