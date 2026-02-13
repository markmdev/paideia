'use client'

import { useState, useCallback } from 'react'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import {
  CheckCircle2,
  ArrowUpRight,
  Compass,
  Pencil,
  RotateCcw,
  Send,
  Loader2,
  Save,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Textarea } from '@/components/ui/textarea'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Skeleton } from '@/components/ui/skeleton'
import { Separator } from '@/components/ui/separator'
import { ClaudeBadge } from '@/components/ui/claude-badge'
import { toast } from 'sonner'

interface CriterionScore {
  id: string
  criterionName: string
  level: string
  score: number
  maxScore: number
  justification: string | null
}

interface FeedbackData {
  id: string
  aiFeedback: string
  teacherEdits: string | null
  finalFeedback: string | null
  status: string
  strengths: string[]
  improvements: string[]
  nextSteps: string[]
}

interface FeedbackPanelProps {
  submissionId: string
  feedback: FeedbackData | null
  criterionScores: CriterionScore[]
  isLoading?: boolean
}

const levelColorMap: Record<string, string> = {
  beginning: 'bg-rose-100 text-rose-700',
  developing: 'bg-amber-100 text-amber-700',
  proficient: 'bg-emerald-100 text-emerald-700',
  advanced: 'bg-blue-100 text-blue-700',
}

function getLevelColor(level: string): string {
  const normalized = level.toLowerCase()
  return levelColorMap[normalized] ?? 'bg-stone-100 text-stone-700'
}

const toneOptions = [
  { value: 'encouraging', label: 'Encouraging' },
  { value: 'direct', label: 'Direct' },
  { value: 'socratic', label: 'Socratic' },
  { value: 'growth-mindset', label: 'Growth Mindset' },
]

export function FeedbackPanel({
  submissionId,
  feedback,
  criterionScores,
  isLoading = false,
}: FeedbackPanelProps) {
  const [isEditing, setIsEditing] = useState(false)
  const [editedFeedback, setEditedFeedback] = useState(
    feedback?.teacherEdits ?? feedback?.aiFeedback ?? ''
  )
  const [tone, setTone] = useState('encouraging')
  const [isSaving, setIsSaving] = useState(false)
  const [isRegenerating, setIsRegenerating] = useState(false)

  const handleApprove = useCallback(async () => {
    setIsSaving(true)
    try {
      const response = await fetch(`/api/grading/${submissionId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'approve' }),
      })
      if (!response.ok) {
        throw new Error('Failed to approve feedback')
      }
      toast.success('Feedback approved and returned to student')
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to approve'
      toast.error(message)
    } finally {
      setIsSaving(false)
    }
  }, [submissionId])

  const handleSaveEdits = useCallback(async () => {
    setIsSaving(true)
    try {
      const response = await fetch(`/api/grading/${submissionId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'edit',
          teacherEdits: editedFeedback,
        }),
      })
      if (!response.ok) {
        throw new Error('Failed to save feedback edits')
      }
      setIsEditing(false)
      toast.success('Feedback edits saved')
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to save'
      toast.error(message)
    } finally {
      setIsSaving(false)
    }
  }, [submissionId, editedFeedback])

  const handleRegenerate = useCallback(async () => {
    setIsRegenerating(true)
    try {
      const response = await fetch('/api/grading', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ submissionId, tone }),
      })
      if (!response.ok) {
        throw new Error('Failed to regenerate feedback')
      }
      toast.success('Feedback regenerated. Refresh to see updates.')
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to regenerate'
      toast.error(message)
    } finally {
      setIsRegenerating(false)
    }
  }, [submissionId, tone])

  if (isLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-32 w-full" />
        <Skeleton className="h-24 w-full" />
        <Skeleton className="h-24 w-full" />
      </div>
    )
  }

  if (!feedback) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-center">
        <div className="rounded-full bg-amber-50 p-4 mb-3">
          <Compass className="size-6 text-amber-400" />
        </div>
        <h3 className="text-sm font-semibold text-stone-800 mb-1">No feedback yet</h3>
        <p className="text-xs text-stone-500 max-w-xs">
          Use the batch grading button or grade this submission individually
          to generate AI feedback.
        </p>
      </div>
    )
  }

  const displayFeedback = feedback.finalFeedback ?? feedback.teacherEdits ?? feedback.aiFeedback

  return (
    <div className="space-y-5">
      {/* Criterion scores */}
      {criterionScores.length > 0 && (
        <div>
          <h3 className="text-sm font-semibold text-stone-700 mb-3">Rubric Scores</h3>
          <div className="space-y-2">
            {criterionScores.map((cs) => (
              <Card key={cs.id} className="bg-stone-50/50">
                <CardContent className="py-3 px-4">
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-sm font-medium text-stone-800">
                          {cs.criterionName}
                        </span>
                        <Badge className={`text-[10px] px-1.5 py-0 border-0 ${getLevelColor(cs.level)}`}>
                          {cs.level}
                        </Badge>
                      </div>
                      {cs.justification && (
                        <p className="text-xs text-stone-500 leading-relaxed">
                          {cs.justification}
                        </p>
                      )}
                    </div>
                    <span className="text-sm font-semibold text-stone-700 shrink-0">
                      {cs.score}/{cs.maxScore}
                    </span>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      )}

      <Separator />

      {/* Overall feedback */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-sm font-semibold text-stone-700">Overall Feedback</h3>
          <Badge
            variant="outline"
            className="text-[10px] capitalize text-stone-500 border-stone-300"
          >
            {feedback.status}
          </Badge>
        </div>

        {isEditing ? (
          <div className="space-y-3">
            <Textarea
              value={editedFeedback}
              onChange={(e) => setEditedFeedback(e.target.value)}
              className="min-h-[120px] text-sm bg-white border-stone-300 focus:border-amber-400 focus:ring-amber-400"
              placeholder="Edit the feedback..."
            />
            <div className="flex gap-2">
              <Button
                size="sm"
                onClick={handleSaveEdits}
                disabled={isSaving}
                className="bg-amber-600 hover:bg-amber-700 text-white gap-1"
              >
                {isSaving ? <Loader2 className="size-3 animate-spin" /> : <Save className="size-3" />}
                Save Edits
              </Button>
              <Button
                size="sm"
                variant="outline"
                onClick={() => setIsEditing(false)}
                className="border-stone-300"
              >
                Cancel
              </Button>
            </div>
          </div>
        ) : (
          <div className="bg-white rounded-xl border border-stone-200 p-4 text-sm text-stone-700 leading-relaxed prose prose-stone prose-sm max-w-none">
            <ReactMarkdown
              remarkPlugins={[remarkGfm]}
              components={{
                table: ({ children, ...props }) => <table className="w-full border-collapse my-4 text-sm" {...props}>{children}</table>,
                th: ({ children, ...props }) => <th className="border border-stone-300 bg-stone-50 px-3 py-2 text-left font-medium" {...props}>{children}</th>,
                td: ({ children, ...props }) => <td className="border border-stone-300 px-3 py-2" {...props}>{children}</td>,
              }}
            >{displayFeedback}</ReactMarkdown>
          </div>
        )}
      </div>

      {/* Strengths, Improvements, Next Steps */}
      {feedback.strengths.length > 0 && (
        <div>
          <h4 className="text-xs font-semibold text-emerald-700 uppercase tracking-wider mb-2 flex items-center gap-1">
            <CheckCircle2 className="size-3" />
            Strengths
          </h4>
          <ul className="space-y-1.5">
            {feedback.strengths.map((s, i) => (
              <li key={i} className="flex items-start gap-2 text-sm text-stone-600">
                <CheckCircle2 className="size-3.5 text-emerald-500 mt-0.5 shrink-0" />
                <span>{s}</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {feedback.improvements.length > 0 && (
        <div>
          <h4 className="text-xs font-semibold text-amber-700 uppercase tracking-wider mb-2 flex items-center gap-1">
            <ArrowUpRight className="size-3" />
            Areas for Improvement
          </h4>
          <ul className="space-y-1.5">
            {feedback.improvements.map((item, i) => (
              <li key={i} className="flex items-start gap-2 text-sm text-stone-600">
                <ArrowUpRight className="size-3.5 text-amber-500 mt-0.5 shrink-0" />
                <span>{item}</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {feedback.nextSteps.length > 0 && (
        <div>
          <h4 className="text-xs font-semibold text-blue-700 uppercase tracking-wider mb-2 flex items-center gap-1">
            <Compass className="size-3" />
            Next Steps
          </h4>
          <ul className="space-y-1.5">
            {feedback.nextSteps.map((step, i) => (
              <li key={i} className="flex items-start gap-2 text-sm text-stone-600">
                <Compass className="size-3.5 text-blue-500 mt-0.5 shrink-0" />
                <span>{step}</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      <Separator />

      {/* Tone selector + Action buttons */}
      <div className="space-y-3">
        <div className="flex items-center gap-2">
          <span className="text-xs text-stone-500">Feedback tone:</span>
          <Select value={tone} onValueChange={setTone}>
            <SelectTrigger className="w-40 h-8 text-xs border-stone-300">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {toneOptions.map((opt) => (
                <SelectItem key={opt.value} value={opt.value} className="text-xs">
                  {opt.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="flex flex-wrap gap-2">
          <Button
            size="sm"
            onClick={handleApprove}
            disabled={isSaving}
            className="bg-emerald-600 hover:bg-emerald-700 text-white gap-1"
          >
            {isSaving ? <Loader2 className="size-3 animate-spin" /> : <Send className="size-3" />}
            Approve & Return
          </Button>
          <Button
            size="sm"
            variant="outline"
            onClick={() => {
              setEditedFeedback(displayFeedback)
              setIsEditing(true)
            }}
            className="gap-1 border-stone-300"
          >
            <Pencil className="size-3" />
            Edit Feedback
          </Button>
          <Button
            size="sm"
            variant="outline"
            onClick={handleRegenerate}
            disabled={isRegenerating}
            className="gap-1 border-stone-300"
          >
            {isRegenerating ? (
              <Loader2 className="size-3 animate-spin" />
            ) : (
              <RotateCcw className="size-3" />
            )}
            Regenerate
          </Button>
        </div>
      </div>
      <ClaudeBadge className="mt-3 justify-end" />
    </div>
  )
}
