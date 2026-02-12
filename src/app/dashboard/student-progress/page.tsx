'use client'

import { useEffect, useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import {
  TrendingUp,
  TrendingDown,
  Minus,
  Star,
  Target,
  BookOpen,
  CheckCircle,
  Sparkles,
} from 'lucide-react'

interface SubjectMastery {
  subject: string
  masteryLevel: string
  score: number
}

interface RecentSubmission {
  assignmentTitle: string
  subject: string
  score: number | null
  submittedAt: string
}

interface ProgressData {
  overallAverage: number | null
  totalCompleted: number
  masteryTrend: 'improving' | 'stable' | 'declining'
  subjectMastery: SubjectMastery[]
  recentSubmissions: RecentSubmission[]
  strengths: string[]
  areasForGrowth: string[]
}

function levelColor(level: string): { bg: string; text: string } {
  switch (level) {
    case 'advanced':
    case 'proficient':
      return { bg: 'bg-emerald-100', text: 'text-emerald-700' }
    case 'developing':
      return { bg: 'bg-amber-100', text: 'text-amber-700' }
    default:
      return { bg: 'bg-rose-100', text: 'text-rose-700' }
  }
}

function scoreColor(score: number | null): string {
  if (score === null) return 'text-stone-400'
  if (score >= 80) return 'text-emerald-600'
  if (score >= 60) return 'text-amber-600'
  return 'text-rose-600'
}

function scoreBg(score: number | null): string {
  if (score === null) return 'bg-stone-100'
  if (score >= 80) return 'bg-emerald-50'
  if (score >= 60) return 'bg-amber-50'
  return 'bg-rose-50'
}

function progressBarColor(score: number): string {
  if (score >= 80) return 'bg-emerald-400'
  if (score >= 60) return 'bg-amber-400'
  return 'bg-rose-400'
}

function TrendIcon({ trend }: { trend: string }) {
  if (trend === 'improving')
    return <TrendingUp className="size-5 text-emerald-500" />
  if (trend === 'declining')
    return <TrendingDown className="size-5 text-rose-500" />
  return <Minus className="size-5 text-stone-400" />
}

function trendLabel(trend: string): string {
  if (trend === 'improving') return 'Improving'
  if (trend === 'declining') return 'Keep going'
  return 'Steady'
}

function trendMessage(trend: string): string {
  if (trend === 'improving')
    return "You're making great progress! Keep up the good work."
  if (trend === 'declining')
    return "Every expert was once a beginner. Let's keep working at it!"
  return "You're on a steady path. Consistency is the key to growth."
}

export default function StudentProgressPage() {
  const [data, setData] = useState<ProgressData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    fetch('/api/student/progress')
      .then(async (res) => {
        if (!res.ok) {
          const body = await res.json().catch(() => ({}))
          throw new Error(body.error ?? 'Failed to load progress')
        }
        return res.json()
      })
      .then((d) => setData(d))
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false))
  }, [])

  if (loading) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-serif font-bold tracking-tight">
            My Progress
          </h1>
          <p className="text-muted-foreground text-sm">Loading your data...</p>
        </div>
        <div className="grid gap-4 sm:grid-cols-3">
          {[1, 2, 3].map((i) => (
            <Card key={i} className="animate-pulse">
              <CardContent className="py-8">
                <div className="h-8 bg-stone-200 rounded w-16 mx-auto mb-2" />
                <div className="h-4 bg-stone-100 rounded w-24 mx-auto" />
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-serif font-bold tracking-tight">
            My Progress
          </h1>
          <p className="text-muted-foreground text-sm">{error}</p>
        </div>
      </div>
    )
  }

  if (!data) return null

  const hasData =
    data.subjectMastery.length > 0 || data.recentSubmissions.length > 0

  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-serif font-bold tracking-tight">
          My Progress
        </h1>
        <p className="text-muted-foreground text-sm">
          {hasData
            ? trendMessage(data.masteryTrend)
            : 'Your progress will appear here as your work gets graded.'}
        </p>
      </div>

      {/* Section 1: Overall Stats */}
      <div className="grid gap-4 sm:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-stone-500">
              Average Score
            </CardTitle>
            <Star className="size-4 text-amber-400" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">
              {data.overallAverage != null ? `${data.overallAverage}%` : 'N/A'}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              Across all graded work
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-stone-500">
              Assignments Completed
            </CardTitle>
            <CheckCircle className="size-4 text-emerald-400" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{data.totalCompleted}</div>
            <p className="text-xs text-muted-foreground mt-1">
              Total graded assignments
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-stone-500">
              Mastery Trend
            </CardTitle>
            <TrendIcon trend={data.masteryTrend} />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">
              {trendLabel(data.masteryTrend)}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              Based on recent performance
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Section 2: Subject Mastery */}
      {data.subjectMastery.length > 0 && (
        <div className="space-y-3">
          <div className="flex items-center gap-2">
            <BookOpen className="size-4 text-stone-500" />
            <h2 className="text-lg font-serif font-semibold">
              Subject Mastery
            </h2>
          </div>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {data.subjectMastery.map((sm) => {
              const lc = levelColor(sm.masteryLevel)
              const barWidth = Math.max(5, Math.min(100, sm.score))
              return (
                <Card key={sm.subject}>
                  <CardHeader className="pb-2">
                    <div className="flex items-center justify-between">
                      <CardTitle className="text-sm font-medium">
                        {sm.subject}
                      </CardTitle>
                      <Badge
                        className={`text-[10px] px-1.5 py-0 ${lc.bg} ${lc.text} border-0 capitalize`}
                      >
                        {sm.masteryLevel}
                      </Badge>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-2">
                    <div className="flex items-end justify-between">
                      <span className="text-2xl font-bold">{sm.score}%</span>
                      <span className="text-xs text-muted-foreground">
                        mastery
                      </span>
                    </div>
                    <div className="h-2 rounded-full bg-stone-100 overflow-hidden">
                      <div
                        className={`h-full rounded-full ${progressBarColor(sm.score)} transition-all`}
                        style={{ width: `${barWidth}%` }}
                      />
                    </div>
                    {sm.score >= 80 && (
                      <p className="text-xs text-emerald-600">
                        Great job — keep it up!
                      </p>
                    )}
                    {sm.score >= 60 && sm.score < 80 && (
                      <p className="text-xs text-amber-600">
                        Getting there — a little more practice will help.
                      </p>
                    )}
                    {sm.score < 60 && (
                      <p className="text-xs text-rose-600">
                        This is a growing area — you can do it!
                      </p>
                    )}
                  </CardContent>
                </Card>
              )
            })}
          </div>
        </div>
      )}

      {/* Section 3: Recent Work */}
      {data.recentSubmissions.length > 0 && (
        <div className="space-y-3">
          <div className="flex items-center gap-2">
            <Target className="size-4 text-stone-500" />
            <h2 className="text-lg font-serif font-semibold">Recent Work</h2>
          </div>
          <Card>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Assignment</TableHead>
                    <TableHead>Subject</TableHead>
                    <TableHead className="text-right">Score</TableHead>
                    <TableHead className="text-right">Date</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {data.recentSubmissions.map((sub, i) => (
                    <TableRow key={i}>
                      <TableCell className="font-medium">
                        {sub.assignmentTitle}
                      </TableCell>
                      <TableCell className="text-muted-foreground">
                        {sub.subject}
                      </TableCell>
                      <TableCell className="text-right">
                        <span
                          className={`inline-flex items-center justify-center rounded-md px-2 py-0.5 text-xs font-semibold ${scoreColor(sub.score)} ${scoreBg(sub.score)}`}
                        >
                          {sub.score != null ? `${sub.score}%` : 'N/A'}
                        </span>
                      </TableCell>
                      <TableCell className="text-right text-muted-foreground text-xs">
                        {new Date(sub.submittedAt).toLocaleDateString(
                          'en-US',
                          {
                            month: 'short',
                            day: 'numeric',
                            year: 'numeric',
                          }
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Section 4: Strengths & Growth Areas */}
      {(data.strengths.length > 0 || data.areasForGrowth.length > 0) && (
        <div className="grid gap-6 sm:grid-cols-2">
          {/* Strengths */}
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <Sparkles className="size-4 text-emerald-500" />
              <h2 className="text-lg font-serif font-semibold">
                What I&apos;m Good At
              </h2>
            </div>
            <Card className="bg-emerald-50/50 border-emerald-200">
              <CardContent className="pt-4">
                {data.strengths.length > 0 ? (
                  <div className="flex flex-wrap gap-2">
                    {data.strengths.map((s, i) => (
                      <Badge
                        key={i}
                        className="bg-emerald-100 text-emerald-700 border-0 text-xs px-2.5 py-1"
                      >
                        {s}
                      </Badge>
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground">
                    Keep working — your strengths will show up here soon!
                  </p>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Growth areas */}
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <Target className="size-4 text-amber-500" />
              <h2 className="text-lg font-serif font-semibold">
                Areas to Improve
              </h2>
            </div>
            <Card className="bg-amber-50/50 border-amber-200">
              <CardContent className="pt-4">
                {data.areasForGrowth.length > 0 ? (
                  <div className="flex flex-wrap gap-2">
                    {data.areasForGrowth.map((a, i) => (
                      <Badge
                        key={i}
                        className="bg-amber-100 text-amber-700 border-0 text-xs px-2.5 py-1"
                      >
                        {a}
                      </Badge>
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground">
                    Nothing here right now — keep up the great work!
                  </p>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      )}

      {/* Empty state */}
      {!hasData && (
        <Card className="bg-stone-50 border-stone-200">
          <CardContent className="py-12 text-center">
            <TrendingUp className="size-10 text-stone-300 mx-auto mb-3" />
            <h3 className="text-sm font-medium mb-1">No progress data yet</h3>
            <p className="text-xs text-muted-foreground max-w-sm mx-auto">
              As your assignments are graded, your progress, strengths, and
              growth areas will appear here. Every step forward counts!
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
