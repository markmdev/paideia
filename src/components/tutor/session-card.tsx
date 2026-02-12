import Link from 'next/link'
import { format } from 'date-fns'
import { MessageSquare, Calendar, BookOpen, ArrowRight } from 'lucide-react'
import { Card, CardContent, CardHeader } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'

const subjectColors: Record<string, { bg: string; text: string }> = {
  Math: { bg: 'bg-blue-50', text: 'text-blue-700' },
  Science: { bg: 'bg-emerald-50', text: 'text-emerald-700' },
  ELA: { bg: 'bg-amber-50', text: 'text-amber-700' },
  'English Language Arts': { bg: 'bg-amber-50', text: 'text-amber-700' },
  'Social Studies': { bg: 'bg-purple-50', text: 'text-purple-700' },
  History: { bg: 'bg-purple-50', text: 'text-purple-700' },
}

interface SessionCardProps {
  session: {
    id: string
    subject: string
    topic: string | null
    startedAt: string
    endedAt: string | null
    messageCount: number
    lastMessage: string | null
  }
}

export function SessionCard({ session }: SessionCardProps) {
  const colors = subjectColors[session.subject] ?? { bg: 'bg-stone-50', text: 'text-stone-700' }
  const isActive = !session.endedAt

  return (
    <Link href={`/dashboard/tutor/${session.id}`}>
      <Card className="group relative overflow-hidden transition-all hover:shadow-md hover:border-emerald-200 cursor-pointer h-full bg-stone-50/50 rounded-xl">
        <div className="absolute top-0 left-0 w-1 h-full bg-emerald-400 opacity-0 group-hover:opacity-100 transition-opacity" />
        <CardHeader className="pb-2">
          <div className="flex items-start justify-between gap-2">
            <div className="flex items-center gap-2 min-w-0">
              <div className={`rounded-full p-2 ${colors.bg}`}>
                <BookOpen className={`size-4 ${colors.text}`} />
              </div>
              <div className="min-w-0">
                <h3 className="font-semibold text-sm leading-tight text-stone-900 truncate">
                  {session.subject}
                </h3>
                {session.topic && (
                  <p className="text-[11px] text-stone-500 truncate mt-0.5">
                    {session.topic}
                  </p>
                )}
              </div>
            </div>
            <Badge
              className={`shrink-0 text-[10px] px-1.5 py-0.5 border-0 ${
                isActive
                  ? 'bg-emerald-100 text-emerald-700'
                  : 'bg-stone-100 text-stone-500'
              }`}
            >
              {isActive ? 'Active' : 'Ended'}
            </Badge>
          </div>
        </CardHeader>
        <CardContent className="space-y-2">
          {/* Last message preview */}
          {session.lastMessage && (
            <p className="text-xs text-stone-500 line-clamp-2 leading-relaxed">
              {session.lastMessage}
            </p>
          )}

          {/* Meta row */}
          <div className="flex items-center justify-between pt-1.5 border-t border-stone-200 text-[11px] text-stone-500">
            <div className="flex items-center gap-3">
              <span className="flex items-center gap-1">
                <Calendar className="size-3" />
                {format(new Date(session.startedAt), 'MMM d, h:mm a')}
              </span>
              <span className="flex items-center gap-1">
                <MessageSquare className="size-3" />
                {session.messageCount} message{session.messageCount !== 1 ? 's' : ''}
              </span>
            </div>
            <ArrowRight className="size-3 text-stone-400 group-hover:text-emerald-500 transition-colors" />
          </div>
        </CardContent>
      </Card>
    </Link>
  )
}
