'use client'

import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import { Sparkles, Home, TrendingUp, AlertTriangle, CheckCircle2, Clock } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'

interface ProgressNarrativeProps {
  narrative: {
    id: string
    subject: string | null
    content: string
    isAIGenerated: boolean
    createdAt: string | Date
    metadata?: string | null
  }
}

const statusIcons = {
  good: { icon: CheckCircle2, color: 'text-emerald-600', bg: 'bg-emerald-50' },
  watch: { icon: AlertTriangle, color: 'text-amber-600', bg: 'bg-amber-50' },
  concern: { icon: AlertTriangle, color: 'text-rose-600', bg: 'bg-rose-50' },
}

export function ProgressNarrative({ narrative }: ProgressNarrativeProps) {
  let parsedContent: {
    summary?: string
    strengths?: string[]
    areasToGrow?: string[]
    homeActivity?: string
    overallStatus?: 'good' | 'watch' | 'concern'
  } | null = null

  try {
    parsedContent = JSON.parse(narrative.content)
  } catch {
    // Content is plain text
  }

  let meta: { subject?: string; gradingPeriod?: string; overallStatus?: string } | null = null
  try {
    if (narrative.metadata) meta = JSON.parse(narrative.metadata)
  } catch {
    // ignore
  }

  const overallStatus =
    parsedContent?.overallStatus ?? (meta?.overallStatus as 'good' | 'watch' | 'concern') ?? 'good'
  const statusInfo = statusIcons[overallStatus]
  const StatusIcon = statusInfo.icon

  const createdDate =
    typeof narrative.createdAt === 'string'
      ? new Date(narrative.createdAt)
      : narrative.createdAt

  return (
    <Card className="overflow-hidden">
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-2">
            <div className={`rounded-lg p-1.5 ${statusInfo.bg}`}>
              <StatusIcon className={`size-4 ${statusInfo.color}`} />
            </div>
            <div>
              <CardTitle className="text-sm font-serif">
                {narrative.subject ?? meta?.subject ?? 'Progress Update'}
              </CardTitle>
              {meta?.gradingPeriod && (
                <p className="text-[11px] text-muted-foreground mt-0.5">
                  {meta.gradingPeriod}
                </p>
              )}
            </div>
          </div>
          <div className="flex items-center gap-2">
            {narrative.isAIGenerated && (
              <Badge
                variant="outline"
                className="text-[10px] gap-1 px-1.5 py-0 text-violet-600 border-violet-200"
              >
                <Sparkles className="size-2.5" />
                AI Summary
              </Badge>
            )}
            <span className="text-[10px] text-muted-foreground flex items-center gap-1">
              <Clock className="size-2.5" />
              {createdDate.toLocaleDateString()}
            </span>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {parsedContent ? (
          <>
            {parsedContent.summary && (
              <p className="text-sm text-stone-700 leading-relaxed">
                {parsedContent.summary}
              </p>
            )}

            {parsedContent.strengths && parsedContent.strengths.length > 0 && (
              <div>
                <div className="flex items-center gap-1.5 mb-2">
                  <TrendingUp className="size-3.5 text-emerald-600" />
                  <h4 className="text-xs font-semibold text-emerald-800">
                    Doing Well
                  </h4>
                </div>
                <ul className="space-y-1">
                  {parsedContent.strengths.map((s, i) => (
                    <li
                      key={i}
                      className="text-xs text-stone-600 pl-4 relative before:content-[''] before:absolute before:left-1 before:top-1.5 before:size-1.5 before:rounded-full before:bg-emerald-400"
                    >
                      {s}
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {parsedContent.areasToGrow &&
              parsedContent.areasToGrow.length > 0 && (
                <div>
                  <div className="flex items-center gap-1.5 mb-2">
                    <TrendingUp className="size-3.5 text-amber-600" />
                    <h4 className="text-xs font-semibold text-amber-800">
                      Growing In
                    </h4>
                  </div>
                  <ul className="space-y-1">
                    {parsedContent.areasToGrow.map((a, i) => (
                      <li
                        key={i}
                        className="text-xs text-stone-600 pl-4 relative before:content-[''] before:absolute before:left-1 before:top-1.5 before:size-1.5 before:rounded-full before:bg-amber-400"
                      >
                        {a}
                      </li>
                    ))}
                  </ul>
                </div>
              )}

            {parsedContent.homeActivity && (
              <div className="rounded-lg bg-stone-50 p-3 border border-stone-200">
                <div className="flex items-center gap-1.5 mb-1.5">
                  <Home className="size-3.5 text-stone-600" />
                  <h4 className="text-xs font-semibold text-stone-800">
                    What You Can Do at Home
                  </h4>
                </div>
                <p className="text-xs text-stone-600 leading-relaxed">
                  {parsedContent.homeActivity}
                </p>
              </div>
            )}

            {narrative.isAIGenerated && (
              <p className="text-[10px] text-muted-foreground italic border-t pt-2">
                This summary was generated by AI from your child's teacher's
                assessment data. The teacher reviewed and approved it before
                sharing.
              </p>
            )}
          </>
        ) : (
          <div className="text-sm text-stone-700 leading-relaxed prose prose-sm max-w-none">
            <ReactMarkdown
              remarkPlugins={[remarkGfm]}
              components={{
                table: ({ children, ...props }) => <table className="w-full border-collapse my-4 text-sm" {...props}>{children}</table>,
                th: ({ children, ...props }) => <th className="border border-stone-300 bg-stone-50 px-3 py-2 text-left font-medium" {...props}>{children}</th>,
                td: ({ children, ...props }) => <td className="border border-stone-300 px-3 py-2" {...props}>{children}</td>,
              }}
            >{narrative.content}</ReactMarkdown>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
