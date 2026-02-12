import { redirect } from 'next/navigation'
import { auth } from '@/lib/auth'
import { db } from '@/lib/db'
import { tutorSessions, masteryRecords, standards } from '@/lib/db/schema'
import { eq, desc, and, lt } from 'drizzle-orm'
import Link from 'next/link'
import { Bot, Sparkles, BookOpen, FlaskConical, Calculator, Globe, Palette, Code, Target } from 'lucide-react'
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

  // Fetch mastery gaps: standards where the student scores below 70
  const weakMasteryData = await db
    .select({
      standardId: masteryRecords.standardId,
      score: masteryRecords.score,
      level: masteryRecords.level,
      assessedAt: masteryRecords.assessedAt,
      subject: standards.subject,
      standardDescription: standards.description,
    })
    .from(masteryRecords)
    .innerJoin(standards, eq(masteryRecords.standardId, standards.id))
    .where(
      and(
        eq(masteryRecords.studentId, session.user.id),
        lt(masteryRecords.score, 70)
      )
    )
    .orderBy(desc(masteryRecords.assessedAt))

  // Deduplicate by standardId (keep latest assessment per standard)
  const latestByStandard = new Map<
    string,
    { subject: string; description: string; score: number; level: string }
  >()
  for (const m of weakMasteryData) {
    if (!latestByStandard.has(m.standardId)) {
      latestByStandard.set(m.standardId, {
        subject: m.subject,
        description: m.standardDescription,
        score: Math.round(m.score),
        level: m.level,
      })
    }
  }

  // Sort by score ascending (weakest first), limit to 4
  const suggestedPractice = Array.from(latestByStandard.values())
    .sort((a, b) => a.score - b.score)
    .slice(0, 4)

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

      {/* Suggested Practice — based on mastery gaps */}
      {suggestedPractice.length > 0 && (
        <div>
          <h2 className="font-serif text-lg font-semibold text-stone-800 mb-3 flex items-center gap-2">
            <Target className="size-4 text-amber-500" />
            Suggested Practice
          </h2>
          <p className="text-stone-500 text-xs mb-3">
            Areas where extra practice could help you level up
          </p>
          <div className="grid gap-3 sm:grid-cols-2">
            {suggestedPractice.map((sp, i) => (
              <Link
                key={i}
                href={`/dashboard/tutor/new?subject=${encodeURIComponent(sp.subject)}&topic=${encodeURIComponent(sp.description)}`}
              >
                <Card className="cursor-pointer transition-all hover:shadow-md rounded-xl border border-amber-200 bg-gradient-to-br from-amber-50 to-orange-50 hover:from-amber-100 hover:to-orange-100">
                  <CardContent className="p-4 space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-medium text-amber-700 bg-amber-100 px-2 py-0.5 rounded-full">
                        {sp.subject}
                      </span>
                      <span className="text-xs font-medium text-stone-500">
                        {sp.score}% mastery
                      </span>
                    </div>
                    <p className="text-sm text-stone-700 leading-snug line-clamp-2">
                      {sp.description}
                    </p>
                    <span className="inline-flex items-center gap-1 text-xs font-medium text-amber-600">
                      Practice This &rarr;
                    </span>
                  </CardContent>
                </Card>
              </Link>
            ))}
          </div>
        </div>
      )}

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
