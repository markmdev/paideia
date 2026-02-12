'use client'

import Link from 'next/link'
import {
  FileText,
  BarChart3,
  TrendingUp,
  GraduationCap,
  ClipboardList,
  Users,
  ShieldCheck,
  BookOpen,
  Bot,
  Clock,
  CheckCircle2,
  AlertCircle,
} from 'lucide-react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'

// ---------------------------------------------------------------------------
// Teacher Dashboard
// ---------------------------------------------------------------------------

interface TeacherDashboardProps {
  firstName: string
  role: string
}

export function TeacherDashboard({ firstName, role }: TeacherDashboardProps) {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">
          Welcome back, {firstName}
        </h1>
        <p className="text-muted-foreground">
          Here is an overview of your teaching activity.
        </p>
      </div>

      {/* Stats cards */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          title="My Classes"
          value="5"
          description="Active this semester"
          icon={GraduationCap}
        />
        <StatCard
          title="Pending Grading"
          value="23"
          description="Submissions awaiting review"
          icon={ClipboardList}
        />
        <StatCard
          title="Upcoming Assignments"
          value="8"
          description="Due this week"
          icon={Clock}
        />
        <StatCard
          title="Students"
          value="142"
          description="Across all classes"
          icon={Users}
        />
      </div>

      {/* Quick actions */}
      <div>
        <h2 className="text-lg font-semibold mb-3">Quick Actions</h2>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          <QuickActionCard
            title="Create Assignment"
            description="Design a new standards-aligned assignment with AI-generated rubric"
            href="/dashboard/assignments/new"
            icon={FileText}
          />
          <QuickActionCard
            title="Grade Work"
            description="Review and provide AI-assisted feedback on student submissions"
            href="/dashboard/grading"
            icon={BarChart3}
          />
          <QuickActionCard
            title="View Reports"
            description="Check class performance, mastery trends, and standards gaps"
            href="/dashboard/reports"
            icon={TrendingUp}
          />
        </div>
      </div>

      {/* SPED quick actions for sped_teacher */}
      {role === 'sped_teacher' && (
        <div>
          <h2 className="text-lg font-semibold mb-3">Special Education</h2>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            <QuickActionCard
              title="IEP Management"
              description="Draft and manage Individualized Education Programs"
              href="/dashboard/iep"
              icon={ShieldCheck}
            />
            <QuickActionCard
              title="Progress Monitoring"
              description="Log data points and track student progress toward IEP goals"
              href="/dashboard/progress-monitoring"
              icon={TrendingUp}
            />
            <QuickActionCard
              title="Compliance"
              description="Review upcoming deadlines and compliance status"
              href="/dashboard/compliance"
              icon={CheckCircle2}
            />
          </div>
        </div>
      )}
    </div>
  )
}

// ---------------------------------------------------------------------------
// Student Dashboard
// ---------------------------------------------------------------------------

interface StudentDashboardProps {
  firstName: string
}

export function StudentDashboard({ firstName }: StudentDashboardProps) {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">
          Welcome back, {firstName}
        </h1>
        <p className="text-muted-foreground">
          Here is what is happening in your classes.
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <StatCard
          title="My Classes"
          value="6"
          description="Enrolled this semester"
          icon={GraduationCap}
        />
        <StatCard
          title="Upcoming Assignments"
          value="4"
          description="Due this week"
          icon={Clock}
        />
        <StatCard
          title="Recent Grades"
          value="B+"
          description="Average across classes"
          icon={BarChart3}
        />
      </div>

      <div>
        <h2 className="text-lg font-semibold mb-3">Quick Actions</h2>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          <QuickActionCard
            title="My Assignments"
            description="View and submit your current assignments"
            href="/dashboard/assignments"
            icon={FileText}
          />
          <QuickActionCard
            title="AI Tutor"
            description="Get Socratic help with your coursework"
            href="/dashboard/tutor"
            icon={Bot}
          />
          <QuickActionCard
            title="My Progress"
            description="Track your mastery across standards and subjects"
            href="/dashboard/progress"
            icon={TrendingUp}
          />
        </div>
      </div>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Parent Dashboard
// ---------------------------------------------------------------------------

interface ParentDashboardProps {
  firstName: string
}

export function ParentDashboard({ firstName }: ParentDashboardProps) {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">
          Welcome back, {firstName}
        </h1>
        <p className="text-muted-foreground">
          Here is how your children are doing.
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <StatCard
          title="Children"
          value="2"
          description="Enrolled students"
          icon={Users}
        />
        <StatCard
          title="Recent Updates"
          value="5"
          description="New this week"
          icon={AlertCircle}
        />
        <StatCard
          title="Messages"
          value="2"
          description="Unread from teachers"
          icon={BookOpen}
        />
      </div>

      <div>
        <h2 className="text-lg font-semibold mb-3">Quick Actions</h2>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          <QuickActionCard
            title="My Children"
            description="View detailed progress for each child"
            href="/dashboard/children"
            icon={Users}
          />
          <QuickActionCard
            title="Progress Overview"
            description="See learning trends and mastery across subjects"
            href="/dashboard/progress"
            icon={TrendingUp}
          />
          <QuickActionCard
            title="Messages"
            description="Communicate with your children's teachers"
            href="/dashboard/messages"
            icon={BookOpen}
          />
        </div>
      </div>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Admin Dashboard
// ---------------------------------------------------------------------------

interface AdminDashboardProps {
  firstName: string
}

export function AdminDashboard({ firstName }: AdminDashboardProps) {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">
          Welcome back, {firstName}
        </h1>
        <p className="text-muted-foreground">
          District-wide overview and compliance status.
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          title="Schools"
          value="12"
          description="Active in district"
          icon={GraduationCap}
        />
        <StatCard
          title="Teachers"
          value="384"
          description="On the platform"
          icon={Users}
        />
        <StatCard
          title="Students"
          value="8,240"
          description="Total enrolled"
          icon={Users}
        />
        <StatCard
          title="SPED Compliance"
          value="94%"
          description="IEPs current"
          icon={ShieldCheck}
        />
      </div>

      <div>
        <h2 className="text-lg font-semibold mb-3">Quick Actions</h2>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          <QuickActionCard
            title="Analytics"
            description="View district-wide performance metrics and trends"
            href="/dashboard/analytics"
            icon={BarChart3}
          />
          <QuickActionCard
            title="SPED Compliance"
            description="Monitor IEP deadlines and compliance across schools"
            href="/dashboard/compliance"
            icon={ShieldCheck}
          />
          <QuickActionCard
            title="Schools"
            description="Manage schools and view building-level data"
            href="/dashboard/schools"
            icon={GraduationCap}
          />
        </div>
      </div>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Shared Components
// ---------------------------------------------------------------------------

interface StatCardProps {
  title: string
  value: string
  description: string
  icon: React.ComponentType<{ className?: string }>
}

function StatCard({ title, value, description, icon: Icon }: StatCardProps) {
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <CardTitle className="text-sm font-medium">{title}</CardTitle>
        <Icon className="size-4 text-muted-foreground" />
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-bold">{value}</div>
        <p className="text-xs text-muted-foreground">{description}</p>
      </CardContent>
    </Card>
  )
}

interface QuickActionCardProps {
  title: string
  description: string
  href: string
  icon: React.ComponentType<{ className?: string }>
}

function QuickActionCard({ title, description, href, icon: Icon }: QuickActionCardProps) {
  return (
    <Card className="hover:bg-accent/50 transition-colors">
      <CardHeader className="pb-2">
        <div className="flex items-center gap-2">
          <Icon className="size-5 text-primary" />
          <CardTitle className="text-sm">{title}</CardTitle>
        </div>
        <CardDescription className="text-xs">{description}</CardDescription>
      </CardHeader>
      <CardContent>
        <Button asChild variant="ghost" size="sm" className="px-0">
          <Link href={href}>Go to {title} &rarr;</Link>
        </Button>
      </CardContent>
    </Card>
  )
}
