'use client'

import { useState } from 'react'
import { User, TrendingUp, TrendingDown, Minus, Sparkles, Loader2 } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Separator } from '@/components/ui/separator'
import { ProgressChart } from '@/components/iep/progress-chart'
import { DataEntryForm } from '@/components/iep/data-entry-form'
import { toast } from 'sonner'

interface DataPointData {
  id: string
  goalId: string
  value: number
  unit: string
  date: string
  notes: string | null
}

interface GoalData {
  id: string
  area: string
  goalText: string
  baseline: string | null
  target: string | null
  status: string
  dataPoints: DataPointData[]
  latestValue: number | null
  latestUnit: string | null
  trend: 'up' | 'down' | 'flat' | null
}

interface StudentProgressData {
  iepId: string
  studentId: string
  studentName: string
  goals: GoalData[]
}

interface ProgressMonitoringClientProps {
  studentProgress: StudentProgressData[]
}

export function ProgressMonitoringClient({ studentProgress }: ProgressMonitoringClientProps) {
  const [selectedStudentIdx, setSelectedStudentIdx] = useState(0)
  const [isGeneratingNarrative, setIsGeneratingNarrative] = useState<string | null>(null)

  const currentStudent = studentProgress[selectedStudentIdx]

  const handleGenerateNarrative = async (goalId: string) => {
    if (!currentStudent) return
    setIsGeneratingNarrative(goalId)
    try {
      const response = await fetch(`/api/iep/${currentStudent.iepId}/progress/narrative`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ goalId }),
      })
      if (!response.ok) throw new Error('Failed')
      const data = (await response.json()) as { narrative?: string }
      if (data.narrative) {
        toast.success('Narrative generated. Check the IEP detail page.')
      }
    } catch {
      toast.error('Failed to generate narrative.')
    } finally {
      setIsGeneratingNarrative(null)
    }
  }

  if (!currentStudent) return null

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      {/* Left sidebar: student list + data entry */}
      <div className="space-y-4">
        {/* Student selector */}
        <Card className="bg-white rounded-xl">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-semibold text-stone-700">Students</CardTitle>
          </CardHeader>
          <CardContent className="space-y-1">
            {studentProgress.map((sp, i) => (
              <button
                key={sp.studentId}
                onClick={() => setSelectedStudentIdx(i)}
                className={`w-full flex items-center gap-2 px-3 py-2 rounded-lg text-sm text-left transition-colors ${
                  i === selectedStudentIdx
                    ? 'bg-amber-50 text-amber-900 font-medium'
                    : 'hover:bg-stone-50 text-stone-700'
                }`}
              >
                <User className="size-4 shrink-0" />
                <div className="min-w-0">
                  <p className="truncate">{sp.studentName}</p>
                  <p className="text-[10px] text-stone-400">
                    {sp.goals.length} goal{sp.goals.length !== 1 ? 's' : ''}
                  </p>
                </div>
              </button>
            ))}
          </CardContent>
        </Card>

        {/* Quick data entry */}
        <Card className="bg-white rounded-xl">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-semibold text-stone-700">
              Quick Data Entry
            </CardTitle>
          </CardHeader>
          <CardContent>
            <DataEntryForm
              goals={currentStudent.goals.map((g) => ({
                id: g.id,
                area: g.area,
                goalText: g.goalText,
              }))}
              studentId={currentStudent.studentId}
              iepId={currentStudent.iepId}
              onSuccess={() => {
                // In a real app, we'd refresh the data here
                toast.info('Refresh the page to see updated charts.')
              }}
            />
          </CardContent>
        </Card>
      </div>

      {/* Right main area: progress charts */}
      <div className="lg:col-span-2 space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="font-serif text-lg font-semibold text-stone-800">
            {currentStudent.studentName}
          </h2>
          <Badge variant="outline" className="text-xs border-stone-300">
            {currentStudent.goals.length} active goal{currentStudent.goals.length !== 1 ? 's' : ''}
          </Badge>
        </div>

        {currentStudent.goals.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 text-center bg-stone-50 rounded-xl border border-stone-200">
            <TrendingUp className="size-8 text-stone-300 mb-3" />
            <p className="text-sm text-stone-500">No goals defined for this student.</p>
          </div>
        ) : (
          currentStudent.goals.map((goal) => {
            const baselineNum = goal.baseline ? parseFloat(goal.baseline) : null
            const targetNum = goal.target ? parseFloat(goal.target) : null
            const chartPoints = goal.dataPoints.map((dp) => ({
              value: dp.value,
              date: new Date(dp.date),
              notes: dp.notes,
            }))

            return (
              <Card key={goal.id} className="bg-white rounded-xl">
                <CardHeader className="pb-2">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <div className="flex items-center gap-2">
                        <CardTitle className="text-sm font-semibold text-stone-800">
                          {goal.area}
                        </CardTitle>
                        {goal.trend && (
                          <div className="flex items-center gap-0.5">
                            {goal.trend === 'up' && <TrendingUp className="size-3.5 text-emerald-500" />}
                            {goal.trend === 'down' && <TrendingDown className="size-3.5 text-rose-500" />}
                            {goal.trend === 'flat' && <Minus className="size-3.5 text-amber-500" />}
                            <Badge className={`text-[10px] px-1.5 py-0 border-0 ${
                              goal.trend === 'up' ? 'bg-emerald-100 text-emerald-700' :
                              goal.trend === 'down' ? 'bg-rose-100 text-rose-700' :
                              'bg-amber-100 text-amber-700'
                            }`}>
                              {goal.trend === 'up' ? 'On Track' : goal.trend === 'down' ? 'Off Track' : 'Flat'}
                            </Badge>
                          </div>
                        )}
                      </div>
                      <p className="text-xs text-stone-500 mt-1 line-clamp-2">{goal.goalText}</p>
                    </div>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleGenerateNarrative(goal.id)}
                      disabled={isGeneratingNarrative === goal.id}
                      className="gap-1 border-stone-300 shrink-0"
                    >
                      {isGeneratingNarrative === goal.id ? (
                        <Loader2 className="size-3 animate-spin" />
                      ) : (
                        <Sparkles className="size-3" />
                      )}
                      Generate Narrative
                    </Button>
                  </div>

                  {/* Meta */}
                  <div className="flex items-center gap-4 mt-2 text-[11px] text-stone-400">
                    {goal.baseline && <span>Baseline: {goal.baseline}</span>}
                    {goal.target && <span>Target: {goal.target}</span>}
                    <span>{goal.dataPoints.length} data points</span>
                    {goal.latestValue != null && (
                      <span className="font-medium text-stone-600">
                        Latest: {goal.latestValue} {goal.latestUnit}
                      </span>
                    )}
                  </div>
                </CardHeader>
                <CardContent>
                  <ProgressChart
                    dataPoints={chartPoints}
                    baselineValue={!isNaN(baselineNum ?? NaN) ? baselineNum : null}
                    targetValue={!isNaN(targetNum ?? NaN) ? targetNum : null}
                    unit={goal.latestUnit ?? undefined}
                    height={200}
                  />
                </CardContent>
              </Card>
            )
          })
        )}
      </div>
    </div>
  )
}
