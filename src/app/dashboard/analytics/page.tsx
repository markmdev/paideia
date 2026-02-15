import { redirect } from 'next/navigation'
import { cookies } from 'next/headers'
import { auth } from '@/lib/auth'
import { getBaseUrl } from '@/lib/url'
import {
  School,
  Users,
  GraduationCap,
  BookOpen,
  FileText,
  ClipboardList,
} from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { StatCard } from '@/components/admin/stat-card'
import { AIInsights } from '@/components/admin/ai-insights'

interface OverviewData {
  totals: {
    schools: number
    teachers: number
    students: number
    classes: number
    assignments: number
    submissions: number
  }
  recentActivity: {
    assignmentsCreatedThisWeek: number
    submissionsGradedThisWeek: number
  }
  gradingPipeline: {
    ungradedSubmissions: number
  }
}

interface TopTeacher {
  teacherId: string
  teacherName: string | null
  teacherEmail: string | null
  assignmentCount: number
  submissionCount: number
  gradedCount: number
  feedbackCount: number
}

interface AnalyticsData {
  masteryDistribution: { level: string; count: number }[]
  subjectScores: {
    subject: string
    avgScore: number | null
    submissionCount: number
  }[]
  gradingCompletion: {
    total: number
    graded: number
    completionRate: number
  }
  teacherEngagement: {
    totalTeachers: number
    withAssignments: number
    withLessonPlans: number
    withRubrics: number
    withFeedbackDrafts: number
    topTeachers: TopTeacher[]
  }
}

const masteryColors: Record<string, string> = {
  advanced: 'bg-emerald-100 text-emerald-700',
  proficient: 'bg-blue-100 text-blue-700',
  developing: 'bg-amber-100 text-amber-700',
  beginning: 'bg-red-100 text-red-700',
}

const masteryLabels: Record<string, string> = {
  advanced: 'Advanced',
  proficient: 'Proficient',
  developing: 'Developing',
  beginning: 'Beginning',
}

export default async function AnalyticsPage() {
  const session = await auth()
  if (!session?.user) {
    redirect('/login')
  }

  if (session.user.role !== 'admin' && session.user.role !== 'district_admin') {
    redirect('/dashboard')
  }

  const baseUrl = await getBaseUrl()
  const cookieStore = await cookies()
  const headers = {
    cookie: cookieStore.toString(),
    'Content-Type': 'application/json',
  }

  const [overviewRes, analyticsRes] = await Promise.all([
    fetch(`${baseUrl}/api/admin/overview`, {
      headers,
      cache: 'no-store',
    }),
    fetch(`${baseUrl}/api/admin/analytics`, {
      headers,
      cache: 'no-store',
    }),
  ])

  const overview: OverviewData = overviewRes.ok
    ? await overviewRes.json()
    : {
        totals: { schools: 0, teachers: 0, students: 0, classes: 0, assignments: 0, submissions: 0 },
        recentActivity: { assignmentsCreatedThisWeek: 0, submissionsGradedThisWeek: 0 },
        gradingPipeline: { ungradedSubmissions: 0 },
      }

  const analytics: AnalyticsData = analyticsRes.ok
    ? await analyticsRes.json()
    : {
        masteryDistribution: [],
        subjectScores: [],
        gradingCompletion: { total: 0, graded: 0, completionRate: 0 },
        teacherEngagement: {
          totalTeachers: 0,
          withAssignments: 0,
          withLessonPlans: 0,
          withRubrics: 0,
          withFeedbackDrafts: 0,
          topTeachers: [],
        },
      }

  return (
    <div className="space-y-8">
      <div>
        <h1 className="font-serif text-2xl font-bold tracking-tight text-stone-900">
          District Analytics
        </h1>
        <p className="text-stone-500 text-sm mt-1">
          Comprehensive overview of district-wide performance, engagement, and standards mastery.
        </p>
      </div>

      {/* Stat cards - 6 across */}
      <div className="grid gap-4 grid-cols-2 md:grid-cols-3 lg:grid-cols-6">
        <StatCard
          label="Schools"
          value={overview.totals.schools}
          icon={School}
        />
        <StatCard
          label="Teachers"
          value={overview.totals.teachers}
          icon={Users}
        />
        <StatCard
          label="Students"
          value={overview.totals.students}
          icon={GraduationCap}
        />
        <StatCard
          label="Classes"
          value={overview.totals.classes}
          icon={BookOpen}
        />
        <StatCard
          label="Assignments"
          value={overview.totals.assignments}
          icon={FileText}
        />
        <StatCard
          label="Submissions"
          value={overview.totals.submissions}
          icon={ClipboardList}
        />
      </div>

      {/* Standards Mastery Distribution */}
      <Card>
        <CardHeader>
          <CardTitle className="font-serif text-lg text-stone-900">
            Standards Mastery Distribution
          </CardTitle>
        </CardHeader>
        <CardContent>
          {analytics.masteryDistribution.length === 0 ? (
            <p className="text-sm text-stone-500">No mastery data available.</p>
          ) : (
            <div className="flex flex-wrap gap-4">
              {['advanced', 'proficient', 'developing', 'beginning'].map(
                (level) => {
                  const entry = analytics.masteryDistribution.find(
                    (m) => m.level === level
                  )
                  return (
                    <div
                      key={level}
                      className="flex items-center gap-2 rounded-lg border border-stone-200 px-4 py-3"
                    >
                      <Badge
                        className={`text-xs px-2 py-0.5 border-0 ${masteryColors[level]}`}
                      >
                        {masteryLabels[level]}
                      </Badge>
                      <span className="text-lg font-bold text-stone-900">
                        {entry?.count ?? 0}
                      </span>
                      <span className="text-xs text-stone-500">records</span>
                    </div>
                  )
                }
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Average Scores by Subject */}
      <Card>
        <CardHeader>
          <CardTitle className="font-serif text-lg text-stone-900">
            Average Scores by Subject
          </CardTitle>
        </CardHeader>
        <CardContent>
          {analytics.subjectScores.length === 0 ? (
            <p className="text-sm text-stone-500">No subject score data available.</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow className="bg-stone-50">
                  <TableHead className="text-stone-600">Subject</TableHead>
                  <TableHead className="text-stone-600 text-center">Avg Score</TableHead>
                  <TableHead className="text-stone-600 text-center">Submissions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {analytics.subjectScores.map((subject) => (
                  <TableRow key={subject.subject}>
                    <TableCell className="font-medium text-stone-900">
                      {subject.subject}
                    </TableCell>
                    <TableCell className="text-center">
                      {subject.avgScore !== null ? (
                        <span className="font-semibold text-stone-900">
                          {Math.round(subject.avgScore)}%
                        </span>
                      ) : (
                        <span className="text-stone-400">N/A</span>
                      )}
                    </TableCell>
                    <TableCell className="text-center text-stone-600">
                      {subject.submissionCount}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Teacher Engagement */}
      <Card>
        <CardHeader>
          <CardTitle className="font-serif text-lg text-stone-900">
            Teacher Engagement
          </CardTitle>
        </CardHeader>
        <CardContent>
          {analytics.teacherEngagement.topTeachers.length === 0 ? (
            <p className="text-sm text-stone-500">No teacher engagement data available.</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow className="bg-stone-50">
                  <TableHead className="text-stone-600">Teacher</TableHead>
                  <TableHead className="text-stone-600 text-center">Assignments</TableHead>
                  <TableHead className="text-stone-600 text-center">Submissions</TableHead>
                  <TableHead className="text-stone-600 text-center">Graded</TableHead>
                  <TableHead className="text-stone-600 text-center">AI Feedback</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {analytics.teacherEngagement.topTeachers.map((teacher) => (
                  <TableRow key={teacher.teacherId}>
                    <TableCell>
                      <div>
                        <p className="font-medium text-stone-900">
                          {teacher.teacherName || 'Unknown'}
                        </p>
                        <p className="text-xs text-stone-500">
                          {teacher.teacherEmail}
                        </p>
                      </div>
                    </TableCell>
                    <TableCell className="text-center text-stone-600">
                      {teacher.assignmentCount}
                    </TableCell>
                    <TableCell className="text-center text-stone-600">
                      {teacher.submissionCount}
                    </TableCell>
                    <TableCell className="text-center text-stone-600">
                      {teacher.gradedCount}
                    </TableCell>
                    <TableCell className="text-center text-stone-600">
                      {teacher.feedbackCount}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* AI Insights */}
      <AIInsights />
    </div>
  )
}
