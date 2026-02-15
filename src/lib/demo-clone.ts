import { db } from '@/lib/db'
import { createId } from '@paralleldrive/cuid2'
import { isNull, lte, inArray } from 'drizzle-orm'
import * as schema from '@/lib/db/schema'
import { DEMO_SEED_EMAILS } from './demo-constants'

const DEMO_SESSION_TTL_MS = 60 * 60 * 1000 // 1 hour

/**
 * Clone all seed data for a demo session. Returns the cloned entry user's email.
 */
export async function cloneDemoData(sourceEmail: string): Promise<{ email: string; sessionId: string }> {
  const sessionId = createId()

  // Read all seed users (those without a demo session)
  const seedUsers = await db
    .select()
    .from(schema.users)
    .where(isNull(schema.users.demoSessionId))

  // Filter to only seed emails
  const usersToClone = seedUsers.filter((u) => DEMO_SEED_EMAILS.has(u.email))
  if (usersToClone.length === 0) {
    throw new Error('No seed users found to clone')
  }

  // Build user ID map
  const userIdMap = new Map<string, string>()
  for (const u of usersToClone) {
    userIdMap.set(u.id, createId())
  }

  // Find the entry user and generate their cloned email
  const entryUser = usersToClone.find((u) => u.email === sourceEmail)
  if (!entryUser) {
    throw new Error(`Source email ${sourceEmail} not found in seed users`)
  }
  const sessionPrefix = sessionId.slice(0, 8)

  function cloneEmail(email: string): string {
    const [local, domain] = email.split('@')
    return `${local}.demo.${sessionPrefix}@${domain}`
  }

  const seedUserIds = usersToClone.map((u) => u.id)

  // Read all seed data in parallel
  const [
    seedClasses,
    seedClassMembers,
    seedParentChildren,
    seedClassStandards,
    seedRubrics,
    seedRubricCriteria,
    seedAssignments,
    seedDiffVersions,
    seedSubmissions,
    seedFeedbackDrafts,
    seedCriterionScores,
    seedMasteryRecords,
    seedLessonPlans,
    seedQuizzes,
    seedQuizQuestions,
    seedQuestionStandards,
    seedIeps,
    seedIepGoals,
    seedProgressDataPoints,
    seedComplianceDeadlines,
    seedMessages,
    seedNotifications,
    seedTutorSessions,
    seedReportCards,
  ] = await Promise.all([
    db.select().from(schema.classes),
    db.select().from(schema.classMembers).where(inArray(schema.classMembers.userId, seedUserIds)),
    db.select().from(schema.parentChildren),
    db.select().from(schema.classStandards),
    db.select().from(schema.rubrics),
    db.select().from(schema.rubricCriteria),
    db.select().from(schema.assignments),
    db.select().from(schema.differentiatedVersions),
    db.select().from(schema.submissions).where(inArray(schema.submissions.studentId, seedUserIds)),
    db.select().from(schema.feedbackDrafts),
    db.select().from(schema.criterionScores),
    db.select().from(schema.masteryRecords).where(inArray(schema.masteryRecords.studentId, seedUserIds)),
    db.select().from(schema.lessonPlans),
    db.select().from(schema.quizzes),
    db.select().from(schema.quizQuestions),
    db.select().from(schema.questionStandards),
    db.select().from(schema.ieps),
    db.select().from(schema.iepGoals),
    db.select().from(schema.progressDataPoints),
    db.select().from(schema.complianceDeadlines),
    db.select().from(schema.messages),
    db.select().from(schema.notifications),
    db.select().from(schema.tutorSessions),
    db.select().from(schema.reportCards),
  ])

  // Build ID maps for all tables
  const classIdMap = new Map<string, string>()
  for (const c of seedClasses) classIdMap.set(c.id, createId())

  const rubricIdMap = new Map<string, string>()
  for (const r of seedRubrics) rubricIdMap.set(r.id, createId())

  const criterionIdMap = new Map<string, string>()
  for (const c of seedRubricCriteria) criterionIdMap.set(c.id, createId())

  const assignmentIdMap = new Map<string, string>()
  for (const a of seedAssignments) assignmentIdMap.set(a.id, createId())

  const submissionIdMap = new Map<string, string>()
  for (const s of seedSubmissions) submissionIdMap.set(s.id, createId())

  const quizIdMap = new Map<string, string>()
  for (const q of seedQuizzes) quizIdMap.set(q.id, createId())

  const questionIdMap = new Map<string, string>()
  for (const q of seedQuizQuestions) questionIdMap.set(q.id, createId())

  const iepIdMap = new Map<string, string>()
  for (const i of seedIeps) iepIdMap.set(i.id, createId())

  const goalIdMap = new Map<string, string>()
  for (const g of seedIepGoals) goalIdMap.set(g.id, createId())

  // Helper to remap or keep an ID
  function remap(map: Map<string, string>, id: string): string {
    return map.get(id) ?? id
  }
  function remapNullable(map: Map<string, string>, id: string | null): string | null {
    if (!id) return null
    return map.get(id) ?? id
  }

  // Insert everything in a transaction
  await db.transaction(async (tx) => {
    // Demo session
    await tx.insert(schema.demoSessions).values({
      id: sessionId,
      sourceEmail,
    })

    // Users
    await tx.insert(schema.users).values(
      usersToClone.map((u) => ({
        id: remap(userIdMap, u.id),
        name: u.name,
        email: cloneEmail(u.email),
        emailVerified: u.emailVerified,
        image: u.image,
        passwordHash: u.passwordHash,
        role: u.role,
        demoSessionId: sessionId,
        createdAt: u.createdAt,
        updatedAt: u.updatedAt,
      }))
    )

    // Classes
    if (seedClasses.length > 0) {
      await tx.insert(schema.classes).values(
        seedClasses.map((c) => ({
          id: remap(classIdMap, c.id),
          name: c.name,
          subject: c.subject,
          gradeLevel: c.gradeLevel,
          period: c.period,
          schoolYear: c.schoolYear,
          schoolId: c.schoolId, // keep — shared
          createdAt: c.createdAt,
          updatedAt: c.updatedAt,
        }))
      )
    }

    // Class Members
    if (seedClassMembers.length > 0) {
      await tx.insert(schema.classMembers).values(
        seedClassMembers.map((cm) => ({
          id: createId(),
          classId: remap(classIdMap, cm.classId),
          userId: remap(userIdMap, cm.userId),
          role: cm.role,
          joinedAt: cm.joinedAt,
        }))
      )
    }

    // Parent-Child Links
    if (seedParentChildren.length > 0) {
      await tx.insert(schema.parentChildren).values(
        seedParentChildren.map((pc) => ({
          id: createId(),
          parentId: remap(userIdMap, pc.parentId),
          childId: remap(userIdMap, pc.childId),
        }))
      )
    }

    // Class Standards
    if (seedClassStandards.length > 0) {
      await tx.insert(schema.classStandards).values(
        seedClassStandards.map((cs) => ({
          id: createId(),
          classId: remap(classIdMap, cs.classId),
          standardId: cs.standardId, // keep — shared
        }))
      )
    }

    // Rubrics
    if (seedRubrics.length > 0) {
      await tx.insert(schema.rubrics).values(
        seedRubrics.map((r) => ({
          id: remap(rubricIdMap, r.id),
          title: r.title,
          description: r.description,
          type: r.type,
          levels: r.levels,
          teacherId: remap(userIdMap, r.teacherId),
          isTemplate: r.isTemplate,
          createdAt: r.createdAt,
          updatedAt: r.updatedAt,
        }))
      )
    }

    // Rubric Criteria
    if (seedRubricCriteria.length > 0) {
      await tx.insert(schema.rubricCriteria).values(
        seedRubricCriteria.map((rc) => ({
          id: remap(criterionIdMap, rc.id),
          rubricId: remap(rubricIdMap, rc.rubricId),
          name: rc.name,
          description: rc.description,
          weight: rc.weight,
          standardId: rc.standardId, // keep — shared
          descriptors: rc.descriptors,
        }))
      )
    }

    // Assignments
    if (seedAssignments.length > 0) {
      await tx.insert(schema.assignments).values(
        seedAssignments.map((a) => ({
          id: remap(assignmentIdMap, a.id),
          title: a.title,
          description: a.description,
          instructions: a.instructions,
          type: a.type,
          gradeLevel: a.gradeLevel,
          subject: a.subject,
          dueDate: a.dueDate,
          status: a.status,
          classId: remap(classIdMap, a.classId),
          teacherId: remap(userIdMap, a.teacherId),
          rubricId: remapNullable(rubricIdMap, a.rubricId),
          successCriteria: a.successCriteria,
          aiMetadata: a.aiMetadata,
          createdAt: a.createdAt,
          updatedAt: a.updatedAt,
        }))
      )
    }

    // Differentiated Versions
    if (seedDiffVersions.length > 0) {
      await tx.insert(schema.differentiatedVersions).values(
        seedDiffVersions.map((dv) => ({
          id: createId(),
          assignmentId: remap(assignmentIdMap, dv.assignmentId),
          tier: dv.tier,
          title: dv.title,
          content: dv.content,
          scaffolds: dv.scaffolds,
          createdAt: dv.createdAt,
        }))
      )
    }

    // Submissions
    if (seedSubmissions.length > 0) {
      await tx.insert(schema.submissions).values(
        seedSubmissions.map((s) => ({
          id: remap(submissionIdMap, s.id),
          assignmentId: remap(assignmentIdMap, s.assignmentId),
          studentId: remap(userIdMap, s.studentId),
          content: s.content,
          attachments: s.attachments,
          status: s.status,
          submittedAt: s.submittedAt,
          gradedAt: s.gradedAt,
          totalScore: s.totalScore,
          maxScore: s.maxScore,
          letterGrade: s.letterGrade,
        }))
      )
    }

    // Feedback Drafts — only for cloned submissions
    const feedbackToClone = seedFeedbackDrafts.filter((fd) => submissionIdMap.has(fd.submissionId))
    if (feedbackToClone.length > 0) {
      await tx.insert(schema.feedbackDrafts).values(
        feedbackToClone.map((fd) => ({
          id: createId(),
          submissionId: remap(submissionIdMap, fd.submissionId),
          teacherId: remap(userIdMap, fd.teacherId),
          aiFeedback: fd.aiFeedback,
          teacherEdits: fd.teacherEdits,
          finalFeedback: fd.finalFeedback,
          status: fd.status,
          strengths: fd.strengths,
          improvements: fd.improvements,
          nextSteps: fd.nextSteps,
          aiMetadata: fd.aiMetadata,
          createdAt: fd.createdAt,
          updatedAt: fd.updatedAt,
        }))
      )
    }

    // Criterion Scores — only for cloned submissions
    const scoresToClone = seedCriterionScores.filter((cs) => submissionIdMap.has(cs.submissionId))
    if (scoresToClone.length > 0) {
      await tx.insert(schema.criterionScores).values(
        scoresToClone.map((cs) => ({
          id: createId(),
          submissionId: remap(submissionIdMap, cs.submissionId),
          criterionId: remap(criterionIdMap, cs.criterionId),
          level: cs.level,
          score: cs.score,
          maxScore: cs.maxScore,
          justification: cs.justification,
        }))
      )
    }

    // Mastery Records
    if (seedMasteryRecords.length > 0) {
      await tx.insert(schema.masteryRecords).values(
        seedMasteryRecords.map((mr) => ({
          id: createId(),
          studentId: remap(userIdMap, mr.studentId),
          standardId: mr.standardId, // keep — shared
          level: mr.level,
          score: mr.score,
          assessedAt: mr.assessedAt,
          source: mr.source ? (assignmentIdMap.get(mr.source) ?? mr.source) : mr.source,
          notes: mr.notes,
        }))
      )
    }

    // Lesson Plans
    if (seedLessonPlans.length > 0) {
      await tx.insert(schema.lessonPlans).values(
        seedLessonPlans.map((lp) => ({
          id: createId(),
          title: lp.title,
          subject: lp.subject,
          gradeLevel: lp.gradeLevel,
          duration: lp.duration,
          standards: lp.standards,
          objectives: lp.objectives,
          warmUp: lp.warmUp,
          directInstruction: lp.directInstruction,
          guidedPractice: lp.guidedPractice,
          independentPractice: lp.independentPractice,
          closure: lp.closure,
          materials: lp.materials,
          differentiation: lp.differentiation,
          assessmentPlan: lp.assessmentPlan,
          teacherId: remap(userIdMap, lp.teacherId),
          aiMetadata: lp.aiMetadata,
          createdAt: lp.createdAt,
          updatedAt: lp.updatedAt,
        }))
      )
    }

    // Quizzes
    if (seedQuizzes.length > 0) {
      await tx.insert(schema.quizzes).values(
        seedQuizzes.map((q) => ({
          id: remap(quizIdMap, q.id),
          title: q.title,
          subject: q.subject,
          gradeLevel: q.gradeLevel,
          standards: q.standards,
          difficultyLevel: q.difficultyLevel,
          timeLimit: q.timeLimit,
          createdBy: remapNullable(userIdMap, q.createdBy),
          createdAt: q.createdAt,
        }))
      )
    }

    // Quiz Questions
    if (seedQuizQuestions.length > 0) {
      await tx.insert(schema.quizQuestions).values(
        seedQuizQuestions.map((qq) => ({
          id: remap(questionIdMap, qq.id),
          quizId: remap(quizIdMap, qq.quizId),
          type: qq.type,
          questionText: qq.questionText,
          options: qq.options,
          correctAnswer: qq.correctAnswer,
          explanation: qq.explanation,
          bloomsLevel: qq.bloomsLevel,
          points: qq.points,
          orderIndex: qq.orderIndex,
        }))
      )
    }

    // Question Standards
    if (seedQuestionStandards.length > 0) {
      await tx.insert(schema.questionStandards).values(
        seedQuestionStandards.map((qs) => ({
          id: createId(),
          questionId: remap(questionIdMap, qs.questionId),
          standardId: qs.standardId, // keep — shared
        }))
      )
    }

    // IEPs
    if (seedIeps.length > 0) {
      await tx.insert(schema.ieps).values(
        seedIeps.map((iep) => ({
          id: remap(iepIdMap, iep.id),
          studentId: remap(userIdMap, iep.studentId),
          authorId: remap(userIdMap, iep.authorId),
          status: iep.status,
          startDate: iep.startDate,
          endDate: iep.endDate,
          presentLevels: iep.presentLevels,
          disabilityCategory: iep.disabilityCategory,
          accommodations: iep.accommodations,
          modifications: iep.modifications,
          relatedServices: iep.relatedServices,
          transitionPlan: iep.transitionPlan,
          meetingDate: iep.meetingDate,
          meetingNotes: iep.meetingNotes,
          parentInput: iep.parentInput,
          aiMetadata: iep.aiMetadata,
          createdAt: iep.createdAt,
          updatedAt: iep.updatedAt,
        }))
      )
    }

    // IEP Goals
    if (seedIepGoals.length > 0) {
      await tx.insert(schema.iepGoals).values(
        seedIepGoals.map((g) => ({
          id: remap(goalIdMap, g.id),
          iepId: remap(iepIdMap, g.iepId),
          area: g.area,
          goalText: g.goalText,
          baseline: g.baseline,
          target: g.target,
          measureMethod: g.measureMethod,
          frequency: g.frequency,
          timeline: g.timeline,
          status: g.status,
          similarityScore: g.similarityScore,
          aiGenerated: g.aiGenerated,
          createdAt: g.createdAt,
        }))
      )
    }

    // Progress Data Points
    if (seedProgressDataPoints.length > 0) {
      await tx.insert(schema.progressDataPoints).values(
        seedProgressDataPoints.map((pdp) => ({
          id: createId(),
          goalId: remap(goalIdMap, pdp.goalId),
          studentId: remap(userIdMap, pdp.studentId),
          value: pdp.value,
          unit: pdp.unit,
          date: pdp.date,
          notes: pdp.notes,
          recordedBy: pdp.recordedBy ? (userIdMap.get(pdp.recordedBy) ?? pdp.recordedBy) : pdp.recordedBy,
        }))
      )
    }

    // Compliance Deadlines
    if (seedComplianceDeadlines.length > 0) {
      await tx.insert(schema.complianceDeadlines).values(
        seedComplianceDeadlines.map((cd) => ({
          id: createId(),
          type: cd.type,
          studentId: remap(userIdMap, cd.studentId), // plain text, not FK
          dueDate: cd.dueDate,
          status: cd.status,
          completedAt: cd.completedAt,
          notes: cd.notes,
        }))
      )
    }

    // Messages
    if (seedMessages.length > 0) {
      await tx.insert(schema.messages).values(
        seedMessages.map((m) => ({
          id: createId(),
          senderId: remap(userIdMap, m.senderId),
          receiverId: remap(userIdMap, m.receiverId),
          subject: m.subject,
          content: m.content,
          type: m.type,
          language: m.language,
          isAIGenerated: m.isAIGenerated,
          status: m.status,
          metadata: m.metadata,
          createdAt: m.createdAt,
        }))
      )
    }

    // Notifications
    if (seedNotifications.length > 0) {
      await tx.insert(schema.notifications).values(
        seedNotifications.map((n) => ({
          id: createId(),
          userId: remap(userIdMap, n.userId),
          type: n.type,
          title: n.title,
          body: n.body,
          isRead: n.isRead,
          link: n.link,
          createdAt: n.createdAt,
        }))
      )
    }

    // Tutor Sessions
    if (seedTutorSessions.length > 0) {
      await tx.insert(schema.tutorSessions).values(
        seedTutorSessions.map((ts) => ({
          id: createId(),
          studentId: remap(userIdMap, ts.studentId),
          subject: ts.subject,
          topic: ts.topic,
          messages: ts.messages,
          startedAt: ts.startedAt,
          endedAt: ts.endedAt,
          metadata: ts.metadata,
        }))
      )
    }

    // Report Cards
    if (seedReportCards.length > 0) {
      await tx.insert(schema.reportCards).values(
        seedReportCards.map((rc) => ({
          id: createId(),
          studentId: remap(userIdMap, rc.studentId),
          classId: remap(classIdMap, rc.classId),
          gradingPeriod: rc.gradingPeriod,
          narrative: rc.narrative,
          strengths: rc.strengths,
          areasForGrowth: rc.areasForGrowth,
          recommendations: rc.recommendations,
          gradeRecommendation: rc.gradeRecommendation,
          status: rc.status,
          generatedAt: rc.generatedAt,
          approvedAt: rc.approvedAt,
          approvedBy: remapNullable(userIdMap, rc.approvedBy),
        }))
      )
    }
  })

  const clonedEmail = cloneEmail(sourceEmail)
  return { email: clonedEmail, sessionId }
}

/**
 * Delete demo sessions older than 1 hour and all their associated data.
 */
export async function cleanupExpiredDemoSessions(): Promise<void> {
  const expiry = new Date(Date.now() - DEMO_SESSION_TTL_MS)
  const expired = await db
    .select({ id: schema.demoSessions.id })
    .from(schema.demoSessions)
    .where(lte(schema.demoSessions.createdAt, expiry))

  if (expired.length === 0) return

  const sessionIds = expired.map((s) => s.id)

  // Find all demo users for these sessions
  const demoUsers = await db
    .select({ id: schema.users.id })
    .from(schema.users)
    .where(inArray(schema.users.demoSessionId, sessionIds))

  if (demoUsers.length === 0) {
    // Sessions exist but no users — clean up orphaned sessions
    await db.delete(schema.demoSessions).where(inArray(schema.demoSessions.id, sessionIds))
    return
  }

  const demoUserIds = demoUsers.map((u) => u.id)

  // Delete in reverse dependency order
  // Tables with user FK
  await db.delete(schema.reportCards).where(inArray(schema.reportCards.studentId, demoUserIds))
  await db.delete(schema.tutorSessions).where(inArray(schema.tutorSessions.studentId, demoUserIds))
  await db.delete(schema.notifications).where(inArray(schema.notifications.userId, demoUserIds))
  await db.delete(schema.messages).where(inArray(schema.messages.senderId, demoUserIds))

  // SPED chain
  // progressDataPoints has goalId FK to iepGoals, and iepGoals has iepId FK to ieps
  // Find IEPs for demo users, then goals, then delete progress data
  const demoIeps = await db
    .select({ id: schema.ieps.id })
    .from(schema.ieps)
    .where(inArray(schema.ieps.studentId, demoUserIds))
  const demoIepIds = demoIeps.map((i) => i.id)

  if (demoIepIds.length > 0) {
    const demoGoals = await db
      .select({ id: schema.iepGoals.id })
      .from(schema.iepGoals)
      .where(inArray(schema.iepGoals.iepId, demoIepIds))
    const demoGoalIds = demoGoals.map((g) => g.id)

    if (demoGoalIds.length > 0) {
      await db.delete(schema.progressDataPoints).where(inArray(schema.progressDataPoints.goalId, demoGoalIds))
    }
    await db.delete(schema.iepGoals).where(inArray(schema.iepGoals.iepId, demoIepIds))
  }
  await db.delete(schema.complianceDeadlines).where(inArray(schema.complianceDeadlines.studentId, demoUserIds))
  await db.delete(schema.ieps).where(inArray(schema.ieps.studentId, demoUserIds))

  // Quiz chain
  const demoQuizzes = await db
    .select({ id: schema.quizzes.id })
    .from(schema.quizzes)
    .where(inArray(schema.quizzes.createdBy, demoUserIds))
  const demoQuizIds = demoQuizzes.map((q) => q.id)

  if (demoQuizIds.length > 0) {
    const demoQuestions = await db
      .select({ id: schema.quizQuestions.id })
      .from(schema.quizQuestions)
      .where(inArray(schema.quizQuestions.quizId, demoQuizIds))
    const demoQuestionIds = demoQuestions.map((q) => q.id)

    if (demoQuestionIds.length > 0) {
      await db.delete(schema.questionStandards).where(inArray(schema.questionStandards.questionId, demoQuestionIds))
    }
    await db.delete(schema.quizQuestions).where(inArray(schema.quizQuestions.quizId, demoQuizIds))
  }
  await db.delete(schema.quizzes).where(inArray(schema.quizzes.createdBy, demoUserIds))

  await db.delete(schema.lessonPlans).where(inArray(schema.lessonPlans.teacherId, demoUserIds))
  await db.delete(schema.masteryRecords).where(inArray(schema.masteryRecords.studentId, demoUserIds))

  // Submission chain
  const demoSubmissions = await db
    .select({ id: schema.submissions.id })
    .from(schema.submissions)
    .where(inArray(schema.submissions.studentId, demoUserIds))
  const demoSubmissionIds = demoSubmissions.map((s) => s.id)

  if (demoSubmissionIds.length > 0) {
    await db.delete(schema.criterionScores).where(inArray(schema.criterionScores.submissionId, demoSubmissionIds))
    await db.delete(schema.feedbackDrafts).where(inArray(schema.feedbackDrafts.submissionId, demoSubmissionIds))
  }
  await db.delete(schema.submissions).where(inArray(schema.submissions.studentId, demoUserIds))

  // Assignment chain
  const demoAssignments = await db
    .select({ id: schema.assignments.id })
    .from(schema.assignments)
    .where(inArray(schema.assignments.teacherId, demoUserIds))
  const demoAssignmentIds = demoAssignments.map((a) => a.id)

  if (demoAssignmentIds.length > 0) {
    await db.delete(schema.differentiatedVersions).where(inArray(schema.differentiatedVersions.assignmentId, demoAssignmentIds))
  }
  await db.delete(schema.assignments).where(inArray(schema.assignments.teacherId, demoUserIds))

  // Rubric chain
  const demoRubrics = await db
    .select({ id: schema.rubrics.id })
    .from(schema.rubrics)
    .where(inArray(schema.rubrics.teacherId, demoUserIds))
  const demoRubricIds = demoRubrics.map((r) => r.id)

  if (demoRubricIds.length > 0) {
    await db.delete(schema.rubricCriteria).where(inArray(schema.rubricCriteria.rubricId, demoRubricIds))
  }
  await db.delete(schema.rubrics).where(inArray(schema.rubrics.teacherId, demoUserIds))

  // Class chain — find demo classes via classMembers with demo user IDs
  const demoClassRows = await db
    .select({ classId: schema.classMembers.classId })
    .from(schema.classMembers)
    .where(inArray(schema.classMembers.userId, demoUserIds))
  const demoClassIds = [...new Set(demoClassRows.map((r) => r.classId))]

  if (demoClassIds.length > 0) {
    await db.delete(schema.classStandards).where(inArray(schema.classStandards.classId, demoClassIds))
  }
  await db.delete(schema.classMembers).where(inArray(schema.classMembers.userId, demoUserIds))
  await db.delete(schema.parentChildren).where(inArray(schema.parentChildren.parentId, demoUserIds))
  if (demoClassIds.length > 0) {
    await db.delete(schema.classes).where(inArray(schema.classes.id, demoClassIds))
  }

  // Finally, delete users and sessions
  await db.delete(schema.users).where(inArray(schema.users.demoSessionId, sessionIds))
  await db.delete(schema.demoSessions).where(inArray(schema.demoSessions.id, sessionIds))
}
