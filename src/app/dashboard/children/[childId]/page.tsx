import { redirect, notFound } from 'next/navigation'
import Link from 'next/link'
import { auth } from '@/lib/auth'
import { db } from '@/lib/db'
import {
  parentChildren,
  users,
  classMembers,
  classes,
  submissions,
  assignments,
  feedbackDrafts,
  masteryRecords,
  standards,
  messages,
} from '@/lib/db/schema'
import { eq, desc, and, inArray } from 'drizzle-orm'
import {
  ArrowLeft,
  BookOpen,
  TrendingUp,
  CheckCircle2,
  AlertTriangle,
  Sparkles,
  MessageSquare,
  ShieldCheck,
  Eye,
  Bot,
} from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { ProgressNarrative } from '@/components/parent/progress-narrative'
import { formatGradeLevel } from '@/lib/utils'

export default async function ChildDetailPage({
  params,
}: {
  params: Promise<{ childId: string }>
}) {
  const session = await auth()
  if (!session?.user) {
    redirect('/login')
  }
  if (session.user.role !== 'parent') {
    redirect('/dashboard')
  }

  const { childId } = await params

  // Verify parent-child link
  const [link] = await db
    .select()
    .from(parentChildren)
    .where(
      and(
        eq(parentChildren.parentId, session.user.id),
        eq(parentChildren.childId, childId)
      )
    )
    .limit(1)

  if (!link) {
    notFound()
  }

  // Get child info
  const [child] = await db
    .select({ id: users.id, name: users.name, email: users.email })
    .from(users)
    .where(eq(users.id, childId))
    .limit(1)

  if (!child) {
    notFound()
  }

  // Get class enrollments
  const enrollments = await db
    .select({
      classId: classes.id,
      className: classes.name,
      subject: classes.subject,
      gradeLevel: classes.gradeLevel,
      period: classes.period,
    })
    .from(classMembers)
    .innerJoin(classes, eq(classMembers.classId, classes.id))
    .where(
      and(eq(classMembers.userId, childId), eq(classMembers.role, 'student'))
    )

  // Get recent submissions
  const recentSubmissions = await db
    .select({
      id: submissions.id,
      assignmentTitle: assignments.title,
      subject: assignments.subject,
      totalScore: submissions.totalScore,
      maxScore: submissions.maxScore,
      letterGrade: submissions.letterGrade,
      status: submissions.status,
      gradedAt: submissions.gradedAt,
    })
    .from(submissions)
    .innerJoin(assignments, eq(submissions.assignmentId, assignments.id))
    .where(eq(submissions.studentId, childId))
    .orderBy(desc(submissions.submittedAt))
    .limit(15)

  // Get feedback for graded submissions
  const gradedIds = recentSubmissions
    .filter((s) => s.status === 'graded' || s.status === 'returned')
    .map((s) => s.id)

  let feedbackMap: Record<
    string,
    { strengths: string; improvements: string; finalFeedback: string | null }
  > = {}
  if (gradedIds.length > 0) {
    const feedbacks = await db
      .select({
        submissionId: feedbackDrafts.submissionId,
        strengths: feedbackDrafts.strengths,
        improvements: feedbackDrafts.improvements,
        finalFeedback: feedbackDrafts.finalFeedback,
      })
      .from(feedbackDrafts)
      .where(inArray(feedbackDrafts.submissionId, gradedIds))

    feedbackMap = Object.fromEntries(
      feedbacks.map((f) => [
        f.submissionId,
        {
          strengths: f.strengths ?? '[]',
          improvements: f.improvements ?? '[]',
          finalFeedback: f.finalFeedback,
        },
      ])
    )
  }

  // Get mastery data
  const mastery = await db
    .select({
      standardId: masteryRecords.standardId,
      standardCode: standards.code,
      standardDescription: standards.description,
      subject: standards.subject,
      level: masteryRecords.level,
      score: masteryRecords.score,
      assessedAt: masteryRecords.assessedAt,
    })
    .from(masteryRecords)
    .innerJoin(standards, eq(masteryRecords.standardId, standards.id))
    .where(eq(masteryRecords.studentId, childId))
    .orderBy(desc(masteryRecords.assessedAt))

  // Deduplicate mastery by standard
  const seenStandards = new Set<string>()
  const uniqueMastery = mastery.filter((m) => {
    if (seenStandards.has(m.standardId)) return false
    seenStandards.add(m.standardId)
    return true
  })

  // Group mastery by subject
  const masteryBySubject: Record<
    string,
    { description: string; level: string; score: number }[]
  > = {}
  for (const m of uniqueMastery) {
    if (!masteryBySubject[m.subject]) masteryBySubject[m.subject] = []
    masteryBySubject[m.subject].push({
      description: m.standardDescription,
      level: m.level,
      score: m.score,
    })
  }

  // Get progress narratives
  const narratives = await db
    .select({
      id: messages.id,
      subject: messages.subject,
      content: messages.content,
      isAIGenerated: messages.isAIGenerated,
      createdAt: messages.createdAt,
      metadata: messages.metadata,
    })
    .from(messages)
    .where(
      and(
        eq(messages.receiverId, session.user.id),
        eq(messages.type, 'progress_update')
      )
    )
    .orderBy(desc(messages.createdAt))
    .limit(20)

  const childNarratives = narratives.filter((n) => {
    if (!n.metadata) return false
    try {
      const meta = JSON.parse(n.metadata)
      return meta.childId === childId
    } catch {
      return false
    }
  })

  // Compute overall stats
  const gradedSubmissions = recentSubmissions.filter(
    (s) => s.totalScore !== null && s.maxScore !== null
  )
  const avgPercentage =
    gradedSubmissions.length > 0
      ? Math.round(
          gradedSubmissions.reduce(
            (sum, s) => sum + (s.totalScore! / s.maxScore!) * 100,
            0
          ) / gradedSubmissions.length
        )
      : null

  const levelConfig: Record<string, { color: string; bg: string }> = {
    proficient: { color: 'text-emerald-700', bg: 'bg-emerald-100' },
    advanced: { color: 'text-emerald-700', bg: 'bg-emerald-100' },
    developing: { color: 'text-amber-700', bg: 'bg-amber-100' },
    beginning: { color: 'text-rose-700', bg: 'bg-rose-100' },
  }

  const gradeLevel =
    enrollments.length > 0 ? enrollments[0].gradeLevel : null

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <Button asChild variant="ghost" size="sm" className="mb-2 -ml-2">
          <Link href="/dashboard/children">
            <ArrowLeft className="size-4 mr-1" />
            Back to My Children
          </Link>
        </Button>
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-serif font-bold tracking-tight">
              {child.name}
            </h1>
            {gradeLevel && (
              <p className="text-muted-foreground text-sm">{formatGradeLevel(gradeLevel)}</p>
            )}
          </div>
          <Button asChild variant="outline" size="sm" className="gap-2">
            <Link href="/dashboard/messages">
              <MessageSquare className="size-3.5" />
              Message Teacher
            </Link>
          </Button>
        </div>
      </div>

      {/* Overview cards */}
      <div className="grid gap-4 sm:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Average Score</CardTitle>
            <TrendingUp className="size-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {avgPercentage !== null ? `${avgPercentage}%` : 'N/A'}
            </div>
            <p className="text-xs text-muted-foreground">
              Across recent assignments
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Classes</CardTitle>
            <BookOpen className="size-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{enrollments.length}</div>
            <p className="text-xs text-muted-foreground">Enrolled this term</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">
              Graded Assignments
            </CardTitle>
            <CheckCircle2 className="size-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{gradedSubmissions.length}</div>
            <p className="text-xs text-muted-foreground">With feedback</p>
          </CardContent>
        </Card>
      </div>

      {/* Mastery Snapshot */}
      {Object.keys(masteryBySubject).length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base font-serif">
              Skills Snapshot
            </CardTitle>
            <p className="text-xs text-muted-foreground">
              How your child is doing on key skills in each subject.
            </p>
          </CardHeader>
          <CardContent className="space-y-4">
            {Object.entries(masteryBySubject).map(([subject, items]) => (
              <div key={subject}>
                <h4 className="text-sm font-semibold mb-2">{subject}</h4>
                <div className="space-y-1.5">
                  {items.map((item, i) => {
                    const lc =
                      levelConfig[item.level] ?? levelConfig.developing
                    return (
                      <div
                        key={i}
                        className="flex items-center justify-between gap-2"
                      >
                        <span className="text-xs text-stone-600 flex-1">
                          {item.description}
                        </span>
                        <Badge
                          className={`text-[10px] px-1.5 py-0 ${lc.bg} ${lc.color} border-0 capitalize`}
                        >
                          {item.level}
                        </Badge>
                      </div>
                    )
                  })}
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      {/* Recent Feedback */}
      {gradedIds.length > 0 && Object.keys(feedbackMap).length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base font-serif">
              Recent Feedback
            </CardTitle>
            <p className="text-xs text-muted-foreground">
              What teachers have said about your child's recent work.
            </p>
          </CardHeader>
          <CardContent className="space-y-4">
            {recentSubmissions
              .filter((s) => feedbackMap[s.id])
              .slice(0, 5)
              .map((s) => {
                const fb = feedbackMap[s.id]
                const strengths = JSON.parse(fb.strengths) as string[]
                const improvements = JSON.parse(fb.improvements) as string[]
                return (
                  <div key={s.id} className="border rounded-lg p-3 space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium">
                        {s.assignmentTitle}
                      </span>
                      <Badge variant="outline" className="text-[10px]">
                        {s.subject}
                      </Badge>
                    </div>
                    {strengths.length > 0 && (
                      <div>
                        <div className="flex items-center gap-1 mb-1">
                          <CheckCircle2 className="size-3 text-emerald-600" />
                          <span className="text-[11px] font-medium text-emerald-800">
                            Strengths
                          </span>
                        </div>
                        <ul className="space-y-0.5">
                          {strengths.map((str, i) => (
                            <li
                              key={i}
                              className="text-[11px] text-stone-600 pl-3"
                            >
                              {str}
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}
                    {improvements.length > 0 && (
                      <div>
                        <div className="flex items-center gap-1 mb-1">
                          <AlertTriangle className="size-3 text-amber-600" />
                          <span className="text-[11px] font-medium text-amber-800">
                            Areas to Grow
                          </span>
                        </div>
                        <ul className="space-y-0.5">
                          {improvements.map((imp, i) => (
                            <li
                              key={i}
                              className="text-[11px] text-stone-600 pl-3"
                            >
                              {imp}
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}
                    {fb.finalFeedback && (
                      <p className="text-[11px] text-stone-500 italic border-t pt-2">
                        {fb.finalFeedback}
                      </p>
                    )}
                  </div>
                )
              })}
          </CardContent>
        </Card>
      )}

      {/* Progress Narratives */}
      {childNarratives.length > 0 && (
        <div>
          <div className="flex items-center gap-2 mb-3">
            <Sparkles className="size-4 text-violet-600" />
            <h2 className="text-base font-serif font-semibold">
              Progress Summaries
            </h2>
          </div>
          <div className="space-y-4">
            {childNarratives.map((n) => (
              <ProgressNarrative
                key={n.id}
                narrative={{
                  ...n,
                  createdAt: n.createdAt.toISOString(),
                }}
              />
            ))}
          </div>
        </div>
      )}

      {/* Empty state for narratives */}
      {childNarratives.length === 0 && (
        <Card className="bg-stone-50 border-stone-200">
          <CardContent className="py-6 text-center">
            <Sparkles className="size-8 text-stone-300 mx-auto mb-2" />
            <h3 className="text-sm font-medium mb-1">
              No progress summaries yet
            </h3>
            <p className="text-xs text-muted-foreground max-w-md mx-auto">
              Progress summaries are created by your child's teachers. When they
              share an AI-generated summary of your child's learning, it will
              appear here.
            </p>
          </CardContent>
        </Card>
      )}

      {/* AI Transparency Panel */}
      <Card className="border-sky-200 bg-gradient-to-br from-sky-50 to-blue-50">
        <CardHeader>
          <CardTitle className="text-base font-serif flex items-center gap-2">
            <ShieldCheck className="size-4 text-sky-600" />
            How AI Is Used
          </CardTitle>
          <p className="text-xs text-muted-foreground">
            We believe in transparency. Here is how AI assists in your child's education.
          </p>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-3 sm:grid-cols-3">
            <div className="flex items-start gap-3 p-3 bg-white/60 rounded-lg">
              <div className="rounded-full bg-sky-100 p-1.5 shrink-0">
                <Eye className="size-3.5 text-sky-600" />
              </div>
              <div>
                <h4 className="text-xs font-semibold mb-0.5">Feedback Drafting</h4>
                <p className="text-[11px] text-muted-foreground leading-relaxed">
                  AI drafts feedback on assignments. Teachers review, edit, and approve every comment before it reaches your child.
                </p>
              </div>
            </div>
            <div className="flex items-start gap-3 p-3 bg-white/60 rounded-lg">
              <div className="rounded-full bg-emerald-100 p-1.5 shrink-0">
                <Bot className="size-3.5 text-emerald-600" />
              </div>
              <div>
                <h4 className="text-xs font-semibold mb-0.5">AI Tutoring</h4>
                <p className="text-[11px] text-muted-foreground leading-relaxed">
                  The AI Tutor asks guiding questions — it never gives answers directly. Sessions are logged for teacher and parent review.
                </p>
              </div>
            </div>
            <div className="flex items-start gap-3 p-3 bg-white/60 rounded-lg">
              <div className="rounded-full bg-violet-100 p-1.5 shrink-0">
                <ShieldCheck className="size-3.5 text-violet-600" />
              </div>
              <div>
                <h4 className="text-xs font-semibold mb-0.5">Data Privacy</h4>
                <p className="text-[11px] text-muted-foreground leading-relaxed">
                  Student data is encrypted, never sold, and never used to train AI models. FERPA and COPPA compliant.
                </p>
              </div>
            </div>
          </div>
          <p className="text-[10px] text-sky-700/70 text-center">
            AI assists, humans decide. Every AI-generated output is reviewed by a teacher before reaching students or parents.
          </p>
        </CardContent>
      </Card>
    </div>
  )
}
