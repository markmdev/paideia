import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import type { LucideIcon } from 'lucide-react'

interface StatCardProps {
  label: string
  value: number | string
  description?: string
  icon: LucideIcon
}

export function StatCard({ label, value, description, icon: Icon }: StatCardProps) {
  return (
    <Card className="bg-stone-50/50 border-stone-200">
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <CardTitle className="text-sm font-medium text-stone-600">
          {label}
        </CardTitle>
        <div className="rounded-md bg-amber-50 p-1.5">
          <Icon className="size-4 text-amber-600" />
        </div>
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-bold text-stone-900">
          {typeof value === 'number' ? value.toLocaleString() : value}
        </div>
        {description && (
          <p className="text-xs text-stone-500 mt-1">{description}</p>
        )}
      </CardContent>
    </Card>
  )
}
