import Link from 'next/link'
import { BookOpen, BarChart3, ShieldCheck, Users, Brain, Sparkles } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'

export default function Home() {
  return (
    <div className="flex min-h-screen flex-col">
      {/* Header */}
      <header className="border-b">
        <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-4">
          <div className="flex items-center gap-2">
            <BookOpen className="size-6 text-primary" />
            <span className="text-lg font-bold">AI Teaching OS</span>
          </div>
          <div className="flex items-center gap-3">
            <Button asChild variant="ghost" size="sm">
              <Link href="/login">Sign In</Link>
            </Button>
            <Button asChild size="sm">
              <Link href="/register">Get Started</Link>
            </Button>
          </div>
        </div>
      </header>

      {/* Hero */}
      <main className="flex-1">
        <section className="bg-gradient-to-b from-amber-50/60 via-orange-50/30 to-background">
          <div className="mx-auto flex max-w-6xl flex-col items-center px-4 py-24 text-center">
            <h1 className="max-w-3xl text-4xl font-bold tracking-tight sm:text-5xl md:text-6xl">
              The Operating System for <span className="whitespace-nowrap">K&#x2011;12</span> Teaching
            </h1>
            <p className="mt-6 max-w-2xl text-lg text-muted-foreground">
              Plan lessons, grade with AI-assisted feedback, track student mastery,
              manage IEPs, and communicate with families — all in one platform.
              Reclaim hours every week so you can focus on what matters: your students.
            </p>
            <Badge variant="outline" className="mt-6 gap-1.5 border-amber-300 bg-amber-50 px-3 py-1 text-sm text-amber-800">
              <svg className="size-4" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M12 2L9 9H2l6 5-2.5 8L12 17l6.5 5L16 14l6-5h-7L12 2z" fill="currentColor" opacity="0.9" />
              </svg>
              Powered by Claude Opus
            </Badge>
            <div className="mt-10 flex flex-wrap items-center justify-center gap-4">
              <Button asChild size="lg">
                <Link href="/register">Get Started Free</Link>
              </Button>
              <Button asChild variant="outline" size="lg">
                <Link href="/login">Sign In</Link>
              </Button>
            </div>
          </div>
        </section>

        {/* Stats */}
        <section className="border-y bg-muted/30 py-12">
          <div className="mx-auto grid max-w-4xl grid-cols-2 gap-6 px-4 sm:grid-cols-4">
            <StatCard value="5+" label="Hours saved per week" />
            <StatCard value="13" label="AI-powered features" />
            <StatCard value="100+" label="Standards aligned" />
            <StatCard value="6" label="Modules built-in" />
          </div>
        </section>

        {/* Feature highlights */}
        <section className="border-b bg-muted/40 py-20">
          <div className="mx-auto max-w-6xl px-4">
            <h2 className="text-center text-2xl font-bold tracking-tight sm:text-3xl">
              Five Modules. One Platform.
            </h2>
            <p className="mx-auto mt-3 max-w-2xl text-center text-muted-foreground">
              Every module delivers standalone value. Together, they create an
              intelligence layer that gets smarter with every interaction.
            </p>
            <div className="mt-12 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
              <FeatureCard
                icon={BookOpen}
                title="Instructional Design"
                description="Smart assignments, lesson plans, rubrics, quizzes, and differentiation — all standards-aligned and curriculum-grounded."
              />
              <FeatureCard
                icon={BarChart3}
                title="Assessment Intelligence"
                description="AI-drafted feedback on student work, longitudinal mastery tracking, standards gap analysis, and formative assessment tools."
              />
              <FeatureCard
                icon={ShieldCheck}
                title="SPED & Compliance"
                description="AI-assisted IEP development, progress monitoring, compliance tracking, and meeting coordination with full audit trails."
              />
              <FeatureCard
                icon={Users}
                title="Family Engagement"
                description="Plain-language progress narratives, proactive communication, multilingual support, and AI transparency for parents."
              />
              <FeatureCard
                icon={Brain}
                title="District Intelligence"
                description="Curriculum fidelity dashboards, cross-school analytics, SPED compliance oversight, and student outcome patterns."
              />
              <FeatureCard
                icon={Sparkles}
                title="Student AI Tutor"
                description="Socratic, pedagogically designed tutoring grounded in evidence. Guides students to understanding without giving answers."
              />
            </div>
          </div>
        </section>

        {/* How It Works */}
        <section className="py-20">
          <div className="mx-auto max-w-6xl px-4">
            <h2 className="text-center text-2xl font-bold tracking-tight sm:text-3xl">
              How It Works
            </h2>
            <p className="mx-auto mt-3 max-w-2xl text-center text-muted-foreground">
              From lesson creation to longitudinal insight in three steps.
            </p>
            <div className="mt-12 grid gap-8 sm:grid-cols-3">
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
        </section>

        {/* CTA */}
        <section className="border-t bg-muted/40 py-20">
          <div className="mx-auto flex max-w-3xl flex-col items-center px-4 text-center">
            <h2 className="text-2xl font-bold tracking-tight sm:text-3xl">
              Teachers save 5+ hours every week
            </h2>
            <p className="mt-4 text-muted-foreground">
              See how AI Teaching OS reduces administrative burden so teachers
              can focus on meaningful instruction.
            </p>
            <div className="mt-8">
              <Button asChild size="lg">
                <Link href="/register">Start for Free</Link>
              </Button>
            </div>
          </div>
        </section>

        {/* Demo Credentials */}
        <section className="py-16">
          <div className="mx-auto max-w-2xl px-4">
            <div className="rounded-lg border-2 border-dashed border-muted-foreground/25 bg-muted/20 p-6">
              <h3 className="text-center text-sm font-semibold uppercase tracking-wider text-muted-foreground">
                Demo Credentials
              </h3>
              <p className="mt-1 text-center text-xs text-muted-foreground">
                All accounts use password: <code className="rounded bg-muted px-1.5 py-0.5 font-mono text-xs">password123</code>
              </p>
              <div className="mt-4 grid gap-2 text-sm sm:grid-cols-2">
                <CredentialRow role="Teacher" email="rivera@school.edu" />
                <CredentialRow role="Admin" email="williams@school.edu" />
                <CredentialRow role="Parent" email="sarah.chen@email.com" />
                <CredentialRow role="Student" email="aisha@student.edu" />
                <CredentialRow role="SPED Teacher" email="rodriguez@school.edu" />
              </div>
            </div>
          </div>
        </section>
      </main>

      {/* Footer */}
      <footer className="border-t py-8">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-4 text-sm text-muted-foreground">
          <span>AI Teaching OS</span>
          <span>FERPA &middot; COPPA &middot; IDEA &middot; SOC 2 Compliant</span>
        </div>
      </footer>
    </div>
  )
}

function StatCard({ value, label }: { value: string; label: string }) {
  return (
    <div className="text-center">
      <div className="text-3xl font-bold tracking-tight">{value}</div>
      <div className="mt-1 text-sm text-muted-foreground">{label}</div>
    </div>
  )
}

function FeatureCard({
  icon: Icon,
  title,
  description,
}: {
  icon: React.ComponentType<{ className?: string }>
  title: string
  description: string
}) {
  return (
    <div className="rounded-lg border bg-card p-6">
      <Icon className="size-8 text-primary" />
      <h3 className="mt-4 font-semibold">{title}</h3>
      <p className="mt-2 text-sm text-muted-foreground">{description}</p>
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
    <div className="text-center">
      <div className="mx-auto flex size-10 items-center justify-center rounded-full bg-primary text-sm font-bold text-primary-foreground">
        {step}
      </div>
      <h3 className="mt-4 text-lg font-semibold">{title}</h3>
      <p className="mt-2 text-sm text-muted-foreground">{description}</p>
    </div>
  )
}

function CredentialRow({ role, email }: { role: string; email: string }) {
  return (
    <div className="flex items-center justify-between rounded-md bg-background px-3 py-2">
      <span className="font-medium text-muted-foreground">{role}</span>
      <code className="font-mono text-xs">{email}</code>
    </div>
  )
}
