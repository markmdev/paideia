'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import {
  Sparkles,
  ArrowLeft,
  Loader2,
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
  Save,
  CheckCircle2,
  Pencil,
  Eye,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
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
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { toast } from 'sonner'
import { formatGradeLevel } from '@/lib/format'

const markdownComponents = {
  table: ({ children, ...props }: React.ComponentProps<'table'>) => <table className="w-full border-collapse my-4 text-sm" {...props}>{children}</table>,
  th: ({ children, ...props }: React.ComponentProps<'th'>) => <th className="border border-stone-300 bg-stone-50 px-3 py-2 text-left font-medium" {...props}>{children}</th>,
  td: ({ children, ...props }: React.ComponentProps<'td'>) => <td className="border border-stone-300 px-3 py-2" {...props}>{children}</td>,
}

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

const GRADE_LEVELS = [
  'Kindergarten',
  '1st Grade', '2nd Grade', '3rd Grade', '4th Grade', '5th Grade',
  '6th Grade', '7th Grade', '8th Grade',
  '9th Grade', '10th Grade', '11th Grade', '12th Grade',
]

const SUBJECTS = [
  'English Language Arts',
  'Mathematics',
  'Science',
  'Social Studies',
  'History',
  'Biology',
  'Chemistry',
  'Physics',
  'Geography',
  'Art',
  'Music',
  'Physical Education',
  'Computer Science',
  'World Languages',
]

const INSTRUCTIONAL_MODELS = [
  { value: 'direct', label: 'Direct Instruction' },
  { value: 'inquiry', label: 'Inquiry-Based Learning' },
  { value: 'project', label: 'Project-Based Learning' },
  { value: 'socratic', label: 'Socratic Seminar' },
  { value: 'workshop', label: 'Workshop Model' },
]

const DURATIONS = [
  '30 minutes',
  '45 minutes',
  '60 minutes',
  '90 minutes',
  '120 minutes',
]

export default function NewLessonPlanPage() {
  const router = useRouter()
  const [isGenerating, setIsGenerating] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  const [generatedPlan, setGeneratedPlan] = useState<LessonPlanData | null>(null)

  // Form state
  const [subject, setSubject] = useState('')
  const [gradeLevel, setGradeLevel] = useState('')
  const [topic, setTopic] = useState('')
  const [duration, setDuration] = useState('')
  const [instructionalModel, setInstructionalModel] = useState('')

  // Editable plan sections
  const [editedPlan, setEditedPlan] = useState<LessonPlanData | null>(null)
  const [editingSection, setEditingSection] = useState<string | null>(null)
  const [editingAssessment, setEditingAssessment] = useState(false)

  const activePlan = editedPlan ?? generatedPlan

  async function handleGenerate() {
    if (!subject || !gradeLevel || !topic) {
      toast.error('Please fill in the subject, grade level, and topic.')
      return
    }

    setIsGenerating(true)
    setGeneratedPlan(null)
    setEditedPlan(null)

    try {
      const res = await fetch('/api/lesson-plans/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          subject,
          gradeLevel,
          topic,
          duration: duration || undefined,
          instructionalModel: instructionalModel || undefined,
        }),
      })

      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error || 'Generation failed')
      }

      const plan = await res.json()
      setGeneratedPlan(plan)
      toast.success('Lesson plan generated successfully!')
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : 'Failed to generate lesson plan.'
      )
    } finally {
      setIsGenerating(false)
    }
  }

  function updatePlanField(field: keyof LessonPlanData, value: unknown) {
    const current = editedPlan ?? generatedPlan
    if (!current) return
    setEditedPlan({ ...current, [field]: value })
  }

  async function handleSave() {
    if (!activePlan) return
    setIsSaving(true)

    try {
      const res = await fetch(`/api/lesson-plans/${activePlan.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: activePlan.title,
          warmUp: activePlan.warmUp,
          directInstruction: activePlan.directInstruction,
          guidedPractice: activePlan.guidedPractice,
          independentPractice: activePlan.independentPractice,
          closure: activePlan.closure,
          assessmentPlan: activePlan.assessmentPlan,
          objectives: activePlan.objectives,
          materials: activePlan.materials,
          differentiation: activePlan.differentiation,
        }),
      })

      if (!res.ok) {
        throw new Error('Failed to save changes')
      }

      toast.success('Lesson plan saved!')
      router.push(`/dashboard/lesson-plans/${activePlan.id}`)
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : 'Failed to save lesson plan.'
      )
    } finally {
      setIsSaving(false)
    }
  }

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="sm" asChild>
          <Link href="/dashboard/lesson-plans">
            <ArrowLeft className="size-4 mr-1" />
            Back
          </Link>
        </Button>
      </div>

      <div>
        <h1 className="text-2xl font-serif font-bold tracking-tight">
          Create Lesson Plan
        </h1>
        <p className="text-muted-foreground">
          Describe what you want to teach and let AI generate a complete,
          standards-aligned lesson plan.
        </p>
      </div>

      {/* Input Form */}
      {!activePlan && (
        <Card className="border-amber-200 bg-amber-50/30">
          <CardHeader>
            <div className="flex items-center gap-2">
              <div className="rounded-full bg-amber-100 p-2">
                <Sparkles className="size-5 text-amber-600" />
              </div>
              <div>
                <CardTitle className="text-lg">AI Lesson Plan Generator</CardTitle>
                <CardDescription>
                  Provide the details below and AI will create a complete lesson plan
                  with objectives, activities, differentiation, and assessment.
                </CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-5">
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="subject">Subject *</Label>
                <Select value={subject} onValueChange={setSubject}>
                  <SelectTrigger id="subject" className="w-full">
                    <SelectValue placeholder="Select subject" />
                  </SelectTrigger>
                  <SelectContent>
                    {SUBJECTS.map((s) => (
                      <SelectItem key={s} value={s}>
                        {s}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="gradeLevel">Grade Level *</Label>
                <Select value={gradeLevel} onValueChange={setGradeLevel}>
                  <SelectTrigger id="gradeLevel" className="w-full">
                    <SelectValue placeholder="Select grade" />
                  </SelectTrigger>
                  <SelectContent>
                    {GRADE_LEVELS.map((g) => (
                      <SelectItem key={g} value={g}>
                        {g}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="topic">Topic *</Label>
              <Textarea
                id="topic"
                placeholder="e.g., Introduction to fractions using visual models and real-world examples"
                value={topic}
                onChange={(e) => setTopic(e.target.value)}
                rows={3}
              />
              <p className="text-xs text-muted-foreground">
                Be specific about what you want students to learn. The more detail
                you provide, the better the generated plan.
              </p>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="duration">Duration</Label>
                <Select value={duration} onValueChange={setDuration}>
                  <SelectTrigger id="duration" className="w-full">
                    <SelectValue placeholder="Select duration" />
                  </SelectTrigger>
                  <SelectContent>
                    {DURATIONS.map((d) => (
                      <SelectItem key={d} value={d}>
                        {d}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="instructionalModel">Instructional Model</Label>
                <Select
                  value={instructionalModel}
                  onValueChange={setInstructionalModel}
                >
                  <SelectTrigger id="instructionalModel" className="w-full">
                    <SelectValue placeholder="Any model" />
                  </SelectTrigger>
                  <SelectContent>
                    {INSTRUCTIONAL_MODELS.map((m) => (
                      <SelectItem key={m.value} value={m.value}>
                        {m.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <Button
              onClick={handleGenerate}
              disabled={isGenerating}
              className="w-full bg-amber-600 hover:bg-amber-700 text-white"
              size="lg"
            >
              {isGenerating ? (
                <>
                  <Loader2 className="size-4 mr-2 animate-spin" />
                  Generating lesson plan...
                </>
              ) : (
                <>
                  <Sparkles className="size-4 mr-2" />
                  Generate with AI
                </>
              )}
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Loading State */}
      {isGenerating && (
        <div className="space-y-4">
          <Card className="border-amber-200">
            <CardContent className="py-8">
              <div className="flex flex-col items-center text-center space-y-4">
                <div className="relative">
                  <div className="rounded-full bg-amber-100 p-4">
                    <Sparkles className="size-6 text-amber-600 animate-pulse" />
                  </div>
                </div>
                <div>
                  <h3 className="font-semibold text-lg">Crafting your lesson plan</h3>
                  <p className="text-muted-foreground text-sm mt-1">
                    Designing objectives, activities, differentiation strategies,
                    and assessments for your {gradeLevel} {subject} class...
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          <div className="space-y-4">
            <Skeleton className="h-24 w-full rounded-lg" />
            <div className="grid gap-4 sm:grid-cols-2">
              <Skeleton className="h-40 rounded-lg" />
              <Skeleton className="h-40 rounded-lg" />
            </div>
            <Skeleton className="h-32 w-full rounded-lg" />
            <Skeleton className="h-32 w-full rounded-lg" />
          </div>
        </div>
      )}

      {/* Generated Lesson Plan Display */}
      {activePlan && !isGenerating && (
        <div className="space-y-5">
          {/* Title & Meta */}
          <Card>
            <CardContent className="pt-6">
              <div className="space-y-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1">
                    <Input
                      value={activePlan.title}
                      onChange={(e) => updatePlanField('title', e.target.value)}
                      className="text-xl font-bold border-none p-0 h-auto shadow-none focus-visible:ring-0 focus-visible:ring-offset-0"
                    />
                  </div>
                  {activePlan.aiMetadata && (
                    <Badge className="bg-amber-100 text-amber-700 border-amber-200 shrink-0">
                      <Sparkles className="size-3 mr-1" />
                      AI Generated
                    </Badge>
                  )}
                </div>
                <div className="flex flex-wrap gap-2">
                  <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200">
                    <GraduationCap className="size-3 mr-1" />
                    {formatGradeLevel(activePlan.gradeLevel)}
                  </Badge>
                  <Badge variant="outline" className="bg-emerald-50 text-emerald-700 border-emerald-200">
                    <BookOpen className="size-3 mr-1" />
                    {activePlan.subject}
                  </Badge>
                  {activePlan.duration && (
                    <Badge variant="outline" className="bg-violet-50 text-violet-700 border-violet-200">
                      <Clock className="size-3 mr-1" />
                      {activePlan.duration}
                    </Badge>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Standards */}
          {activePlan.standards.length > 0 && (
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
                <ul className="space-y-2">
                  {activePlan.standards.map((standard, i) => {
                    const dashIdx = standard.indexOf(' — ')
                    const hasDescription = dashIdx > -1
                    const code = hasDescription ? standard.slice(0, dashIdx) : standard
                    const description = hasDescription ? standard.slice(dashIdx + 3) : null
                    return (
                      <li key={i} className="flex items-start gap-2">
                        <Badge
                          variant="outline"
                          className="text-xs font-mono bg-sky-50 text-sky-700 border-sky-200 shrink-0"
                        >
                          {code}
                        </Badge>
                        {description && (
                          <span className="text-sm text-muted-foreground leading-relaxed">
                            {description}
                          </span>
                        )}
                      </li>
                    )
                  })}
                </ul>
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
                {activePlan.objectives.map((obj, i) => (
                  <li key={i} className="flex items-start gap-3">
                    <span className="flex items-center justify-center rounded-full bg-amber-100 text-amber-700 text-xs font-semibold size-6 shrink-0 mt-0.5">
                      {i + 1}
                    </span>
                    <Textarea
                      value={obj}
                      onChange={(e) => {
                        const updated = [...activePlan.objectives]
                        updated[i] = e.target.value
                        updatePlanField('objectives', updated)
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
            <LessonSection
              sectionKey="warmUp"
              icon={Flame}
              iconBg="bg-orange-100"
              iconColor="text-orange-600"
              title="Warm-Up"
              subtitle="Activate prior knowledge"
              value={activePlan.warmUp ?? ''}
              onChange={(v) => updatePlanField('warmUp', v)}
              isEditing={editingSection === 'warmUp'}
              onToggleEdit={() => setEditingSection(editingSection === 'warmUp' ? null : 'warmUp')}
            />

            <LessonSection
              sectionKey="directInstruction"
              icon={Presentation}
              iconBg="bg-indigo-100"
              iconColor="text-indigo-600"
              title="Direct Instruction"
              subtitle="Teacher-led instruction"
              value={activePlan.directInstruction ?? ''}
              onChange={(v) => updatePlanField('directInstruction', v)}
              isEditing={editingSection === 'directInstruction'}
              onToggleEdit={() => setEditingSection(editingSection === 'directInstruction' ? null : 'directInstruction')}
            />

            <LessonSection
              sectionKey="guidedPractice"
              icon={Users}
              iconBg="bg-teal-100"
              iconColor="text-teal-600"
              title="Guided Practice"
              subtitle="Structured practice with support"
              value={activePlan.guidedPractice ?? ''}
              onChange={(v) => updatePlanField('guidedPractice', v)}
              isEditing={editingSection === 'guidedPractice'}
              onToggleEdit={() => setEditingSection(editingSection === 'guidedPractice' ? null : 'guidedPractice')}
            />

            <LessonSection
              sectionKey="independentPractice"
              icon={UserCheck}
              iconBg="bg-green-100"
              iconColor="text-green-600"
              title="Independent Practice"
              subtitle="Student-driven practice"
              value={activePlan.independentPractice ?? ''}
              onChange={(v) => updatePlanField('independentPractice', v)}
              isEditing={editingSection === 'independentPractice'}
              onToggleEdit={() => setEditingSection(editingSection === 'independentPractice' ? null : 'independentPractice')}
            />

            <LessonSection
              sectionKey="closure"
              icon={Flag}
              iconBg="bg-rose-100"
              iconColor="text-rose-600"
              title="Closure"
              subtitle="Synthesize learning"
              value={activePlan.closure ?? ''}
              onChange={(v) => updatePlanField('closure', v)}
              isEditing={editingSection === 'closure'}
              onToggleEdit={() => setEditingSection(editingSection === 'closure' ? null : 'closure')}
            />
          </div>

          {/* Materials */}
          {activePlan.materials.length > 0 && (
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
                  {activePlan.materials.map((material, i) => (
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
          {activePlan.differentiation && (
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
                    tierKey="belowGrade"
                    label="Below Grade Level"
                    color="border-amber-200 bg-amber-50/50"
                    labelColor="text-amber-700 bg-amber-100"
                    value={activePlan.differentiation.belowGrade}
                    onChange={(v) =>
                      updatePlanField('differentiation', {
                        ...activePlan.differentiation,
                        belowGrade: v,
                      })
                    }
                    isEditing={editingSection === 'diff-belowGrade'}
                    onToggleEdit={() => setEditingSection(editingSection === 'diff-belowGrade' ? null : 'diff-belowGrade')}
                  />
                  <DifferentiationTier
                    tierKey="onGrade"
                    label="On Grade Level"
                    color="border-emerald-200 bg-emerald-50/50"
                    labelColor="text-emerald-700 bg-emerald-100"
                    value={activePlan.differentiation.onGrade}
                    onChange={(v) =>
                      updatePlanField('differentiation', {
                        ...activePlan.differentiation,
                        onGrade: v,
                      })
                    }
                    isEditing={editingSection === 'diff-onGrade'}
                    onToggleEdit={() => setEditingSection(editingSection === 'diff-onGrade' ? null : 'diff-onGrade')}
                  />
                  <DifferentiationTier
                    tierKey="aboveGrade"
                    label="Above Grade Level"
                    color="border-blue-200 bg-blue-50/50"
                    labelColor="text-blue-700 bg-blue-100"
                    value={activePlan.differentiation.aboveGrade}
                    onChange={(v) =>
                      updatePlanField('differentiation', {
                        ...activePlan.differentiation,
                        aboveGrade: v,
                      })
                    }
                    isEditing={editingSection === 'diff-aboveGrade'}
                    onToggleEdit={() => setEditingSection(editingSection === 'diff-aboveGrade' ? null : 'diff-aboveGrade')}
                  />
                </div>
              </CardContent>
            </Card>
          )}

          {/* Assessment Plan */}
          <Card>
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="rounded-md bg-cyan-100 p-1.5">
                    <ClipboardCheck className="size-4 text-cyan-600" />
                  </div>
                  <CardTitle className="text-base">Assessment Plan</CardTitle>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-7 px-2 text-xs text-muted-foreground"
                  onClick={() => setEditingAssessment(!editingAssessment)}
                >
                  {editingAssessment ? (
                    <>
                      <Eye className="size-3 mr-1" />
                      Preview
                    </>
                  ) : (
                    <>
                      <Pencil className="size-3 mr-1" />
                      Edit
                    </>
                  )}
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              {editingAssessment ? (
                <Textarea
                  value={activePlan.assessmentPlan ?? ''}
                  onChange={(e) => updatePlanField('assessmentPlan', e.target.value)}
                  className="min-h-40 border-dashed text-sm leading-relaxed"
                  rows={Math.max(8, (activePlan.assessmentPlan ?? '').split('\n').length + 2)}
                />
              ) : activePlan.assessmentPlan ? (
                <div className="prose prose-stone prose-sm max-w-none">
                  <ReactMarkdown remarkPlugins={[remarkGfm]} components={markdownComponents}>
                    {activePlan.assessmentPlan}
                  </ReactMarkdown>
                </div>
              ) : (
                <p className="text-sm text-muted-foreground italic">No assessment plan generated. Click Edit to add one.</p>
              )}
            </CardContent>
          </Card>

          {/* Action Buttons */}
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
                  Save Lesson Plan
                </>
              )}
            </Button>
            <Button
              variant="outline"
              size="lg"
              onClick={() => {
                setGeneratedPlan(null)
                setEditedPlan(null)
              }}
            >
              Start Over
            </Button>
          </div>
        </div>
      )}
    </div>
  )
}

// ---------------------------------------------------------------------------
// Sub-components
// ---------------------------------------------------------------------------

interface LessonSectionProps {
  sectionKey: string
  icon: React.ComponentType<{ className?: string }>
  iconBg: string
  iconColor: string
  title: string
  subtitle: string
  value: string
  onChange: (value: string) => void
  isEditing: boolean
  onToggleEdit: () => void
}

function LessonSection({
  icon: Icon,
  iconBg,
  iconColor,
  title,
  subtitle,
  value,
  onChange,
  isEditing,
  onToggleEdit,
}: LessonSectionProps) {
  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className={`rounded-md p-1.5 ${iconBg}`}>
              <Icon className={`size-4 ${iconColor}`} />
            </div>
            <div>
              <CardTitle className="text-base">{title}</CardTitle>
              <CardDescription className="text-xs">{subtitle}</CardDescription>
            </div>
          </div>
          <Button
            variant="ghost"
            size="sm"
            className="h-7 px-2 text-xs text-muted-foreground"
            onClick={onToggleEdit}
          >
            {isEditing ? (
              <>
                <Eye className="size-3 mr-1" />
                Preview
              </>
            ) : (
              <>
                <Pencil className="size-3 mr-1" />
                Edit
              </>
            )}
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        {isEditing ? (
          <Textarea
            value={value}
            onChange={(e) => onChange(e.target.value)}
            className="min-h-40 border-dashed text-sm leading-relaxed"
            rows={Math.max(8, value.split('\n').length + 2)}
          />
        ) : value ? (
          <div className="prose prose-stone prose-sm max-w-none">
            <ReactMarkdown remarkPlugins={[remarkGfm]} components={markdownComponents}>
              {value}
            </ReactMarkdown>
          </div>
        ) : (
          <p className="text-sm text-muted-foreground italic">Click Edit to add content.</p>
        )}
      </CardContent>
    </Card>
  )
}

interface DifferentiationTierProps {
  tierKey: string
  label: string
  color: string
  labelColor: string
  value: string
  onChange: (value: string) => void
  isEditing: boolean
  onToggleEdit: () => void
}

function DifferentiationTier({
  label,
  color,
  labelColor,
  value,
  onChange,
  isEditing,
  onToggleEdit,
}: DifferentiationTierProps) {
  return (
    <div className={`rounded-lg border p-3 ${color}`}>
      <div className="flex items-center justify-between mb-2">
        <span className={`inline-block text-xs font-semibold px-2 py-0.5 rounded-full ${labelColor}`}>
          {label}
        </span>
        <Button
          variant="ghost"
          size="sm"
          className="h-6 px-1.5 text-xs text-muted-foreground"
          onClick={onToggleEdit}
        >
          {isEditing ? (
            <Eye className="size-3" />
          ) : (
            <Pencil className="size-3" />
          )}
        </Button>
      </div>
      {isEditing ? (
        <Textarea
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="min-h-28 border-none bg-transparent p-0 shadow-none focus-visible:ring-0 text-sm leading-relaxed"
          rows={Math.max(6, value.split('\n').length + 2)}
        />
      ) : (
        <div className="text-sm leading-relaxed text-muted-foreground prose prose-stone prose-sm max-w-none">
          <ReactMarkdown remarkPlugins={[remarkGfm]} components={markdownComponents}>
            {value}
          </ReactMarkdown>
        </div>
      )}
    </div>
  )
}
