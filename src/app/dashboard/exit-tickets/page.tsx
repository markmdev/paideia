'use client'

import { useState } from 'react'
import {
  ClipboardCheck,
  Sparkles,
  Loader2,
  Copy,
  RotateCcw,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
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
import { formatGradeLevel } from '@/lib/format'

interface ExitTicketQuestion {
  questionText: string
  questionType: 'multiple_choice' | 'short_answer' | 'true_false'
  options?: string[]
  correctAnswer: string
  explanation: string
  targetSkill: string
}

interface GeneratedExitTicket {
  title: string
  questions: ExitTicketQuestion[]
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
  'K', '1st', '2nd', '3rd', '4th', '5th',
  '6th', '7th', '8th', '9th', '10th', '11th', '12th',
]

const questionTypeBadge: Record<string, { label: string; className: string }> = {
  multiple_choice: {
    label: 'Multiple Choice',
    className: 'bg-sky-100 text-sky-800 border-sky-200',
  },
  short_answer: {
    label: 'Short Answer',
    className: 'bg-violet-100 text-violet-800 border-violet-200',
  },
  true_false: {
    label: 'True / False',
    className: 'bg-amber-100 text-amber-800 border-amber-200',
  },
}

export default function ExitTicketsPage() {
  const [topic, setTopic] = useState('')
  const [gradeLevel, setGradeLevel] = useState('')
  const [subject, setSubject] = useState('')
  const [numberOfQuestions, setNumberOfQuestions] = useState('3')
  const [lessonContext, setLessonContext] = useState('')

  const [isGenerating, setIsGenerating] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [generated, setGenerated] = useState<GeneratedExitTicket | null>(null)
  const [copied, setCopied] = useState(false)
  const [revealedAnswers, setRevealedAnswers] = useState<Set<number>>(new Set())

  const canGenerate = topic.trim() && gradeLevel && subject

  function toggleAnswer(index: number) {
    setRevealedAnswers((prev) => {
      const next = new Set(prev)
      if (next.has(index)) {
        next.delete(index)
      } else {
        next.add(index)
      }
      return next
    })
  }

  async function handleGenerate() {
    if (!canGenerate) return

    setIsGenerating(true)
    setError(null)
    setGenerated(null)
    setRevealedAnswers(new Set())

    try {
      const res = await fetch('/api/exit-tickets/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          topic,
          gradeLevel,
          subject,
          numberOfQuestions: parseInt(numberOfQuestions, 10),
          lessonContext: lessonContext || undefined,
        }),
      })

      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error || 'Generation failed')
      }

      const data: GeneratedExitTicket = await res.json()
      setGenerated(data)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong')
    } finally {
      setIsGenerating(false)
    }
  }

  function handleReset() {
    setGenerated(null)
    setRevealedAnswers(new Set())
    setError(null)
  }

  function handleCopyToClipboard() {
    if (!generated) return

    const lines: string[] = [generated.title, '']

    generated.questions.forEach((q, i) => {
      lines.push(`${i + 1}. ${q.questionText}`)
      if (q.questionType === 'multiple_choice' && q.options) {
        q.options.forEach((opt, j) => {
          const letter = String.fromCharCode(65 + j)
          lines.push(`   ${letter}) ${opt}`)
        })
      }
      if (q.questionType === 'true_false') {
        lines.push('   A) True')
        lines.push('   B) False')
      }
      lines.push('')
    })

    lines.push('--- Answer Key ---')
    lines.push('')
    generated.questions.forEach((q, i) => {
      lines.push(`${i + 1}. ${q.correctAnswer}`)
      lines.push(`   ${q.explanation}`)
      lines.push('')
    })

    navigator.clipboard.writeText(lines.join('\n'))
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-serif font-bold tracking-tight flex items-center gap-2">
          <ClipboardCheck className="size-6 text-amber-600" />
          Exit Ticket Generator
        </h1>
        <p className="text-muted-foreground text-sm mt-1">
          Generate 3-5 quick-check questions to assess student understanding at
          the end of a lesson. Results appear instantly below.
        </p>
      </div>

      {/* Form */}
      <Card className="border-amber-100">
        <CardHeader className="bg-gradient-to-r from-amber-50 to-orange-50 rounded-t-lg border-b border-amber-100">
          <CardTitle className="flex items-center gap-2 text-lg">
            <Sparkles className="size-5 text-amber-600" />
            Configure Exit Ticket
          </CardTitle>
        </CardHeader>
        <CardContent className="p-6 space-y-5">
          {error && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-3 text-sm text-red-700">
              {error}
            </div>
          )}

          <div className="space-y-2">
            <Label htmlFor="topic" className="text-sm font-medium">
              Topic <span className="text-red-500">*</span>
            </Label>
            <Input
              id="topic"
              placeholder="e.g., Photosynthesis, Fractions, The American Revolution"
              value={topic}
              onChange={(e) => setTopic(e.target.value)}
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label htmlFor="gradeLevel" className="text-sm font-medium">
                Grade Level <span className="text-red-500">*</span>
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

            <div className="space-y-2">
              <Label htmlFor="subject" className="text-sm font-medium">
                Subject <span className="text-red-500">*</span>
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
              <Label htmlFor="numQuestions" className="text-sm font-medium">
                Questions
              </Label>
              <Select value={numberOfQuestions} onValueChange={setNumberOfQuestions}>
                <SelectTrigger id="numQuestions" className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="3">3 questions</SelectItem>
                  <SelectItem value="4">4 questions</SelectItem>
                  <SelectItem value="5">5 questions</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="lessonContext" className="text-sm font-medium">
              Lesson Context{' '}
              <span className="text-muted-foreground font-normal">(optional)</span>
            </Label>
            <Textarea
              id="lessonContext"
              placeholder="Describe what you covered in today's lesson to help the AI generate more targeted questions..."
              value={lessonContext}
              onChange={(e) => setLessonContext(e.target.value)}
              className="min-h-[80px] resize-none"
            />
          </div>

          <div className="flex justify-end pt-1">
            <Button
              onClick={handleGenerate}
              disabled={!canGenerate || isGenerating}
              className="bg-amber-600 hover:bg-amber-700 text-white gap-2"
              size="lg"
            >
              {isGenerating ? (
                <>
                  <Loader2 className="size-4 animate-spin" />
                  Generating...
                </>
              ) : (
                <>
                  <Sparkles className="size-4" />
                  Generate Exit Ticket
                </>
              )}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Generated Results */}
      {generated && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-bold">{generated.title}</h2>
            <div className="flex gap-2">
              <Button
                variant="outline"
                onClick={handleReset}
                className="gap-2"
              >
                <RotateCcw className="size-4" />
                Generate Another
              </Button>
              <Button
                variant="outline"
                onClick={handleCopyToClipboard}
                className="gap-2"
              >
                {copied ? (
                  <>
                    <CheckCircle2 className="size-4 text-emerald-600" />
                    Copied!
                  </>
                ) : (
                  <>
                    <Copy className="size-4" />
                    Copy to Clipboard
                  </>
                )}
              </Button>
            </div>
          </div>

          {generated.questions.map((question, index) => {
            const typeBadge = questionTypeBadge[question.questionType] ?? questionTypeBadge.short_answer
            const isRevealed = revealedAnswers.has(index)

            return (
              <Card key={index} className="overflow-hidden">
                <CardHeader className="pb-3">
                  <div className="flex items-center gap-2 flex-wrap">
                    <Badge variant="secondary" className="text-xs font-medium">
                      Q{index + 1}
                    </Badge>
                    <Badge className={`${typeBadge.className} border text-xs`}>
                      {typeBadge.label}
                    </Badge>
                    <Badge variant="outline" className="text-xs">
                      {question.targetSkill}
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent className="space-y-3">
                  <p className="text-sm font-medium leading-relaxed">
                    {question.questionText}
                  </p>

                  {question.questionType === 'multiple_choice' && question.options && (
                    <div className="space-y-1.5 pl-1">
                      {question.options.map((option, optIndex) => {
                        const letter = String.fromCharCode(65 + optIndex)
                        return (
                          <div
                            key={optIndex}
                            className="flex items-start gap-2 text-sm"
                          >
                            <span className="font-medium text-muted-foreground min-w-[1.25rem]">
                              {letter})
                            </span>
                            <span>{option}</span>
                          </div>
                        )
                      })}
                    </div>
                  )}

                  {question.questionType === 'true_false' && (
                    <div className="space-y-1.5 pl-1">
                      <div className="flex items-center gap-2 text-sm">
                        <span className="font-medium text-muted-foreground min-w-[1.25rem]">A)</span>
                        <span>True</span>
                      </div>
                      <div className="flex items-center gap-2 text-sm">
                        <span className="font-medium text-muted-foreground min-w-[1.25rem]">B)</span>
                        <span>False</span>
                      </div>
                    </div>
                  )}

                  {/* Answer spoiler toggle */}
                  <button
                    onClick={() => toggleAnswer(index)}
                    className="flex items-center gap-1.5 text-sm font-medium text-amber-700 hover:text-amber-800 transition-colors pt-1"
                  >
                    {isRevealed ? (
                      <ChevronUp className="size-4" />
                    ) : (
                      <ChevronDown className="size-4" />
                    )}
                    {isRevealed ? 'Hide Answer' : 'Show Answer'}
                  </button>

                  {isRevealed && (
                    <div className="bg-emerald-50 border border-emerald-200 rounded-lg p-3 space-y-2">
                      <div className="flex items-start gap-2">
                        <CheckCircle2 className="size-4 text-emerald-600 mt-0.5 shrink-0" />
                        <div>
                          <p className="text-sm font-medium text-emerald-900">
                            {question.correctAnswer}
                          </p>
                          <p className="text-sm text-emerald-800 mt-1">
                            {question.explanation}
                          </p>
                        </div>
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            )
          })}
        </div>
      )}
    </div>
  )
}
