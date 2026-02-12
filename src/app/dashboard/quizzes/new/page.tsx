'use client'

import { useState } from 'react'
import Link from 'next/link'
import {
  Sparkles,
  ChevronRight,
  ChevronLeft,
  CheckCircle2,
  FileQuestion,
  Loader2,
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
import { Skeleton } from '@/components/ui/skeleton'

interface GeneratedQuestion {
  id: string
  type: string
  questionText: string
  options: string[] | null
  correctAnswer: string | null
  explanation: string | null
  bloomsLevel: string | null
  points: number
  orderIndex: number
}

interface GeneratedQuizData {
  quiz: {
    id: string
    title: string
    subject: string
    gradeLevel: string
    standards: string | null
    createdAt: string
  }
  questions: GeneratedQuestion[]
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

const questionTypeOptions = [
  { value: 'multiple_choice', label: 'Multiple Choice' },
  { value: 'short_answer', label: 'Short Answer' },
  { value: 'essay', label: 'Essay' },
] as const

const difficultyOptions = [
  { value: 'easy', label: 'Easy' },
  { value: 'medium', label: 'Medium' },
  { value: 'hard', label: 'Hard' },
]

const bloomsColors: Record<string, string> = {
  remember: 'bg-slate-100 text-slate-700 border-slate-200',
  understand: 'bg-blue-100 text-blue-700 border-blue-200',
  apply: 'bg-emerald-100 text-emerald-700 border-emerald-200',
  analyze: 'bg-amber-100 text-amber-700 border-amber-200',
  evaluate: 'bg-purple-100 text-purple-700 border-purple-200',
  create: 'bg-rose-100 text-rose-700 border-rose-200',
}

const loadingMessages = [
  'Designing quiz questions...',
  'Crafting plausible distractors...',
  'Tagging Bloom\'s taxonomy levels...',
  'Writing answer explanations...',
  'Aligning to standards...',
  'Almost there...',
]

export default function NewQuizPage() {
  const [step, setStep] = useState(1)
  const [isGenerating, setIsGenerating] = useState(false)
  const [loadingMessageIndex, setLoadingMessageIndex] = useState(0)
  const [generated, setGenerated] = useState<GeneratedQuizData | null>(null)
  const [error, setError] = useState<string | null>(null)

  // Form state
  const [topic, setTopic] = useState('')
  const [subject, setSubject] = useState('')
  const [gradeLevel, setGradeLevel] = useState('')
  const [numberOfQuestions, setNumberOfQuestions] = useState(10)
  const [selectedTypes, setSelectedTypes] = useState<string[]>(['multiple_choice'])
  const [difficultyLevel, setDifficultyLevel] = useState('medium')
  const [standards, setStandards] = useState('')

  function toggleQuestionType(type: string) {
    setSelectedTypes((prev) => {
      if (prev.includes(type)) {
        if (prev.length === 1) return prev
        return prev.filter((t) => t !== type)
      }
      return [...prev, type]
    })
  }

  const canGenerate = topic.trim() && subject && gradeLevel

  async function handleGenerate() {
    if (!canGenerate) return

    setIsGenerating(true)
    setError(null)
    setStep(2)

    const interval = setInterval(() => {
      setLoadingMessageIndex((i) => (i + 1) % loadingMessages.length)
    }, 3000)

    try {
      const res = await fetch('/api/quizzes/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          topic,
          subject,
          gradeLevel,
          numberOfQuestions,
          questionTypes: selectedTypes,
          standards: standards || undefined,
          difficultyLevel,
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

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-serif font-bold tracking-tight">Generate Quiz</h1>
        <p className="text-muted-foreground text-sm">
          Use AI to create a standards-aligned quiz with answer keys, explanations, and Bloom&apos;s taxonomy tags.
        </p>
      </div>

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
                Quiz Generator
              </CardTitle>
              <p className="text-sm text-muted-foreground">
                Specify the topic, grade level, and question preferences and the
                AI will generate a complete quiz with answer keys and explanations.
              </p>
            </CardHeader>
            <CardContent className="p-6 space-y-6">
              {error && (
                <div className="bg-red-50 border border-red-200 rounded-lg p-3 text-sm text-red-700">
                  {error}
                </div>
              )}

              <div className="space-y-2">
                <Label htmlFor="topic" className="text-sm font-medium">
                  Topic
                </Label>
                <Textarea
                  id="topic"
                  placeholder="e.g., Photosynthesis and cellular respiration in plants"
                  value={topic}
                  onChange={(e) => setTopic(e.target.value)}
                  className="min-h-[80px] resize-none"
                />
                <p className="text-xs text-muted-foreground">
                  Describe the topic or concept you want the quiz to cover.
                </p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
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
                          Grade {g}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="numberOfQuestions" className="text-sm font-medium">
                    Number of Questions
                  </Label>
                  <Input
                    id="numberOfQuestions"
                    type="number"
                    min={5}
                    max={20}
                    value={numberOfQuestions}
                    onChange={(e) => setNumberOfQuestions(Number(e.target.value))}
                  />
                  <p className="text-xs text-muted-foreground">
                    Between 5 and 20 questions.
                  </p>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="difficultyLevel" className="text-sm font-medium">
                    Difficulty Level
                  </Label>
                  <Select value={difficultyLevel} onValueChange={setDifficultyLevel}>
                    <SelectTrigger id="difficultyLevel" className="w-full">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {difficultyOptions.map((d) => (
                        <SelectItem key={d.value} value={d.value}>
                          {d.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="space-y-2">
                <Label className="text-sm font-medium">Question Types</Label>
                <div className="flex flex-wrap gap-2">
                  {questionTypeOptions.map((qt) => (
                    <button
                      key={qt.value}
                      type="button"
                      onClick={() => toggleQuestionType(qt.value)}
                      className={`px-3 py-1.5 rounded-full text-sm font-medium border transition-colors ${
                        selectedTypes.includes(qt.value)
                          ? 'bg-amber-100 text-amber-900 border-amber-300'
                          : 'bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100'
                      }`}
                    >
                      {qt.label}
                    </button>
                  ))}
                </div>
                <p className="text-xs text-muted-foreground">
                  Select one or more question types.
                </p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="standards" className="text-sm font-medium">
                  Standards (optional)
                </Label>
                <Input
                  id="standards"
                  placeholder="e.g., NGSS LS1-5, NGSS LS1-6"
                  value={standards}
                  onChange={(e) => setStandards(e.target.value)}
                />
                <p className="text-xs text-muted-foreground">
                  Comma-separated standard codes to align the quiz to.
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
                    The AI is creating your quiz with answer keys, explanations,
                    and Bloom&apos;s taxonomy tags. This usually takes 15-30 seconds.
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
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Step 3: Review Generated Quiz */}
        {step === 3 && generated && (
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-xl font-bold">{generated.quiz.title}</h2>
                <p className="text-sm text-muted-foreground mt-1">
                  {generated.questions.length} questions &middot; {generated.quiz.subject} &middot; Grade {generated.quiz.gradeLevel}
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
                <Button asChild className="bg-amber-600 hover:bg-amber-700 text-white gap-2">
                  <Link href="/dashboard/quizzes">
                    <FileQuestion className="size-4" />
                    View All Quizzes
                  </Link>
                </Button>
              </div>
            </div>

            <div className="space-y-4">
              {generated.questions.map((question, index) => (
                <Card key={question.id}>
                  <CardHeader className="pb-3">
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex items-start gap-3">
                        <span className="flex items-center justify-center size-7 rounded-full bg-slate-100 text-sm font-semibold text-slate-700 shrink-0 mt-0.5">
                          {index + 1}
                        </span>
                        <div>
                          <p className="text-sm font-medium leading-relaxed">
                            {question.questionText}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        {question.bloomsLevel && (
                          <Badge
                            className={`text-xs border capitalize ${bloomsColors[question.bloomsLevel] ?? 'bg-slate-100 text-slate-700 border-slate-200'}`}
                          >
                            {question.bloomsLevel}
                          </Badge>
                        )}
                        <Badge variant="outline" className="text-xs">
                          {question.points} {question.points === 1 ? 'pt' : 'pts'}
                        </Badge>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent className="pt-0 space-y-3">
                    {question.options && question.options.length > 0 && (
                      <div className="space-y-1.5 pl-10">
                        {question.options.map((option, optIndex) => {
                          const letter = String.fromCharCode(65 + optIndex)
                          const isCorrect = question.correctAnswer === option
                          return (
                            <div
                              key={optIndex}
                              className={`flex items-start gap-2 text-sm rounded-md px-3 py-1.5 ${
                                isCorrect
                                  ? 'bg-emerald-50 border border-emerald-200'
                                  : 'bg-slate-50'
                              }`}
                            >
                              <span className={`font-medium shrink-0 ${isCorrect ? 'text-emerald-700' : 'text-slate-500'}`}>
                                {letter}.
                              </span>
                              <span className={isCorrect ? 'text-emerald-800' : ''}>
                                {option}
                              </span>
                              {isCorrect && (
                                <CheckCircle2 className="size-4 text-emerald-600 shrink-0 mt-0.5 ml-auto" />
                              )}
                            </div>
                          )
                        })}
                      </div>
                    )}

                    {question.type !== 'multiple_choice' && question.correctAnswer && (
                      <div className="pl-10">
                        <div className="bg-emerald-50 border border-emerald-200 rounded-md px-3 py-2">
                          <p className="text-xs font-medium text-emerald-700 mb-1">Answer</p>
                          <p className="text-sm text-emerald-800">{question.correctAnswer}</p>
                        </div>
                      </div>
                    )}

                    {question.explanation && (
                      <div className="pl-10">
                        <div className="bg-blue-50 border border-blue-100 rounded-md px-3 py-2">
                          <p className="text-xs font-medium text-blue-700 mb-1">Explanation</p>
                          <p className="text-sm text-blue-800 leading-relaxed">{question.explanation}</p>
                        </div>
                      </div>
                    )}
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
