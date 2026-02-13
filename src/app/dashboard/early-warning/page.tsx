'use client'

import { Fragment, useEffect, useState } from 'react'
import {
  AlertTriangle,
  TrendingDown,
  TrendingUp,
  Minus,
  ChevronDown,
  ChevronRight,
  Users,
  ShieldAlert,
  ShieldCheck,
  Sparkles,
} from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'

interface StudentRisk {
  id: string
  name: string
  email: string
  riskLevel: 'high_risk' | 'moderate_risk' | 'on_track'
  indicators: string[]
  recentScores: number[]
  trendDirection: 'declining' | 'stable' | 'improving'
  recommendations?: string[]
}

const riskConfig = {
  high_risk: {
    label: 'High Risk',
    badgeClass: 'bg-red-100 text-red-700 border-red-200',
    dotClass: 'bg-red-500',
  },
  moderate_risk: {
    label: 'Moderate',
    badgeClass: 'bg-amber-100 text-amber-700 border-amber-200',
    dotClass: 'bg-amber-500',
  },
  on_track: {
    label: 'On Track',
    badgeClass: 'bg-emerald-100 text-emerald-700 border-emerald-200',
    dotClass: 'bg-emerald-500',
  },
}

function TrendIcon({ direction }: { direction: string }) {
  switch (direction) {
    case 'declining':
      return <TrendingDown className="size-4 text-red-500" />
    case 'improving':
      return <TrendingUp className="size-4 text-emerald-500" />
    default:
      return <Minus className="size-4 text-stone-400" />
  }
}

export default function EarlyWarningPage() {
  const [students, setStudents] = useState<StudentRisk[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set())

  useEffect(() => {
    async function fetchData() {
      try {
        const res = await fetch('/api/early-warning')
        if (!res.ok) {
          if (res.status === 403) {
            throw new Error('You do not have permission to view this page.')
          }
          const body = await res.json().catch(() => ({}))
          throw new Error(body.error || 'Failed to fetch early warning data')
        }
        const data = await res.json()
        setStudents(data.students)
      } catch (err) {
        setError(err instanceof Error ? err.message : 'An error occurred')
      } finally {
        setLoading(false)
      }
    }
    fetchData()
  }, [])

  const toggleExpand = (id: string) => {
    setExpandedIds((prev) => {
      const next = new Set(prev)
      if (next.has(id)) {
        next.delete(id)
      } else {
        next.add(id)
      }
      return next
    })
  }

  const highRiskCount = students.filter((s) => s.riskLevel === 'high_risk').length
  const moderateCount = students.filter((s) => s.riskLevel === 'moderate_risk').length
  const onTrackCount = students.filter((s) => s.riskLevel === 'on_track').length

  if (loading) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="font-serif text-2xl font-bold tracking-tight text-stone-900">
            Early Warning Dashboard
          </h1>
          <p className="text-stone-500 text-sm mt-1">
            AI-identified students who may need additional support
          </p>
        </div>
        <div className="flex flex-col items-center justify-center py-24 text-center">
          <div className="rounded-full bg-amber-50 p-6 mb-4 animate-pulse">
            <AlertTriangle className="size-10 text-amber-400" />
          </div>
          <p className="text-sm text-stone-500">
            Analyzing student performance data...
          </p>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="font-serif text-2xl font-bold tracking-tight text-stone-900">
            Early Warning Dashboard
          </h1>
          <p className="text-stone-500 text-sm mt-1">
            AI-identified students who may need additional support
          </p>
        </div>
        <Card className="border-red-200 bg-red-50">
          <CardContent className="py-8 text-center">
            <p className="text-sm text-red-700">{error}</p>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="font-serif text-2xl font-bold tracking-tight text-stone-900">
          Early Warning Dashboard
        </h1>
        <p className="text-stone-500 text-sm mt-1">
          AI-identified students who may need additional support
        </p>
      </div>

      {/* Summary cards */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card className="border-stone-200">
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="rounded-full bg-stone-100 p-2.5">
                <Users className="size-5 text-stone-600" />
              </div>
              <div>
                <p className="text-2xl font-bold text-stone-900">{students.length}</p>
                <p className="text-xs text-stone-500">Students Monitored</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-red-200 bg-red-50/30">
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="rounded-full bg-red-100 p-2.5">
                <ShieldAlert className="size-5 text-red-600" />
              </div>
              <div>
                <p className="text-2xl font-bold text-red-700">{highRiskCount}</p>
                <p className="text-xs text-red-600">High Risk</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-amber-200 bg-amber-50/30">
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="rounded-full bg-amber-100 p-2.5">
                <AlertTriangle className="size-5 text-amber-600" />
              </div>
              <div>
                <p className="text-2xl font-bold text-amber-700">{moderateCount}</p>
                <p className="text-xs text-amber-600">Moderate Risk</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-emerald-200 bg-emerald-50/30">
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="rounded-full bg-emerald-100 p-2.5">
                <ShieldCheck className="size-5 text-emerald-600" />
              </div>
              <div>
                <p className="text-2xl font-bold text-emerald-700">{onTrackCount}</p>
                <p className="text-xs text-emerald-600">On Track</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Student table */}
      {students.length === 0 ? (
        <Card className="border-dashed">
          <CardContent className="flex flex-col items-center justify-center py-16 text-center">
            <div className="rounded-full bg-amber-50 p-6 mb-4">
              <AlertTriangle className="size-10 text-amber-400" />
            </div>
            <h3 className="text-lg font-semibold text-stone-800 mb-1">
              No student data available
            </h3>
            <p className="text-sm text-stone-500 max-w-md">
              Students will appear here once they have mastery records and
              submission data to analyze.
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="rounded-lg border border-stone-200 bg-white">
          <Table>
            <TableHeader>
              <TableRow className="bg-stone-50">
                <TableHead className="text-stone-600 w-8" />
                <TableHead className="text-stone-600">Student</TableHead>
                <TableHead className="text-stone-600">Risk Level</TableHead>
                <TableHead className="text-stone-600">Indicators</TableHead>
                <TableHead className="text-stone-600 text-center">Trend</TableHead>
                <TableHead className="text-stone-600 text-center">Avg Score</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {students.map((student) => {
                const config = riskConfig[student.riskLevel]
                const isExpanded = expandedIds.has(student.id)
                const hasRecommendations =
                  student.recommendations && student.recommendations.length > 0
                const avgScore =
                  student.recentScores.length > 0
                    ? Math.round(
                        student.recentScores.reduce((a, b) => a + b, 0) /
                          student.recentScores.length
                      )
                    : null

                return (
                  <Fragment key={student.id}>
                    <TableRow
                      className={`${hasRecommendations ? 'cursor-pointer hover:bg-stone-50' : ''} ${isExpanded ? 'bg-stone-50' : ''}`}
                      onClick={() => hasRecommendations && toggleExpand(student.id)}
                    >
                      <TableCell className="w-8 pr-0">
                        {hasRecommendations ? (
                          isExpanded ? (
                            <ChevronDown className="size-4 text-stone-400" />
                          ) : (
                            <ChevronRight className="size-4 text-stone-400" />
                          )
                        ) : null}
                      </TableCell>
                      <TableCell>
                        <div>
                          <p className="font-medium text-stone-900">
                            {student.name}
                          </p>
                          <p className="text-xs text-stone-500">{student.email}</p>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge
                          className={`text-xs border ${config.badgeClass}`}
                        >
                          <span
                            className={`inline-block size-1.5 rounded-full ${config.dotClass} mr-1`}
                          />
                          {config.label}
                        </Badge>
                      </TableCell>
                      <TableCell className="whitespace-normal">
                        <div className="flex flex-wrap gap-1">
                          {student.indicators.length > 0 ? (
                            student.indicators.map((indicator, i) => (
                              <Badge
                                key={i}
                                variant="outline"
                                className="text-[10px] px-1.5 py-0 border-stone-300 text-stone-600"
                              >
                                {indicator}
                              </Badge>
                            ))
                          ) : (
                            <span className="text-xs text-stone-400">
                              No concerns
                            </span>
                          )}
                        </div>
                      </TableCell>
                      <TableCell className="text-center">
                        <div className="flex justify-center">
                          <TrendIcon direction={student.trendDirection} />
                        </div>
                      </TableCell>
                      <TableCell className="text-center">
                        {avgScore !== null ? (
                          <span
                            className={`font-medium ${
                              avgScore < 70
                                ? 'text-red-600'
                                : avgScore < 80
                                  ? 'text-amber-600'
                                  : 'text-stone-900'
                            }`}
                          >
                            {avgScore}%
                          </span>
                        ) : (
                          <span className="text-stone-400">N/A</span>
                        )}
                      </TableCell>
                    </TableRow>
                    {isExpanded && hasRecommendations && (
                      <TableRow className="bg-stone-50/50">
                        <TableCell colSpan={6} className="py-4 whitespace-normal">
                          <div className="ml-8 rounded-lg border border-amber-200 bg-amber-50/50 p-4">
                            <div className="flex items-center gap-2 mb-3">
                              <Sparkles className="size-4 text-amber-600" />
                              <h4 className="text-sm font-semibold text-stone-800">
                                AI Intervention Recommendations
                              </h4>
                            </div>
                            <ul className="space-y-2">
                              {student.recommendations!.map((rec, i) => (
                                <li
                                  key={i}
                                  className="flex items-start gap-2 text-sm text-stone-700"
                                >
                                  <span className="inline-flex items-center justify-center size-5 shrink-0 rounded-full bg-amber-200 text-amber-800 text-[10px] font-bold mt-0.5">
                                    {i + 1}
                                  </span>
                                  {rec}
                                </li>
                              ))}
                            </ul>
                          </div>
                        </TableCell>
                      </TableRow>
                    )}
                  </Fragment>
                )
              })}
            </TableBody>
          </Table>
        </div>
      )}
    </div>
  )
}
