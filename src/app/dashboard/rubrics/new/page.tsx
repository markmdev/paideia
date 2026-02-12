'use client'

import { useState, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft, Sparkles, Loader2, Save, X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
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
import { RubricGrid, type RubricData, type RubricCriterion } from '@/components/rubrics/rubric-grid'

const SUBJECTS = [
  'English Language Arts',
  'Mathematics',
  'Science',
  'Social Studies',
  'World Languages',
  'Arts',
  'Physical Education',
  'Computer Science',
  'Other',
]

const GRADE_LEVELS = [
  'Kindergarten',
  '1st Grade',
  '2nd Grade',
  '3rd Grade',
  '4th Grade',
  '5th Grade',
  '6th Grade',
  '7th Grade',
  '8th Grade',
  '9th Grade',
  '10th Grade',
  '11th Grade',
  '12th Grade',
]

const DEFAULT_LEVELS = ['Beginning', 'Developing', 'Proficient', 'Advanced']

export default function NewRubricPage() {
  const router = useRouter()

  const [title, setTitle] = useState('')
  const [subject, setSubject] = useState('')
  const [gradeLevel, setGradeLevel] = useState('')
  const [assignmentDescription, setAssignmentDescription] = useState('')
  const [standards, setStandards] = useState('')
  const [levels, setLevels] = useState<string[]>(DEFAULT_LEVELS)
  const [newLevel, setNewLevel] = useState('')

  const [generatedRubric, setGeneratedRubric] = useState<RubricData | null>(null)
  const [successCriteria, setSuccessCriteria] = useState<string[]>([])
  const [isGenerating, setIsGenerating] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const addLevel = () => {
    const trimmed = newLevel.trim()
    if (trimmed && !levels.includes(trimmed)) {
      setLevels([...levels, trimmed])
      setNewLevel('')
    }
  }

  const removeLevel = (level: string) => {
    if (levels.length <= 2) return
    setLevels(levels.filter((l) => l !== level))
  }

  const handleGenerate = async () => {
    if (!title || !subject || !gradeLevel || !assignmentDescription) {
      setError('Fill in all required fields before generating.')
      return
    }

    setIsGenerating(true)
    setError(null)

    try {
      const res = await fetch('/api/rubrics/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title,
          subject,
          gradeLevel,
          assignmentDescription,
          standards: standards ? standards.split(',').map((s) => s.trim()).filter(Boolean) : undefined,
          levels,
        }),
      })

      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error ?? 'Failed to generate rubric')
      }

      const data = await res.json()

      setGeneratedRubric({
        id: data.id,
        title: data.title,
        description: data.description,
        type: data.type,
        levels: data.levels,
        criteria: data.criteria,
        successCriteria: data.successCriteria,
      })
      setSuccessCriteria(data.successCriteria ?? [])
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong. Please try again.')
    } finally {
      setIsGenerating(false)
    }
  }

  const handleDescriptorEdit = useCallback(
    (criterionId: string, level: string, value: string) => {
      if (!generatedRubric) return

      setGeneratedRubric({
        ...generatedRubric,
        criteria: generatedRubric.criteria.map((c) =>
          c.id === criterionId
            ? { ...c, descriptors: { ...c.descriptors, [level]: value } }
            : c
        ),
      })
    },
    [generatedRubric]
  )

  const handleSave = async () => {
    if (!generatedRubric) return

    setIsSaving(true)
    setError(null)

    try {
      const res = await fetch(`/api/rubrics/${generatedRubric.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: generatedRubric.title,
          description: generatedRubric.description,
          type: generatedRubric.type,
          levels: generatedRubric.levels,
          criteria: generatedRubric.criteria.map((c) => ({
            name: c.name,
            description: c.description,
            weight: c.weight,
            descriptors: c.descriptors,
          })),
        }),
      })

      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error ?? 'Failed to save rubric')
      }

      router.push(`/dashboard/rubrics/${generatedRubric.id}`)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save changes.')
    } finally {
      setIsSaving(false)
    }
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon" asChild>
          <Link href="/dashboard/rubrics">
            <ArrowLeft className="size-4" />
          </Link>
        </Button>
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Create Rubric</h1>
          <p className="text-muted-foreground">
            Describe your assignment and let AI generate a standards-aligned rubric.
          </p>
        </div>
      </div>

      {/* Error display */}
      {error && (
        <div className="rounded-lg border border-destructive/50 bg-destructive/5 px-4 py-3 text-sm text-destructive">
          {error}
        </div>
      )}

      {!generatedRubric ? (
        /* Generation form */
        <div className="grid gap-6 lg:grid-cols-3">
          <div className="lg:col-span-2 space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Assignment Details</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="title">Title / Topic *</Label>
                  <Input
                    id="title"
                    placeholder='e.g., "Persuasive Essay on Climate Change"'
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                  />
                </div>

                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="space-y-2">
                    <Label>Subject *</Label>
                    <Select value={subject} onValueChange={setSubject}>
                      <SelectTrigger className="w-full">
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
                    <Label>Grade Level *</Label>
                    <Select value={gradeLevel} onValueChange={setGradeLevel}>
                      <SelectTrigger className="w-full">
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
                  <Label htmlFor="description">Assignment Description *</Label>
                  <Textarea
                    id="description"
                    placeholder="Describe what students will do, the learning objectives, and any specific expectations..."
                    value={assignmentDescription}
                    onChange={(e) => setAssignmentDescription(e.target.value)}
                    className="min-h-[120px]"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="standards">
                    Standards{' '}
                    <span className="text-muted-foreground font-normal">
                      (optional, comma-separated)
                    </span>
                  </Label>
                  <Input
                    id="standards"
                    placeholder="e.g., CCSS.ELA-LITERACY.W.8.1, CCSS.ELA-LITERACY.W.8.4"
                    value={standards}
                    onChange={(e) => setStandards(e.target.value)}
                  />
                </div>
              </CardContent>
            </Card>

            <Button
              onClick={handleGenerate}
              disabled={isGenerating || !title || !subject || !gradeLevel || !assignmentDescription}
              className="w-full sm:w-auto"
              size="lg"
            >
              {isGenerating ? (
                <>
                  <Loader2 className="size-4 animate-spin" />
                  Generating Rubric...
                </>
              ) : (
                <>
                  <Sparkles className="size-4" />
                  Generate with AI
                </>
              )}
            </Button>
          </div>

          {/* Proficiency levels sidebar */}
          <div>
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Proficiency Levels</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex flex-wrap gap-2">
                  {levels.map((level) => (
                    <Badge
                      key={level}
                      variant="secondary"
                      className="flex items-center gap-1 pr-1"
                    >
                      {level}
                      {levels.length > 2 && (
                        <button
                          type="button"
                          onClick={() => removeLevel(level)}
                          className="ml-0.5 rounded-full p-0.5 hover:bg-muted"
                        >
                          <X className="size-3" />
                        </button>
                      )}
                    </Badge>
                  ))}
                </div>
                <div className="flex gap-2">
                  <Input
                    placeholder="Add level..."
                    value={newLevel}
                    onChange={(e) => setNewLevel(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault()
                        addLevel()
                      }
                    }}
                    className="h-8 text-sm"
                  />
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={addLevel}
                    disabled={!newLevel.trim()}
                  >
                    Add
                  </Button>
                </div>
                <p className="text-xs text-muted-foreground">
                  Order from lowest to highest proficiency. Default levels
                  work well for most rubrics.
                </p>
              </CardContent>
            </Card>
          </div>
        </div>
      ) : (
        /* Generated rubric display */
        <div className="space-y-6">
          <div className="flex items-center justify-between flex-wrap gap-3">
            <div>
              <h2 className="text-xl font-bold">{generatedRubric.title}</h2>
              {generatedRubric.description && (
                <p className="text-sm text-muted-foreground mt-1">
                  {generatedRubric.description}
                </p>
              )}
            </div>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                onClick={() => setGeneratedRubric(null)}
              >
                Start Over
              </Button>
              <Button onClick={handleSave} disabled={isSaving}>
                {isSaving ? (
                  <>
                    <Loader2 className="size-4 animate-spin" />
                    Saving...
                  </>
                ) : (
                  <>
                    <Save className="size-4" />
                    Save Rubric
                  </>
                )}
              </Button>
            </div>
          </div>

          <p className="text-sm text-muted-foreground">
            Review the rubric below. Click any descriptor cell to edit it directly.
          </p>

          <RubricGrid
            rubric={{ ...generatedRubric, successCriteria }}
            editable
            onDescriptorEdit={handleDescriptorEdit}
          />
        </div>
      )}
    </div>
  )
}
