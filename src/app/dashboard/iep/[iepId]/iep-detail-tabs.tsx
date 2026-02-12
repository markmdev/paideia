'use client'

import { useState } from 'react'
import { format } from 'date-fns'
import {
  FileText,
  Target,
  Shield,
  TrendingUp,
  CheckCircle2,
  Loader2,
  Sparkles,
  Plus,
  Clock,
  AlertTriangle,
} from 'lucide-react'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import { GoalCard } from '@/components/iep/goal-card'
import { ProgressChart } from '@/components/iep/progress-chart'
import { ComplianceBadge, getComplianceStatus } from '@/components/iep/compliance-badge'
import { toast } from 'sonner'

interface GoalData {
  id: string
  iepId: string
  area: string
  goalText: string
  baseline: string | null
  target: string | null
  measureMethod: string | null
  frequency: string | null
  timeline: string | null
  status: string
  similarityScore: number | null
  aiGenerated: boolean
  createdAt: string
  dataPoints: Array<{
    id: string
    goalId: string
    studentId: string
    value: number
    unit: string
    date: string
    notes: string | null
    recordedBy: string | null
  }>
  latestDataPoint: { value: number; unit: string; date: string } | null
  dataPointCount: number
  trend: 'up' | 'down' | 'flat' | null
}

interface Accommodation {
  type: string
  description: string
}

interface Modification {
  type: string
  description: string
}

interface RelatedService {
  service: string
  frequency: string
  location: string
  provider: string
}

interface DeadlineData {
  id: string
  type: string
  studentId: string
  dueDate: string
  status: string
  completedAt: string | null
  notes: string | null
}

interface IepDetailTabsProps {
  iep: {
    id: string
    presentLevels: string | null
    status: string
    studentId: string
  }
  goals: GoalData[]
  accommodations: Accommodation[]
  modifications: Modification[]
  relatedServices: RelatedService[]
  deadlines: DeadlineData[]
  studentName: string
}

const deadlineTypeLabels: Record<string, string> = {
  initial_eval: 'Initial Evaluation',
  annual_review: 'Annual Review',
  triennial: 'Triennial Re-evaluation',
}

const accommodationTypeLabels: Record<string, string> = {
  instructional: 'Instructional',
  assessment: 'Assessment',
  environmental: 'Environmental',
  behavioral: 'Behavioral',
}

export function IepDetailTabs({
  iep,
  goals,
  accommodations,
  modifications,
  relatedServices,
  deadlines,
  studentName,
}: IepDetailTabsProps) {
  const [isRegenerating, setIsRegenerating] = useState(false)

  const handleRegeneratePresentLevels = async () => {
    setIsRegenerating(true)
    try {
      const response = await fetch('/api/iep/generate/present-levels', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ iepId: iep.id }),
      })
      if (!response.ok) throw new Error('Failed to regenerate')
      toast.success('Present levels regenerated. Refresh to see updates.')
    } catch {
      toast.error('Failed to regenerate present levels')
    } finally {
      setIsRegenerating(false)
    }
  }

  // Group accommodations by type
  const accommodationsByType = accommodations.reduce<Record<string, Accommodation[]>>((acc, item) => {
    const type = item.type
    if (!acc[type]) acc[type] = []
    acc[type].push(item)
    return acc
  }, {})

  return (
    <Tabs defaultValue="present-levels" className="space-y-4">
      <TabsList className="bg-stone-100 border border-stone-200">
        <TabsTrigger value="present-levels" className="gap-1.5 data-[state=active]:bg-white">
          <FileText className="size-3.5" />
          Present Levels
        </TabsTrigger>
        <TabsTrigger value="goals" className="gap-1.5 data-[state=active]:bg-white">
          <Target className="size-3.5" />
          Goals
        </TabsTrigger>
        <TabsTrigger value="accommodations" className="gap-1.5 data-[state=active]:bg-white">
          <Shield className="size-3.5" />
          Accommodations
        </TabsTrigger>
        <TabsTrigger value="progress" className="gap-1.5 data-[state=active]:bg-white">
          <TrendingUp className="size-3.5" />
          Progress
        </TabsTrigger>
        <TabsTrigger value="compliance" className="gap-1.5 data-[state=active]:bg-white">
          <CheckCircle2 className="size-3.5" />
          Compliance
        </TabsTrigger>
      </TabsList>

      {/* Present Levels Tab */}
      <TabsContent value="present-levels" className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="font-serif text-lg font-semibold text-stone-800">
            Present Levels of Performance
          </h2>
          <Button
            variant="outline"
            size="sm"
            onClick={handleRegeneratePresentLevels}
            disabled={isRegenerating}
            className="gap-1.5 border-stone-300"
          >
            {isRegenerating ? (
              <Loader2 className="size-3.5 animate-spin" />
            ) : (
              <Sparkles className="size-3.5" />
            )}
            Regenerate with AI
          </Button>
        </div>

        {iep.presentLevels ? (
          <Card className="bg-white rounded-xl">
            <CardContent className="p-6">
              <div className="prose prose-stone prose-sm max-w-none">
                {iep.presentLevels.split('\n\n').map((paragraph, i) => {
                  // Check if paragraph looks like a header (short line ending with colon)
                  const lines = paragraph.split('\n')
                  if (lines[0].endsWith(':') && lines[0].length < 80) {
                    return (
                      <div key={i} className="mb-4">
                        <h3 className="font-serif text-sm font-semibold text-stone-800 mb-2">
                          {lines[0]}
                        </h3>
                        {lines.slice(1).map((line, j) => (
                          <p key={j} className="text-sm text-stone-700 leading-relaxed mb-2">
                            {line}
                          </p>
                        ))}
                      </div>
                    )
                  }
                  return (
                    <p key={i} className="text-sm text-stone-700 leading-relaxed mb-4">
                      {paragraph}
                    </p>
                  )
                })}
              </div>
              <div className="mt-4 pt-3 border-t border-stone-100">
                <p className="text-[10px] text-stone-400 italic">
                  Generated by AI &mdash; Review required. All content must be verified and approved by the IEP team.
                </p>
              </div>
            </CardContent>
          </Card>
        ) : (
          <div className="flex flex-col items-center justify-center py-12 text-center bg-stone-50 rounded-xl border border-stone-200">
            <FileText className="size-8 text-stone-300 mb-3" />
            <p className="text-sm text-stone-500 mb-4">
              No present levels written yet.
            </p>
            <Button
              variant="outline"
              size="sm"
              onClick={handleRegeneratePresentLevels}
              disabled={isRegenerating}
              className="gap-1.5 border-stone-300"
            >
              {isRegenerating ? (
                <Loader2 className="size-3.5 animate-spin" />
              ) : (
                <Sparkles className="size-3.5" />
              )}
              Generate with AI
            </Button>
          </div>
        )}
      </TabsContent>

      {/* Goals Tab */}
      <TabsContent value="goals" className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="font-serif text-lg font-semibold text-stone-800">
            Annual Goals
          </h2>
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={async () => {
                try {
                  const response = await fetch('/api/iep/generate/goals', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ iepId: iep.id }),
                  })
                  if (!response.ok) throw new Error('Failed')
                  toast.success('AI goal suggestions generated. Refresh to see.')
                } catch {
                  toast.error('Failed to generate goal suggestions')
                }
              }}
              className="gap-1.5 border-stone-300"
            >
              <Sparkles className="size-3.5" />
              AI Suggest Goals
            </Button>
            <Button asChild size="sm" className="bg-amber-600 hover:bg-amber-700 text-white gap-1.5">
              <a href={`/dashboard/iep/${iep.id}/edit`}>
                <Plus className="size-3.5" />
                Add Goal
              </a>
            </Button>
          </div>
        </div>

        {goals.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 text-center bg-stone-50 rounded-xl border border-stone-200">
            <Target className="size-8 text-stone-300 mb-3" />
            <p className="text-sm text-stone-500">No goals defined yet.</p>
          </div>
        ) : (
          <div className="space-y-3">
            {goals.map((goal) => (
              <GoalCard
                key={goal.id}
                goal={goal}
                latestDataPoint={
                  goal.latestDataPoint
                    ? { ...goal.latestDataPoint, date: new Date(goal.latestDataPoint.date) }
                    : null
                }
                dataPointCount={goal.dataPointCount}
                trend={goal.trend}
              />
            ))}
          </div>
        )}
      </TabsContent>

      {/* Accommodations Tab */}
      <TabsContent value="accommodations" className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="font-serif text-lg font-semibold text-stone-800">
            Accommodations & Modifications
          </h2>
          <Button asChild variant="outline" size="sm" className="gap-1.5 border-stone-300">
            <a href={`/dashboard/iep/${iep.id}/edit`}>
              <Plus className="size-3.5" />
              Manage
            </a>
          </Button>
        </div>

        {/* Accommodations by category */}
        {Object.keys(accommodationsByType).length > 0 ? (
          <div className="space-y-4">
            {Object.entries(accommodationsByType).map(([type, items]) => (
              <Card key={type} className="bg-white rounded-xl">
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-semibold text-stone-700">
                    {accommodationTypeLabels[type] ?? type} Accommodations
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <ul className="space-y-2">
                    {items.map((item, i) => (
                      <li key={i} className="flex items-start gap-2 text-sm text-stone-600">
                        <CheckCircle2 className="size-4 text-emerald-500 mt-0.5 shrink-0" />
                        {item.description}
                      </li>
                    ))}
                  </ul>
                </CardContent>
              </Card>
            ))}
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center py-8 text-center bg-stone-50 rounded-xl border border-stone-200">
            <p className="text-sm text-stone-500">No accommodations documented yet.</p>
          </div>
        )}

        {/* Modifications */}
        {modifications.length > 0 && (
          <>
            <Separator />
            <Card className="bg-white rounded-xl">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-semibold text-stone-700">
                  Modifications
                </CardTitle>
              </CardHeader>
              <CardContent>
                <ul className="space-y-2">
                  {modifications.map((mod, i) => (
                    <li key={i} className="flex items-start gap-2 text-sm text-stone-600">
                      <Badge variant="outline" className="text-[10px] px-1.5 py-0 shrink-0 border-stone-300">
                        {mod.type}
                      </Badge>
                      {mod.description}
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>
          </>
        )}

        {/* Related Services */}
        {relatedServices.length > 0 && (
          <>
            <Separator />
            <Card className="bg-white rounded-xl">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-semibold text-stone-700">
                  Related Services
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {relatedServices.map((svc, i) => (
                    <div key={i} className="flex items-start justify-between gap-4 text-sm">
                      <div>
                        <p className="font-medium text-stone-800">{svc.service}</p>
                        <p className="text-stone-500 text-xs">
                          {svc.provider} &middot; {svc.location}
                        </p>
                      </div>
                      <Badge variant="outline" className="text-[10px] shrink-0 border-stone-300">
                        {svc.frequency}
                      </Badge>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </>
        )}
      </TabsContent>

      {/* Progress Tab */}
      <TabsContent value="progress" className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="font-serif text-lg font-semibold text-stone-800">
            Progress Monitoring
          </h2>
          <Button asChild size="sm" className="bg-amber-600 hover:bg-amber-700 text-white gap-1.5">
            <a href="/dashboard/progress-monitoring">
              <Plus className="size-3.5" />
              Enter Data
            </a>
          </Button>
        </div>

        {goals.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 text-center bg-stone-50 rounded-xl border border-stone-200">
            <TrendingUp className="size-8 text-stone-300 mb-3" />
            <p className="text-sm text-stone-500">Define goals first to track progress.</p>
          </div>
        ) : (
          <div className="space-y-6">
            {goals.map((goal) => {
              // Parse numeric baseline/target for chart
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
                    <div className="flex items-center justify-between">
                      <CardTitle className="text-sm font-semibold text-stone-800">
                        {goal.area}
                      </CardTitle>
                      <div className="flex items-center gap-2">
                        {goal.trend && (
                          <Badge className={`text-[10px] px-1.5 py-0.5 border-0 ${
                            goal.trend === 'up' ? 'bg-emerald-100 text-emerald-700' :
                            goal.trend === 'down' ? 'bg-rose-100 text-rose-700' :
                            'bg-amber-100 text-amber-700'
                          }`}>
                            {goal.trend === 'up' ? 'On Track' : goal.trend === 'down' ? 'Off Track' : 'Flat'}
                          </Badge>
                        )}
                        <span className="text-[11px] text-stone-400">
                          {goal.dataPointCount} data points
                        </span>
                      </div>
                    </div>
                    <p className="text-xs text-stone-500 line-clamp-2 mt-1">{goal.goalText}</p>
                  </CardHeader>
                  <CardContent>
                    <ProgressChart
                      dataPoints={chartPoints}
                      baselineValue={!isNaN(baselineNum ?? NaN) ? baselineNum : null}
                      targetValue={!isNaN(targetNum ?? NaN) ? targetNum : null}
                      unit={chartPoints[0]?.value != null ? goal.dataPoints[0]?.unit : undefined}
                      height={180}
                    />

                    {/* Recent data points list */}
                    {goal.dataPoints.length > 0 && (
                      <div className="mt-4 pt-3 border-t border-stone-100">
                        <p className="text-[11px] font-medium text-stone-500 uppercase tracking-wider mb-2">
                          Recent Entries
                        </p>
                        <div className="space-y-1.5 max-h-32 overflow-y-auto">
                          {goal.dataPoints.slice(0, 5).map((dp) => (
                            <div key={dp.id} className="flex items-center justify-between text-xs text-stone-600">
                              <span>
                                {format(new Date(dp.date), 'MMM d, yyyy')}
                              </span>
                              <span className="font-medium">
                                {dp.value} {dp.unit}
                              </span>
                              {dp.notes && (
                                <span className="text-stone-400 truncate max-w-[200px]">
                                  {dp.notes}
                                </span>
                              )}
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </CardContent>
                </Card>
              )
            })}
          </div>
        )}
      </TabsContent>

      {/* Compliance Tab */}
      <TabsContent value="compliance" className="space-y-4">
        <h2 className="font-serif text-lg font-semibold text-stone-800">
          Compliance & Deadlines
        </h2>

        {/* Deadline timeline */}
        {deadlines.length > 0 ? (
          <div className="space-y-3">
            {deadlines
              .sort((a, b) => new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime())
              .map((deadline) => {
                const dueDate = new Date(deadline.dueDate)
                const completedAt = deadline.completedAt ? new Date(deadline.completedAt) : null
                const status = getComplianceStatus(dueDate, completedAt)

                return (
                  <Card key={deadline.id} className={`bg-white rounded-xl border-l-4 ${
                    status.level === 'overdue' ? 'border-l-stone-800' :
                    status.level === 'critical' ? 'border-l-rose-500' :
                    status.level === 'warning' ? 'border-l-amber-500' :
                    status.level === 'complete' ? 'border-l-emerald-500' :
                    'border-l-emerald-400'
                  }`}>
                    <CardContent className="p-4">
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex items-start gap-3">
                          <div className={`rounded-full p-2 ${
                            status.level === 'overdue' ? 'bg-stone-100' :
                            status.level === 'critical' ? 'bg-rose-50' :
                            status.level === 'warning' ? 'bg-amber-50' :
                            'bg-emerald-50'
                          }`}>
                            {status.level === 'overdue' ? (
                              <AlertTriangle className="size-4 text-stone-700" />
                            ) : (
                              <Clock className="size-4 text-stone-500" />
                            )}
                          </div>
                          <div>
                            <p className="text-sm font-medium text-stone-800">
                              {deadlineTypeLabels[deadline.type] ?? deadline.type}
                            </p>
                            <p className="text-xs text-stone-500 mt-0.5">
                              Due: {format(dueDate, 'MMMM d, yyyy')}
                            </p>
                            {deadline.notes && (
                              <p className="text-xs text-stone-400 mt-1">{deadline.notes}</p>
                            )}
                          </div>
                        </div>
                        <ComplianceBadge
                          dueDate={dueDate}
                          completedAt={completedAt}
                        />
                      </div>
                    </CardContent>
                  </Card>
                )
              })}
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center py-8 text-center bg-stone-50 rounded-xl border border-stone-200">
            <p className="text-sm text-stone-500">No compliance deadlines tracked for this student.</p>
          </div>
        )}

        {/* Service delivery summary */}
        {relatedServices.length > 0 && (
          <>
            <Separator />
            <Card className="bg-white rounded-xl">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-semibold text-stone-700">
                  Service Delivery Tracking
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {relatedServices.map((svc, i) => (
                    <div key={i} className="flex items-center justify-between text-sm p-2 bg-stone-50 rounded-lg">
                      <div>
                        <span className="font-medium text-stone-800">{svc.service}</span>
                        <span className="text-stone-400 ml-2">{svc.frequency}</span>
                      </div>
                      <Badge variant="outline" className="text-[10px] border-stone-300">
                        {svc.provider}
                      </Badge>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </>
        )}
      </TabsContent>
    </Tabs>
  )
}
