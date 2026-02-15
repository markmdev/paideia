import Link from 'next/link'
import { BookOpen, BarChart3, ShieldCheck, Users, Brain, Sparkles, ArrowRight, ChevronRight } from 'lucide-react'
import { Button } from '@/components/ui/button'

const MODULE_ACCENTS = {
  amber: { border: 'border-t-amber-500', icon: 'text-amber-700', bg: 'bg-amber-50', badge: 'bg-amber-100 text-amber-800' },
  terracotta: { border: 'border-t-orange-600', icon: 'text-orange-700', bg: 'bg-orange-50', badge: 'bg-orange-100 text-orange-800' },
  sage: { border: 'border-t-emerald-600', icon: 'text-emerald-700', bg: 'bg-emerald-50', badge: 'bg-emerald-100 text-emerald-800' },
  sky: { border: 'border-t-sky-500', icon: 'text-sky-700', bg: 'bg-sky-50', badge: 'bg-sky-100 text-sky-800' },
  slate: { border: 'border-t-stone-600', icon: 'text-stone-700', bg: 'bg-stone-50', badge: 'bg-stone-100 text-stone-800' },
  rose: { border: 'border-t-rose-500', icon: 'text-rose-700', bg: 'bg-rose-50', badge: 'bg-rose-100 text-rose-800' },
} as const

export default function Home() {
  return (
    <div className="flex min-h-screen flex-col">
      {/* Header */}
      <header className="border-b bg-white/80 backdrop-blur-sm sticky top-0 z-50">
        <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-4">
          <div className="flex items-center gap-2.5">
            <div className="flex size-8 items-center justify-center rounded-lg bg-amber-600 text-white">
              <BookOpen className="size-4" />
            </div>
            <span className="text-lg font-bold tracking-tight">Paideia</span>
          </div>
          <div className="flex items-center gap-3">
            <Button asChild variant="ghost" size="sm">
              <Link href="/login">Sign In</Link>
            </Button>
            <Button asChild size="sm" className="bg-amber-700 hover:bg-amber-800">
              <Link href="/demo">Try Demo</Link>
            </Button>
          </div>
        </div>
      </header>

      {/* Hero */}
      <main className="flex-1">
        <section className="relative overflow-hidden">
          {/* Background: warm gradient with subtle geometric texture */}
          <div className="absolute inset-0 bg-gradient-to-br from-amber-50 via-orange-50/80 to-stone-50" />
          <div
            className="absolute inset-0 opacity-[0.04]"
            style={{
              backgroundImage: `radial-gradient(circle at 1px 1px, currentColor 1px, transparent 0)`,
              backgroundSize: '24px 24px',
            }}
          />
          {/* Decorative warm shapes */}
          <div className="absolute -top-24 -right-24 size-96 rounded-full bg-amber-200/30 blur-3xl" />
          <div className="absolute -bottom-32 -left-32 size-[500px] rounded-full bg-orange-100/40 blur-3xl" />

          <div className="relative mx-auto flex max-w-6xl flex-col items-center px-4 pt-20 pb-24 text-center sm:pt-28 sm:pb-32">
            {/* Powered by Claude badge - prominent placement */}
            <div className="mb-10 flex items-center gap-2 rounded-full border border-amber-200 bg-white/70 px-4 py-2 shadow-sm backdrop-blur-sm">
              <svg className="size-5 text-amber-600" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M12 2L9 9H2l6 5-2.5 8L12 17l6.5 5L16 14l6-5h-7L12 2z" fill="currentColor" opacity="0.9" />
              </svg>
              <span className="text-sm font-medium text-stone-700">Powered by</span>
              <span className="text-sm font-bold text-stone-900">Claude Opus</span>
              <span className="text-xs text-stone-500">&mdash; Anthropic</span>
            </div>

            <h1 className="font-heading max-w-4xl text-5xl leading-[1.1] tracking-tight text-stone-900 sm:text-6xl md:text-7xl lg:text-[5rem]">
              The Operating System for{' '}
              <span className="whitespace-nowrap">K&#x2011;12</span>{' '}
              <span className="italic text-amber-800">Teaching</span>
            </h1>
            <p className="mt-8 max-w-2xl text-lg leading-relaxed text-stone-600 sm:text-xl">
              Plan lessons, grade with AI-assisted feedback, track student mastery,
              manage IEPs, and communicate with families — all in one platform.
              Reclaim hours every week so you can focus on what matters: your students.
            </p>
            <div className="mt-12 flex flex-wrap items-center justify-center gap-4">
              <Button asChild size="lg" className="h-12 bg-amber-700 px-8 text-base hover:bg-amber-800">
                <Link href="/demo">
                  Try the Demo
                  <ArrowRight className="ml-1 size-4" />
                </Link>
              </Button>
              <Button asChild variant="outline" size="lg" className="h-12 border-stone-300 px-8 text-base">
                <Link href="/register">Get Started Free</Link>
              </Button>
            </div>
          </div>
        </section>

        {/* Stats */}
        <section className="relative border-y border-stone-200 bg-white py-0">
          <div className="mx-auto grid max-w-5xl grid-cols-2 divide-x divide-stone-200 sm:grid-cols-4">
            <StatCard value="5+" label="Hours saved per week" />
            <StatCard value="13" label="AI-powered features" />
            <StatCard value="100+" label="Standards aligned" />
            <StatCard value="6" label="Modules built-in" />
          </div>
        </section>

        {/* Feature highlights */}
        <section className="relative overflow-hidden bg-stone-50 py-24">
          {/* Subtle background texture */}
          <div
            className="absolute inset-0 opacity-[0.025]"
            style={{
              backgroundImage: `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23000000'%3E%3Cpath d='M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")`,
            }}
          />
          <div className="relative mx-auto max-w-6xl px-4">
            <div className="mx-auto max-w-2xl text-center">
              <h2 className="font-heading text-3xl tracking-tight text-stone-900 sm:text-4xl md:text-[2.75rem]">
                Five Modules. One Platform.
              </h2>
              <p className="mt-4 text-lg leading-relaxed text-stone-600">
                Every module delivers standalone value. Together, they create an
                intelligence layer that gets smarter with every interaction.
              </p>
            </div>
            <div className="mt-16 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
              <FeatureCard
                icon={BookOpen}
                title="Instructional Design"
                description="Smart assignments, lesson plans, rubrics, quizzes, and differentiation — all standards-aligned and curriculum-grounded."
                accent="amber"
              />
              <FeatureCard
                icon={BarChart3}
                title="Assessment Intelligence"
                description="AI-drafted feedback on student work, longitudinal mastery tracking, standards gap analysis, and formative assessment tools."
                accent="terracotta"
              />
              <FeatureCard
                icon={ShieldCheck}
                title="SPED & Compliance"
                description="AI-assisted IEP development, progress monitoring, compliance tracking, and meeting coordination with full audit trails."
                accent="sage"
              />
              <FeatureCard
                icon={Users}
                title="Family Engagement"
                description="Plain-language progress narratives, proactive communication, multilingual support, and AI transparency for parents."
                accent="sky"
              />
              <FeatureCard
                icon={Brain}
                title="District Intelligence"
                description="Curriculum fidelity dashboards, cross-school analytics, SPED compliance oversight, and student outcome patterns."
                accent="slate"
              />
              <FeatureCard
                icon={Sparkles}
                title="Student AI Tutor"
                description="Socratic, pedagogically designed tutoring grounded in evidence. Guides students to understanding without giving answers."
                accent="rose"
              />
            </div>
          </div>
        </section>

        {/* How It Works */}
        <section className="bg-white py-24">
          <div className="mx-auto max-w-6xl px-4">
            <div className="mx-auto max-w-2xl text-center">
              <h2 className="font-heading text-3xl tracking-tight text-stone-900 sm:text-4xl md:text-[2.75rem]">
                How It Works
              </h2>
              <p className="mt-4 text-lg leading-relaxed text-stone-600">
                From lesson creation to longitudinal insight in three steps.
              </p>
            </div>
            <div className="relative mt-16">
              {/* Connector line (visible on sm+) */}
              <div className="absolute top-7 right-[calc(16.67%+1rem)] left-[calc(16.67%+1rem)] hidden h-px bg-gradient-to-r from-amber-300 via-amber-400 to-amber-300 sm:block" />
              <div className="grid gap-12 sm:grid-cols-3 sm:gap-8">
                <StepCard
                  step="1"
                  title="Create"
                  description="Teachers create assignments, lesson plans, and rubrics with AI assistance. Standards-aligned, curriculum-grounded, and differentiated from the start."
                />
                <StepCard
                  step="2"
                  title="Assess"
                  description="AI drafts individualized feedback on student work, scored against rubrics. Teachers review, edit, and approve before anything reaches a student."
                />
                <StepCard
                  step="3"
                  title="Grow"
                  description="Longitudinal mastery tracking powers differentiation, parent insights, SPED compliance, and Socratic tutoring — all from the same data."
                />
              </div>
            </div>
          </div>
        </section>

        {/* CTA */}
        <section className="relative overflow-hidden border-t border-stone-200">
          <div className="absolute inset-0 bg-gradient-to-br from-amber-50 via-orange-50/60 to-stone-50" />
          <div className="absolute -top-24 right-0 size-72 rounded-full bg-amber-100/50 blur-3xl" />
          <div className="absolute -bottom-24 -left-24 size-96 rounded-full bg-orange-100/30 blur-3xl" />
          <div className="relative mx-auto flex max-w-3xl flex-col items-center px-4 py-24 text-center">
            <h2 className="font-heading text-3xl tracking-tight text-stone-900 sm:text-4xl md:text-[2.75rem]">
              Teachers save 5+ hours every week
            </h2>
            <p className="mt-5 text-lg leading-relaxed text-stone-600">
              See how Paideia reduces administrative burden so teachers
              can focus on meaningful instruction.
            </p>
            <div className="mt-10">
              <Button asChild size="lg" className="h-12 bg-amber-700 px-8 text-base hover:bg-amber-800">
                <Link href="/register">
                  Start for Free
                  <ChevronRight className="ml-1 size-4" />
                </Link>
              </Button>
            </div>
          </div>
        </section>

        {/* Demo CTA */}
        <section className="bg-white py-20">
          <div className="mx-auto max-w-2xl px-4 text-center">
            <h3 className="text-xl font-semibold text-stone-900">See it in action</h3>
            <p className="mt-3 text-stone-600">
              Try any role — Teacher, SPED Teacher, Admin, Parent, or Student.
              Each demo creates a fresh, isolated sandbox.
            </p>
            <div className="mt-6">
              <Button asChild size="lg" className="h-12 bg-amber-700 px-8 text-base hover:bg-amber-800">
                <Link href="/demo">
                  Open Demo Accounts
                  <ArrowRight className="ml-1 size-4" />
                </Link>
              </Button>
            </div>
          </div>
        </section>
      </main>

      {/* Footer */}
      <footer className="border-t border-stone-200 bg-stone-50">
        <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-4 px-4 py-8 text-sm text-stone-500 sm:flex-row">
          <div className="flex items-center gap-2.5">
            <div className="flex size-6 items-center justify-center rounded bg-amber-600 text-white">
              <BookOpen className="size-3" />
            </div>
            <span className="font-semibold text-stone-700">Paideia</span>
          </div>
          <span>FERPA &middot; COPPA &middot; IDEA &middot; SOC 2 Compliant</span>
        </div>
      </footer>
    </div>
  )
}

function StatCard({ value, label }: { value: string; label: string }) {
  return (
    <div className="flex flex-col items-center justify-center px-4 py-8 sm:py-10">
      <div className="font-heading text-4xl tracking-tight text-stone-900 sm:text-5xl">{value}</div>
      <div className="mt-2 text-sm font-medium text-stone-500">{label}</div>
    </div>
  )
}

function FeatureCard({
  icon: Icon,
  title,
  description,
  accent,
}: {
  icon: React.ComponentType<{ className?: string }>
  title: string
  description: string
  accent: keyof typeof MODULE_ACCENTS
}) {
  const colors = MODULE_ACCENTS[accent]
  return (
    <div className={`rounded-xl border-t-[3px] ${colors.border} border border-stone-200 bg-white p-6 shadow-sm`}>
      <div className={`inline-flex size-10 items-center justify-center rounded-lg ${colors.bg}`}>
        <Icon className={`size-5 ${colors.icon}`} />
      </div>
      <h3 className="font-heading mt-4 text-xl text-stone-900">{title}</h3>
      <p className="mt-2 text-[0.9375rem] leading-relaxed text-stone-600">{description}</p>
    </div>
  )
}

function StepCard({
  step,
  title,
  description,
}: {
  step: string
  title: string
  description: string
}) {
  return (
    <div className="relative text-center">
      <div className="relative z-10 mx-auto flex size-14 items-center justify-center rounded-full border-2 border-amber-300 bg-amber-50 text-lg font-bold text-amber-800">
        {step}
      </div>
      <h3 className="font-heading mt-5 text-2xl text-stone-900">{title}</h3>
      <p className="mt-3 text-[0.9375rem] leading-relaxed text-stone-600">{description}</p>
    </div>
  )
}

