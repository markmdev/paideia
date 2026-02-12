'use client'

import Link from 'next/link'
import { Mail, MailOpen, Sparkles, Clock } from 'lucide-react'
import { Badge } from '@/components/ui/badge'

interface Message {
  id: string
  subject: string | null
  content: string
  type: string
  isAIGenerated: boolean
  status: string
  senderName: string
  receiverName: string
  isFromMe: boolean
  createdAt: string | Date
}

interface MessageListProps {
  messages: Message[]
}

const typeLabels: Record<string, { label: string; color: string }> = {
  general: { label: 'Message', color: 'bg-stone-100 text-stone-700' },
  progress_update: { label: 'Progress', color: 'bg-emerald-100 text-emerald-700' },
  assignment_insight: { label: 'Assignment', color: 'bg-amber-100 text-amber-700' },
  weekly_digest: { label: 'Weekly Digest', color: 'bg-sky-100 text-sky-700' },
  alert: { label: 'Alert', color: 'bg-rose-100 text-rose-700' },
}

export function MessageList({ messages }: MessageListProps) {
  if (messages.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-center">
        <div className="rounded-full bg-stone-100 p-6 mb-4">
          <Mail className="size-10 text-stone-400" />
        </div>
        <h3 className="text-lg font-semibold mb-1">No messages yet</h3>
        <p className="text-sm text-muted-foreground max-w-md">
          When you receive messages from teachers or send messages yourself,
          they will appear here.
        </p>
      </div>
    )
  }

  return (
    <div className="divide-y rounded-lg border bg-white">
      {messages.map((message) => {
        const isUnread = !message.isFromMe && message.status === 'sent'
        const typeInfo = typeLabels[message.type] ?? typeLabels.general
        const createdDate =
          typeof message.createdAt === 'string'
            ? new Date(message.createdAt)
            : message.createdAt

        // Truncate content for preview
        let preview = message.content
        try {
          const parsed = JSON.parse(message.content)
          preview = parsed.summary ?? parsed.greeting ?? message.content
        } catch {
          // plain text content
        }
        if (preview.length > 120) preview = preview.slice(0, 120) + '...'

        return (
          <Link
            key={message.id}
            href={`/dashboard/messages/${message.id}`}
            className={`flex items-start gap-3 p-4 hover:bg-stone-50 transition-colors ${
              isUnread ? 'bg-amber-50/50' : ''
            }`}
          >
            <div className="mt-0.5">
              {isUnread ? (
                <Mail className="size-4 text-amber-600" />
              ) : (
                <MailOpen className="size-4 text-stone-400" />
              )}
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-0.5">
                <span
                  className={`text-sm truncate ${
                    isUnread ? 'font-semibold text-stone-900' : 'font-medium text-stone-700'
                  }`}
                >
                  {message.isFromMe
                    ? `To: ${message.receiverName}`
                    : message.senderName}
                </span>
                <Badge
                  className={`text-[9px] px-1 py-0 ${typeInfo.color} border-0 shrink-0`}
                >
                  {typeInfo.label}
                </Badge>
                {message.isAIGenerated && (
                  <Sparkles className="size-3 text-violet-500 shrink-0" />
                )}
              </div>
              {message.subject && (
                <p
                  className={`text-xs mb-0.5 truncate ${
                    isUnread ? 'font-medium text-stone-800' : 'text-stone-600'
                  }`}
                >
                  {message.subject}
                </p>
              )}
              <p className="text-[11px] text-muted-foreground truncate">
                {preview}
              </p>
            </div>
            <span className="text-[10px] text-muted-foreground shrink-0 flex items-center gap-1">
              <Clock className="size-2.5" />
              {createdDate.toLocaleDateString()}
            </span>
          </Link>
        )
      })}
    </div>
  )
}
