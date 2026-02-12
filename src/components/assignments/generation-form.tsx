'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import {
  Sparkles,
  ChevronRight,
  ChevronLeft,
  Save,
  Loader2,
  CheckCircle2,
  BookOpen,
  Lightbulb,
  Layers,
  ClipboardList,
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { RubricDisplay } from '@/components/assignments/rubric-display'
import { formatGradeLevel } from '@/lib/format'

interface ClassOption {
  id: string
  name: string
  subject: string
  gradeLevel: string
}

interface GeneratedData {
  assignment: {
    id: string
    title: string
    description: string
    instructions: string | null
  }
  rubric: {
    id: string
    title: string
    description: string | null
    type: string
    levels: string
  }
  criteria: Array<{
    id: string
    name: string
    description: string | null
    weight: number
    descriptors: string
  }>
  versions: Array<{
    id: string
    tier: string
    title: string
    content: string
    scaffolds: string | null
  }>
  successCriteria: string[]
}

interface GenerationFormProps {
  classes: ClassOption[]
}

const subjects = [
  'English Language Arts',
  'Mathematics',
  'Science',
  'Social Studies',
  'History',
  'Biology',
  'Chemistry',
  'Physics',
  'Computer Science',
  'Art',
  'Music',
  'Physical Education',
  'World Languages',
]

const gradeLevels = [
  'K',
  '1st',
  '2nd',
  '3rd',
  '4th',
  '5th',
  '6th',
  '7th',
  '8th',
  '9th',
  '10th',
  '11th',
  '12th',
]

const assignmentTypes = [
  { value: 'essay', label: 'Essay' },
  { value: 'quiz', label: 'Quiz' },
  { value: 'short_answer', label: 'Short Answer' },
  { value: 'project', label: 'Project' },
  { value: 'lab_report', label: 'Lab Report' },
]

const loadingMessages = [
  'Crafting your assignment...',
  'Designing rubric criteria...',
  'Building differentiated versions...',
  'Creating success criteria...',
  'Aligning to standards...',
  'Almost there...',
]

const tierLabels: Record<string, { label: string; description: string; color: string }> = {
  below_grade: {
    label: 'Below Grade Level',
    description: 'Additional scaffolding and structured support',
    color: 'bg-amber-100 text-amber-800 border-amber-200',
  },
  on_grade: {
    label: 'On Grade Level',
    description: 'Standard assignment expectations',
    color: 'bg-emerald-100 text-emerald-800 border-emerald-200',
  },
  above_grade: {
    label: 'Above Grade Level',
    description: 'Extended complexity and deeper analysis',
    color: 'bg-sky-100 text-sky-800 border-sky-200',
  },
}

export function GenerationForm({ classes }: GenerationFormProps) {
  const router = useRouter()
  const [step, setStep] = useState(1)
  const [isGenerating, setIsGenerating] = useState(false)
  const [loadingMessageIndex, setLoadingMessageIndex] = useState(0)
  const [generated, setGenerated] = useState<GeneratedData | null>(null)
  const [error, setError] = useState<string | null>(null)

  // Form state
  const [objective, setObjective] = useState('')
  const [subject, setSubject] = useState('')
  const [gradeLevel, setGradeLevel] = useState('')
  const [type, setType] = useState('essay')
  const [classId, setClassId] = useState('')
  const [standards, setStandards] = useState('')

  const selectedClass = classes.find((c) => c.id === classId)

  // Auto-fill subject and grade from class selection
  function handleClassChange(id: string) {
    setClassId(id)
    const cls = classes.find((c) => c.id === id)
    if (cls) {
      if (!subject) setSubject(cls.subject)
      if (!gradeLevel) setGradeLevel(cls.gradeLevel)
    }
  }

  const canGenerate =
    objective.trim() && subject && gradeLevel && classId

  async function handleGenerate() {
    if (!canGenerate) return

    setIsGenerating(true)
    setError(null)
    setStep(2)

    // Cycle through loading messages
    const interval = setInterval(() => {
      setLoadingMessageIndex((i) => (i + 1) % loadingMessages.length)
    }, 3000)

    try {
      const res = await fetch('/api/assignments/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          objective,
          subject,
          gradeLevel,
          type,
          standards: standards || undefined,
          classId,
        }),
      })

      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error || 'Generation failed')
      }

      const data = await res.json()
      setGenerated(data)
      setStep(3)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong')
      setStep(1)
    } finally {
      setIsGenerating(false)
      clearInterval(interval)
      setLoadingMessageIndex(0)
    }
  }

  function handleViewAssignment() {
    if (generated?.assignment.id) {
      router.push(`/dashboard/assignments/${generated.assignment.id}`)
    }
  }

  return (
    <div className="max-w-4xl mx-auto">
      {/* Step indicator */}
      <div className="flex items-center justify-center gap-2 mb-8">
        {[
          { num: 1, label: 'Configure' },
          { num: 2, label: 'Generate' },
          { num: 3, label: 'Review' },
        ].map((s, index) => (
          <div key={s.num} className="flex items-center gap-2">
            <div
              className={`flex items-center gap-2 px-3 py-1.5 rounded-full text-sm font-medium transition-colors ${
                step === s.num
                  ? 'bg-amber-100 text-amber-900'
                  : step > s.num
                    ? 'bg-emerald-100 text-emerald-800'
                    : 'bg-slate-100 text-slate-500'
              }`}
            >
              {step > s.num ? (
                <CheckCircle2 className="size-4" />
              ) : (
                <span className="size-5 flex items-center justify-center rounded-full bg-white/60 text-xs font-bold">
                  {s.num}
                </span>
              )}
              {s.label}
            </div>
            {index < 2 && (
              <ChevronRight className="size-4 text-slate-300" />
            )}
          </div>
        ))}
      </div>

      {/* Step 1: Configuration */}
      {step === 1 && (
        <Card className="border-amber-100">
          <CardHeader className="bg-gradient-to-r from-amber-50 to-orange-50 rounded-t-lg border-b border-amber-100">
            <CardTitle className="flex items-center gap-2 text-lg">
              <Sparkles className="size-5 text-amber-600" />
              Smart Assignment Creator
            </CardTitle>
            <p className="text-sm text-muted-foreground">
              Describe what you want students to learn and the AI will generate
              a complete assignment package with rubric, success criteria, and
              differentiated versions.
            </p>
          </CardHeader>
          <CardContent className="p-6 space-y-6">
            {error && (
              <div className="bg-red-50 border border-red-200 rounded-lg p-3 text-sm text-red-700">
                {error}
              </div>
            )}

            <div className="space-y-2">
              <Label htmlFor="objective" className="text-sm font-medium">
                Learning Objective
              </Label>
              <Textarea
                id="objective"
                placeholder="e.g., Students will analyze the causes and effects of the American Revolution by evaluating primary source documents and constructing evidence-based arguments."
                value={objective}
                onChange={(e) => setObjective(e.target.value)}
                className="min-h-[100px] resize-none"
              />
              <p className="text-xs text-muted-foreground">
                Describe the learning outcome you want to assess. Be specific
                about the skills and knowledge students should demonstrate.
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="classId" className="text-sm font-medium">
                  Class
                </Label>
                <Select value={classId} onValueChange={handleClassChange}>
                  <SelectTrigger id="classId" className="w-full">
                    <SelectValue placeholder="Select a class" />
                  </SelectTrigger>
                  <SelectContent>
                    {classes.map((cls) => (
                      <SelectItem key={cls.id} value={cls.id}>
                        {cls.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="type" className="text-sm font-medium">
                  Assignment Type
                </Label>
                <Select value={type} onValueChange={setType}>
                  <SelectTrigger id="type" className="w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {assignmentTypes.map((t) => (
                      <SelectItem key={t.value} value={t.value}>
                        {t.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="subject" className="text-sm font-medium">
                  Subject
                </Label>
                <Select value={subject} onValueChange={setSubject}>
                  <SelectTrigger id="subject" className="w-full">
                    <SelectValue placeholder="Select subject" />
                  </SelectTrigger>
                  <SelectContent>
                    {subjects.map((s) => (
                      <SelectItem key={s} value={s}>
                        {s}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="gradeLevel" className="text-sm font-medium">
                  Grade Level
                </Label>
                <Select value={gradeLevel} onValueChange={setGradeLevel}>
                  <SelectTrigger id="gradeLevel" className="w-full">
                    <SelectValue placeholder="Select grade" />
                  </SelectTrigger>
                  <SelectContent>
                    {gradeLevels.map((g) => (
                      <SelectItem key={g} value={g}>
                        {formatGradeLevel(g)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="standards" className="text-sm font-medium">
                Standards (optional)
              </Label>
              <Input
                id="standards"
                placeholder="e.g., CCSS.ELA-LITERACY.RH.6-8.1, CCSS.ELA-LITERACY.W.8.1"
                value={standards}
                onChange={(e) => setStandards(e.target.value)}
              />
              <p className="text-xs text-muted-foreground">
                Comma-separated standard codes to align the assignment to.
              </p>
            </div>

            <div className="flex justify-end pt-2">
              <Button
                onClick={handleGenerate}
                disabled={!canGenerate}
                className="bg-amber-600 hover:bg-amber-700 text-white gap-2"
                size="lg"
              >
                <Sparkles className="size-4" />
                Generate with AI
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Step 2: Loading */}
      {step === 2 && isGenerating && (
        <Card className="border-amber-100">
          <CardContent className="p-12">
            <div className="flex flex-col items-center gap-6 text-center">
              <div className="relative">
                <div className="absolute inset-0 rounded-full bg-amber-200 animate-ping opacity-20" />
                <div className="relative rounded-full bg-gradient-to-br from-amber-100 to-orange-100 p-6">
                  <Sparkles className="size-8 text-amber-600 animate-pulse" />
                </div>
              </div>
              <div className="space-y-2">
                <h3 className="text-lg font-semibold">
                  {loadingMessages[loadingMessageIndex]}
                </h3>
                <p className="text-sm text-muted-foreground max-w-md">
                  The AI is analyzing your learning objective and generating a
                  comprehensive assignment package. This usually takes 15-30
                  seconds.
                </p>
              </div>
              <div className="w-full max-w-md space-y-4">
                <div className="space-y-2">
                  <Skeleton className="h-4 w-full" />
                  <Skeleton className="h-4 w-3/4" />
                  <Skeleton className="h-4 w-5/6" />
                </div>
                <div className="grid grid-cols-4 gap-2">
                  {[...Array(4)].map((_, i) => (
                    <Skeleton key={i} className="h-20" />
                  ))}
                </div>
                <div className="space-y-2">
                  <Skeleton className="h-3 w-2/3" />
                  <Skeleton className="h-3 w-1/2" />
                  <Skeleton className="h-3 w-3/5" />
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Step 3: Review Generated Content */}
      {step === 3 && generated && (
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-xl font-bold">{generated.assignment.title}</h2>
              <p className="text-sm text-muted-foreground mt-1">
                Review the generated content below. Everything has been saved as
                a draft.
              </p>
            </div>
            <div className="flex gap-2">
              <Button
                variant="outline"
                onClick={() => {
                  setGenerated(null)
                  setStep(1)
                }}
                className="gap-2"
              >
                <ChevronLeft className="size-4" />
                Start Over
              </Button>
              <Button
                onClick={handleViewAssignment}
                className="bg-amber-600 hover:bg-amber-700 text-white gap-2"
              >
                <Save className="size-4" />
                View Assignment
              </Button>
            </div>
          </div>

          <Tabs defaultValue="assignment" className="w-full" activationMode="automatic">
            <TabsList className="w-full justify-start">
              <TabsTrigger value="assignment" className="gap-1.5">
                <BookOpen className="size-3.5" />
                Assignment
              </TabsTrigger>
              <TabsTrigger value="rubric" className="gap-1.5">
                <ClipboardList className="size-3.5" />
                Rubric
              </TabsTrigger>
              <TabsTrigger value="criteria" className="gap-1.5">
                <Lightbulb className="size-3.5" />
                Success Criteria
              </TabsTrigger>
              <TabsTrigger value="differentiation" className="gap-1.5">
                <Layers className="size-3.5" />
                Differentiated Versions
              </TabsTrigger>
            </TabsList>

            <TabsContent value="assignment" className="mt-4">
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">
                    Assignment Details
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <h4 className="text-sm font-medium text-muted-foreground mb-1">
                      Description
                    </h4>
                    <p className="text-sm leading-relaxed whitespace-pre-wrap">
                      {generated.assignment.description}
                    </p>
                  </div>
                  {generated.assignment.instructions && (
                    <div>
                      <h4 className="text-sm font-medium text-muted-foreground mb-1">
                        Instructions
                      </h4>
                      <div className="text-sm leading-relaxed whitespace-pre-wrap bg-slate-50 rounded-lg p-4 border">
                        {generated.assignment.instructions}
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="rubric" className="mt-4">
              <RubricDisplay
                rubric={generated.rubric}
                criteria={generated.criteria}
              />
            </TabsContent>

            <TabsContent value="criteria" className="mt-4">
              <Card>
                <CardHeader className="bg-gradient-to-r from-emerald-50 to-teal-50 border-b">
                  <CardTitle className="text-base flex items-center gap-2">
                    <Lightbulb className="size-4 text-emerald-600" />
                    Success Criteria
                  </CardTitle>
                  <p className="text-sm text-muted-foreground">
                    Student-facing &ldquo;I can&rdquo; statements that clarify
                    what success looks like.
                  </p>
                </CardHeader>
                <CardContent className="p-6">
                  <ul className="space-y-3">
                    {generated.successCriteria.map((criterion, index) => (
                      <li
                        key={index}
                        className="flex items-start gap-3 text-sm"
                      >
                        <CheckCircle2 className="size-4 text-emerald-500 mt-0.5 shrink-0" />
                        <span className="leading-relaxed">{criterion}</span>
                      </li>
                    ))}
                  </ul>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="differentiation" className="mt-4">
              <div className="space-y-4">
                {generated.versions.map((version) => {
                  const tierInfo =
                    tierLabels[version.tier] ?? tierLabels.on_grade
                  const scaffolds: string[] = (() => {
                    try {
                      return version.scaffolds
                        ? JSON.parse(version.scaffolds)
                        : []
                    } catch {
                      return []
                    }
                  })()

                  return (
                    <Card key={version.id} className="overflow-hidden">
                      <CardHeader className="pb-3">
                        <div className="flex items-center gap-2">
                          <Badge
                            className={`${tierInfo.color} border text-xs`}
                          >
                            {tierInfo.label}
                          </Badge>
                          <span className="text-xs text-muted-foreground">
                            {tierInfo.description}
                          </span>
                        </div>
                        <CardTitle className="text-base mt-1">
                          {version.title}
                        </CardTitle>
                      </CardHeader>
                      <CardContent className="space-y-3">
                        <div className="text-sm leading-relaxed whitespace-pre-wrap">
                          {version.content}
                        </div>
                        {scaffolds.length > 0 && (
                          <div className="bg-slate-50 rounded-lg p-4 border">
                            <h4 className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-2">
                              Scaffolds & Supports
                            </h4>
                            <ul className="space-y-1.5">
                              {scaffolds.map(
                                (scaffold: string, index: number) => (
                                  <li
                                    key={index}
                                    className="text-sm flex items-start gap-2"
                                  >
                                    <span className="text-amber-500 mt-1">
                                      &bull;
                                    </span>
                                    {scaffold}
                                  </li>
                                )
                              )}
                            </ul>
                          </div>
                        )}
                      </CardContent>
                    </Card>
                  )
                })}
              </div>
            </TabsContent>
          </Tabs>
        </div>
      )}
    </div>
  )
}
