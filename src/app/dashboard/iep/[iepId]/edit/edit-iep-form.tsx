'use client'

import { useState, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import {
  Loader2,
  Sparkles,
  Save,
  Plus,
  X,
} from 'lucide-react'
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
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Separator } from '@/components/ui/separator'
import { toast } from 'sonner'

interface GoalEdit {
  id: string
  area: string
  goalText: string
  baseline: string
  target: string
  measureMethod: string
  frequency: string
  status: string
  aiGenerated: boolean
  isNew?: boolean
}

interface AccommodationEdit {
  id: string
  type: string
  description: string
}

interface EditIepFormProps {
  iep: {
    id: string
    presentLevels: string
    disabilityCategory: string
    status: string
    studentId: string
  }
  existingGoals: GoalEdit[]
  existingAccommodations: AccommodationEdit[]
}

export function EditIepForm({ iep, existingGoals, existingAccommodations }: EditIepFormProps) {
  const router = useRouter()
  const [isSaving, setIsSaving] = useState(false)
  const [isGenerating, setIsGenerating] = useState(false)

  const [presentLevels, setPresentLevels] = useState(iep.presentLevels)
  const [goals, setGoals] = useState<GoalEdit[]>(existingGoals)
  const [accommodations, setAccommodations] = useState<AccommodationEdit[]>(existingAccommodations)

  function addGoal() {
    setGoals([
      ...goals,
      {
        id: crypto.randomUUID(),
        area: '',
        goalText: '',
        baseline: '',
        target: '',
        measureMethod: '',
        frequency: '',
        status: 'active',
        aiGenerated: false,
        isNew: true,
      },
    ])
  }

  function removeGoal(id: string) {
    setGoals(goals.filter((g) => g.id !== id))
  }

  function updateGoal(id: string, field: keyof GoalEdit, value: string | boolean) {
    setGoals(goals.map((g) => (g.id === id ? { ...g, [field]: value } : g)))
  }

  function addAccommodation() {
    setAccommodations([
      ...accommodations,
      { id: crypto.randomUUID(), type: 'instructional', description: '' },
    ])
  }

  function removeAccommodation(id: string) {
    setAccommodations(accommodations.filter((a) => a.id !== id))
  }

  const handleSave = useCallback(async () => {
    setIsSaving(true)
    try {
      const response = await fetch(`/api/iep/${iep.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          presentLevels,
          goals: goals.map(({ isNew: _isNew, ...g }) => g),
          accommodations: accommodations.map(({ id: _id, ...a }) => a),
        }),
      })

      if (!response.ok) {
        const data = await response.json().catch(() => ({}))
        throw new Error((data as { error?: string }).error ?? 'Failed to save')
      }

      toast.success('IEP saved successfully')
      router.push(`/dashboard/iep/${iep.id}`)
      router.refresh()
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to save'
      toast.error(message)
    } finally {
      setIsSaving(false)
    }
  }, [iep.id, presentLevels, goals, accommodations, router])

  return (
    <div className="space-y-6">
      {/* Present Levels */}
      <Card className="bg-white rounded-xl">
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="font-serif text-lg text-stone-800">
              Present Levels of Performance
            </CardTitle>
            <Button
              variant="outline"
              size="sm"
              onClick={async () => {
                setIsGenerating(true)
                try {
                  const response = await fetch('/api/iep/generate/present-levels', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ iepId: iep.id, studentId: iep.studentId }),
                  })
                  if (!response.ok) throw new Error('Failed')
                  const data = (await response.json()) as { presentLevels?: string }
                  if (data.presentLevels) {
                    setPresentLevels(data.presentLevels)
                    toast.success('Present levels regenerated. Review before saving.')
                  }
                } catch {
                  toast.error('Failed to regenerate present levels.')
                } finally {
                  setIsGenerating(false)
                }
              }}
              disabled={isGenerating}
              className="gap-1.5 border-stone-300"
            >
              {isGenerating ? (
                <Loader2 className="size-3.5 animate-spin" />
              ) : (
                <Sparkles className="size-3.5" />
              )}
              Regenerate with AI
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <Textarea
            value={presentLevels}
            onChange={(e) => setPresentLevels(e.target.value)}
            className="min-h-[200px] border-stone-300 bg-white text-sm leading-relaxed"
          />
          <p className="text-[10px] text-stone-400 italic mt-2">
            Generated by AI &mdash; Review required. All content must be verified by the IEP team.
          </p>
        </CardContent>
      </Card>

      <Separator />

      {/* Goals */}
      <Card className="bg-white rounded-xl">
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="font-serif text-lg text-stone-800">Goals</CardTitle>
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={async () => {
                  setIsGenerating(true)
                  try {
                    const response = await fetch('/api/iep/generate/goals', {
                      method: 'POST',
                      headers: { 'Content-Type': 'application/json' },
                      body: JSON.stringify({
                        iepId: iep.id,
                        studentId: iep.studentId,
                        disabilityCategory: iep.disabilityCategory,
                        presentLevels,
                      }),
                    })
                    if (!response.ok) throw new Error('Failed')
                    const data = (await response.json()) as { goals?: GoalEdit[] }
                    if (data.goals) {
                      setGoals([
                        ...goals,
                        ...data.goals.map((g) => ({
                          ...g,
                          id: crypto.randomUUID(),
                          status: 'active',
                          aiGenerated: true,
                          isNew: true,
                        })),
                      ])
                      toast.success('AI goals suggested. Review before saving.')
                    }
                  } catch {
                    toast.error('Failed to generate goals.')
                  } finally {
                    setIsGenerating(false)
                  }
                }}
                disabled={isGenerating}
                className="gap-1.5 border-stone-300"
              >
                {isGenerating ? <Loader2 className="size-3.5 animate-spin" /> : <Sparkles className="size-3.5" />}
                AI Suggest
              </Button>
              <Button
                size="sm"
                onClick={addGoal}
                className="bg-amber-600 hover:bg-amber-700 text-white gap-1"
              >
                <Plus className="size-3.5" />
                Add Goal
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {goals.map((goal, index) => (
            <div key={goal.id} className="space-y-3 p-4 border border-stone-200 rounded-lg bg-stone-50/50">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-stone-500 uppercase tracking-wider">
                  Goal {index + 1}
                  {goal.aiGenerated && (
                    <span className="ml-2 text-stone-400 normal-case font-normal">(AI-generated)</span>
                  )}
                </span>
                <button
                  onClick={() => removeGoal(goal.id)}
                  className="p-1 rounded hover:bg-stone-200 text-stone-400 hover:text-stone-600"
                >
                  <X className="size-4" />
                </button>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <Label className="text-xs text-stone-500">Area</Label>
                  <Input
                    value={goal.area}
                    onChange={(e) => updateGoal(goal.id, 'area', e.target.value)}
                    className="border-stone-300 bg-white text-sm"
                  />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs text-stone-500">Frequency</Label>
                  <Input
                    value={goal.frequency}
                    onChange={(e) => updateGoal(goal.id, 'frequency', e.target.value)}
                    className="border-stone-300 bg-white text-sm"
                  />
                </div>
              </div>
              <div className="space-y-1">
                <Label className="text-xs text-stone-500">Goal Text</Label>
                <Textarea
                  value={goal.goalText}
                  onChange={(e) => updateGoal(goal.id, 'goalText', e.target.value)}
                  className="border-stone-300 bg-white text-sm min-h-[80px]"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <Label className="text-xs text-stone-500">Baseline</Label>
                  <Input
                    value={goal.baseline}
                    onChange={(e) => updateGoal(goal.id, 'baseline', e.target.value)}
                    className="border-stone-300 bg-white text-sm"
                  />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs text-stone-500">Target</Label>
                  <Input
                    value={goal.target}
                    onChange={(e) => updateGoal(goal.id, 'target', e.target.value)}
                    className="border-stone-300 bg-white text-sm"
                  />
                </div>
              </div>
              <div className="space-y-1">
                <Label className="text-xs text-stone-500">Measurement Method</Label>
                <Input
                  value={goal.measureMethod}
                  onChange={(e) => updateGoal(goal.id, 'measureMethod', e.target.value)}
                  className="border-stone-300 bg-white text-sm"
                />
              </div>
            </div>
          ))}
        </CardContent>
      </Card>

      <Separator />

      {/* Accommodations */}
      <Card className="bg-white rounded-xl">
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="font-serif text-lg text-stone-800">Accommodations</CardTitle>
            <Button
              size="sm"
              onClick={addAccommodation}
              className="bg-amber-600 hover:bg-amber-700 text-white gap-1"
            >
              <Plus className="size-3.5" />
              Add
            </Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-3">
          {accommodations.map((acc) => (
            <div key={acc.id} className="flex items-start gap-3 p-3 border border-stone-200 rounded-lg bg-stone-50/50">
              <Select
                value={acc.type}
                onValueChange={(v) =>
                  setAccommodations(accommodations.map((a) => (a.id === acc.id ? { ...a, type: v } : a)))
                }
              >
                <SelectTrigger className="w-40 border-stone-300 bg-white text-xs shrink-0">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="instructional">Instructional</SelectItem>
                  <SelectItem value="assessment">Assessment</SelectItem>
                  <SelectItem value="environmental">Environmental</SelectItem>
                  <SelectItem value="behavioral">Behavioral</SelectItem>
                </SelectContent>
              </Select>
              <Input
                value={acc.description}
                onChange={(e) =>
                  setAccommodations(accommodations.map((a) => (a.id === acc.id ? { ...a, description: e.target.value } : a)))
                }
                className="flex-1 border-stone-300 bg-white text-sm"
              />
              <button
                onClick={() => removeAccommodation(acc.id)}
                className="p-1.5 rounded hover:bg-stone-200 text-stone-400 hover:text-stone-600 shrink-0"
              >
                <X className="size-4" />
              </button>
            </div>
          ))}
        </CardContent>
      </Card>

      {/* Save button */}
      <div className="flex justify-end pt-2">
        <Button
          onClick={handleSave}
          disabled={isSaving}
          className="bg-emerald-600 hover:bg-emerald-700 text-white gap-2"
        >
          {isSaving ? <Loader2 className="size-4 animate-spin" /> : <Save className="size-4" />}
          Save IEP
        </Button>
      </div>
    </div>
  )
}
