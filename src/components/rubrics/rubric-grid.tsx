'use client'

import { cn } from '@/lib/utils'

export interface RubricCriterion {
  id: string
  name: string
  description: string | null
  weight: number
  descriptors: Record<string, string>
}

export interface RubricData {
  id: string
  title: string
  description: string | null
  type: string
  levels: string[]
  criteria: RubricCriterion[]
  successCriteria?: string[]
}

const LEVEL_COLORS: Record<number, { header: string; cell: string; text: string }> = {
  0: {
    header: 'bg-rose-600 text-white',
    cell: 'bg-rose-50 dark:bg-rose-950/30',
    text: 'text-rose-700 dark:text-rose-300',
  },
  1: {
    header: 'bg-amber-500 text-white',
    cell: 'bg-amber-50 dark:bg-amber-950/30',
    text: 'text-amber-700 dark:text-amber-300',
  },
  2: {
    header: 'bg-emerald-600 text-white',
    cell: 'bg-emerald-50 dark:bg-emerald-950/30',
    text: 'text-emerald-700 dark:text-emerald-300',
  },
  3: {
    header: 'bg-blue-600 text-white',
    cell: 'bg-blue-50 dark:bg-blue-950/30',
    text: 'text-blue-700 dark:text-blue-300',
  },
  4: {
    header: 'bg-violet-600 text-white',
    cell: 'bg-violet-50 dark:bg-violet-950/30',
    text: 'text-violet-700 dark:text-violet-300',
  },
}

function getLevelColor(index: number, totalLevels: number) {
  if (totalLevels <= 4) {
    return LEVEL_COLORS[index] ?? LEVEL_COLORS[3]
  }
  const mapped = Math.round((index / (totalLevels - 1)) * 4)
  return LEVEL_COLORS[mapped] ?? LEVEL_COLORS[3]
}

interface RubricGridProps {
  rubric: RubricData
  onDescriptorEdit?: (criterionId: string, level: string, value: string) => void
  editable?: boolean
  compact?: boolean
}

export function RubricGrid({
  rubric,
  onDescriptorEdit,
  editable = false,
  compact = false,
}: RubricGridProps) {
  const { levels, criteria } = rubric

  return (
    <div className="space-y-6">
      {/* Rubric matrix */}
      <div className="overflow-x-auto rounded-lg border border-border">
        <table className="w-full border-collapse text-sm">
          <thead>
            <tr>
              <th
                className={cn(
                  'bg-muted/70 border-b border-r border-border text-left font-semibold text-foreground',
                  compact ? 'px-3 py-2' : 'px-4 py-3',
                  'sticky left-0 z-10 min-w-[180px]'
                )}
              >
                Criteria
              </th>
              {levels.map((level, i) => {
                const colors = getLevelColor(i, levels.length)
                return (
                  <th
                    key={level}
                    className={cn(
                      'border-b border-r last:border-r-0 border-border text-center font-semibold',
                      compact ? 'px-3 py-2' : 'px-4 py-3',
                      'min-w-[200px]',
                      colors.header
                    )}
                  >
                    {level}
                  </th>
                )
              })}
            </tr>
          </thead>
          <tbody>
            {criteria.map((criterion, rowIndex) => (
              <tr
                key={criterion.id}
                className={cn(
                  rowIndex % 2 === 0 ? 'bg-background' : 'bg-muted/20'
                )}
              >
                <td
                  className={cn(
                    'border-b border-r border-border font-medium text-foreground align-top',
                    compact ? 'px-3 py-2' : 'px-4 py-3',
                    'sticky left-0 z-10',
                    rowIndex % 2 === 0 ? 'bg-background' : 'bg-muted/20'
                  )}
                >
                  <div className="space-y-1">
                    <div className="font-semibold leading-tight">
                      {criterion.name}
                    </div>
                    <div className="text-xs text-muted-foreground font-normal">
                      {Math.round(criterion.weight * 100)}% weight
                    </div>
                    {criterion.description && !compact && (
                      <div className="text-xs text-muted-foreground font-normal leading-relaxed mt-1">
                        {criterion.description}
                      </div>
                    )}
                  </div>
                </td>
                {levels.map((level, colIndex) => {
                  const colors = getLevelColor(colIndex, levels.length)
                  const descriptor = criterion.descriptors[level] ?? ''

                  return (
                    <td
                      key={level}
                      className={cn(
                        'border-b border-r last:border-r-0 border-border align-top',
                        compact ? 'px-3 py-2' : 'px-4 py-3',
                        colors.cell
                      )}
                    >
                      {editable && onDescriptorEdit ? (
                        <textarea
                          className={cn(
                            'w-full bg-transparent text-sm leading-relaxed resize-none border-0 p-0 focus:outline-none focus:ring-0',
                            colors.text
                          )}
                          value={descriptor}
                          onChange={(e) =>
                            onDescriptorEdit(criterion.id, level, e.target.value)
                          }
                          rows={4}
                        />
                      ) : (
                        <p
                          className={cn(
                            'text-sm leading-relaxed whitespace-pre-wrap',
                            colors.text
                          )}
                        >
                          {descriptor}
                        </p>
                      )}
                    </td>
                  )
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Success criteria */}
      {rubric.successCriteria && rubric.successCriteria.length > 0 && (
        <div className="rounded-lg border border-border bg-muted/30 p-4">
          <h3 className="text-sm font-semibold text-foreground mb-3">
            Success Criteria
          </h3>
          <ul className="space-y-2">
            {rubric.successCriteria.map((sc, i) => (
              <li
                key={i}
                className="flex items-start gap-2 text-sm text-muted-foreground"
              >
                <span className="mt-0.5 flex-shrink-0 size-5 rounded-full bg-emerald-100 dark:bg-emerald-900/40 text-emerald-700 dark:text-emerald-300 flex items-center justify-center text-xs font-medium">
                  {i + 1}
                </span>
                <span className="leading-relaxed">{sc}</span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  )
}
