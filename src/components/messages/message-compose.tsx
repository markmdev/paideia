'use client'

import { useState } from 'react'
import { Send, Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'

interface MessageComposeProps {
  receiverId?: string
  receiverName?: string
  defaultSubject?: string
  onSent?: () => void
  isReply?: boolean
}

export function MessageCompose({
  receiverId,
  receiverName,
  defaultSubject,
  onSent,
  isReply = false,
}: MessageComposeProps) {
  const [subject, setSubject] = useState(defaultSubject ?? '')
  const [content, setContent] = useState('')
  const [sending, setSending] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!receiverId || !content.trim()) return

    setSending(true)
    setError(null)

    try {
      const res = await fetch('/api/messages', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          receiverId,
          subject: subject || null,
          content: content.trim(),
          type: 'general',
        }),
      })

      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error ?? 'Failed to send message')
      }

      setContent('')
      setSubject('')
      onSent?.()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to send message')
    } finally {
      setSending(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-3">
      {receiverName && (
        <div className="text-sm text-muted-foreground">
          {isReply ? 'Reply to' : 'To'}:{' '}
          <span className="font-medium text-stone-700">{receiverName}</span>
        </div>
      )}

      {!isReply && (
        <div className="space-y-1.5">
          <Label htmlFor="subject" className="text-xs">
            Subject
          </Label>
          <Input
            id="subject"
            value={subject}
            onChange={(e) => setSubject(e.target.value)}
            placeholder="What is this about?"
            className="text-sm"
          />
        </div>
      )}

      <div className="space-y-1.5">
        <Label htmlFor="content" className="text-xs">
          Message
        </Label>
        <Textarea
          id="content"
          value={content}
          onChange={(e) => setContent(e.target.value)}
          placeholder={
            isReply
              ? 'Type your reply...'
              : 'Type your message...'
          }
          rows={isReply ? 3 : 5}
          className="text-sm resize-none"
        />
      </div>

      {error && (
        <p className="text-xs text-rose-600">{error}</p>
      )}

      <div className="flex justify-end">
        <Button
          type="submit"
          disabled={sending || !content.trim()}
          className="bg-amber-600 hover:bg-amber-700 text-white gap-2"
          size="sm"
        >
          {sending ? (
            <>
              <Loader2 className="size-3.5 animate-spin" />
              Sending...
            </>
          ) : (
            <>
              <Send className="size-3.5" />
              {isReply ? 'Send Reply' : 'Send Message'}
            </>
          )}
        </Button>
      </div>
    </form>
  )
}
