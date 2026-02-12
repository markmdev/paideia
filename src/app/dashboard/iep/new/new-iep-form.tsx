'use client'

import { useState, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { format } from 'date-fns'
import {
  User,
  FileText,
  Target,
  Shield,
  CheckCircle2,
  Loader2,
  Sparkles,
  ArrowRight,
  ArrowLeft,
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
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import { toast } from 'sonner'

interface Student {
  id: string
  name: string
}

interface NewIepFormProps {
  students: Student[]
  teacherId: string
}

const disabilityCategories = [
  'Specific Learning Disability (SLD)',
  'Speech or Language Impairment',
  'Other Health Impairment (OHI)',
  'Autism Spectrum Disorder',
  'Intellectual Disability',
  'Emotional Disturbance',
  'Multiple Disabilities',
  'Hearing Impairment',
  'Orthopedic Impairment',
  'Visual Impairment',
  'Traumatic Brain Injury',
  'Deaf-Blindness',
  'Developmental Delay',
]

interface GoalDraft {
  id: string
  area: string
  goalText: string
  baseline: string
  target: string
  measureMethod: string
  frequency: string
}

interface AccommodationDraft {
  id: string
  type: string
  description: string
}

const steps = [
  { label: 'Student Info', icon: User },
  { label: 'Present Levels', icon: FileText },
  { label: 'Goals', icon: Target },
  { label: 'Accommodations', icon: Shield },
  { label: 'Review', icon: CheckCircle2 },
]

export function NewIepForm({ students }: NewIepFormProps) {
  const router = useRouter()
  const [currentStep, setCurrentStep] = useState(0)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isGenerating, setIsGenerating] = useState(false)

  // Step 1: Student Info
  const [studentId, setStudentId] = useState('')
  const [disabilityCategory, setDisabilityCategory] = useState('')
  const [startDate, setStartDate] = useState(format(new Date(), 'yyyy-MM-dd'))
  const [endDate, setEndDate] = useState(
    format(new Date(Date.now() + 365 * 24 * 60 * 60 * 1000), 'yyyy-MM-dd')
  )

  // Step 2: Present Levels
  const [presentLevels, setPresentLevels] = useState('')

  // Step 3: Goals
  const [goals, setGoals] = useState<GoalDraft[]>([])

  // Step 4: Accommodations
  const [accommodations, setAccommodations] = useState<AccommodationDraft[]>([])

  const selectedStudent = students.find((s) => s.id === studentId)

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
      },
    ])
  }

  function removeGoal(id: string) {
    setGoals(goals.filter((g) => g.id !== id))
  }

  function updateGoal(id: string, field: keyof GoalDraft, value: string) {
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

  function updateAccommodation(id: string, field: keyof AccommodationDraft, value: string) {
    setAccommodations(accommodations.map((a) => (a.id === id ? { ...a, [field]: value } : a)))
  }

  const handleGeneratePresentLevels = useCallback(async () => {
    if (!studentId) {
      toast.error('Select a student first.')
      return
    }
    setIsGenerating(true)
    try {
      const response = await fetch('/api/iep/generate/present-levels', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ studentId, disabilityCategory }),
      })
      if (!response.ok) throw new Error('Failed to generate')
      const data = (await response.json()) as { presentLevels?: string }
      if (data.presentLevels) {
        setPresentLevels(data.presentLevels)
        toast.success('Present levels generated. Review and edit before proceeding.')
      }
    } catch {
      toast.error('Failed to generate present levels. You can write them manually.')
    } finally {
      setIsGenerating(false)
    }
  }, [studentId, disabilityCategory])

  const handleSubmit = useCallback(async () => {
    setIsSubmitting(true)
    try {
      const response = await fetch('/api/iep', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          studentId,
          disabilityCategory,
          startDate,
          endDate,
          presentLevels,
          goals: goals.map(({ id: _id, ...g }) => g),
          accommodations: accommodations.map(({ id: _id, ...a }) => a),
        }),
      })

      if (!response.ok) {
        const data = await response.json().catch(() => ({}))
        throw new Error((data as { error?: string }).error ?? 'Failed to create IEP')
      }

      const result = (await response.json()) as { id: string }
      toast.success('IEP created successfully')
      router.push(`/dashboard/iep/${result.id}`)
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to create IEP'
      toast.error(message)
    } finally {
      setIsSubmitting(false)
    }
  }, [studentId, disabilityCategory, startDate, endDate, presentLevels, goals, accommodations, router])

  function canProceed(): boolean {
    switch (currentStep) {
      case 0:
        return !!studentId && !!disabilityCategory && !!startDate && !!endDate
      default:
        return true
    }
  }

  return (
    <div className="space-y-6">
      {/* Step indicator */}
      <div className="flex items-center justify-between">
        {steps.map((step, i) => {
          const StepIcon = step.icon
          const isActive = i === currentStep
          const isComplete = i < currentStep

          return (
            <div key={step.label} className="flex items-center gap-2">
              <button
                onClick={() => i < currentStep && setCurrentStep(i)}
                disabled={i > currentStep}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium transition-colors ${
                  isActive
                    ? 'bg-amber-100 text-amber-800'
                    : isComplete
                      ? 'bg-emerald-50 text-emerald-700 cursor-pointer hover:bg-emerald-100'
                      : 'bg-stone-100 text-stone-400'
                }`}
              >
                {isComplete ? (
                  <CheckCircle2 className="size-3.5" />
                ) : (
                  <StepIcon className="size-3.5" />
                )}
                <span className="hidden sm:inline">{step.label}</span>
              </button>
              {i < steps.length - 1 && (
                <div className={`w-8 h-px ${i < currentStep ? 'bg-emerald-300' : 'bg-stone-200'}`} />
              )}
            </div>
          )
        })}
      </div>

      {/* Step 1: Student Info */}
      {currentStep === 0 && (
        <Card className="bg-white rounded-xl">
          <CardHeader>
            <CardTitle className="font-serif text-lg text-stone-800">Student Information</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label className="text-sm font-medium text-stone-700">Student</Label>
              <Select value={studentId} onValueChange={setStudentId}>
                <SelectTrigger className="border-stone-300 bg-white">
                  <SelectValue placeholder="Select a student..." />
                </SelectTrigger>
                <SelectContent>
                  {students.map((s) => (
                    <SelectItem key={s.id} value={s.id}>
                      {s.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label className="text-sm font-medium text-stone-700">Disability Category</Label>
              <Select value={disabilityCategory} onValueChange={setDisabilityCategory}>
                <SelectTrigger className="border-stone-300 bg-white">
                  <SelectValue placeholder="Select category..." />
                </SelectTrigger>
                <SelectContent>
                  {disabilityCategories.map((cat) => (
                    <SelectItem key={cat} value={cat}>
                      {cat}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label className="text-sm font-medium text-stone-700">Start Date</Label>
                <Input
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  className="border-stone-300 bg-white"
                />
              </div>
              <div className="space-y-2">
                <Label className="text-sm font-medium text-stone-700">End Date</Label>
                <Input
                  type="date"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                  className="border-stone-300 bg-white"
                />
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Step 2: Present Levels */}
      {currentStep === 1 && (
        <Card className="bg-white rounded-xl">
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="font-serif text-lg text-stone-800">
                Present Levels of Performance
              </CardTitle>
              <Button
                variant="outline"
                size="sm"
                onClick={handleGeneratePresentLevels}
                disabled={isGenerating}
                className="gap-1.5 border-stone-300"
              >
                {isGenerating ? (
                  <Loader2 className="size-3.5 animate-spin" />
                ) : (
                  <Sparkles className="size-3.5" />
                )}
                Auto-generate with AI
              </Button>
            </div>
          </CardHeader>
          <CardContent className="space-y-3">
            <Textarea
              value={presentLevels}
              onChange={(e) => setPresentLevels(e.target.value)}
              placeholder="Describe the student's current academic and functional performance levels, strengths, areas of need, and how the disability impacts access to the general curriculum..."
              className="min-h-[250px] border-stone-300 bg-white text-sm leading-relaxed"
            />
            {presentLevels && (
              <p className="text-[10px] text-stone-400 italic">
                Generated by AI &mdash; Review required. Edit as needed before proceeding.
              </p>
            )}
          </CardContent>
        </Card>
      )}

      {/* Step 3: Goals */}
      {currentStep === 2 && (
        <Card className="bg-white rounded-xl">
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="font-serif text-lg text-stone-800">Annual Goals</CardTitle>
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
                        body: JSON.stringify({ studentId, disabilityCategory, presentLevels }),
                      })
                      if (!response.ok) throw new Error('Failed')
                      const data = (await response.json()) as { goals?: GoalDraft[] }
                      if (data.goals) {
                        setGoals([
                          ...goals,
                          ...data.goals.map((g) => ({ ...g, id: crypto.randomUUID() })),
                        ])
                        toast.success('AI goal suggestions added. Review and edit each goal.')
                      }
                    } catch {
                      toast.error('Failed to generate goals. Add them manually.')
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
            {goals.length === 0 ? (
              <div className="text-center py-8 text-sm text-stone-400">
                No goals added yet. Click &ldquo;Add Goal&rdquo; or use AI suggestions.
              </div>
            ) : (
              goals.map((goal, index) => (
                <div key={goal.id} className="space-y-3 p-4 border border-stone-200 rounded-lg bg-stone-50/50">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-semibold text-stone-500 uppercase tracking-wider">
                      Goal {index + 1}
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
                        placeholder="e.g., Reading Fluency"
                        className="border-stone-300 bg-white text-sm"
                      />
                    </div>
                    <div className="space-y-1">
                      <Label className="text-xs text-stone-500">Frequency</Label>
                      <Input
                        value={goal.frequency}
                        onChange={(e) => updateGoal(goal.id, 'frequency', e.target.value)}
                        placeholder="e.g., Bi-weekly"
                        className="border-stone-300 bg-white text-sm"
                      />
                    </div>
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs text-stone-500">Goal Text (SMART)</Label>
                    <Textarea
                      value={goal.goalText}
                      onChange={(e) => updateGoal(goal.id, 'goalText', e.target.value)}
                      placeholder="By [date], [student] will [specific skill] as measured by [method], improving from [baseline] to [target]."
                      className="border-stone-300 bg-white text-sm min-h-[80px]"
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1">
                      <Label className="text-xs text-stone-500">Baseline</Label>
                      <Input
                        value={goal.baseline}
                        onChange={(e) => updateGoal(goal.id, 'baseline', e.target.value)}
                        placeholder="e.g., 85 wpm"
                        className="border-stone-300 bg-white text-sm"
                      />
                    </div>
                    <div className="space-y-1">
                      <Label className="text-xs text-stone-500">Target</Label>
                      <Input
                        value={goal.target}
                        onChange={(e) => updateGoal(goal.id, 'target', e.target.value)}
                        placeholder="e.g., 110 wpm"
                        className="border-stone-300 bg-white text-sm"
                      />
                    </div>
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs text-stone-500">Measurement Method</Label>
                    <Input
                      value={goal.measureMethod}
                      onChange={(e) => updateGoal(goal.id, 'measureMethod', e.target.value)}
                      placeholder="e.g., CBM oral reading fluency probes"
                      className="border-stone-300 bg-white text-sm"
                    />
                  </div>
                </div>
              ))
            )}
          </CardContent>
        </Card>
      )}

      {/* Step 4: Accommodations */}
      {currentStep === 3 && (
        <Card className="bg-white rounded-xl">
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="font-serif text-lg text-stone-800">Accommodations</CardTitle>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={async () => {
                    setIsGenerating(true)
                    try {
                      const response = await fetch('/api/iep/generate/accommodations', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ studentId, disabilityCategory }),
                      })
                      if (!response.ok) throw new Error('Failed')
                      const data = (await response.json()) as { accommodations?: AccommodationDraft[] }
                      if (data.accommodations) {
                        setAccommodations([
                          ...accommodations,
                          ...data.accommodations.map((a) => ({ ...a, id: crypto.randomUUID() })),
                        ])
                        toast.success('AI accommodation suggestions added.')
                      }
                    } catch {
                      toast.error('Failed to generate accommodations.')
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
                  AI Suggest
                </Button>
                <Button
                  size="sm"
                  onClick={addAccommodation}
                  className="bg-amber-600 hover:bg-amber-700 text-white gap-1"
                >
                  <Plus className="size-3.5" />
                  Add
                </Button>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-3">
            {accommodations.length === 0 ? (
              <div className="text-center py-8 text-sm text-stone-400">
                No accommodations added yet.
              </div>
            ) : (
              accommodations.map((acc) => (
                <div key={acc.id} className="flex items-start gap-3 p-3 border border-stone-200 rounded-lg bg-stone-50/50">
                  <Select
                    value={acc.type}
                    onValueChange={(v) => updateAccommodation(acc.id, 'type', v)}
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
                    onChange={(e) => updateAccommodation(acc.id, 'description', e.target.value)}
                    placeholder="Describe the accommodation..."
                    className="flex-1 border-stone-300 bg-white text-sm"
                  />
                  <button
                    onClick={() => removeAccommodation(acc.id)}
                    className="p-1.5 rounded hover:bg-stone-200 text-stone-400 hover:text-stone-600 shrink-0"
                  >
                    <X className="size-4" />
                  </button>
                </div>
              ))
            )}
          </CardContent>
        </Card>
      )}

      {/* Step 5: Review */}
      {currentStep === 4 && (
        <Card className="bg-white rounded-xl">
          <CardHeader>
            <CardTitle className="font-serif text-lg text-stone-800">Review & Create</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <p className="text-stone-400 text-xs font-medium uppercase tracking-wider">Student</p>
                <p className="text-stone-800 font-medium">{selectedStudent?.name ?? '--'}</p>
              </div>
              <div>
                <p className="text-stone-400 text-xs font-medium uppercase tracking-wider">Disability</p>
                <p className="text-stone-800 font-medium">{disabilityCategory || '--'}</p>
              </div>
              <div>
                <p className="text-stone-400 text-xs font-medium uppercase tracking-wider">Start Date</p>
                <p className="text-stone-800">{startDate}</p>
              </div>
              <div>
                <p className="text-stone-400 text-xs font-medium uppercase tracking-wider">End Date</p>
                <p className="text-stone-800">{endDate}</p>
              </div>
            </div>

            <Separator />

            <div>
              <p className="text-stone-400 text-xs font-medium uppercase tracking-wider mb-2">Present Levels</p>
              {presentLevels ? (
                <p className="text-sm text-stone-600 line-clamp-4">{presentLevels}</p>
              ) : (
                <p className="text-sm text-stone-400 italic">Not yet written (will save as draft)</p>
              )}
            </div>

            <Separator />

            <div>
              <p className="text-stone-400 text-xs font-medium uppercase tracking-wider mb-2">
                Goals ({goals.length})
              </p>
              {goals.length > 0 ? (
                <div className="space-y-2">
                  {goals.map((g, i) => (
                    <div key={g.id} className="flex items-start gap-2 text-sm">
                      <Badge variant="outline" className="text-[10px] shrink-0 border-stone-300">
                        {i + 1}
                      </Badge>
                      <span className="text-stone-600">
                        {g.area}: {g.goalText.length > 100 ? g.goalText.slice(0, 100) + '...' : g.goalText}
                      </span>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-stone-400 italic">No goals added yet</p>
              )}
            </div>

            <Separator />

            <div>
              <p className="text-stone-400 text-xs font-medium uppercase tracking-wider mb-2">
                Accommodations ({accommodations.length})
              </p>
              {accommodations.length > 0 ? (
                <div className="space-y-1">
                  {accommodations.map((a) => (
                    <div key={a.id} className="flex items-center gap-2 text-sm text-stone-600">
                      <Badge variant="outline" className="text-[10px] shrink-0 border-stone-300">
                        {a.type}
                      </Badge>
                      {a.description}
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-stone-400 italic">No accommodations added yet</p>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Navigation buttons */}
      <div className="flex items-center justify-between pt-2">
        <Button
          variant="outline"
          onClick={() => setCurrentStep(Math.max(0, currentStep - 1))}
          disabled={currentStep === 0}
          className="gap-1 border-stone-300"
        >
          <ArrowLeft className="size-4" />
          Back
        </Button>

        {currentStep < steps.length - 1 ? (
          <Button
            onClick={() => setCurrentStep(currentStep + 1)}
            disabled={!canProceed()}
            className="bg-amber-600 hover:bg-amber-700 text-white gap-1"
          >
            Next
            <ArrowRight className="size-4" />
          </Button>
        ) : (
          <Button
            onClick={handleSubmit}
            disabled={isSubmitting || !studentId}
            className="bg-emerald-600 hover:bg-emerald-700 text-white gap-1"
          >
            {isSubmitting ? (
              <Loader2 className="size-4 animate-spin" />
            ) : (
              <CheckCircle2 className="size-4" />
            )}
            Create IEP
          </Button>
        )}
      </div>
    </div>
  )
}
