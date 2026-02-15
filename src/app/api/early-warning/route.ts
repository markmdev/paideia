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
import { generateStudentInterventions } from '@/lib/ai/early-warning'

// Cache AI recommendations for 5 minutes to avoid re-analysis on every page load
const recommendationCache = new Map<string, { data: Map<string, string[]>; expiresAt: number }>()
const CACHE_TTL_MS = 5 * 60 * 1000

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
    // Get assignments from the last 30 days, including their classId
    const recentAssignments = await db
      .select({ id: assignments.id, classId: assignments.classId })
      .from(assignments)
      .where(gte(assignments.createdAt, thirtyDaysAgo))

    // Build a map of classId -> assignment IDs for missing submission checks
    const assignmentsByClass = new Map<string, string[]>()
    for (const a of recentAssignments) {
      const list = assignmentsByClass.get(a.classId) ?? []
      list.push(a.id)
      assignmentsByClass.set(a.classId, list)
    }

    // Fetch each student's enrolled class IDs for scoping assignment expectations
    const studentClassMemberships = await db
      .select({ userId: classMembers.userId, classId: classMembers.classId })
      .from(classMembers)
      .where(
        and(
          inArray(classMembers.userId, studentIds),
          eq(classMembers.role, 'student')
        )
      )

    const studentClassMap = new Map<string, Set<string>>()
    for (const m of studentClassMemberships) {
      const set = studentClassMap.get(m.userId) ?? new Set()
      set.add(m.classId)
      studentClassMap.set(m.userId, set)
    }

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
        .map((s) => {
          const score = s.totalScore ?? 0
          const maxScore = s.maxScore ?? 0
          const percentage = maxScore > 0 ? (score / maxScore) * 100 : 0
          return Math.round(percentage)
        })

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
      // Only count assignments from classes the student is enrolled in
      const studentSubmittedAssignmentIds = new Set(studentSubs.map((s) => s.assignmentId))
      const enrolledClassIds = studentClassMap.get(studentId) ?? new Set()
      let missingCount = 0
      for (const classId of enrolledClassIds) {
        const classAssignmentIds = assignmentsByClass.get(classId) ?? []
        for (const assignmentId of classAssignmentIds) {
          if (!studentSubmittedAssignmentIds.has(assignmentId)) {
            missingCount++
          }
        }
      }
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
        // Build anonymized identifiers to avoid sending PII to the AI
        const alphabet = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'
        const anonymizedIdToStudent = new Map<string, StudentRisk>()
        const flaggedInput = flaggedStudents.map((s, index) => {
          const anonId = index < 26
            ? `Student ${alphabet[index]}`
            : `Student ${alphabet[Math.floor(index / 26) - 1]}${alphabet[index % 26]}`
          anonymizedIdToStudent.set(anonId, s)
          return {
            anonId,
            riskLevel: s.riskLevel,
            indicators: s.indicators,
            recentScores: s.recentScores,
            trendDirection: s.trendDirection,
          }
        })

        const cacheKey = session.user.id
        const now = Date.now()

        // Clean up expired cache entries
        for (const [key, entry] of recommendationCache) {
          if (entry.expiresAt <= now) {
            recommendationCache.delete(key)
          }
        }

        const cached = recommendationCache.get(cacheKey)
        if (cached && cached.expiresAt > now) {
          // Apply cached recommendations using anonymized labels
          for (const [anonId, recommendations] of cached.data) {
            const match = anonymizedIdToStudent.get(anonId)
            if (match) {
              match.recommendations = recommendations
            }
          }
        } else {
          const result = await generateStudentInterventions(flaggedInput)

          // Build cache entry from AI results
          const cacheData = new Map<string, string[]>()
          for (const rec of result.students) {
            cacheData.set(rec.studentLabel, rec.recommendations)
          }
          recommendationCache.set(cacheKey, {
            data: cacheData,
            expiresAt: now + CACHE_TTL_MS,
          })

          // Match recommendations back to students using anonymized labels
          for (const rec of result.students) {
            const match = anonymizedIdToStudent.get(rec.studentLabel)
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
