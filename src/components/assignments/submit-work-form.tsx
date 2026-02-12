'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { PenLine, Send, Loader2 } from 'lucide-react'
import { toast } from 'sonner'

interface SubmitWorkFormProps {
  assignmentId: string
  existingContent?: string
}

export function SubmitWorkForm({
  assignmentId,
  existingContent,
}: SubmitWorkFormProps) {
  const router = useRouter()
  const [content, setContent] = useState(existingContent ?? '')
  const [isSubmitting, setIsSubmitting] = useState(false)

  async function handleSubmit() {
    if (!content.trim()) {
      toast.error('Please write a response before submitting.')
      return
    }

    setIsSubmitting(true)
    try {
      const res = await fetch('/api/submissions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ assignmentId, content }),
      })

      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error || 'Failed to submit work')
      }

      toast.success('Your work has been submitted!')
      router.refresh()
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : 'Something went wrong'
      )
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base flex items-center gap-2">
          <PenLine className="size-4 text-amber-600" />
          Write Your Response
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <Textarea
          placeholder="Write your response here..."
          value={content}
          onChange={(e) => setContent(e.target.value)}
          rows={8}
          disabled={isSubmitting}
          className="resize-y"
        />
        <div className="flex justify-end">
          <Button
            onClick={handleSubmit}
            disabled={isSubmitting || !content.trim()}
            className="gap-2"
          >
            {isSubmitting ? (
              <Loader2 className="size-4 animate-spin" />
            ) : (
              <Send className="size-4" />
            )}
            {isSubmitting ? 'Submitting...' : 'Submit Work'}
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}
