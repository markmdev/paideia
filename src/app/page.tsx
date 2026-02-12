import Link from 'next/link'
import { BookOpen, BarChart3, ShieldCheck, Users, Brain } from 'lucide-react'
import { Button } from '@/components/ui/button'

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
        <section className="mx-auto flex max-w-6xl flex-col items-center px-4 py-24 text-center">
          <h1 className="max-w-3xl text-4xl font-bold tracking-tight sm:text-5xl md:text-6xl">
            The Operating System for K-12 Teaching
          </h1>
          <p className="mt-6 max-w-2xl text-lg text-muted-foreground">
            Plan lessons, grade with AI-assisted feedback, track student mastery,
            manage IEPs, and communicate with families -- all in one platform.
            Reclaim hours every week so you can focus on what matters: your students.
          </p>
          <div className="mt-10 flex flex-wrap items-center justify-center gap-4">
            <Button asChild size="lg">
              <Link href="/register">Get Started Free</Link>
            </Button>
            <Button asChild variant="outline" size="lg">
              <Link href="/login">Sign In</Link>
            </Button>
          </div>
        </section>

        {/* Feature highlights */}
        <section className="border-t bg-muted/40 py-20">
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
                description="Smart assignments, lesson plans, rubrics, quizzes, and differentiation -- all standards-aligned and curriculum-grounded."
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
                icon={BookOpen}
                title="Student AI Tutor"
                description="Socratic, pedagogically designed tutoring grounded in evidence. Guides students to understanding without giving answers."
              />
            </div>
          </div>
        </section>

        {/* CTA */}
        <section className="py-20">
          <div className="mx-auto flex max-w-3xl flex-col items-center px-4 text-center">
            <h2 className="text-2xl font-bold tracking-tight sm:text-3xl">
              Teachers save 5+ hours every week
            </h2>
            <p className="mt-4 text-muted-foreground">
              Join thousands of educators who use AI Teaching OS to reduce
              administrative burden and focus on meaningful instruction.
            </p>
            <div className="mt-8">
              <Button asChild size="lg">
                <Link href="/register">Start for Free</Link>
              </Button>
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
