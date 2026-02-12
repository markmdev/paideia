'use client'

import { useState } from 'react'
import { Search } from 'lucide-react'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'

interface StudentData {
  id: string
  name: string | null
  email: string
  gradeLevel: string | null
  classesEnrolled: number
  avgScore: number | null
  mastery: Record<string, number>
}

interface StudentTableProps {
  students: StudentData[]
}

const masteryColors: Record<string, string> = {
  advanced: 'bg-emerald-100 text-emerald-700',
  proficient: 'bg-blue-100 text-blue-700',
  developing: 'bg-amber-100 text-amber-700',
  beginning: 'bg-red-100 text-red-700',
}

const masteryOrder = ['advanced', 'proficient', 'developing', 'beginning']

export function StudentTable({ students }: StudentTableProps) {
  const [query, setQuery] = useState('')

  const filtered = query
    ? students.filter(
        (s) =>
          s.name?.toLowerCase().includes(query.toLowerCase()) ||
          s.email.toLowerCase().includes(query.toLowerCase())
      )
    : students

  return (
    <div className="space-y-4">
      <div className="relative max-w-sm">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-stone-400" />
        <Input
          placeholder="Search students by name or email..."
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          className="pl-9"
        />
      </div>

      <div className="rounded-lg border border-stone-200 bg-white">
        <Table>
          <TableHeader>
            <TableRow className="bg-stone-50">
              <TableHead className="text-stone-600">Name</TableHead>
              <TableHead className="text-stone-600">Email</TableHead>
              <TableHead className="text-stone-600">Grade Level</TableHead>
              <TableHead className="text-stone-600 text-center">Classes</TableHead>
              <TableHead className="text-stone-600 text-center">Avg Score</TableHead>
              <TableHead className="text-stone-600">Mastery Distribution</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filtered.length === 0 ? (
              <TableRow>
                <TableCell
                  colSpan={6}
                  className="text-center py-8 text-stone-500"
                >
                  {query ? 'No students match your search.' : 'No students found.'}
                </TableCell>
              </TableRow>
            ) : (
              filtered.map((student) => (
                <TableRow key={student.id}>
                  <TableCell className="font-medium text-stone-900">
                    {student.name || 'Unknown'}
                  </TableCell>
                  <TableCell className="text-stone-600">{student.email}</TableCell>
                  <TableCell className="text-stone-600">
                    {student.gradeLevel || '--'}
                  </TableCell>
                  <TableCell className="text-center text-stone-600">
                    {student.classesEnrolled}
                  </TableCell>
                  <TableCell className="text-center">
                    {student.avgScore !== null ? (
                      <span className="font-medium text-stone-900">
                        {Math.round(student.avgScore)}%
                      </span>
                    ) : (
                      <span className="text-stone-400">--</span>
                    )}
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-1 flex-wrap">
                      {masteryOrder.map((level) => {
                        const count = student.mastery[level]
                        if (!count) return null
                        return (
                          <Badge
                            key={level}
                            className={`text-[10px] px-1.5 py-0 border-0 ${masteryColors[level]}`}
                          >
                            {count} {level.charAt(0).toUpperCase() + level.slice(1, 3)}
                          </Badge>
                        )
                      })}
                      {Object.keys(student.mastery).length === 0 && (
                        <span className="text-xs text-stone-400">No data</span>
                      )}
                    </div>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  )
}
