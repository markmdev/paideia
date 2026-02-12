'use client'

import { format } from 'date-fns'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import { Bot, User } from 'lucide-react'
import { ClaudeBadge } from '@/components/ui/claude-badge'

interface ChatMessageProps {
  role: 'user' | 'assistant'
  content: string
  timestamp?: string
  isStreaming?: boolean
}

export function ChatMessage({ role, content, timestamp, isStreaming }: ChatMessageProps) {
  const isUser = role === 'user'

  return (
    <div className={`flex gap-3 ${isUser ? 'flex-row-reverse' : 'flex-row'}`}>
      {/* Avatar */}
      <div
        className={`shrink-0 rounded-full p-2 size-8 flex items-center justify-center ${
          isUser
            ? 'bg-blue-100 text-blue-600'
            : 'bg-emerald-100 text-emerald-600'
        }`}
      >
        {isUser ? <User className="size-4" /> : <Bot className="size-4" />}
      </div>

      {/* Message bubble */}
      <div
        className={`relative max-w-[80%] rounded-2xl px-4 py-3 ${
          isUser
            ? 'bg-blue-500 text-white rounded-br-md'
            : 'bg-stone-100 text-stone-800 rounded-bl-md'
        }`}
      >
        <div className={`text-sm leading-relaxed ${isUser ? 'text-white' : 'text-stone-800'}`}>
          {isUser ? (
            <p className="whitespace-pre-wrap">{content}</p>
          ) : (
            <div className="prose prose-sm prose-stone max-w-none [&>p]:mb-2 [&>p:last-child]:mb-0 [&>ul]:mb-2 [&>ol]:mb-2">
              <ReactMarkdown
                remarkPlugins={[remarkGfm]}
                components={{
                  table: ({ children, ...props }) => <table className="w-full border-collapse my-4 text-sm" {...props}>{children}</table>,
                  th: ({ children, ...props }) => <th className="border border-stone-300 bg-stone-50 px-3 py-2 text-left font-medium" {...props}>{children}</th>,
                  td: ({ children, ...props }) => <td className="border border-stone-300 px-3 py-2" {...props}>{children}</td>,
                }}
              >{content}</ReactMarkdown>
            </div>
          )}
          {isStreaming && (
            <span className="inline-block w-1.5 h-4 bg-emerald-500 ml-0.5 animate-pulse rounded-sm" />
          )}
        </div>

        {/* Timestamp */}
        {timestamp && (
          <p
            className={`text-[10px] mt-1.5 ${
              isUser ? 'text-blue-200' : 'text-stone-400'
            }`}
          >
            {format(new Date(timestamp), 'h:mm a')}
          </p>
        )}
        {!isUser && !isStreaming && (
          <ClaudeBadge className="mt-1.5" />
        )}
      </div>
    </div>
  )
}
