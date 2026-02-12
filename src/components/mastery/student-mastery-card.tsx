'use client'

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip'
import { TrendingUp, TrendingDown, Minus } from 'lucide-react'

interface Assessment {
  level: string
  score: number
  assessedAt: string
  sourceTitle: string
}

interface StandardMastery {
  standardId: string
  standardCode: string
  standardDescription: string
  currentLevel: string
  currentScore: number
  trend: 'improving' | 'stable' | 'declining'
  lastAssessedAt: string
  assessmentCount: number
  recentAssessments: Assessment[]
}

interface StudentMasteryCardProps {
  student: {
    id: string
    name: string
    email?: string | null
  }
  mastery: StandardMastery[]
}

const LEVEL_COLORS: Record<string, string> = {
  advanced: 'bg-blue-100 text-blue-800 border-blue-200',
  proficient: 'bg-emerald-100 text-emerald-800 border-emerald-200',
  developing: 'bg-amber-100 text-amber-800 border-amber-200',
  beginning: 'bg-rose-100 text-rose-800 border-rose-200',
}

const LEVEL_LABEL: Record<string, string> = {
  beginning: 'Beginning',
  developing: 'Developing',
  proficient: 'Proficient',
  advanced: 'Advanced',
}

const TREND_CONFIG: Record<
  string,
  { icon: typeof TrendingUp; color: string; label: string }
> = {
  improving: {
    icon: TrendingUp,
    color: 'text-emerald-600',
    label: 'Improving',
  },
  stable: {
    icon: Minus,
    color: 'text-amber-600',
    label: 'Stable',
  },
  declining: {
    icon: TrendingDown,
    color: 'text-rose-600',
    label: 'Declining',
  },
}

export function StudentMasteryCard({
  student,
  mastery,
}: StudentMasteryCardProps) {
  const overallAvg =
    mastery.length > 0
      ? Math.round(
          mastery.reduce((sum, m) => sum + m.currentScore, 0) / mastery.length
        )
      : 0

  return (
    <Card className="border-stone-200">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base text-stone-900">
            {student.name}
          </CardTitle>
          <span className="text-sm font-medium text-stone-600">
            Avg: {overallAvg}%
          </span>
        </div>
      </CardHeader>
      <CardContent className="pt-0">
        {mastery.length === 0 ? (
          <p className="text-xs text-stone-400 italic">
            No mastery data yet
          </p>
        ) : (
          <TooltipProvider delayDuration={200}>
            <div className="space-y-2">
              {mastery.map((m) => {
                const trendConfig = TREND_CONFIG[m.trend]
                const TrendIcon = trendConfig.icon

                return (
                  <div
                    key={m.standardId}
                    className="flex items-center gap-2 py-1"
                  >
                    {/* Standard code */}
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <span className="text-xs font-mono text-stone-500 w-16 shrink-0 truncate cursor-help">
                          {m.standardCode}
                        </span>
                      </TooltipTrigger>
                      <TooltipContent side="right" className="max-w-xs text-xs">
                        <p className="font-medium">{m.standardCode}</p>
                        <p className="text-muted-foreground mt-1">
                          {m.standardDescription}
                        </p>
                      </TooltipContent>
                    </Tooltip>

                    {/* Mastery level badge */}
                    <Badge
                      variant="outline"
                      className={`text-[10px] px-1.5 py-0 ${LEVEL_COLORS[m.currentLevel] ?? ''}`}
                    >
                      {LEVEL_LABEL[m.currentLevel] ?? m.currentLevel}
                    </Badge>

                    {/* Score bar */}
                    <div className="flex-1 h-2 rounded-full bg-stone-100 overflow-hidden">
                      <div
                        className={`h-full rounded-full transition-all ${
                          m.currentLevel === 'advanced'
                            ? 'bg-blue-400'
                            : m.currentLevel === 'proficient'
                              ? 'bg-emerald-400'
                              : m.currentLevel === 'developing'
                                ? 'bg-amber-400'
                                : 'bg-rose-400'
                        }`}
                        style={{ width: `${m.currentScore}%` }}
                      />
                    </div>

                    {/* Score */}
                    <span className="text-xs font-medium text-stone-600 w-10 text-right">
                      {m.currentScore}%
                    </span>

                    {/* Trend indicator */}
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <span className={`shrink-0 ${trendConfig.color}`}>
                          <TrendIcon className="size-3.5" />
                        </span>
                      </TooltipTrigger>
                      <TooltipContent side="right" className="text-xs">
                        <p className="font-medium">{trendConfig.label}</p>
                        {m.recentAssessments.length > 0 && (
                          <div className="mt-1 space-y-0.5">
                            {m.recentAssessments.map((a, i) => (
                              <p key={i} className="text-muted-foreground">
                                {a.score}% -{' '}
                                {new Date(a.assessedAt).toLocaleDateString(
                                  'en-US',
                                  { month: 'short', day: 'numeric' }
                                )}{' '}
                                ({a.sourceTitle})
                              </p>
                            ))}
                          </div>
                        )}
                      </TooltipContent>
                    </Tooltip>
                  </div>
                )
              })}
            </div>
          </TooltipProvider>
        )}
      </CardContent>
    </Card>
  )
}
