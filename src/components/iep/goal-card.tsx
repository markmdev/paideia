import { Target, TrendingUp, TrendingDown, Minus, CheckCircle2 } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent } from '@/components/ui/card'

const statusConfig: Record<string, { label: string; color: string; icon: typeof Target }> = {
  active: { label: 'Active', color: 'bg-emerald-100 text-emerald-700', icon: Target },
  met: { label: 'Met', color: 'bg-blue-100 text-blue-700', icon: CheckCircle2 },
  not_met: { label: 'Not Met', color: 'bg-rose-100 text-rose-700', icon: TrendingDown },
  discontinued: { label: 'Discontinued', color: 'bg-stone-100 text-stone-500', icon: Minus },
}

interface GoalCardProps {
  goal: {
    id: string
    area: string
    goalText: string
    baseline: string | null
    target: string | null
    status: string
    aiGenerated: boolean
  }
  latestDataPoint?: {
    value: number
    unit: string
    date: Date
  } | null
  dataPointCount?: number
  trend?: 'up' | 'down' | 'flat' | null
}

export function GoalCard({ goal, latestDataPoint, dataPointCount = 0, trend }: GoalCardProps) {
  const statusInfo = statusConfig[goal.status] ?? statusConfig.active
  const StatusIcon = statusInfo.icon

  return (
    <Card className="bg-white rounded-xl border border-stone-200 hover:border-stone-300 transition-colors">
      <CardContent className="p-4 space-y-3">
        <div className="flex items-start justify-between gap-2">
          <div className="flex items-center gap-2">
            <Badge variant="outline" className="text-[10px] font-normal px-1.5 py-0 text-stone-600 border-stone-300">
              {goal.area}
            </Badge>
            <Badge className={`text-[10px] px-1.5 py-0.5 border-0 ${statusInfo.color}`}>
              <StatusIcon className="size-2.5 mr-0.5" />
              {statusInfo.label}
            </Badge>
            {goal.aiGenerated && (
              <Badge variant="outline" className="text-[10px] font-normal px-1.5 py-0 text-stone-400 border-stone-200">
                AI-generated
              </Badge>
            )}
          </div>
        </div>

        <p className="text-sm text-stone-700 leading-relaxed line-clamp-3">
          {goal.goalText}
        </p>

        {/* Baseline and target */}
        {(goal.baseline || goal.target) && (
          <div className="flex gap-4 text-[11px]">
            {goal.baseline && (
              <div>
                <span className="text-stone-400 font-medium">Baseline: </span>
                <span className="text-stone-600">{goal.baseline}</span>
              </div>
            )}
            {goal.target && (
              <div>
                <span className="text-stone-400 font-medium">Target: </span>
                <span className="text-stone-600">{goal.target}</span>
              </div>
            )}
          </div>
        )}

        {/* Mini progress indicator */}
        <div className="flex items-center justify-between pt-2 border-t border-stone-100 text-[11px] text-stone-500">
          <div className="flex items-center gap-3">
            {latestDataPoint && (
              <span className="font-medium text-stone-700">
                Latest: {latestDataPoint.value} {latestDataPoint.unit}
              </span>
            )}
            <span>{dataPointCount} data point{dataPointCount !== 1 ? 's' : ''}</span>
          </div>
          {trend && (
            <div className="flex items-center gap-1">
              {trend === 'up' && <TrendingUp className="size-3.5 text-emerald-500" />}
              {trend === 'down' && <TrendingDown className="size-3.5 text-rose-500" />}
              {trend === 'flat' && <Minus className="size-3.5 text-amber-500" />}
              <span className={
                trend === 'up' ? 'text-emerald-600' :
                trend === 'down' ? 'text-rose-600' :
                'text-amber-600'
              }>
                {trend === 'up' ? 'On track' : trend === 'down' ? 'Off track' : 'Flat'}
              </span>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  )
}
