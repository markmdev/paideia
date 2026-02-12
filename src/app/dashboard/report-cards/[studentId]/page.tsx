import { redirect } from 'next/navigation'
import { auth } from '@/lib/auth'
import { db } from '@/lib/db'
import { reportCards, classMembers, classes, users } from '@/lib/db/schema'
import { eq, and } from 'drizzle-orm'
import { FileText } from 'lucide-react'
import { formatGradeLevel } from '@/lib/format'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { ReportCardActions } from './report-card-actions'

export default async function ReportCardDetailPage({
  params,
}: {
  params: Promise<{ studentId: string }>
}) {
  const session = await auth()
  if (!session?.user) {
    redirect('/login')
  }

  if (session.user.role !== 'teacher' && session.user.role !== 'sped_teacher') {
    redirect('/dashboard')
  }

  const { studentId: reportCardId } = await params

  const [reportCard] = await db
    .select({
      id: reportCards.id,
      studentId: reportCards.studentId,
      studentName: users.name,
      classId: reportCards.classId,
      className: classes.name,
      subject: classes.subject,
      gradeLevel: classes.gradeLevel,
      gradingPeriod: reportCards.gradingPeriod,
      narrative: reportCards.narrative,
      strengths: reportCards.strengths,
      areasForGrowth: reportCards.areasForGrowth,
      recommendations: reportCards.recommendations,
      gradeRecommendation: reportCards.gradeRecommendation,
      status: reportCards.status,
      generatedAt: reportCards.generatedAt,
      approvedAt: reportCards.approvedAt,
      approvedBy: reportCards.approvedBy,
    })
    .from(reportCards)
    .innerJoin(users, eq(reportCards.studentId, users.id))
    .innerJoin(classes, eq(reportCards.classId, classes.id))
    .where(eq(reportCards.id, reportCardId))
    .limit(1)

  if (!reportCard) {
    redirect('/dashboard/report-cards')
  }

  // Verify teacher has access
  const [membership] = await db
    .select()
    .from(classMembers)
    .where(
      and(
        eq(classMembers.classId, reportCard.classId),
        eq(classMembers.userId, session.user.id),
        eq(classMembers.role, 'teacher')
      )
    )
    .limit(1)

  if (!membership) {
    redirect('/dashboard/report-cards')
  }

  const strengths: string[] = reportCard.strengths
    ? JSON.parse(reportCard.strengths)
    : []
  const areasForGrowth: string[] = reportCard.areasForGrowth
    ? JSON.parse(reportCard.areasForGrowth)
    : []
  const recommendations: string[] = reportCard.recommendations
    ? JSON.parse(reportCard.recommendations)
    : []

  // Get approver name if approved
  let approverName: string | null = null
  if (reportCard.approvedBy) {
    const [approver] = await db
      .select({ name: users.name })
      .from(users)
      .where(eq(users.id, reportCard.approvedBy))
      .limit(1)
    approverName = approver?.name ?? null
  }

  return (
    <div className="space-y-6 max-w-4xl">
      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="font-serif text-2xl font-bold tracking-tight text-stone-900">
            {reportCard.studentName}
          </h1>
          <p className="text-stone-500 text-sm mt-0.5">
            {reportCard.className} | {reportCard.subject} | {formatGradeLevel(reportCard.gradeLevel)} | {reportCard.gradingPeriod}
          </p>
        </div>
        <div className="flex items-center gap-3">
          {reportCard.status === 'approved' ? (
            <Badge className="bg-emerald-100 text-emerald-700 border-0">
              Approved
            </Badge>
          ) : (
            <Badge className="bg-amber-100 text-amber-700 border-0">
              Draft
            </Badge>
          )}
          {reportCard.gradeRecommendation && (
            <div className="text-center">
              <div className="text-2xl font-bold text-stone-900">
                {reportCard.gradeRecommendation}
              </div>
              <div className="text-[10px] text-stone-500 uppercase tracking-wide">Grade</div>
            </div>
          )}
        </div>
      </div>

      {/* Approval info */}
      {reportCard.status === 'approved' && reportCard.approvedAt && (
        <div className="rounded-lg bg-emerald-50 border border-emerald-200 px-4 py-3 text-sm text-emerald-800">
          Approved on {reportCard.approvedAt.toLocaleDateString()}
          {approverName ? ` by ${approverName}` : ''}
        </div>
      )}

      {/* Narrative */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <FileText className="size-4 text-amber-600" />
            Overall Narrative
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="prose prose-stone prose-sm max-w-none">
            {reportCard.narrative.split('\n').map((paragraph, i) => (
              <p key={i}>{paragraph}</p>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Strengths */}
      {strengths.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base text-emerald-700">Strengths</CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="space-y-2">
              {strengths.map((strength, i) => (
                <li key={i} className="flex items-start gap-2 text-sm text-stone-700">
                  <span className="inline-block size-1.5 rounded-full bg-emerald-500 mt-1.5 shrink-0" />
                  {strength}
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      )}

      {/* Areas for Growth */}
      {areasForGrowth.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base text-amber-700">Areas for Growth</CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="space-y-2">
              {areasForGrowth.map((area, i) => (
                <li key={i} className="flex items-start gap-2 text-sm text-stone-700">
                  <span className="inline-block size-1.5 rounded-full bg-amber-500 mt-1.5 shrink-0" />
                  {area}
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      )}

      {/* Recommendations */}
      {recommendations.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base text-blue-700">Recommendations</CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="space-y-2">
              {recommendations.map((rec, i) => (
                <li key={i} className="flex items-start gap-2 text-sm text-stone-700">
                  <span className="inline-block size-1.5 rounded-full bg-blue-500 mt-1.5 shrink-0" />
                  {rec}
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      )}

      {/* Actions */}
      {reportCard.status === 'draft' && (
        <ReportCardActions reportCardId={reportCard.id} />
      )}

      {/* Metadata */}
      <div className="text-xs text-stone-400 pt-4 border-t border-stone-100">
        Generated on {reportCard.generatedAt.toLocaleDateString()} |
        This report card narrative was generated by AI from longitudinal student performance data.
        The teacher reviewed and {reportCard.status === 'approved' ? 'approved' : 'has not yet approved'} this content.
      </div>
    </div>
  )
}
