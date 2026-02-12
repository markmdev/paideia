'use client'

import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import {
  ArrowLeft,
  Sparkles,
  Clock,
  Globe,
  Loader2,
  Mail,
} from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { MessageCompose } from '@/components/messages/message-compose'

interface MessageDetail {
  id: string
  senderId: string
  receiverId: string
  subject: string | null
  content: string
  type: string
  language: string
  isAIGenerated: boolean
  status: string
  metadata: string | null
  createdAt: string
  senderName: string
  receiverName: string
  isFromMe: boolean
}

const LANGUAGES = [
  { value: 'Spanish', label: 'Spanish' },
  { value: 'Mandarin Chinese', label: 'Mandarin Chinese' },
  { value: 'Vietnamese', label: 'Vietnamese' },
  { value: 'Arabic', label: 'Arabic' },
  { value: 'French', label: 'French' },
  { value: 'Korean', label: 'Korean' },
  { value: 'Portuguese', label: 'Portuguese' },
  { value: 'Tagalog', label: 'Tagalog' },
  { value: 'Russian', label: 'Russian' },
  { value: 'Haitian Creole', label: 'Haitian Creole' },
]

export default function MessageDetailPage() {
  const params = useParams()
  const router = useRouter()
  const messageId = params.messageId as string

  const [message, setMessage] = useState<MessageDetail | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [translatedText, setTranslatedText] = useState<string | null>(null)
  const [translating, setTranslating] = useState(false)
  const [targetLanguage, setTargetLanguage] = useState<string>('')

  useEffect(() => {
    async function load() {
      try {
        const res = await fetch(`/api/messages/${messageId}`)
        if (!res.ok) {
          const data = await res.json()
          throw new Error(data.error ?? 'Failed to load message')
        }
        const data = await res.json()
        setMessage(data)
      } catch (err) {
        setError(
          err instanceof Error ? err.message : 'Failed to load message'
        )
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [messageId])

  async function handleTranslate() {
    if (!message || !targetLanguage) return
    setTranslating(true)
    setTranslatedText(null)

    try {
      // Get displayable content
      let textToTranslate = message.content
      try {
        const parsed = JSON.parse(message.content)
        // Build a readable version of structured content
        const parts: string[] = []
        if (parsed.summary) parts.push(parsed.summary)
        if (parsed.strengths?.length)
          parts.push('Strengths: ' + parsed.strengths.join('. '))
        if (parsed.areasToGrow?.length)
          parts.push('Areas to grow: ' + parsed.areasToGrow.join('. '))
        if (parsed.homeActivity)
          parts.push('What you can do at home: ' + parsed.homeActivity)
        if (parsed.greeting) parts.push(parsed.greeting)
        if (parsed.highlights?.length)
          parts.push('Highlights: ' + parsed.highlights.join('. '))
        if (parsed.concerns?.length)
          parts.push('Concerns: ' + parsed.concerns.join('. '))
        if (parsed.encouragement) parts.push(parsed.encouragement)
        if (parts.length > 0) textToTranslate = parts.join('\n\n')
      } catch {
        // plain text
      }

      const res = await fetch('/api/messages/translate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text: textToTranslate, targetLanguage }),
      })

      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error ?? 'Translation failed')
      }

      const data = await res.json()
      setTranslatedText(data.translatedText)
    } catch (err) {
      setError(
        err instanceof Error ? err.message : 'Translation failed'
      )
    } finally {
      setTranslating(false)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-16">
        <Loader2 className="size-6 animate-spin text-muted-foreground" />
      </div>
    )
  }

  if (error || !message) {
    return (
      <div className="space-y-4">
        <Button asChild variant="ghost" size="sm" className="-ml-2">
          <Link href="/dashboard/messages">
            <ArrowLeft className="size-4 mr-1" />
            Back to Messages
          </Link>
        </Button>
        <Card className="bg-rose-50 border-rose-200">
          <CardContent className="py-6 text-center">
            <p className="text-sm text-rose-700">
              {error ?? 'Message not found'}
            </p>
          </CardContent>
        </Card>
      </div>
    )
  }

  // Parse structured content
  let displayContent: string = message.content
  let parsedContent: Record<string, unknown> | null = null
  try {
    parsedContent = JSON.parse(message.content)
  } catch {
    // plain text
  }

  const createdDate = new Date(message.createdAt)

  // Determine reply target
  const replyToId = message.isFromMe
    ? message.receiverId
    : message.senderId
  const replyToName = message.isFromMe
    ? message.receiverName
    : message.senderName

  return (
    <div className="space-y-6">
      <Button asChild variant="ghost" size="sm" className="-ml-2">
        <Link href="/dashboard/messages">
          <ArrowLeft className="size-4 mr-1" />
          Back to Messages
        </Link>
      </Button>

      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-start justify-between">
            <div>
              {message.subject && (
                <CardTitle className="text-lg font-serif">
                  {message.subject}
                </CardTitle>
              )}
              <div className="flex items-center gap-2 mt-1">
                <span className="text-sm text-muted-foreground">
                  {message.isFromMe ? 'To' : 'From'}:{' '}
                  <span className="font-medium text-stone-700">
                    {message.isFromMe
                      ? message.receiverName
                      : message.senderName}
                  </span>
                </span>
                <span className="text-[10px] text-muted-foreground flex items-center gap-1">
                  <Clock className="size-2.5" />
                  {createdDate.toLocaleDateString()}{' '}
                  {createdDate.toLocaleTimeString([], {
                    hour: '2-digit',
                    minute: '2-digit',
                  })}
                </span>
              </div>
            </div>
            <div className="flex items-center gap-2">
              {message.isAIGenerated && (
                <Badge
                  variant="outline"
                  className="text-[10px] gap-1 px-1.5 py-0 text-violet-600 border-violet-200"
                >
                  <Sparkles className="size-2.5" />
                  AI Generated
                </Badge>
              )}
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Content display */}
          {parsedContent ? (
            <div className="space-y-3">
              {(parsedContent as { summary?: string }).summary && (
                <p className="text-sm leading-relaxed text-stone-700">
                  {(parsedContent as { summary: string }).summary}
                </p>
              )}
              {(parsedContent as { greeting?: string }).greeting && (
                <p className="text-sm leading-relaxed text-stone-700">
                  {(parsedContent as { greeting: string }).greeting}
                </p>
              )}
              {(parsedContent as { strengths?: string[] }).strengths && (
                <div>
                  <h4 className="text-xs font-semibold text-emerald-800 mb-1">
                    Doing Well
                  </h4>
                  <ul className="space-y-1">
                    {(
                      (parsedContent as { strengths: string[] }).strengths
                    ).map((s: string, i: number) => (
                      <li key={i} className="text-sm text-stone-600 pl-3">
                        {s}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
              {(parsedContent as { highlights?: string[] }).highlights && (
                <div>
                  <h4 className="text-xs font-semibold text-emerald-800 mb-1">
                    Highlights
                  </h4>
                  <ul className="space-y-1">
                    {(
                      (parsedContent as { highlights: string[] }).highlights
                    ).map((s: string, i: number) => (
                      <li key={i} className="text-sm text-stone-600 pl-3">
                        {s}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
              {(parsedContent as { areasToGrow?: string[] }).areasToGrow && (
                <div>
                  <h4 className="text-xs font-semibold text-amber-800 mb-1">
                    Growing In
                  </h4>
                  <ul className="space-y-1">
                    {(
                      (parsedContent as { areasToGrow: string[] }).areasToGrow
                    ).map((s: string, i: number) => (
                      <li key={i} className="text-sm text-stone-600 pl-3">
                        {s}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
              {(parsedContent as { concerns?: string[] }).concerns &&
                (
                  (parsedContent as { concerns: string[] }).concerns
                ).length > 0 && (
                  <div>
                    <h4 className="text-xs font-semibold text-amber-800 mb-1">
                      Areas to Watch
                    </h4>
                    <ul className="space-y-1">
                      {(
                        (parsedContent as { concerns: string[] }).concerns
                      ).map((s: string, i: number) => (
                        <li key={i} className="text-sm text-stone-600 pl-3">
                          {s}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              {(parsedContent as { homeActivity?: string }).homeActivity && (
                <div className="rounded-lg bg-stone-50 p-3 border border-stone-200">
                  <h4 className="text-xs font-semibold text-stone-800 mb-1">
                    What You Can Do at Home
                  </h4>
                  <p className="text-sm text-stone-600 leading-relaxed">
                    {
                      (parsedContent as { homeActivity: string })
                        .homeActivity
                    }
                  </p>
                </div>
              )}
              {(parsedContent as { encouragement?: string }).encouragement && (
                <p className="text-sm text-stone-600 italic">
                  {
                    (parsedContent as { encouragement: string })
                      .encouragement
                  }
                </p>
              )}
            </div>
          ) : (
            <p className="text-sm leading-relaxed text-stone-700 whitespace-pre-wrap">
              {displayContent}
            </p>
          )}

          {message.isAIGenerated && (
            <p className="text-[10px] text-muted-foreground italic border-t pt-2">
              This message was generated by AI. The teacher reviewed and
              approved it before sharing.
            </p>
          )}

          {/* Translation section */}
          <div className="border-t pt-4">
            <div className="flex items-center gap-2 mb-3">
              <Globe className="size-4 text-stone-500" />
              <h4 className="text-xs font-semibold text-stone-800">
                Translate this message
              </h4>
            </div>
            <div className="flex items-center gap-2">
              <Select value={targetLanguage} onValueChange={setTargetLanguage}>
                <SelectTrigger className="w-[200px] text-sm">
                  <SelectValue placeholder="Select language" />
                </SelectTrigger>
                <SelectContent>
                  {LANGUAGES.map((lang) => (
                    <SelectItem key={lang.value} value={lang.value}>
                      {lang.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Button
                onClick={handleTranslate}
                disabled={!targetLanguage || translating}
                size="sm"
                variant="outline"
                className="gap-2"
              >
                {translating ? (
                  <>
                    <Loader2 className="size-3.5 animate-spin" />
                    Translating...
                  </>
                ) : (
                  <>
                    <Globe className="size-3.5" />
                    Translate
                  </>
                )}
              </Button>
            </div>
            {translatedText && (
              <Card className="mt-3 bg-sky-50/50 border-sky-200">
                <CardContent className="py-3">
                  <div className="flex items-center gap-1 mb-2">
                    <Badge
                      variant="outline"
                      className="text-[10px] text-sky-700 border-sky-200"
                    >
                      {targetLanguage}
                    </Badge>
                  </div>
                  <p className="text-sm text-stone-700 leading-relaxed whitespace-pre-wrap">
                    {translatedText}
                  </p>
                </CardContent>
              </Card>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Reply section */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center gap-2">
            <Mail className="size-4 text-stone-500" />
            <CardTitle className="text-sm font-serif">Reply</CardTitle>
          </div>
        </CardHeader>
        <CardContent>
          <MessageCompose
            receiverId={replyToId}
            receiverName={replyToName}
            defaultSubject={
              message.subject
                ? `Re: ${message.subject.replace(/^Re: /, '')}`
                : undefined
            }
            isReply
            onSent={() => router.refresh()}
          />
        </CardContent>
      </Card>
    </div>
  )
}
