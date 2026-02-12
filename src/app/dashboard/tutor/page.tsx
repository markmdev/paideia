import { redirect } from 'next/navigation'
import { auth } from '@/lib/auth'
import { db } from '@/lib/db'
import { tutorSessions } from '@/lib/db/schema'
import { eq, desc } from 'drizzle-orm'
import Link from 'next/link'
import { Bot, Sparkles, BookOpen, FlaskConical, Calculator, Globe, Palette, Code } from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'
import { SessionCard } from '@/components/tutor/session-card'

interface TutorMessage {
  role: 'user' | 'assistant'
  content: string
  timestamp: string
}

function stripMarkdown(text: string): string {
  return text
    .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1')   // [text](url) → text
    .replace(/```[\s\S]*?```/g, '')              // code blocks
    .replace(/`([^`]+)`/g, '$1')                 // inline code
    .replace(/(\*\*|__)(.*?)\1/g, '$2')          // bold
    .replace(/(\*|_)(.*?)\1/g, '$2')             // italic
    .replace(/^#{1,6}\s+/gm, '')                 // headings
    .replace(/\n{2,}/g, ' ')                     // collapse newlines
    .trim()
}

const subjects = [
  { name: 'Math', icon: Calculator, color: 'bg-blue-50 text-blue-600 hover:bg-blue-100' },
  { name: 'Science', icon: FlaskConical, color: 'bg-emerald-50 text-emerald-600 hover:bg-emerald-100' },
  { name: 'ELA', icon: BookOpen, color: 'bg-amber-50 text-amber-600 hover:bg-amber-100' },
  { name: 'Social Studies', icon: Globe, color: 'bg-purple-50 text-purple-600 hover:bg-purple-100' },
  { name: 'Art', icon: Palette, color: 'bg-pink-50 text-pink-600 hover:bg-pink-100' },
  { name: 'Computer Science', icon: Code, color: 'bg-cyan-50 text-cyan-600 hover:bg-cyan-100' },
]

export default async function TutorHubPage() {
  const session = await auth()
  if (!session?.user) {
    redirect('/login')
  }

  if (session.user.role !== 'student') {
    redirect('/dashboard')
  }

  const firstName = session.user.name?.split(' ')[0] ?? 'there'

  // Fetch recent sessions
  const recentSessions = await db
    .select()
    .from(tutorSessions)
    .where(eq(tutorSessions.studentId, session.user.id))
    .orderBy(desc(tutorSessions.startedAt))
    .limit(6)

  const formattedSessions = recentSessions.map((s) => {
    const messages = JSON.parse(s.messages) as TutorMessage[]
    return {
      id: s.id,
      subject: s.subject,
      topic: s.topic,
      startedAt: s.startedAt.toISOString(),
      endedAt: s.endedAt?.toISOString() ?? null,
      messageCount: messages.length,
      lastMessage:
        messages.length > 0
          ? stripMarkdown(messages[messages.length - 1].content).slice(0, 120)
          : null,
    }
  })

  return (
    <div className="space-y-8 max-w-4xl mx-auto">
      {/* Welcome header */}
      <div className="text-center pt-4">
        <div className="inline-flex items-center justify-center rounded-full bg-emerald-50 p-4 mb-4">
          <Bot className="size-8 text-emerald-500" />
        </div>
        <h1 className="font-serif text-2xl font-bold tracking-tight text-stone-900">
          Hey {firstName}, ready to learn?
        </h1>
        <p className="text-stone-500 text-sm mt-2 max-w-md mx-auto">
          I am your study buddy. Pick a subject and let us work through problems
          together. I will ask questions to help you think, not just give answers.
        </p>
      </div>

      {/* Subject quick-start */}
      <div>
        <h2 className="font-serif text-lg font-semibold text-stone-800 mb-3 flex items-center gap-2">
          <Sparkles className="size-4 text-emerald-500" />
          Start a New Session
        </h2>
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
          {subjects.map((subject) => (
            <Link
              key={subject.name}
              href={`/dashboard/tutor/new?subject=${encodeURIComponent(subject.name)}`}
            >
              <Card className={`cursor-pointer transition-all hover:shadow-md rounded-xl border-0 ${subject.color}`}>
                <CardContent className="flex items-center gap-3 p-4">
                  <subject.icon className="size-5 shrink-0" />
                  <span className="font-medium text-sm">{subject.name}</span>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      </div>

      {/* Recent sessions */}
      {formattedSessions.length > 0 && (
        <div>
          <h2 className="font-serif text-lg font-semibold text-stone-800 mb-3">
            Recent Sessions
          </h2>
          <div className="grid gap-4 sm:grid-cols-2">
            {formattedSessions.map((s) => (
              <SessionCard key={s.id} session={s} />
            ))}
          </div>
        </div>
      )}

      {/* Empty state for no sessions */}
      {formattedSessions.length === 0 && (
        <div className="text-center py-8">
          <p className="text-sm text-stone-400">
            No sessions yet. Pick a subject above to get started.
          </p>
        </div>
      )}
    </div>
  )
}
