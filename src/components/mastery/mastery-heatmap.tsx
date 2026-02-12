'use client'

import { useState, useMemo } from 'react'
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip'
import { Button } from '@/components/ui/button'
import { ArrowUpDown } from 'lucide-react'

interface Student {
  id: string
  name: string
}

interface Standard {
  id: string
  code: string
  description: string
  domain: string | null
}

interface Cell {
  studentId: string
  standardId: string
  level: string
  score: number
  assessedAt: string
}

interface MasteryHeatmapProps {
  students: Student[]
  standards: Standard[]
  cells: Cell[]
  classId: string
}

const LEVEL_BG: Record<string, string> = {
  beginning: 'bg-rose-400 hover:bg-rose-500',
  developing: 'bg-amber-400 hover:bg-amber-500',
  proficient: 'bg-emerald-400 hover:bg-emerald-500',
  advanced: 'bg-blue-400 hover:bg-blue-500',
}

const LEVEL_LABEL: Record<string, string> = {
  beginning: 'Beginning',
  developing: 'Developing',
  proficient: 'Proficient',
  advanced: 'Advanced',
}

type SortMode = 'name' | 'avg-score-asc' | 'avg-score-desc'

export function MasteryHeatmap({
  students,
  standards,
  cells,
  classId,
}: MasteryHeatmapProps) {
  const [sortMode, setSortMode] = useState<SortMode>('name')

  // Build a lookup: studentId:standardId -> cell
  const cellMap = useMemo(() => {
    const map = new Map<string, Cell>()
    for (const cell of cells) {
      map.set(`${cell.studentId}:${cell.standardId}`, cell)
    }
    return map
  }, [cells])

  // Compute average scores per student for sorting
  const studentAvgScores = useMemo(() => {
    const map = new Map<string, number>()
    for (const student of students) {
      const studentCells = cells.filter((c) => c.studentId === student.id)
      if (studentCells.length === 0) {
        map.set(student.id, -1)
      } else {
        const avg =
          studentCells.reduce((sum, c) => sum + c.score, 0) /
          studentCells.length
        map.set(student.id, avg)
      }
    }
    return map
  }, [students, cells])

  const sortedStudents = useMemo(() => {
    const copy = [...students]
    switch (sortMode) {
      case 'name':
        return copy.sort((a, b) => a.name.localeCompare(b.name))
      case 'avg-score-asc':
        return copy.sort(
          (a, b) =>
            (studentAvgScores.get(a.id) ?? -1) -
            (studentAvgScores.get(b.id) ?? -1)
        )
      case 'avg-score-desc':
        return copy.sort(
          (a, b) =>
            (studentAvgScores.get(b.id) ?? -1) -
            (studentAvgScores.get(a.id) ?? -1)
        )
    }
  }, [students, sortMode, studentAvgScores])

  function cycleSortMode() {
    setSortMode((prev) => {
      switch (prev) {
        case 'name':
          return 'avg-score-desc'
        case 'avg-score-desc':
          return 'avg-score-asc'
        case 'avg-score-asc':
          return 'name'
      }
    })
  }

  const sortLabel: Record<SortMode, string> = {
    name: 'Name A-Z',
    'avg-score-desc': 'Highest Avg',
    'avg-score-asc': 'Lowest Avg',
  }

  return (
    <div className="space-y-3">
      {/* Sort control */}
      <div className="flex items-center gap-2">
        <Button
          variant="outline"
          size="sm"
          onClick={cycleSortMode}
          className="text-xs border-stone-300 text-stone-600 hover:bg-stone-100"
        >
          <ArrowUpDown className="size-3 mr-1" />
          Sort: {sortLabel[sortMode]}
        </Button>
      </div>

      {/* Heatmap grid */}
      <div className="overflow-x-auto rounded-lg border border-stone-200 bg-white">
        <TooltipProvider delayDuration={200}>
          <table className="w-full border-collapse">
            <thead>
              <tr>
                <th className="sticky left-0 z-10 bg-stone-50 border-b border-r border-stone-200 px-3 py-2 text-left text-xs font-medium text-stone-600 min-w-[160px]">
                  Student
                </th>
                {standards.map((std) => (
                  <th
                    key={std.id}
                    className="border-b border-stone-200 px-1 py-2 text-center text-[10px] font-medium text-stone-500 min-w-[60px] max-w-[80px]"
                  >
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <span className="cursor-help truncate block">
                          {std.code}
                        </span>
                      </TooltipTrigger>
                      <TooltipContent
                        side="top"
                        className="max-w-xs text-xs"
                      >
                        <p className="font-medium">{std.code}</p>
                        <p className="text-muted-foreground mt-1">
                          {std.description}
                        </p>
                        {std.domain && (
                          <p className="text-muted-foreground mt-0.5 italic">
                            {std.domain}
                          </p>
                        )}
                      </TooltipContent>
                    </Tooltip>
                  </th>
                ))}
                <th className="border-b border-l border-stone-200 px-3 py-2 text-center text-xs font-medium text-stone-600 min-w-[60px]">
                  Avg
                </th>
              </tr>
            </thead>
            <tbody>
              {sortedStudents.map((student, rowIdx) => {
                const avgScore = studentAvgScores.get(student.id) ?? -1

                return (
                  <tr
                    key={student.id}
                    className={
                      rowIdx % 2 === 0 ? 'bg-white' : 'bg-stone-50/50'
                    }
                  >
                    <td className="sticky left-0 z-10 border-r border-stone-200 px-3 py-1.5 text-sm text-stone-800 font-medium bg-inherit">
                      {student.name}
                    </td>
                    {standards.map((std) => {
                      const cell = cellMap.get(
                        `${student.id}:${std.id}`
                      )

                      if (!cell) {
                        return (
                          <td
                            key={std.id}
                            className="px-1 py-1.5 text-center"
                          >
                            <div className="mx-auto size-7 rounded bg-stone-100 border border-stone-200" />
                          </td>
                        )
                      }

                      return (
                        <td
                          key={std.id}
                          className="px-1 py-1.5 text-center"
                        >
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <div
                                className={`mx-auto size-7 rounded cursor-pointer transition-colors flex items-center justify-center text-[10px] font-medium text-white ${LEVEL_BG[cell.level] ?? 'bg-stone-300'}`}
                              >
                                {cell.score}
                              </div>
                            </TooltipTrigger>
                            <TooltipContent
                              side="top"
                              className="text-xs"
                            >
                              <p className="font-medium">
                                {student.name} - {std.code}
                              </p>
                              <p>
                                Level:{' '}
                                {LEVEL_LABEL[cell.level] ?? cell.level}
                              </p>
                              <p>Score: {cell.score}%</p>
                              <p className="text-muted-foreground">
                                Assessed:{' '}
                                {new Date(
                                  cell.assessedAt
                                ).toLocaleDateString('en-US', {
                                  month: 'short',
                                  day: 'numeric',
                                  year: 'numeric',
                                })}
                              </p>
                            </TooltipContent>
                          </Tooltip>
                        </td>
                      )
                    })}
                    <td className="border-l border-stone-200 px-3 py-1.5 text-center text-xs font-medium text-stone-700">
                      {avgScore >= 0 ? `${Math.round(avgScore)}%` : '--'}
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </TooltipProvider>
      </div>
    </div>
  )
}
