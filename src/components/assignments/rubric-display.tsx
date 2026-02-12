'use client'

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'

interface Criterion {
  id: string
  name: string
  description: string | null
  weight: number
  descriptors: string // JSON string
}

interface RubricDisplayProps {
  rubric: {
    id: string
    title: string
    description: string | null
    type: string
    levels: string // JSON string
  }
  criteria: Criterion[]
}

const levelColors: Record<string, string> = {
  Beginning: 'bg-rose-50 border-rose-200 text-rose-800',
  Developing: 'bg-amber-50 border-amber-200 text-amber-800',
  Proficient: 'bg-emerald-50 border-emerald-200 text-emerald-800',
  Advanced: 'bg-sky-50 border-sky-200 text-sky-800',
}

const levelHeaderColors: Record<string, string> = {
  Beginning: 'bg-rose-100 text-rose-900',
  Developing: 'bg-amber-100 text-amber-900',
  Proficient: 'bg-emerald-100 text-emerald-900',
  Advanced: 'bg-sky-100 text-sky-900',
}

export function RubricDisplay({ rubric, criteria }: RubricDisplayProps) {
  const levels: string[] = (() => {
    try {
      return JSON.parse(rubric.levels)
    } catch {
      return ['Beginning', 'Developing', 'Proficient', 'Advanced']
    }
  })()

  return (
    <Card className="overflow-hidden">
      <CardHeader className="bg-gradient-to-r from-amber-50 to-orange-50 border-b">
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="text-base">{rubric.title}</CardTitle>
            {rubric.description && (
              <p className="text-sm text-muted-foreground mt-1">
                {rubric.description}
              </p>
            )}
          </div>
          <Badge variant="outline" className="text-xs capitalize">
            {rubric.type}
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="p-0">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b">
                <th className="text-left p-3 font-semibold bg-slate-50 min-w-[140px]">
                  Criteria
                </th>
                {levels.map((level) => (
                  <th
                    key={level}
                    className={`text-center p-3 font-semibold min-w-[160px] ${levelHeaderColors[level] ?? 'bg-slate-100'}`}
                  >
                    {level}
                  </th>
                ))}
                <th className="text-center p-3 font-semibold bg-slate-50 w-[80px]">
                  Weight
                </th>
              </tr>
            </thead>
            <tbody>
              {criteria.map((criterion, index) => {
                const descriptors: Record<string, string> = (() => {
                  try {
                    return JSON.parse(criterion.descriptors)
                  } catch {
                    return {}
                  }
                })()

                return (
                  <tr
                    key={criterion.id}
                    className={index % 2 === 0 ? '' : 'bg-slate-50/50'}
                  >
                    <td className="p-3 align-top border-r">
                      <div className="font-medium text-sm">
                        {criterion.name}
                      </div>
                      {criterion.description && (
                        <div className="text-xs text-muted-foreground mt-0.5">
                          {criterion.description}
                        </div>
                      )}
                    </td>
                    {levels.map((level) => (
                      <td
                        key={level}
                        className={`p-3 align-top border-r text-xs leading-relaxed ${levelColors[level] ?? ''}`}
                      >
                        {descriptors[level] ?? '-'}
                      </td>
                    ))}
                    <td className="p-3 text-center align-top font-medium">
                      {criterion.weight}
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </CardContent>
    </Card>
  )
}
