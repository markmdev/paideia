'use client'

import { useEffect, useState } from 'react'
import { useParams } from 'next/navigation'
import Link from 'next/link'
import {
  TrendingUp,
  TrendingDown,
  Minus,
  BookOpen,
  Target,
  ArrowLeft,
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

interface MasteryRecord {
  standardId: string
  standardCode: string
  standardDescription: string
  subject: string
  domain: string | null
  currentLevel: string
  currentScore: number
  trend: 'improving' | 'stable' | 'declining'
  lastAssessedAt: string
  assessmentCount: number
  recentAssessments: Array<{
    level: string
    score: number
    assessedAt: string
    source: string
    sourceTitle: string
    notes: string | null
  }>
}

interface MasteryResponse {
  student: { id: string; name: string | null; email: string }
  mastery: MasteryRecord[]
}

const levelConfig: Record<string, { label: string; badgeClass: string }> = {
  advanced: {
    label: 'Advanced',
    badgeClass: 'bg-emerald-100 text-emerald-700 border-emerald-200',
  },
  proficient: {
    label: 'Proficient',
    badgeClass: 'bg-emerald-50 text-emerald-600 border-emerald-200',
  },
  developing: {
    label: 'Developing',
    badgeClass: 'bg-amber-100 text-amber-700 border-amber-200',
  },
  beginning: {
    label: 'Beginning',
    badgeClass: 'bg-rose-100 text-rose-700 border-rose-200',
  },
}

function TrendIcon({ direction }: { direction: string }) {
  switch (direction) {
    case 'improving':
      return <TrendingUp className="size-4 text-emerald-500" />
    case 'declining':
      return <TrendingDown className="size-4 text-red-500" />
    default:
      return <Minus className="size-4 text-stone-400" />
  }
}

export default function StudentMasteryPage() {
  const params = useParams()
  const studentId = params.studentId as string

  const [data, setData] = useState<MasteryResponse | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    async function fetchMastery() {
      try {
        const res = await fetch(`/api/mastery/${studentId}`)
        if (!res.ok) {
          const body = await res.json().catch(() => ({}))
          throw new Error(body.error || 'Failed to fetch mastery data')
        }
        const json: MasteryResponse = await res.json()
        setData(json)
      } catch (err) {
        setError(err instanceof Error ? err.message : 'An error occurred')
      } finally {
        setLoading(false)
      }
    }
    fetchMastery()
  }, [studentId])

  if (loading) {
    return (
      <div className="space-y-6">
        <div>
          <Link
            href="/dashboard/classes"
            className="inline-flex items-center gap-1 text-sm text-stone-500 hover:text-stone-700 mb-2"
          >
            <ArrowLeft className="size-3.5" />
            Back to Classes
          </Link>
          <h1 className="font-serif text-2xl font-bold tracking-tight text-stone-900">
            Student Mastery
          </h1>
        </div>
        <div className="grid gap-4 sm:grid-cols-3">
          {[1, 2, 3].map((i) => (
            <Card key={i} className="border-stone-200">
              <CardContent className="pt-6">
                <div className="h-12 rounded bg-stone-100 animate-pulse" />
              </CardContent>
            </Card>
          ))}
        </div>
        <Card className="border-stone-200">
          <CardContent className="pt-6">
            <div className="space-y-3">
              {[1, 2, 3, 4].map((i) => (
                <div key={i} className="h-8 rounded bg-stone-100 animate-pulse" />
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }

  if (error) {
    return (
      <div className="space-y-6">
        <div>
          <Link
            href="/dashboard/classes"
            className="inline-flex items-center gap-1 text-sm text-stone-500 hover:text-stone-700 mb-2"
          >
            <ArrowLeft className="size-3.5" />
            Back to Classes
          </Link>
          <h1 className="font-serif text-2xl font-bold tracking-tight text-stone-900">
            Student Mastery
          </h1>
        </div>
        <Card className="border-red-200 bg-red-50">
          <CardContent className="py-8 text-center">
            <p className="text-sm text-red-700">{error}</p>
          </CardContent>
        </Card>
      </div>
    )
  }

  const mastery = data?.mastery ?? []
  const studentName = data?.student.name ?? 'Student'

  const proficientCount = mastery.filter(
    (m) => m.currentLevel === 'advanced' || m.currentLevel === 'proficient'
  ).length
  const needsAttentionCount = mastery.filter(
    (m) => m.currentLevel === 'beginning' || m.currentLevel === 'developing'
  ).length

  // Group by subject
  const bySubject = mastery.reduce<Record<string, MasteryRecord[]>>((acc, m) => {
    const key = m.subject || 'Other'
    if (!acc[key]) acc[key] = []
    acc[key].push(m)
    return acc
  }, {})

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <Link
          href="/dashboard/classes"
          className="inline-flex items-center gap-1 text-sm text-stone-500 hover:text-stone-700 mb-2"
        >
          <ArrowLeft className="size-3.5" />
          Back to Classes
        </Link>
        <h1 className="font-serif text-2xl font-bold tracking-tight text-stone-900">
          {studentName}
        </h1>
        <p className="text-stone-500 text-sm mt-1">
          Standards mastery overview
        </p>
      </div>

      {/* Summary cards */}
      <div className="grid gap-4 sm:grid-cols-3">
        <Card className="border-stone-200">
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="rounded-full bg-stone-100 p-2.5">
                <BookOpen className="size-5 text-stone-600" />
              </div>
              <div>
                <p className="text-2xl font-bold text-stone-900">{mastery.length}</p>
                <p className="text-xs text-stone-500">Standards Tracked</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-emerald-200 bg-emerald-50/30">
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="rounded-full bg-emerald-100 p-2.5">
                <Target className="size-5 text-emerald-600" />
              </div>
              <div>
                <p className="text-2xl font-bold text-emerald-700">{proficientCount}</p>
                <p className="text-xs text-emerald-600">Proficient or Above</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-amber-200 bg-amber-50/30">
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="rounded-full bg-amber-100 p-2.5">
                <TrendingDown className="size-5 text-amber-600" />
              </div>
              <div>
                <p className="text-2xl font-bold text-amber-700">{needsAttentionCount}</p>
                <p className="text-xs text-amber-600">Needs Attention</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Empty state */}
      {mastery.length === 0 ? (
        <Card className="border-dashed">
          <CardContent className="flex flex-col items-center justify-center py-16 text-center">
            <div className="rounded-full bg-stone-50 p-6 mb-4">
              <BookOpen className="size-10 text-stone-400" />
            </div>
            <h3 className="text-lg font-semibold text-stone-800 mb-1">
              No mastery data yet
            </h3>
            <p className="text-sm text-stone-500 max-w-md">
              Mastery records will appear here once this student has been
              assessed on standards-aligned assignments.
            </p>
          </CardContent>
        </Card>
      ) : (
        /* Standards mastery table grouped by subject */
        Object.entries(bySubject).map(([subject, records]) => (
          <div key={subject} className="space-y-2">
            <h2 className="font-serif text-lg font-semibold text-stone-800">
              {subject}
            </h2>
            <div className="rounded-lg border border-stone-200 bg-white">
              <Table>
                <TableHeader>
                  <TableRow className="bg-stone-50">
                    <TableHead className="text-stone-600">Standard</TableHead>
                    <TableHead className="text-stone-600">Description</TableHead>
                    <TableHead className="text-stone-600">Level</TableHead>
                    <TableHead className="text-stone-600 text-center">Score</TableHead>
                    <TableHead className="text-stone-600 text-center">Trend</TableHead>
                    <TableHead className="text-stone-600">Last Assessed</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {records.map((record) => {
                    const config = levelConfig[record.currentLevel] ?? {
                      label: record.currentLevel,
                      badgeClass: 'bg-stone-100 text-stone-700 border-stone-200',
                    }

                    return (
                      <TableRow key={record.standardId}>
                        <TableCell className="font-medium text-stone-900 whitespace-nowrap">
                          {record.standardCode}
                        </TableCell>
                        <TableCell className="text-stone-600 text-sm whitespace-normal max-w-xs">
                          {record.standardDescription}
                        </TableCell>
                        <TableCell>
                          <Badge className={`text-xs border ${config.badgeClass}`}>
                            {config.label}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-center font-medium text-stone-900">
                          {record.currentScore}%
                        </TableCell>
                        <TableCell className="text-center">
                          <div className="flex justify-center">
                            <TrendIcon direction={record.trend} />
                          </div>
                        </TableCell>
                        <TableCell className="text-sm text-stone-500 whitespace-nowrap">
                          {new Date(record.lastAssessedAt).toLocaleDateString()}
                        </TableCell>
                      </TableRow>
                    )
                  })}
                </TableBody>
              </Table>
            </div>
          </div>
        ))
      )}
    </div>
  )
}
