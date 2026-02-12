'use client'

import { useState } from 'react'
import { Loader2, Wand2, Copy, Check, Users, AlertTriangle } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { toast } from 'sonner'

interface TierActivity {
  title: string
  description: string
  instructions: string
  scaffolds?: string[]
  extensions?: string[]
}

interface DifferentiatedTier {
  level: 'below_grade' | 'on_grade' | 'above_grade'
  label: string
  studentCount: number
  students: Array<{ name: string; score: number }>
  activity: TierActivity
}

interface DifferentiationPanelProps {
  assignmentId: string
}

const tierConfig = {
  below_grade: {
    accent: 'border-orange-300 bg-orange-50/50',
    badge: 'bg-orange-100 text-orange-700 border-0',
    header: 'text-orange-800',
    icon: 'text-orange-500',
    scoreBg: 'bg-orange-100 text-orange-700',
  },
  on_grade: {
    accent: 'border-blue-300 bg-blue-50/50',
    badge: 'bg-blue-100 text-blue-700 border-0',
    header: 'text-blue-800',
    icon: 'text-blue-500',
    scoreBg: 'bg-blue-100 text-blue-700',
  },
  above_grade: {
    accent: 'border-emerald-300 bg-emerald-50/50',
    badge: 'bg-emerald-100 text-emerald-700 border-0',
    header: 'text-emerald-800',
    icon: 'text-emerald-500',
    scoreBg: 'bg-emerald-100 text-emerald-700',
  },
} as const

export function DifferentiationPanel({ assignmentId }: DifferentiationPanelProps) {
  const [isLoading, setIsLoading] = useState(false)
  const [tiers, setTiers] = useState<DifferentiatedTier[] | null>(null)
  const [copiedTier, setCopiedTier] = useState<string | null>(null)

  const handleGenerate = async () => {
    setIsLoading(true)
    setTiers(null)

    try {
      const response = await fetch('/api/grading/differentiate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ assignmentId }),
      })

      if (!response.ok) {
        const error = await response.json().catch(() => ({ error: 'Request failed' }))
        throw new Error(error.error ?? 'Failed to generate differentiated activities')
      }

      const result = await response.json()
      setTiers(result.tiers)
      toast.success('Differentiated follow-up activities generated')
    } catch (error) {
      const message =
        error instanceof Error ? error.message : 'Failed to generate activities'
      toast.error(message)
    } finally {
      setIsLoading(false)
    }
  }

  const copyActivity = async (tier: DifferentiatedTier) => {
    const parts = [
      `${tier.activity.title}`,
      '',
      tier.activity.description,
      '',
      'Instructions:',
      tier.activity.instructions,
    ]

    if (tier.activity.scaffolds && tier.activity.scaffolds.length > 0) {
      parts.push('', 'Scaffolds:')
      tier.activity.scaffolds.forEach((s) => parts.push(`- ${s}`))
    }

    if (tier.activity.extensions && tier.activity.extensions.length > 0) {
      parts.push('', 'Extensions:')
      tier.activity.extensions.forEach((e) => parts.push(`- ${e}`))
    }

    await navigator.clipboard.writeText(parts.join('\n'))
    setCopiedTier(tier.level)
    toast.success(`${tier.label} activity copied to clipboard`)
    setTimeout(() => setCopiedTier(null), 2000)
  }

  if (!tiers) {
    return (
      <div className="border border-dashed border-stone-300 rounded-lg p-6 text-center">
        <div className="flex flex-col items-center gap-3">
          <div className="rounded-full bg-violet-50 p-3">
            <Wand2 className="size-5 text-violet-500" />
          </div>
          <div>
            <h3 className="text-sm font-semibold text-stone-800">
              Assessment-Driven Differentiation
            </h3>
            <p className="text-xs text-stone-500 mt-1 max-w-md mx-auto">
              Generate tiered follow-up activities based on student performance. Students
              are clustered into three groups and each group receives a targeted activity.
            </p>
          </div>
          <Button
            onClick={handleGenerate}
            disabled={isLoading}
            className="bg-violet-600 hover:bg-violet-700 text-white gap-2 mt-1"
          >
            {isLoading ? (
              <>
                <Loader2 className="size-4 animate-spin" />
                Generating Activities...
              </>
            ) : (
              <>
                <Wand2 className="size-4" />
                Generate Differentiated Follow-up
              </>
            )}
          </Button>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-sm font-semibold text-stone-700 uppercase tracking-wider">
            Differentiated Follow-up Activities
          </h2>
          <p className="text-xs text-stone-500 mt-0.5">
            Tiered activities generated from student performance data
          </p>
        </div>
        <Button
          onClick={handleGenerate}
          disabled={isLoading}
          variant="outline"
          size="sm"
          className="gap-1.5 text-xs"
        >
          {isLoading ? (
            <>
              <Loader2 className="size-3 animate-spin" />
              Regenerating...
            </>
          ) : (
            <>
              <Wand2 className="size-3" />
              Regenerate
            </>
          )}
        </Button>
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        {tiers.map((tier) => {
          const config = tierConfig[tier.level]
          const isCopied = copiedTier === tier.level

          return (
            <Card key={tier.level} className={`${config.accent} overflow-hidden`}>
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <CardTitle className={`text-sm font-semibold ${config.header}`}>
                    {tier.label}
                  </CardTitle>
                  <Badge className={`text-[10px] px-1.5 py-0.5 ${config.badge}`}>
                    <Users className="size-2.5 mr-1" />
                    {tier.studentCount} student{tier.studentCount !== 1 ? 's' : ''}
                  </Badge>
                </div>

                {tier.students.length > 0 ? (
                  <div className="flex flex-wrap gap-1 mt-2">
                    {tier.students.map((student, i) => (
                      <span
                        key={i}
                        className={`inline-flex items-center text-[10px] px-1.5 py-0.5 rounded-full ${config.scoreBg}`}
                      >
                        {student.name ?? 'Student'}{' '}
                        <span className="ml-1 font-medium">{student.score}%</span>
                      </span>
                    ))}
                  </div>
                ) : (
                  <div className="flex items-center gap-1.5 mt-2 text-xs text-stone-500">
                    <AlertTriangle className="size-3" />
                    No students in this tier
                  </div>
                )}
              </CardHeader>

              <CardContent className="space-y-3">
                <div>
                  <h4 className="text-sm font-medium text-stone-900">
                    {tier.activity.title}
                  </h4>
                  <p className="text-xs text-stone-600 mt-1">{tier.activity.description}</p>
                </div>

                <div>
                  <h5 className="text-[11px] font-medium text-stone-700 uppercase tracking-wider mb-1">
                    Instructions
                  </h5>
                  <p className="text-xs text-stone-600 whitespace-pre-line">
                    {tier.activity.instructions}
                  </p>
                </div>

                {tier.activity.scaffolds && tier.activity.scaffolds.length > 0 && (
                  <div>
                    <h5 className="text-[11px] font-medium text-orange-700 uppercase tracking-wider mb-1">
                      Scaffolds
                    </h5>
                    <ul className="space-y-1">
                      {tier.activity.scaffolds.map((scaffold, i) => (
                        <li
                          key={i}
                          className="text-xs text-stone-600 flex items-start gap-1.5"
                        >
                          <span className="text-orange-400 mt-0.5 shrink-0">-</span>
                          {scaffold}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                {tier.activity.extensions && tier.activity.extensions.length > 0 && (
                  <div>
                    <h5 className="text-[11px] font-medium text-emerald-700 uppercase tracking-wider mb-1">
                      Extensions
                    </h5>
                    <ul className="space-y-1">
                      {tier.activity.extensions.map((extension, i) => (
                        <li
                          key={i}
                          className="text-xs text-stone-600 flex items-start gap-1.5"
                        >
                          <span className="text-emerald-400 mt-0.5 shrink-0">-</span>
                          {extension}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                <Button
                  onClick={() => copyActivity(tier)}
                  variant="outline"
                  size="sm"
                  className="w-full gap-1.5 text-xs mt-2"
                >
                  {isCopied ? (
                    <>
                      <Check className="size-3" />
                      Copied
                    </>
                  ) : (
                    <>
                      <Copy className="size-3" />
                      Copy Activity
                    </>
                  )}
                </Button>
              </CardContent>
            </Card>
          )
        })}
      </div>
    </div>
  )
}
