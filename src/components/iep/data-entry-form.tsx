'use client'

import { useState, useCallback } from 'react'
import { Loader2, Plus } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { toast } from 'sonner'

interface Goal {
  id: string
  area: string
  goalText: string
}

interface DataEntryFormProps {
  goals: Goal[]
  studentId: string
  iepId: string
  defaultGoalId?: string
  onSuccess?: () => void
}

const unitOptions = [
  { value: 'wpm', label: 'Words per minute (wpm)' },
  { value: 'percent', label: 'Percentage (%)' },
  { value: 'rubric score (0-4)', label: 'Rubric score (0-4)' },
  { value: 'count', label: 'Count' },
  { value: 'minutes', label: 'Minutes' },
  { value: 'trials', label: 'Trials correct' },
  { value: 'rating', label: 'Rating scale' },
]

export function DataEntryForm({ goals, studentId, iepId, defaultGoalId, onSuccess }: DataEntryFormProps) {
  const [goalId, setGoalId] = useState(defaultGoalId ?? '')
  const [value, setValue] = useState('')
  const [unit, setUnit] = useState('')
  const [notes, setNotes] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)

  const handleSubmit = useCallback(async (e: React.FormEvent) => {
    e.preventDefault()

    if (!goalId || !value || !unit) {
      toast.error('Please fill in the goal, value, and unit fields.')
      return
    }

    const numericValue = parseFloat(value)
    if (isNaN(numericValue)) {
      toast.error('Value must be a number.')
      return
    }

    setIsSubmitting(true)
    try {
      const response = await fetch(`/api/iep/${iepId}/progress`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          goalId,
          studentId,
          value: numericValue,
          unit,
          notes: notes.trim() || undefined,
        }),
      })

      if (!response.ok) {
        const data = await response.json().catch(() => ({}))
        throw new Error((data as { error?: string }).error ?? 'Failed to save data point')
      }

      toast.success('Data point recorded')
      setValue('')
      setNotes('')
      onSuccess?.()
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to save'
      toast.error(message)
    } finally {
      setIsSubmitting(false)
    }
  }, [goalId, value, unit, notes, studentId, iepId, onSuccess])

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="goal-select" className="text-sm font-medium text-stone-700">
          Goal
        </Label>
        <Select value={goalId} onValueChange={setGoalId}>
          <SelectTrigger id="goal-select" className="border-stone-300 bg-white">
            <SelectValue placeholder="Select a goal..." />
          </SelectTrigger>
          <SelectContent>
            {goals.map((g) => (
              <SelectItem key={g.id} value={g.id}>
                <span className="font-medium">{g.area}</span>
                <span className="text-stone-400 ml-1 text-xs">
                  {g.goalText.length > 60 ? g.goalText.slice(0, 60) + '...' : g.goalText}
                </span>
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-2">
          <Label htmlFor="data-value" className="text-sm font-medium text-stone-700">
            Value
          </Label>
          <Input
            id="data-value"
            type="number"
            step="any"
            placeholder="e.g. 97"
            value={value}
            onChange={(e) => setValue(e.target.value)}
            className="border-stone-300 bg-white"
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="data-unit" className="text-sm font-medium text-stone-700">
            Unit
          </Label>
          <Select value={unit} onValueChange={setUnit}>
            <SelectTrigger id="data-unit" className="border-stone-300 bg-white">
              <SelectValue placeholder="Select unit..." />
            </SelectTrigger>
            <SelectContent>
              {unitOptions.map((u) => (
                <SelectItem key={u.value} value={u.value}>
                  {u.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="data-notes" className="text-sm font-medium text-stone-700">
          Notes <span className="text-stone-400 font-normal">(optional)</span>
        </Label>
        <Textarea
          id="data-notes"
          placeholder="Observation notes..."
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          className="border-stone-300 bg-white min-h-[60px] resize-none"
          rows={2}
        />
      </div>

      <Button
        type="submit"
        disabled={isSubmitting || !goalId || !value || !unit}
        className="w-full bg-amber-600 hover:bg-amber-700 text-white gap-2"
      >
        {isSubmitting ? (
          <Loader2 className="size-4 animate-spin" />
        ) : (
          <Plus className="size-4" />
        )}
        Record Data Point
      </Button>
    </form>
  )
}
