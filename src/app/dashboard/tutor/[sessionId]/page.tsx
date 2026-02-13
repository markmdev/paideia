'use client'

import { useEffect, useState, useRef, useCallback } from 'react'
import { useParams, useRouter, useSearchParams } from 'next/navigation'
import { Bot, ArrowLeft, Clock, BookOpen, XCircle } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { ChatMessage } from '@/components/tutor/chat-message'
import { ChatInput } from '@/components/tutor/chat-input'
import Link from 'next/link'

interface Message {
  role: 'user' | 'assistant'
  content: string
  timestamp: string
}

interface SessionData {
  id: string
  subject: string
  topic: string | null
  startedAt: string
  endedAt: string | null
  messages: Message[]
}

export default function TutorSessionPage() {
  const params = useParams()
  const router = useRouter()
  const searchParams = useSearchParams()
  const sessionId = params.sessionId as string
  const isNew = sessionId === 'new'

  const [session, setSession] = useState<SessionData | null>(null)
  const [messages, setMessages] = useState<Message[]>([])
  const [currentSessionId, setCurrentSessionId] = useState<string | null>(
    isNew ? null : sessionId
  )
  const [isStreaming, setIsStreaming] = useState(false)
  const [streamingContent, setStreamingContent] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(!isNew)
  const [isEnding, setIsEnding] = useState(false)

  const messagesEndRef = useRef<HTMLDivElement>(null)
  const initialSubject = searchParams.get('subject')
  const initialTopic = searchParams.get('topic')
  const [subjectState] = useState(initialSubject ?? 'General')
  const subject = session?.subject ?? subjectState
  const [startTime] = useState(new Date())

  // Scroll to bottom when messages change
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, streamingContent])

  // Load existing session
  useEffect(() => {
    if (isNew || !sessionId) return

    async function loadSession() {
      try {
        const res = await fetch(`/api/tutor/sessions/${sessionId}`)
        if (!res.ok) {
          setError('Failed to load session')
          return
        }
        const data: SessionData = await res.json()
        setSession(data)
        setMessages(data.messages)
        setCurrentSessionId(data.id)
      } catch {
        setError('Failed to load session')
      } finally {
        setIsLoading(false)
      }
    }

    loadSession()
  }, [sessionId, isNew])

  const handleSend = useCallback(
    async (message: string) => {
      if (isStreaming) return

      setError(null)
      setIsStreaming(true)
      setStreamingContent('')

      // Optimistically add user message
      const userMessage: Message = {
        role: 'user',
        content: message,
        timestamp: new Date().toISOString(),
      }
      setMessages((prev) => [...prev, userMessage])

      try {
        const res = await fetch('/api/tutor', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            message,
            sessionId: currentSessionId,
            subject,
            topic: session?.topic ?? searchParams.get('topic'),
          }),
        })

        if (!res.ok) {
          const errData = await res.json().catch(() => ({ error: 'Request failed' }))
          setError(errData.error ?? 'Something went wrong')
          setIsStreaming(false)
          return
        }

        // Capture session ID from header (for new sessions)
        const newSessionId = res.headers.get('X-Session-Id')
        if (newSessionId && !currentSessionId) {
          setCurrentSessionId(newSessionId)
          // Replace URL without navigation for new sessions
          window.history.replaceState(null, '', `/dashboard/tutor/${newSessionId}`)
        }

        // Stream the response
        const reader = res.body!.getReader()
        const decoder = new TextDecoder()
        let fullText = ''

        while (true) {
          const { done, value } = await reader.read()
          if (done) break
          const chunk = decoder.decode(value, { stream: true })
          fullText += chunk
          setStreamingContent(fullText)
        }

        // Add completed assistant message
        const assistantMessage: Message = {
          role: 'assistant',
          content: fullText,
          timestamp: new Date().toISOString(),
        }
        setMessages((prev) => [...prev, assistantMessage])
        setStreamingContent('')
      } catch {
        setError('Failed to send message. Please try again.')
      } finally {
        setIsStreaming(false)
      }
    },
    [isStreaming, currentSessionId, subject, session?.topic, searchParams]
  )

  const handleEndSession = async () => {
    if (!currentSessionId || isEnding) return
    setIsEnding(true)

    try {
      const res = await fetch(`/api/tutor/sessions/${currentSessionId}`, {
        method: 'DELETE',
      })
      if (res.ok) {
        router.push('/dashboard/tutor')
      }
    } catch {
      setError('Failed to end session')
    } finally {
      setIsEnding(false)
    }
  }

  // Calculate duration
  const sessionStart = session?.startedAt ? new Date(session.startedAt) : startTime
  const [duration, setDuration] = useState('0m')
  useEffect(() => {
    const interval = setInterval(() => {
      const diff = Date.now() - sessionStart.getTime()
      const minutes = Math.floor(diff / 60000)
      if (minutes < 60) {
        setDuration(`${minutes}m`)
      } else {
        setDuration(`${Math.floor(minutes / 60)}h ${minutes % 60}m`)
      }
    }, 30000) // Update every 30 seconds
    return () => clearInterval(interval)
  }, [sessionStart])

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-[60vh]">
        <div className="text-center space-y-3">
          <div className="inline-flex items-center justify-center rounded-full bg-emerald-50 p-4">
            <Bot className="size-6 text-emerald-500 animate-pulse" />
          </div>
          <p className="text-sm text-stone-500">Loading session...</p>
        </div>
      </div>
    )
  }

  const sessionEnded = session?.endedAt != null

  return (
    <div className="flex flex-col h-[calc(100vh-3.5rem)] -m-4 md:-m-6">
      {/* Session info bar */}
      <div className="shrink-0 flex items-center justify-between border-b border-stone-200 bg-white px-4 py-2.5">
        <div className="flex items-center gap-3">
          <Button asChild variant="ghost" size="icon" className="size-8">
            <Link href="/dashboard/tutor">
              <ArrowLeft className="size-4" />
            </Link>
          </Button>
          <div className="flex items-center gap-2">
            <Badge variant="outline" className="text-[11px] gap-1">
              <BookOpen className="size-3" />
              {subject}
            </Badge>
            {session?.topic && (
              <Badge variant="outline" className="text-[11px] text-stone-500">
                {session.topic}
              </Badge>
            )}
            <Badge variant="outline" className="text-[11px] text-stone-400 gap-1">
              <Clock className="size-3" />
              {duration}
            </Badge>
          </div>
        </div>
        {!sessionEnded && (
          <Button
            variant="ghost"
            size="sm"
            onClick={handleEndSession}
            disabled={isEnding}
            className="text-xs text-stone-500 hover:text-rose-600 gap-1"
          >
            <XCircle className="size-3.5" />
            End Session
          </Button>
        )}
      </div>

      {/* Messages area */}
      <div className="flex-1 overflow-y-auto bg-stone-50 px-4 py-6 space-y-4">
        {/* Welcome message for new sessions */}
        {messages.length === 0 && !isStreaming && (
          <div className="text-center py-12 space-y-3">
            <div className="inline-flex items-center justify-center rounded-full bg-emerald-50 p-4">
              <Bot className="size-8 text-emerald-500" />
            </div>
            <h2 className="font-serif text-lg font-semibold text-stone-800">
              Let us get started with {subject}!
            </h2>
            <p className="text-sm text-stone-500 max-w-sm mx-auto">
              Ask me a question about what you are working on. I will help you
              think through it step by step.
            </p>
          </div>
        )}

        {/* Message list */}
        {messages.map((msg, i) => (
          <ChatMessage
            key={i}
            role={msg.role}
            content={msg.content}
            timestamp={msg.timestamp}
          />
        ))}

        {/* Streaming response */}
        {isStreaming && streamingContent && (
          <ChatMessage
            role="assistant"
            content={streamingContent}
            isStreaming
          />
        )}

        {/* Typing indicator */}
        {isStreaming && !streamingContent && (
          <div className="flex gap-3">
            <div className="shrink-0 rounded-full p-2 size-8 flex items-center justify-center bg-emerald-100 text-emerald-600">
              <Bot className="size-4" />
            </div>
            <div className="rounded-2xl rounded-bl-md bg-stone-100 px-4 py-3">
              <div className="flex items-center gap-1.5">
                <span className="size-2 rounded-full bg-stone-400 animate-bounce [animation-delay:0ms]" />
                <span className="size-2 rounded-full bg-stone-400 animate-bounce [animation-delay:150ms]" />
                <span className="size-2 rounded-full bg-stone-400 animate-bounce [animation-delay:300ms]" />
              </div>
            </div>
          </div>
        )}

        {/* Error message */}
        {error && (
          <div className="text-center py-2">
            <p className="text-xs text-rose-500 bg-rose-50 rounded-lg px-3 py-2 inline-block">
              {error}
            </p>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Input area */}
      {sessionEnded ? (
        <div className="shrink-0 border-t border-stone-200 bg-white p-4 text-center">
          <p className="text-sm text-stone-500 mb-2">This session has ended.</p>
          <Button asChild variant="outline" size="sm">
            <Link href="/dashboard/tutor">Start a new session</Link>
          </Button>
        </div>
      ) : (
        <ChatInput
          onSend={handleSend}
          disabled={isStreaming}
          placeholder={
            messages.length === 0
              ? `What are you working on in ${subject}?`
              : 'Type your response...'
          }
          initialValue={
            isNew && initialTopic
              ? `I need help with: ${initialTopic}`
              : undefined
          }
        />
      )}
    </div>
  )
}
