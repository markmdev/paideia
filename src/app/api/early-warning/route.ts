import { auth } from '@/lib/auth'
import { db } from '@/lib/db'
import {
  users,
  classMembers,
  masteryRecords,
  submissions,
  assignments,
} from '@/lib/db/schema'
import { eq, and, inArray, gte, desc } from 'drizzle-orm'
import { NextRequest, NextResponse } from 'next/server'
import { anthropic, AI_MODEL } from '@/lib/ai'

interface StudentRisk {
  id: string
  name: string
  email: string
  riskLevel: 'high_risk' | 'moderate_risk' | 'on_track'
  indicators: string[]
  recentScores: number[]
  trendDirection: 'declining' | 'stable' | 'improving'
  recommendations?: string[]
}

export async function GET(req: NextRequest) {
  try {
    const session = await auth()
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const role = session.user.role
    if (role !== 'teacher' && role !== 'sped_teacher' && role !== 'admin' && role !== 'district_admin') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const { searchParams } = new URL(req.url)
    const schoolId = searchParams.get('schoolId')

    // Step 1: Get student IDs the user has access to
    let studentIds: string[] = []

    if (role === 'admin' || role === 'district_admin') {
      // Admins see all students (optionally filtered by schoolId)
      if (schoolId) {
        const { classes } = await import('@/lib/db/schema')
        const schoolClasses = await db
          .select({ id: classes.id })
          .from(classes)
          .where(eq(classes.schoolId, schoolId))

        const schoolClassIds = schoolClasses.map((c) => c.id)
        if (schoolClassIds.length > 0) {
          const members = await db
            .select({ userId: classMembers.userId })
            .from(classMembers)
            .where(
              and(
                inArray(classMembers.classId, schoolClassIds),
                eq(classMembers.role, 'student')
              )
            )
          studentIds = [...new Set(members.map((m) => m.userId))]
        }
      } else {
        const allStudents = await db
          .select({ id: users.id })
          .from(users)
          .where(eq(users.role, 'student'))
        studentIds = allStudents.map((s) => s.id)
      }
    } else {
      // Teachers: get students in their classes
      const teacherClasses = await db
        .select({ classId: classMembers.classId })
        .from(classMembers)
        .where(
          and(
            eq(classMembers.userId, session.user.id),
            eq(classMembers.role, 'teacher')
          )
        )

      const classIds = teacherClasses.map((c) => c.classId)
      if (classIds.length > 0) {
        const members = await db
          .select({ userId: classMembers.userId })
          .from(classMembers)
          .where(
            and(
              inArray(classMembers.classId, classIds),
              eq(classMembers.role, 'student')
            )
          )
        studentIds = [...new Set(members.map((m) => m.userId))]
      }
    }

    if (studentIds.length === 0) {
      return NextResponse.json({ students: [] })
    }

    // Step 2: Fetch student info
    const studentRows = await db
      .select({ id: users.id, name: users.name, email: users.email })
      .from(users)
      .where(inArray(users.id, studentIds))

    const studentMap = new Map(studentRows.map((s) => [s.id, s]))

    // Step 3: Fetch recent mastery records (last 30 days)
    const thirtyDaysAgo = new Date()
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30)

    const recentMastery = await db
      .select()
      .from(masteryRecords)
      .where(
        and(
          inArray(masteryRecords.studentId, studentIds),
          gte(masteryRecords.assessedAt, thirtyDaysAgo)
        )
      )
      .orderBy(desc(masteryRecords.assessedAt))

    // Step 4: Fetch recent submissions with scores
    // Get assignments from the last 30 days
    const recentAssignments = await db
      .select({ id: assignments.id })
      .from(assignments)
      .where(gte(assignments.createdAt, thirtyDaysAgo))

    const recentAssignmentIds = recentAssignments.map((a) => a.id)

    // Fetch all submissions for these students
    const allStudentSubmissions = await db
      .select({
        id: submissions.id,
        studentId: submissions.studentId,
        totalScore: submissions.totalScore,
        maxScore: submissions.maxScore,
        status: submissions.status,
        assignmentId: submissions.assignmentId,
        submittedAt: submissions.submittedAt,
      })
      .from(submissions)
      .where(inArray(submissions.studentId, studentIds))

    // Step 5: Calculate risk indicators per student
    const studentRisks: StudentRisk[] = []

    for (const studentId of studentIds) {
      const student = studentMap.get(studentId)
      if (!student) continue

      const indicators: string[] = []

      // Mastery records for this student
      const studentMastery = recentMastery.filter((r) => r.studentId === studentId)

      // Submissions for this student
      const studentSubs = allStudentSubmissions.filter((s) => s.studentId === studentId)
      const gradedSubs = studentSubs.filter(
        (s) => s.status === 'graded' && s.totalScore !== null && s.maxScore !== null
      )

      // Calculate recent scores as percentages
      const recentScores = gradedSubs
        .sort((a, b) => b.submittedAt.getTime() - a.submittedAt.getTime())
        .slice(0, 10)
        .map((s) => Math.round(((s.totalScore ?? 0) / (s.maxScore ?? 100)) * 100))

      // Indicator 1: Declining score trend
      let trendDirection: 'declining' | 'stable' | 'improving' = 'stable'
      if (recentScores.length >= 3) {
        const halfIdx = Math.floor(recentScores.length / 2)
        const recentHalf = recentScores.slice(0, halfIdx)
        const olderHalf = recentScores.slice(halfIdx)

        const recentAvg = recentHalf.reduce((a, b) => a + b, 0) / recentHalf.length
        const olderAvg = olderHalf.reduce((a, b) => a + b, 0) / olderHalf.length

        if (recentAvg < olderAvg - 5) {
          trendDirection = 'declining'
          indicators.push('Declining score trend')
        } else if (recentAvg > olderAvg + 5) {
          trendDirection = 'improving'
        }
      }

      // Indicator 2: Standards below proficient
      const belowProficient = studentMastery.filter(
        (r) => r.score < 70 || r.level === 'beginning' || r.level === 'developing'
      )
      if (belowProficient.length > 0) {
        indicators.push(`${belowProficient.length} standard${belowProficient.length !== 1 ? 's' : ''} below proficient`)
      }

      // Indicator 3: Missing submissions
      // Count assignments the student should have submitted but didn't
      const studentSubmittedAssignmentIds = new Set(studentSubs.map((s) => s.assignmentId))
      const missingCount = recentAssignmentIds.filter(
        (id) => !studentSubmittedAssignmentIds.has(id)
      ).length
      if (missingCount > 0) {
        indicators.push(`${missingCount} missing submission${missingCount !== 1 ? 's' : ''}`)
      }

      // Indicator 4: Low average score
      if (recentScores.length > 0) {
        const avgScore = recentScores.reduce((a, b) => a + b, 0) / recentScores.length
        if (avgScore < 70) {
          indicators.push('Average score below 70%')
        }
      }

      // Determine risk level
      let riskLevel: 'high_risk' | 'moderate_risk' | 'on_track' = 'on_track'
      if (indicators.length >= 3) {
        riskLevel = 'high_risk'
      } else if (indicators.length === 2) {
        riskLevel = 'moderate_risk'
      }

      studentRisks.push({
        id: studentId,
        name: student.name ?? 'Unknown',
        email: student.email,
        riskLevel,
        indicators,
        recentScores,
        trendDirection,
      })
    }

    // Sort: high risk first, then moderate, then on track
    const riskOrder = { high_risk: 0, moderate_risk: 1, on_track: 2 }
    studentRisks.sort((a, b) => riskOrder[a.riskLevel] - riskOrder[b.riskLevel])

    // Step 6: Generate AI recommendations for flagged students
    const flaggedStudents = studentRisks.filter(
      (s) => s.riskLevel === 'high_risk' || s.riskLevel === 'moderate_risk'
    )

    if (flaggedStudents.length > 0) {
      try {
        const studentSummaries = flaggedStudents.map((s) => {
          const firstName = s.name.split(' ')[0]
          return `Student: ${firstName}\nRisk Level: ${s.riskLevel.replace('_', ' ')}\nIndicators: ${s.indicators.join(', ')}\nRecent Scores: ${s.recentScores.join(', ') || 'No scores'}\nTrend: ${s.trendDirection}`
        }).join('\n\n')

        const response = await anthropic.messages.create({
          model: AI_MODEL,
          max_tokens: 4096,
          system: 'You are an expert K-12 education interventionist. Based on student performance data, generate specific, actionable intervention recommendations for teachers.',
          tools: [
            {
              name: 'student_interventions',
              description: 'Generate intervention recommendations for at-risk students based on their performance data.',
              input_schema: {
                type: 'object' as const,
                properties: {
                  students: {
                    type: 'array',
                    items: {
                      type: 'object',
                      properties: {
                        firstName: {
                          type: 'string',
                          description: 'The student\'s first name.',
                        },
                        recommendations: {
                          type: 'array',
                          items: { type: 'string' },
                          description: '2-3 specific, actionable intervention recommendations for this student.',
                        },
                      },
                      required: ['firstName', 'recommendations'],
                    },
                  },
                },
                required: ['students'],
              },
            },
          ],
          tool_choice: { type: 'tool', name: 'student_interventions' },
          messages: [
            {
              role: 'user',
              content: `The following students have been flagged as at-risk based on their recent performance data. Please generate 2-3 specific intervention recommendations for each student.\n\n${studentSummaries}`,
            },
          ],
        })

        const toolUseBlock = response.content.find(
          (block): block is Extract<typeof block, { type: 'tool_use' }> =>
            block.type === 'tool_use'
        )

        if (toolUseBlock) {
          const result = toolUseBlock.input as {
            students: { firstName: string; recommendations: string[] }[]
          }

          // Match recommendations back to students by first name
          for (const rec of result.students) {
            const match = flaggedStudents.find(
              (s) => s.name.split(' ')[0].toLowerCase() === rec.firstName.toLowerCase()
            )
            if (match) {
              match.recommendations = rec.recommendations
            }
          }
        }
      } catch (error) {
        console.error('Failed to generate intervention recommendations:', error)
        // Continue without recommendations rather than failing the entire request
      }
    }

    return NextResponse.json({ students: studentRisks })
  } catch (error) {
    console.error('Early warning error:', error)
    return NextResponse.json(
      { error: 'Failed to fetch early warning data' },
      { status: 500 }
    )
  }
}
