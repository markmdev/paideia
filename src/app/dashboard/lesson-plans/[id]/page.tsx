import { redirect, notFound } from 'next/navigation'
import Link from 'next/link'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import { auth } from '@/lib/auth'
import { db } from '@/lib/db'
import { lessonPlans } from '@/lib/db/schema'
import { eq, and } from 'drizzle-orm'
import { format } from 'date-fns'
import { formatGradeLevel } from '@/lib/utils'
import {
  ArrowLeft,
  BookOpen,
  Clock,
  GraduationCap,
  Sparkles,
  Target,
  Flame,
  Presentation,
  Users,
  UserCheck,
  Flag,
  Package,
  Layers,
  ClipboardCheck,
  Calendar,
  CheckCircle2,
} from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { LessonPlanActions } from './actions'

export default async function LessonPlanDetailPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const session = await auth()
  if (!session?.user) {
    redirect('/login')
  }

  const { id } = await params

  const [plan] = await db
    .select()
    .from(lessonPlans)
    .where(
      and(
        eq(lessonPlans.id, id),
        eq(lessonPlans.teacherId, session.user.id)
      )
    )

  if (!plan) {
    notFound()
  }

  const objectives = JSON.parse(plan.objectives) as string[]
  const standards = plan.standards ? (JSON.parse(plan.standards) as string[]) : []
  const materials = plan.materials ? (JSON.parse(plan.materials) as string[]) : []
  const differentiation = plan.differentiation
    ? (JSON.parse(plan.differentiation) as {
        belowGrade: string
        onGrade: string
        aboveGrade: string
      })
    : null
  const aiMetadata = plan.aiMetadata ? JSON.parse(plan.aiMetadata) : null

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between">
        <Button variant="ghost" size="sm" asChild>
          <Link href="/dashboard/lesson-plans">
            <ArrowLeft className="size-4 mr-1" />
            All Lesson Plans
          </Link>
        </Button>
        <LessonPlanActions planId={plan.id} />
      </div>

      {/* Title & Meta */}
      <div className="space-y-4">
        <div className="flex items-start justify-between gap-3">
          <h1 className="text-2xl font-serif font-bold tracking-tight">{plan.title}</h1>
          {aiMetadata && (
            <Badge className="bg-amber-100 text-amber-700 border-amber-200 shrink-0">
              <Sparkles className="size-3 mr-1" />
              AI Generated
            </Badge>
          )}
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200">
            <GraduationCap className="size-3 mr-1" />
            {formatGradeLevel(plan.gradeLevel)}
          </Badge>
          <Badge variant="outline" className="bg-emerald-50 text-emerald-700 border-emerald-200">
            <BookOpen className="size-3 mr-1" />
            {plan.subject}
          </Badge>
          {plan.duration && (
            <Badge variant="outline" className="bg-violet-50 text-violet-700 border-violet-200">
              <Clock className="size-3 mr-1" />
              {plan.duration}
            </Badge>
          )}
          <Badge variant="outline" className="text-muted-foreground">
            <Calendar className="size-3 mr-1" />
            {format(plan.createdAt, 'MMMM d, yyyy')}
          </Badge>
        </div>
      </div>

      {/* Standards */}
      {standards.length > 0 && (
        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center gap-2">
              <div className="rounded-md bg-sky-100 p-1.5">
                <CheckCircle2 className="size-4 text-sky-600" />
              </div>
              <CardTitle className="text-base">Standards Alignment</CardTitle>
            </div>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-2">
              {standards.map((standard, i) => (
                <Badge
                  key={i}
                  variant="outline"
                  className="text-xs font-mono bg-sky-50 text-sky-700 border-sky-200"
                >
                  {standard}
                </Badge>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Objectives */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center gap-2">
            <div className="rounded-md bg-amber-100 p-1.5">
              <Target className="size-4 text-amber-600" />
            </div>
            <CardTitle className="text-base">Learning Objectives</CardTitle>
          </div>
        </CardHeader>
        <CardContent>
          <ul className="space-y-2.5">
            {objectives.map((obj, i) => (
              <li key={i} className="flex items-start gap-3">
                <span className="flex items-center justify-center rounded-full bg-amber-100 text-amber-700 text-xs font-semibold size-6 shrink-0 mt-0.5">
                  {i + 1}
                </span>
                <span className="text-sm leading-relaxed">{obj}</span>
              </li>
            ))}
          </ul>
        </CardContent>
      </Card>

      {/* Lesson Sections */}
      <div className="space-y-4">
        {plan.warmUp && (
          <ReadOnlySection
            icon={Flame}
            iconBg="bg-orange-100"
            iconColor="text-orange-600"
            title="Warm-Up"
            subtitle="Activate prior knowledge"
            content={plan.warmUp}
          />
        )}

        {plan.directInstruction && (
          <ReadOnlySection
            icon={Presentation}
            iconBg="bg-indigo-100"
            iconColor="text-indigo-600"
            title="Direct Instruction"
            subtitle="Teacher-led instruction"
            content={plan.directInstruction}
          />
        )}

        {plan.guidedPractice && (
          <ReadOnlySection
            icon={Users}
            iconBg="bg-teal-100"
            iconColor="text-teal-600"
            title="Guided Practice"
            subtitle="Structured practice with support"
            content={plan.guidedPractice}
          />
        )}

        {plan.independentPractice && (
          <ReadOnlySection
            icon={UserCheck}
            iconBg="bg-green-100"
            iconColor="text-green-600"
            title="Independent Practice"
            subtitle="Student-driven practice"
            content={plan.independentPractice}
          />
        )}

        {plan.closure && (
          <ReadOnlySection
            icon={Flag}
            iconBg="bg-rose-100"
            iconColor="text-rose-600"
            title="Closure"
            subtitle="Synthesize learning"
            content={plan.closure}
          />
        )}
      </div>

      {/* Materials */}
      {materials.length > 0 && (
        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center gap-2">
              <div className="rounded-md bg-slate-100 p-1.5">
                <Package className="size-4 text-slate-600" />
              </div>
              <CardTitle className="text-base">Materials Needed</CardTitle>
            </div>
          </CardHeader>
          <CardContent>
            <ul className="grid gap-1.5 sm:grid-cols-2">
              {materials.map((material, i) => (
                <li
                  key={i}
                  className="flex items-center gap-2 text-sm text-muted-foreground"
                >
                  <span className="size-1.5 rounded-full bg-slate-400 shrink-0" />
                  {material}
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      )}

      {/* Differentiation */}
      {differentiation && (
        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center gap-2">
              <div className="rounded-md bg-purple-100 p-1.5">
                <Layers className="size-4 text-purple-600" />
              </div>
              <CardTitle className="text-base">Differentiation</CardTitle>
            </div>
          </CardHeader>
          <CardContent>
            <div className="grid gap-4 sm:grid-cols-3">
              <div className="rounded-lg border border-amber-200 bg-amber-50/50 p-3">
                <span className="inline-block text-xs font-semibold px-2 py-0.5 rounded-full mb-2 text-amber-700 bg-amber-100">
                  Below Grade Level
                </span>
                <p className="text-sm leading-relaxed text-muted-foreground">
                  {differentiation.belowGrade}
                </p>
              </div>
              <div className="rounded-lg border border-emerald-200 bg-emerald-50/50 p-3">
                <span className="inline-block text-xs font-semibold px-2 py-0.5 rounded-full mb-2 text-emerald-700 bg-emerald-100">
                  On Grade Level
                </span>
                <p className="text-sm leading-relaxed text-muted-foreground">
                  {differentiation.onGrade}
                </p>
              </div>
              <div className="rounded-lg border border-blue-200 bg-blue-50/50 p-3">
                <span className="inline-block text-xs font-semibold px-2 py-0.5 rounded-full mb-2 text-blue-700 bg-blue-100">
                  Above Grade Level
                </span>
                <p className="text-sm leading-relaxed text-muted-foreground">
                  {differentiation.aboveGrade}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Assessment Plan */}
      {plan.assessmentPlan && (
        <Card className="mb-8">
          <CardHeader className="pb-3">
            <div className="flex items-center gap-2">
              <div className="rounded-md bg-cyan-100 p-1.5">
                <ClipboardCheck className="size-4 text-cyan-600" />
              </div>
              <CardTitle className="text-base">Assessment Plan</CardTitle>
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-sm leading-relaxed prose prose-sm max-w-none">
              <ReactMarkdown
                remarkPlugins={[remarkGfm]}
                components={{
                  table: ({ children, ...props }) => <table className="w-full border-collapse my-4 text-sm" {...props}>{children}</table>,
                  th: ({ children, ...props }) => <th className="border border-stone-300 bg-stone-50 px-3 py-2 text-left font-medium" {...props}>{children}</th>,
                  td: ({ children, ...props }) => <td className="border border-stone-300 px-3 py-2" {...props}>{children}</td>,
                }}
              >{plan.assessmentPlan}</ReactMarkdown>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}

// ---------------------------------------------------------------------------
// Sub-components
// ---------------------------------------------------------------------------

interface ReadOnlySectionProps {
  icon: React.ComponentType<{ className?: string }>
  iconBg: string
  iconColor: string
  title: string
  subtitle: string
  content: string
}

function ReadOnlySection({
  icon: Icon,
  iconBg,
  iconColor,
  title,
  subtitle,
  content,
}: ReadOnlySectionProps) {
  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center gap-2">
          <div className={`rounded-md p-1.5 ${iconBg}`}>
            <Icon className={`size-4 ${iconColor}`} />
          </div>
          <div>
            <CardTitle className="text-base">{title}</CardTitle>
            <CardDescription className="text-xs">{subtitle}</CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div className="text-sm leading-relaxed prose prose-sm max-w-none">
          <ReactMarkdown
            remarkPlugins={[remarkGfm]}
            components={{
              table: ({ children, ...props }) => <table className="w-full border-collapse my-4 text-sm" {...props}>{children}</table>,
              th: ({ children, ...props }) => <th className="border border-stone-300 bg-stone-50 px-3 py-2 text-left font-medium" {...props}>{children}</th>,
              td: ({ children, ...props }) => <td className="border border-stone-300 px-3 py-2" {...props}>{children}</td>,
            }}
          >{content}</ReactMarkdown>
        </div>
      </CardContent>
    </Card>
  )
}
