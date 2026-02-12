'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { AlertTriangle, Lightbulb, Users } from 'lucide-react'

interface GapData {
  standardCode: string
  standardDescription: string
  classSize: number
  assessedCount: number
  belowProficientCount: number
  belowProficientPercent: number
  averageScore: number
  studentsBelow: {
    studentId: string
    studentName: string
    level: string
    score: number
  }[]
  isGap: boolean
}

interface Recommendation {
  standardCode: string
  activities: string[]
  groupingStrategy: string
}

interface GapAnalysisResponse {
  classSize: number
  gaps: GapData[]
  recommendations: Recommendation[]
}

export function GapAnalysisButton({ classId }: { classId: string }) {
  const [open, setOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const [data, setData] = useState<GapAnalysisResponse | null>(null)
  const [loadingRecs, setLoadingRecs] = useState(false)

  async function fetchGaps(withRecs: boolean) {
    const setter = withRecs ? setLoadingRecs : setLoading
    setter(true)
    try {
      const url = `/api/mastery/gaps?classId=${classId}${withRecs ? '&withRecommendations=true' : ''}`
      const res = await fetch(url)
      if (res.ok) {
        const json = await res.json()
        setData(json)
      }
    } catch (error) {
      console.error('Failed to fetch gaps:', error)
    } finally {
      setter(false)
    }
  }

  function handleOpen() {
    setOpen(true)
    if (!data) {
      fetchGaps(false)
    }
  }

  function handleGetRecommendations() {
    fetchGaps(true)
  }

  const gapStandards = data?.gaps.filter((g) => g.isGap) ?? []
  const recMap = new Map(
    (data?.recommendations ?? []).map((r) => [r.standardCode, r])
  )

  return (
    <>
      <Button
        variant="outline"
        onClick={handleOpen}
        className="border-stone-300 text-stone-700 hover:bg-stone-100"
      >
        <AlertTriangle className="size-4 mr-2 text-amber-600" />
        Find Gaps
      </Button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="font-serif text-stone-900">
              Standards Gap Analysis
            </DialogTitle>
            <DialogDescription className="text-stone-500">
              Standards where a majority of the class is below proficient.
            </DialogDescription>
          </DialogHeader>

          {loading ? (
            <div className="space-y-4 py-4">
              <Skeleton className="h-20 w-full" />
              <Skeleton className="h-20 w-full" />
              <Skeleton className="h-20 w-full" />
            </div>
          ) : data ? (
            <div className="space-y-6 py-2">
              {gapStandards.length === 0 ? (
                <div className="text-center py-8">
                  <p className="text-stone-500">
                    No major gaps found. Most students are at or above
                    proficient across assessed standards.
                  </p>
                </div>
              ) : (
                <>
                  <p className="text-sm text-stone-600">
                    Found{' '}
                    <span className="font-semibold text-stone-800">
                      {gapStandards.length}
                    </span>{' '}
                    standard{gapStandards.length === 1 ? '' : 's'} where
                    more than half the class is below proficient.
                  </p>

                  {gapStandards.map((gap) => {
                    const rec = recMap.get(gap.standardCode)

                    return (
                      <div
                        key={gap.standardCode}
                        className="rounded-lg border border-stone-200 p-4 space-y-3"
                      >
                        <div className="flex items-start justify-between gap-2">
                          <div>
                            <p className="font-medium text-stone-800 text-sm">
                              {gap.standardCode}
                            </p>
                            <p className="text-xs text-stone-500 mt-0.5">
                              {gap.standardDescription}
                            </p>
                          </div>
                          <Badge
                            variant="outline"
                            className="shrink-0 text-xs bg-rose-50 text-rose-700 border-rose-200"
                          >
                            {gap.belowProficientPercent}% below
                          </Badge>
                        </div>

                        <div className="flex items-center gap-4 text-xs text-stone-500">
                          <span>
                            Avg Score:{' '}
                            <span className="font-medium text-stone-700">
                              {gap.averageScore}%
                            </span>
                          </span>
                          <span className="flex items-center gap-1">
                            <Users className="size-3" />
                            {gap.belowProficientCount}/{gap.classSize}{' '}
                            below proficient
                          </span>
                        </div>

                        {/* Students below proficient */}
                        <div className="flex flex-wrap gap-1">
                          {gap.studentsBelow.map((s) => (
                            <Badge
                              key={s.studentId}
                              variant="outline"
                              className={`text-[10px] ${
                                s.level === 'beginning'
                                  ? 'bg-rose-50 text-rose-700 border-rose-200'
                                  : 'bg-amber-50 text-amber-700 border-amber-200'
                              }`}
                            >
                              {s.studentName} ({s.score}%)
                            </Badge>
                          ))}
                        </div>

                        {/* AI Recommendations */}
                        {rec && (
                          <div className="mt-3 rounded bg-blue-50 border border-blue-100 p-3 space-y-2">
                            <p className="flex items-center gap-1.5 text-xs font-medium text-blue-800">
                              <Lightbulb className="size-3.5" />
                              Reteach Suggestions
                            </p>
                            <ul className="space-y-1">
                              {rec.activities.map((activity, i) => (
                                <li
                                  key={i}
                                  className="text-xs text-blue-700 pl-4 relative before:content-[''] before:absolute before:left-1 before:top-1.5 before:size-1.5 before:rounded-full before:bg-blue-400"
                                >
                                  {activity}
                                </li>
                              ))}
                            </ul>
                            <p className="text-[10px] text-blue-600 italic">
                              Grouping: {rec.groupingStrategy}
                            </p>
                          </div>
                        )}
                      </div>
                    )
                  })}

                  {/* Get recommendations button */}
                  {data.recommendations.length === 0 && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={handleGetRecommendations}
                      disabled={loadingRecs}
                      className="w-full border-blue-200 text-blue-700 hover:bg-blue-50"
                    >
                      <Lightbulb className="size-4 mr-2" />
                      {loadingRecs
                        ? 'Generating recommendations...'
                        : 'Get AI Reteach Recommendations'}
                    </Button>
                  )}
                </>
              )}
            </div>
          ) : null}
        </DialogContent>
      </Dialog>
    </>
  )
}
