'use client'

import { useEffect, useState } from 'react'
import { useRouter, useParams } from 'next/navigation'
import Link from 'next/link'
import {
  ArrowLeft,
  Loader2,
  Save,
  BookOpen,
  Target,
  Flame,
  Presentation,
  Users,
  UserCheck,
  Flag,
  Package,
  Layers,
  ClipboardCheck,
  Clock,
  GraduationCap,
  CheckCircle2,
  Sparkles,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { toast } from 'sonner'

interface LessonPlanData {
  id: string
  title: string
  subject: string
  gradeLevel: string
  duration: string | null
  objectives: string[]
  standards: string[]
  warmUp: string | null
  directInstruction: string | null
  guidedPractice: string | null
  independentPractice: string | null
  closure: string | null
  materials: string[]
  differentiation: {
    belowGrade: string
    onGrade: string
    aboveGrade: string
  } | null
  assessmentPlan: string | null
  aiMetadata: Record<string, unknown> | null
}

export default function EditLessonPlanPage() {
  const router = useRouter()
  const params = useParams()
  const id = params.id as string

  const [plan, setPlan] = useState<LessonPlanData | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [isSaving, setIsSaving] = useState(false)

  useEffect(() => {
    async function loadPlan() {
      try {
        const res = await fetch(`/api/lesson-plans/${id}`)
        if (!res.ok) throw new Error('Failed to load lesson plan')
        const data = await res.json()
        setPlan(data)
      } catch {
        toast.error('Failed to load lesson plan.')
        router.push('/dashboard/lesson-plans')
      } finally {
        setIsLoading(false)
      }
    }
    loadPlan()
  }, [id, router])

  function updateField(field: keyof LessonPlanData, value: unknown) {
    if (!plan) return
    setPlan({ ...plan, [field]: value })
  }

  async function handleSave() {
    if (!plan) return
    setIsSaving(true)

    try {
      const res = await fetch(`/api/lesson-plans/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: plan.title,
          warmUp: plan.warmUp,
          directInstruction: plan.directInstruction,
          guidedPractice: plan.guidedPractice,
          independentPractice: plan.independentPractice,
          closure: plan.closure,
          assessmentPlan: plan.assessmentPlan,
          objectives: plan.objectives,
          materials: plan.materials,
          differentiation: plan.differentiation,
        }),
      })

      if (!res.ok) throw new Error('Failed to save changes')

      toast.success('Lesson plan saved!')
      router.push(`/dashboard/lesson-plans/${id}`)
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : 'Failed to save lesson plan.'
      )
    } finally {
      setIsSaving(false)
    }
  }

  if (isLoading) {
    return (
      <div className="space-y-6 max-w-4xl mx-auto">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-24 w-full" />
        <Skeleton className="h-40 w-full" />
        <Skeleton className="h-40 w-full" />
      </div>
    )
  }

  if (!plan) return null

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="sm" asChild>
          <Link href={`/dashboard/lesson-plans/${id}`}>
            <ArrowLeft className="size-4 mr-1" />
            Back to Plan
          </Link>
        </Button>
      </div>

      <div>
        <h1 className="text-2xl font-serif font-bold tracking-tight">Edit Lesson Plan</h1>
        <p className="text-muted-foreground">
          Make changes to your lesson plan below.
        </p>
      </div>

      {/* Title & Meta */}
      <Card>
        <CardContent className="pt-6">
          <div className="space-y-4">
            <div className="flex items-start justify-between gap-3">
              <div className="flex-1">
                <Input
                  value={plan.title}
                  onChange={(e) => updateField('title', e.target.value)}
                  className="text-xl font-bold border-none p-0 h-auto shadow-none focus-visible:ring-0 focus-visible:ring-offset-0"
                />
              </div>
              {plan.aiMetadata && (
                <Badge className="bg-amber-100 text-amber-700 border-amber-200 shrink-0">
                  <Sparkles className="size-3 mr-1" />
                  AI Generated
                </Badge>
              )}
            </div>
            <div className="flex flex-wrap gap-2">
              <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200">
                <GraduationCap className="size-3 mr-1" />
                {plan.gradeLevel}
              </Badge>
              <Badge variant="outline" className="bg-emerald-50 text-emerald-700 border-emerald-200">
                <BookOpen className="size-3 mr-1" />
                {plan.subject}
              </Badge>
              {plan.duration && (
                <Badge variant="outline" className="bg-violet-50 text-violet-700 border-violet-200">
                  <Clock className="size-3 mr-1" />
                  {plan.duration}
                </Badge>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Standards */}
      {plan.standards.length > 0 && (
        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center gap-2">
              <div className="rounded-md bg-sky-100 p-1.5">
                <CheckCircle2 className="size-4 text-sky-600" />
              </div>
              <CardTitle className="text-base">Standards Alignment</CardTitle>
            </div>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-2">
              {plan.standards.map((standard, i) => (
                <Badge
                  key={i}
                  variant="outline"
                  className="text-xs font-mono bg-sky-50 text-sky-700 border-sky-200"
                >
                  {standard}
                </Badge>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Objectives */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center gap-2">
            <div className="rounded-md bg-amber-100 p-1.5">
              <Target className="size-4 text-amber-600" />
            </div>
            <CardTitle className="text-base">Learning Objectives</CardTitle>
          </div>
        </CardHeader>
        <CardContent>
          <ul className="space-y-2">
            {plan.objectives.map((obj, i) => (
              <li key={i} className="flex items-start gap-3">
                <span className="flex items-center justify-center rounded-full bg-amber-100 text-amber-700 text-xs font-semibold size-6 shrink-0 mt-0.5">
                  {i + 1}
                </span>
                <Textarea
                  value={obj}
                  onChange={(e) => {
                    const updated = [...plan.objectives]
                    updated[i] = e.target.value
                    updateField('objectives', updated)
                  }}
                  className="min-h-0 resize-none border-none p-0 shadow-none focus-visible:ring-0 text-sm leading-relaxed"
                  rows={2}
                />
              </li>
            ))}
          </ul>
        </CardContent>
      </Card>

      {/* Lesson Sections */}
      <div className="space-y-4">
        <EditableSection
          icon={Flame}
          iconBg="bg-orange-100"
          iconColor="text-orange-600"
          title="Warm-Up"
          subtitle="Activate prior knowledge"
          value={plan.warmUp ?? ''}
          onChange={(v) => updateField('warmUp', v)}
        />
        <EditableSection
          icon={Presentation}
          iconBg="bg-indigo-100"
          iconColor="text-indigo-600"
          title="Direct Instruction"
          subtitle="Teacher-led instruction"
          value={plan.directInstruction ?? ''}
          onChange={(v) => updateField('directInstruction', v)}
        />
        <EditableSection
          icon={Users}
          iconBg="bg-teal-100"
          iconColor="text-teal-600"
          title="Guided Practice"
          subtitle="Structured practice with support"
          value={plan.guidedPractice ?? ''}
          onChange={(v) => updateField('guidedPractice', v)}
        />
        <EditableSection
          icon={UserCheck}
          iconBg="bg-green-100"
          iconColor="text-green-600"
          title="Independent Practice"
          subtitle="Student-driven practice"
          value={plan.independentPractice ?? ''}
          onChange={(v) => updateField('independentPractice', v)}
        />
        <EditableSection
          icon={Flag}
          iconBg="bg-rose-100"
          iconColor="text-rose-600"
          title="Closure"
          subtitle="Synthesize learning"
          value={plan.closure ?? ''}
          onChange={(v) => updateField('closure', v)}
        />
      </div>

      {/* Materials */}
      {plan.materials.length > 0 && (
        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center gap-2">
              <div className="rounded-md bg-slate-100 p-1.5">
                <Package className="size-4 text-slate-600" />
              </div>
              <CardTitle className="text-base">Materials Needed</CardTitle>
            </div>
          </CardHeader>
          <CardContent>
            <ul className="grid gap-1.5 sm:grid-cols-2">
              {plan.materials.map((material, i) => (
                <li
                  key={i}
                  className="flex items-center gap-2 text-sm text-muted-foreground"
                >
                  <span className="size-1.5 rounded-full bg-slate-400 shrink-0" />
                  {material}
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      )}

      {/* Differentiation */}
      {plan.differentiation && (
        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center gap-2">
              <div className="rounded-md bg-purple-100 p-1.5">
                <Layers className="size-4 text-purple-600" />
              </div>
              <CardTitle className="text-base">Differentiation</CardTitle>
            </div>
          </CardHeader>
          <CardContent>
            <div className="grid gap-4 sm:grid-cols-3">
              <DifferentiationTier
                label="Below Grade Level"
                color="border-amber-200 bg-amber-50/50"
                labelColor="text-amber-700 bg-amber-100"
                value={plan.differentiation.belowGrade}
                onChange={(v) =>
                  updateField('differentiation', {
                    ...plan.differentiation,
                    belowGrade: v,
                  })
                }
              />
              <DifferentiationTier
                label="On Grade Level"
                color="border-emerald-200 bg-emerald-50/50"
                labelColor="text-emerald-700 bg-emerald-100"
                value={plan.differentiation.onGrade}
                onChange={(v) =>
                  updateField('differentiation', {
                    ...plan.differentiation,
                    onGrade: v,
                  })
                }
              />
              <DifferentiationTier
                label="Above Grade Level"
                color="border-blue-200 bg-blue-50/50"
                labelColor="text-blue-700 bg-blue-100"
                value={plan.differentiation.aboveGrade}
                onChange={(v) =>
                  updateField('differentiation', {
                    ...plan.differentiation,
                    aboveGrade: v,
                  })
                }
              />
            </div>
          </CardContent>
        </Card>
      )}

      {/* Assessment Plan */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center gap-2">
            <div className="rounded-md bg-cyan-100 p-1.5">
              <ClipboardCheck className="size-4 text-cyan-600" />
            </div>
            <CardTitle className="text-base">Assessment Plan</CardTitle>
          </div>
        </CardHeader>
        <CardContent>
          <Textarea
            value={plan.assessmentPlan ?? ''}
            onChange={(e) => updateField('assessmentPlan', e.target.value)}
            className="min-h-24 resize-none border-dashed"
            rows={4}
          />
        </CardContent>
      </Card>

      {/* Save */}
      <div className="flex items-center gap-3 pt-2 pb-8">
        <Button
          onClick={handleSave}
          disabled={isSaving}
          className="bg-amber-600 hover:bg-amber-700 text-white"
          size="lg"
        >
          {isSaving ? (
            <>
              <Loader2 className="size-4 mr-2 animate-spin" />
              Saving...
            </>
          ) : (
            <>
              <Save className="size-4 mr-2" />
              Save Changes
            </>
          )}
        </Button>
        <Button variant="outline" size="lg" asChild>
          <Link href={`/dashboard/lesson-plans/${id}`}>Cancel</Link>
        </Button>
      </div>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Sub-components
// ---------------------------------------------------------------------------

interface EditableSectionProps {
  icon: React.ComponentType<{ className?: string }>
  iconBg: string
  iconColor: string
  title: string
  subtitle: string
  value: string
  onChange: (value: string) => void
}

function EditableSection({
  icon: Icon,
  iconBg,
  iconColor,
  title,
  subtitle,
  value,
  onChange,
}: EditableSectionProps) {
  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center gap-2">
          <div className={`rounded-md p-1.5 ${iconBg}`}>
            <Icon className={`size-4 ${iconColor}`} />
          </div>
          <div>
            <CardTitle className="text-base">{title}</CardTitle>
            <CardDescription className="text-xs">{subtitle}</CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <Textarea
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="min-h-24 resize-none border-dashed text-sm leading-relaxed"
          rows={5}
        />
      </CardContent>
    </Card>
  )
}

interface DifferentiationTierProps {
  label: string
  color: string
  labelColor: string
  value: string
  onChange: (value: string) => void
}

function DifferentiationTier({
  label,
  color,
  labelColor,
  value,
  onChange,
}: DifferentiationTierProps) {
  return (
    <div className={`rounded-lg border p-3 ${color}`}>
      <span className={`inline-block text-xs font-semibold px-2 py-0.5 rounded-full mb-2 ${labelColor}`}>
        {label}
      </span>
      <Textarea
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="min-h-20 resize-none border-none bg-transparent p-0 shadow-none focus-visible:ring-0 text-sm leading-relaxed"
        rows={4}
      />
    </div>
  )
}
