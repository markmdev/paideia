import 'dotenv/config'
import { drizzle } from 'drizzle-orm/postgres-js'
import postgres from 'postgres'
import { createId } from '@paralleldrive/cuid2'
import bcrypt from 'bcryptjs'
import * as schema from './schema'

// ---------- database connection ----------
const connectionString = process.env.DATABASE_URL!
if (!connectionString) {
  console.error('DATABASE_URL is not set in .env')
  process.exit(1)
}

const client = postgres(connectionString, { prepare: false })
const db = drizzle(client, { schema })

// ---------- helpers ----------
async function hashPassword(password: string) {
  return bcrypt.hash(password, 10)
}

function daysAgo(n: number) {
  const d = new Date()
  d.setDate(d.getDate() - n)
  return d
}

function daysFromNow(n: number) {
  const d = new Date()
  d.setDate(d.getDate() + n)
  return d
}

// ---------- main ----------
async function seed() {
  console.log('Seeding database...\n')

  // =========================================================
  // 1. Clear existing data (reverse dependency order)
  // =========================================================
  console.log('Clearing existing data...')
  await db.delete(schema.auditLogs)
  await db.delete(schema.reportCards)
  await db.delete(schema.notifications)
  await db.delete(schema.messages)
  await db.delete(schema.tutorSessions)
  await db.delete(schema.progressDataPoints)
  await db.delete(schema.iepGoals)
  await db.delete(schema.complianceDeadlines)
  await db.delete(schema.ieps)
  await db.delete(schema.masteryRecords)
  await db.delete(schema.criterionScores)
  await db.delete(schema.feedbackDrafts)
  await db.delete(schema.submissions)
  await db.delete(schema.differentiatedVersions)
  await db.delete(schema.questionStandards)
  await db.delete(schema.quizQuestions)
  await db.delete(schema.quizzes)
  await db.delete(schema.lessonPlans)
  await db.delete(schema.classStandards)
  await db.delete(schema.rubricCriteria)
  await db.delete(schema.assignments)
  await db.delete(schema.rubrics)
  await db.delete(schema.standards)
  await db.delete(schema.parentChildren)
  await db.delete(schema.classMembers)
  await db.delete(schema.classes)
  await db.delete(schema.schools)
  await db.delete(schema.districts)
  await db.delete(schema.sessions)
  await db.delete(schema.accounts)
  await db.delete(schema.verificationTokens)
  await db.delete(schema.users)
  console.log('Cleared.\n')

  // =========================================================
  // 2. Users
  // =========================================================
  console.log('Creating users...')
  const passwordHash = await hashPassword('password123')

  // Pre-generate IDs so we can reference them throughout
  const userIds = {
    rivera: createId(),
    okafor: createId(),
    chen: createId(),
    rodriguez: createId(),
    williams_admin: createId(),
    sarah_chen: createId(),
    marcus_williams: createId(),
    aisha: createId(),
    deshawn: createId(),
    students: Array.from({ length: 20 }, () => createId()),
  }

  const usersToInsert = [
    // Teachers
    { id: userIds.rivera, name: 'Ms. Rivera', email: 'rivera@school.edu', passwordHash, role: 'teacher' },
    { id: userIds.okafor, name: 'Mr. Okafor', email: 'okafor@school.edu', passwordHash, role: 'teacher' },
    { id: userIds.chen, name: 'Mrs. Chen', email: 'chen@school.edu', passwordHash, role: 'teacher' },
    // SPED Teacher
    { id: userIds.rodriguez, name: 'Ms. Rodriguez', email: 'rodriguez@school.edu', passwordHash, role: 'sped_teacher' },
    // Admin
    { id: userIds.williams_admin, name: 'Dr. Williams', email: 'williams@school.edu', passwordHash, role: 'admin' },
    // Parents
    { id: userIds.sarah_chen, name: 'Sarah Chen', email: 'sarah.chen@email.com', passwordHash, role: 'parent' },
    { id: userIds.marcus_williams, name: 'Marcus Williams', email: 'marcus.w@email.com', passwordHash, role: 'parent' },
    // Named students
    { id: userIds.aisha, name: 'Aisha Torres', email: 'aisha@student.edu', passwordHash, role: 'student' },
    { id: userIds.deshawn, name: 'DeShawn Williams', email: 'deshawn@student.edu', passwordHash, role: 'student' },
    // 20 additional students with realistic, diverse names
    ...[
      { name: 'Jayden Park', email: 'jayden.park@student.edu' },
      { name: 'Sofia Martinez', email: 'sofia.martinez@student.edu' },
      { name: 'Ethan Nakamura', email: 'ethan.nakamura@student.edu' },
      { name: 'Zara Ahmed', email: 'zara.ahmed@student.edu' },
      { name: 'Lucas Thompson', email: 'lucas.thompson@student.edu' },
      { name: 'Amara Osei', email: 'amara.osei@student.edu' },
      { name: 'Noah Gutierrez', email: 'noah.gutierrez@student.edu' },
      { name: 'Priya Sharma', email: 'priya.sharma@student.edu' },
      { name: 'Isaiah Washington', email: 'isaiah.washington@student.edu' },
      { name: 'Mei-Lin Chang', email: 'mei-lin.chang@student.edu' },
      { name: 'Diego Reyes', email: 'diego.reyes@student.edu' },
      { name: 'Fatima Hassan', email: 'fatima.hassan@student.edu' },
      { name: 'Liam O\'Brien', email: 'liam.obrien@student.edu' },
      { name: 'Nia Jackson', email: 'nia.jackson@student.edu' },
      { name: 'Andrei Volkov', email: 'andrei.volkov@student.edu' },
      { name: 'Camila Santos', email: 'camila.santos@student.edu' },
      { name: 'Tariq Robinson', email: 'tariq.robinson@student.edu' },
      { name: 'Yuki Tanaka', email: 'yuki.tanaka@student.edu' },
      { name: 'Aaliyah Bennett', email: 'aaliyah.bennett@student.edu' },
      { name: 'Mateo Rivera', email: 'mateo.rivera@student.edu' },
    ].map((s, i) => ({
      id: userIds.students[i],
      name: s.name,
      email: s.email,
      passwordHash,
      role: 'student',
    })),
  ]

  await db.insert(schema.users).values(usersToInsert)
  console.log(`  ${usersToInsert.length} users created.`)

  // =========================================================
  // 3. District & Schools
  // =========================================================
  console.log('Creating district & schools...')
  const districtId = createId()
  const washingtonId = createId()
  const jeffersonId = createId()

  await db.insert(schema.districts).values({
    id: districtId,
    name: 'Lincoln Unified School District',
    state: 'California',
  })

  await db.insert(schema.schools).values([
    { id: washingtonId, name: 'Washington Middle School', districtId, address: '450 Elm Street, Lincoln, CA 95648' },
    { id: jeffersonId, name: 'Jefferson Elementary School', districtId, address: '200 Oak Avenue, Lincoln, CA 95648' },
  ])
  console.log('  1 district, 2 schools created.')

  // =========================================================
  // 4. Classes
  // =========================================================
  console.log('Creating classes...')
  const classIds = {
    riveraPeriod1: createId(),
    riveraPeriod2: createId(),
    riveraPeriod3: createId(),
    riveraPeriod4: createId(),
    riveraPeriod5: createId(),
    okaforPeriod1: createId(),
    okaforPeriod2: createId(),
    okaforPeriod3: createId(),
    chenAllSubjects: createId(),
    rodriguezResource: createId(),
  }

  const classesToInsert = [
    // Ms. Rivera - 8th Grade ELA, Periods 1-5
    { id: classIds.riveraPeriod1, name: '8th Grade ELA - Period 1', subject: 'ELA', gradeLevel: '8', period: '1', schoolId: washingtonId },
    { id: classIds.riveraPeriod2, name: '8th Grade ELA - Period 2', subject: 'ELA', gradeLevel: '8', period: '2', schoolId: washingtonId },
    { id: classIds.riveraPeriod3, name: '8th Grade ELA - Period 3', subject: 'ELA', gradeLevel: '8', period: '3', schoolId: washingtonId },
    { id: classIds.riveraPeriod4, name: '8th Grade ELA - Period 4', subject: 'ELA', gradeLevel: '8', period: '4', schoolId: washingtonId },
    { id: classIds.riveraPeriod5, name: '8th Grade ELA - Period 5', subject: 'ELA', gradeLevel: '8', period: '5', schoolId: washingtonId },
    // Mr. Okafor - 10th Grade Biology, Periods 1-3
    { id: classIds.okaforPeriod1, name: '10th Grade Biology - Period 1', subject: 'Science', gradeLevel: '10', period: '1', schoolId: washingtonId },
    { id: classIds.okaforPeriod2, name: '10th Grade Biology - Period 2', subject: 'Science', gradeLevel: '10', period: '2', schoolId: washingtonId },
    { id: classIds.okaforPeriod3, name: '10th Grade Biology - Period 3', subject: 'Science', gradeLevel: '10', period: '3', schoolId: washingtonId },
    // Mrs. Chen - 3rd Grade All Subjects
    { id: classIds.chenAllSubjects, name: '3rd Grade All Subjects', subject: 'All Subjects', gradeLevel: '3', period: null, schoolId: jeffersonId },
    // Ms. Rodriguez - SPED Resource Room
    { id: classIds.rodriguezResource, name: 'SPED Resource Room', subject: 'SPED', gradeLevel: 'Mixed', period: null, schoolId: washingtonId },
  ]

  await db.insert(schema.classes).values(classesToInsert)
  console.log(`  ${classesToInsert.length} classes created.`)

  // =========================================================
  // 5. Class Members (teachers + students)
  // =========================================================
  console.log('Creating class memberships...')
  const classMembersToInsert: Array<{
    classId: string
    userId: string
    role: string
  }> = []

  // Teachers as members of their classes
  const riveraClasses = [classIds.riveraPeriod1, classIds.riveraPeriod2, classIds.riveraPeriod3, classIds.riveraPeriod4, classIds.riveraPeriod5]
  for (const cId of riveraClasses) {
    classMembersToInsert.push({ classId: cId, userId: userIds.rivera, role: 'teacher' })
  }
  const okaforClasses = [classIds.okaforPeriod1, classIds.okaforPeriod2, classIds.okaforPeriod3]
  for (const cId of okaforClasses) {
    classMembersToInsert.push({ classId: cId, userId: userIds.okafor, role: 'teacher' })
  }
  classMembersToInsert.push({ classId: classIds.chenAllSubjects, userId: userIds.chen, role: 'teacher' })
  classMembersToInsert.push({ classId: classIds.rodriguezResource, userId: userIds.rodriguez, role: 'teacher' })

  // Named students: Aisha in Rivera Period 1, DeShawn in Rivera Period 1 and Rodriguez Resource
  classMembersToInsert.push({ classId: classIds.riveraPeriod1, userId: userIds.aisha, role: 'student' })
  classMembersToInsert.push({ classId: classIds.riveraPeriod1, userId: userIds.deshawn, role: 'student' })
  classMembersToInsert.push({ classId: classIds.rodriguezResource, userId: userIds.deshawn, role: 'student' })

  // Distribute 20 additional students across Rivera's classes (Period 1 already has 2 named students)
  // Period 1: students 0-4 (5 more -> total 7 with Aisha+DeShawn)
  // Period 2: students 5-9 (5 students)
  // Period 3: students 10-14 (5 students)
  // Period 4: students 15-17 (3 students)
  // Period 5: students 18-19 (2 students)
  const periodStudentAssignment: Record<string, number[]> = {
    [classIds.riveraPeriod1]: [0, 1, 2, 3, 4],
    [classIds.riveraPeriod2]: [5, 6, 7, 8, 9],
    [classIds.riveraPeriod3]: [10, 11, 12, 13, 14],
    [classIds.riveraPeriod4]: [15, 16, 17],
    [classIds.riveraPeriod5]: [18, 19],
  }

  for (const [cId, studentIndices] of Object.entries(periodStudentAssignment)) {
    for (const idx of studentIndices) {
      classMembersToInsert.push({ classId: cId, userId: userIds.students[idx], role: 'student' })
    }
  }

  // Some students also in Okafor and Chen classes
  for (let i = 0; i < 8; i++) {
    classMembersToInsert.push({ classId: classIds.okaforPeriod1, userId: userIds.students[i], role: 'student' })
  }
  for (let i = 8; i < 14; i++) {
    classMembersToInsert.push({ classId: classIds.okaforPeriod2, userId: userIds.students[i], role: 'student' })
  }
  for (let i = 14; i < 20; i++) {
    classMembersToInsert.push({ classId: classIds.chenAllSubjects, userId: userIds.students[i], role: 'student' })
  }

  await db.insert(schema.classMembers).values(classMembersToInsert)
  console.log(`  ${classMembersToInsert.length} class memberships created.`)

  // =========================================================
  // 6. Parent-Child Relationships
  // =========================================================
  console.log('Creating parent-child relationships...')
  await db.insert(schema.parentChildren).values([
    { parentId: userIds.sarah_chen, childId: userIds.aisha },
    { parentId: userIds.marcus_williams, childId: userIds.deshawn },
  ])
  console.log('  2 parent-child links created.')

  // =========================================================
  // 7. Standards (Common Core samples)
  // =========================================================
  console.log('Creating standards...')
  const standardIds: Record<string, string> = {}

  const standardsData = [
    // ELA Standards (8th Grade)
    { code: 'RL.8.1', description: 'Cite the textual evidence that most strongly supports an analysis of what the text says explicitly as well as inferences drawn from the text.', subject: 'ELA', gradeLevel: '8', domain: 'Reading: Literature' },
    { code: 'RL.8.2', description: 'Determine a theme or central idea of a text and analyze its development over the course of the text, including its relationship to the characters, setting, and plot.', subject: 'ELA', gradeLevel: '8', domain: 'Reading: Literature' },
    { code: 'RL.8.3', description: 'Analyze how particular lines of dialogue or incidents in a story or drama propel the action, reveal aspects of a character, or provoke a decision.', subject: 'ELA', gradeLevel: '8', domain: 'Reading: Literature' },
    { code: 'W.8.1', description: 'Write arguments to support claims with clear reasons and relevant evidence.', subject: 'ELA', gradeLevel: '8', domain: 'Writing' },
    { code: 'W.8.2', description: 'Write informative/explanatory texts to examine a topic and convey ideas, concepts, and information through the selection, organization, and analysis of relevant content.', subject: 'ELA', gradeLevel: '8', domain: 'Writing' },
    { code: 'W.8.3', description: 'Write narratives to develop real or imagined experiences or events using effective technique, relevant descriptive details, and well-structured event sequences.', subject: 'ELA', gradeLevel: '8', domain: 'Writing' },
    { code: 'L.8.1', description: 'Demonstrate command of the conventions of standard English grammar and usage when writing or speaking.', subject: 'ELA', gradeLevel: '8', domain: 'Language' },
    { code: 'L.8.2', description: 'Demonstrate command of the conventions of standard English capitalization, punctuation, and spelling when writing.', subject: 'ELA', gradeLevel: '8', domain: 'Language' },
    // Math Standards (3rd Grade)
    { code: '3.OA.1', description: 'Interpret products of whole numbers, e.g., interpret 5 x 7 as the total number of objects in 5 groups of 7 objects each.', subject: 'Math', gradeLevel: '3', domain: 'Operations & Algebraic Thinking' },
    { code: '3.OA.2', description: 'Interpret whole-number quotients of whole numbers, e.g., interpret 56 / 8 as the number of objects in each share when 56 objects are partitioned equally into 8 shares.', subject: 'Math', gradeLevel: '3', domain: 'Operations & Algebraic Thinking' },
    { code: '3.NBT.1', description: 'Use place value understanding to round whole numbers to the nearest 10 or 100.', subject: 'Math', gradeLevel: '3', domain: 'Number & Operations in Base Ten' },
    { code: '3.NBT.2', description: 'Fluently add and subtract within 1000 using strategies and algorithms based on place value, properties of operations, and/or the relationship between addition and subtraction.', subject: 'Math', gradeLevel: '3', domain: 'Number & Operations in Base Ten' },
    { code: '3.NF.1', description: 'Understand a fraction 1/b as the quantity formed by 1 part when a whole is partitioned into b equal parts.', subject: 'Math', gradeLevel: '3', domain: 'Number & Operations-Fractions' },
    // Science Standards (High School Life Science)
    { code: 'HS-LS1-1', description: 'Construct an explanation based on evidence for how the structure of DNA determines the structure of proteins which carry out the essential functions of life through systems of specialized cells.', subject: 'Science', gradeLevel: '10', domain: 'From Molecules to Organisms: Structures and Processes' },
    { code: 'HS-LS1-2', description: 'Develop and use a model to illustrate the hierarchical organization of interacting systems that provide specific functions within multicellular organisms.', subject: 'Science', gradeLevel: '10', domain: 'From Molecules to Organisms: Structures and Processes' },
    { code: 'HS-LS1-3', description: 'Plan and conduct an investigation to provide evidence that feedback mechanisms maintain homeostasis.', subject: 'Science', gradeLevel: '10', domain: 'From Molecules to Organisms: Structures and Processes' },
  ]

  const standardsToInsert = standardsData.map((s) => {
    const id = createId()
    standardIds[s.code] = id
    return { id, ...s }
  })

  await db.insert(schema.standards).values(standardsToInsert)
  console.log(`  ${standardsToInsert.length} standards created.`)

  // Link standards to classes
  const classStandardsToInsert: Array<{ classId: string; standardId: string }> = []

  // ELA standards -> Rivera classes
  const elaStandardCodes = ['RL.8.1', 'RL.8.2', 'RL.8.3', 'W.8.1', 'W.8.2', 'W.8.3', 'L.8.1', 'L.8.2']
  for (const cId of riveraClasses) {
    for (const code of elaStandardCodes) {
      classStandardsToInsert.push({ classId: cId, standardId: standardIds[code] })
    }
  }

  // Science standards -> Okafor classes
  const scienceStandardCodes = ['HS-LS1-1', 'HS-LS1-2', 'HS-LS1-3']
  for (const cId of okaforClasses) {
    for (const code of scienceStandardCodes) {
      classStandardsToInsert.push({ classId: cId, standardId: standardIds[code] })
    }
  }

  // Math standards -> Chen class
  const mathStandardCodes = ['3.OA.1', '3.OA.2', '3.NBT.1', '3.NBT.2', '3.NF.1']
  for (const code of mathStandardCodes) {
    classStandardsToInsert.push({ classId: classIds.chenAllSubjects, standardId: standardIds[code] })
  }

  await db.insert(schema.classStandards).values(classStandardsToInsert)
  console.log(`  ${classStandardsToInsert.length} class-standard links created.`)

  // =========================================================
  // 8. Rubrics
  // =========================================================
  console.log('Creating rubrics...')
  const rubricIds = {
    essay: createId(),
    labReport: createId(),
  }

  const levels = JSON.stringify(['Beginning', 'Developing', 'Proficient', 'Advanced'])

  await db.insert(schema.rubrics).values([
    {
      id: rubricIds.essay,
      title: 'Essay Writing Rubric',
      description: 'Analytical rubric for evaluating 8th grade argumentative and informative essays.',
      type: 'analytical',
      levels,
      teacherId: userIds.rivera,
      isTemplate: true,
    },
    {
      id: rubricIds.labReport,
      title: 'Lab Report Rubric',
      description: 'Analytical rubric for evaluating high school biology lab reports.',
      type: 'analytical',
      levels,
      teacherId: userIds.okafor,
      isTemplate: true,
    },
  ])

  // Rubric criteria
  const criterionIds = {
    thesis: createId(),
    evidence: createId(),
    organization: createId(),
    language: createId(),
    hypothesis: createId(),
    methods: createId(),
    dataAnalysis: createId(),
    conclusion: createId(),
  }

  const essayCriteria = [
    {
      id: criterionIds.thesis,
      rubricId: rubricIds.essay,
      name: 'Thesis',
      description: 'Clarity and strength of the central argument or thesis statement.',
      weight: 0.25,
      standardId: standardIds['W.8.1'],
      descriptors: JSON.stringify({
        Beginning: 'No clear thesis or central claim. The essay lacks a discernible argument.',
        Developing: 'A thesis is present but vague or overly broad. The argument is unclear or weakly stated.',
        Proficient: 'A clear and specific thesis states the argument. The position is evident throughout the essay.',
        Advanced: 'A compelling, nuanced thesis drives the essay. The argument is sophisticated and addresses complexity or counterarguments.',
      }),
    },
    {
      id: criterionIds.evidence,
      rubricId: rubricIds.essay,
      name: 'Evidence Use',
      description: 'Selection and integration of textual evidence to support claims.',
      weight: 0.25,
      standardId: standardIds['RL.8.1'],
      descriptors: JSON.stringify({
        Beginning: 'No evidence cited, or evidence is irrelevant to the claim.',
        Developing: 'Some evidence is cited but not explained or connected to the claim. May rely on summary rather than analysis.',
        Proficient: 'Relevant evidence is cited and explained. The student connects evidence to claims with clear reasoning.',
        Advanced: 'Evidence is carefully selected, smoothly integrated, and deeply analyzed. The student explains how and why the evidence supports the argument.',
      }),
    },
    {
      id: criterionIds.organization,
      rubricId: rubricIds.essay,
      name: 'Organization',
      description: 'Logical structure, paragraph development, and transitions.',
      weight: 0.25,
      standardId: standardIds['W.8.2'],
      descriptors: JSON.stringify({
        Beginning: 'No discernible organizational structure. Ideas are randomly arranged.',
        Developing: 'Basic structure is present (intro, body, conclusion) but transitions are weak and paragraph focus drifts.',
        Proficient: 'Logical organizational structure with clear paragraphs. Transitions connect ideas between sections.',
        Advanced: 'Sophisticated organizational choices enhance the argument. Seamless transitions create a cohesive, engaging reading experience.',
      }),
    },
    {
      id: criterionIds.language,
      rubricId: rubricIds.essay,
      name: 'Language',
      description: 'Grammar, mechanics, word choice, and sentence variety.',
      weight: 0.25,
      standardId: standardIds['L.8.1'],
      descriptors: JSON.stringify({
        Beginning: 'Frequent errors in grammar and mechanics that impede understanding. Limited vocabulary.',
        Developing: 'Some errors in grammar and mechanics but meaning is generally clear. Basic vocabulary and sentence structures.',
        Proficient: 'Few errors in grammar and mechanics. Appropriate vocabulary and varied sentence structures.',
        Advanced: 'Virtually error-free. Precise, varied vocabulary and deliberate sentence structures that enhance meaning.',
      }),
    },
  ]

  const labCriteria = [
    {
      id: criterionIds.hypothesis,
      rubricId: rubricIds.labReport,
      name: 'Hypothesis',
      description: 'Quality and testability of the stated hypothesis.',
      weight: 0.25,
      standardId: standardIds['HS-LS1-3'],
      descriptors: JSON.stringify({
        Beginning: 'No hypothesis stated, or hypothesis is not testable.',
        Developing: 'A hypothesis is stated but is vague or not clearly connected to the research question.',
        Proficient: 'A clear, testable hypothesis is stated and logically connected to background knowledge.',
        Advanced: 'A precise, testable hypothesis demonstrates deep understanding of the concept and predicts specific outcomes with reasoning.',
      }),
    },
    {
      id: criterionIds.methods,
      rubricId: rubricIds.labReport,
      name: 'Methods',
      description: 'Completeness and reproducibility of experimental methods.',
      weight: 0.25,
      standardId: standardIds['HS-LS1-3'],
      descriptors: JSON.stringify({
        Beginning: 'Methods are missing or too vague to follow.',
        Developing: 'Methods are present but incomplete. Another student could not replicate the experiment.',
        Proficient: 'Methods are detailed and sequential. The experiment could be replicated by another student.',
        Advanced: 'Methods are thorough, precise, and include controls and variables. Justification for methods is provided.',
      }),
    },
    {
      id: criterionIds.dataAnalysis,
      rubricId: rubricIds.labReport,
      name: 'Data Analysis',
      description: 'Accuracy of data presentation and depth of analysis.',
      weight: 0.25,
      standardId: standardIds['HS-LS1-2'],
      descriptors: JSON.stringify({
        Beginning: 'Data is missing, disorganized, or inaccurately presented. No analysis.',
        Developing: 'Data is presented but analysis is superficial or contains errors. Tables or graphs may be incomplete.',
        Proficient: 'Data is clearly organized in appropriate tables/graphs. Analysis identifies patterns and connects to hypothesis.',
        Advanced: 'Data presentation is professional and insightful. Statistical analysis is accurate. Anomalies are identified and explained.',
      }),
    },
    {
      id: criterionIds.conclusion,
      rubricId: rubricIds.labReport,
      name: 'Conclusion',
      description: 'Connection between results, hypothesis, and broader scientific understanding.',
      weight: 0.25,
      standardId: standardIds['HS-LS1-1'],
      descriptors: JSON.stringify({
        Beginning: 'No conclusion, or conclusion does not reference results.',
        Developing: 'Conclusion states whether hypothesis was supported but provides little explanation or connection to concepts.',
        Proficient: 'Conclusion clearly states whether hypothesis was supported with evidence from data. Connects findings to biological concepts.',
        Advanced: 'Conclusion provides a thorough analysis of results, addresses limitations, suggests future investigations, and connects to broader scientific understanding.',
      }),
    },
  ]

  await db.insert(schema.rubricCriteria).values([...essayCriteria, ...labCriteria])
  console.log(`  2 rubrics with ${essayCriteria.length + labCriteria.length} criteria created.`)

  // =========================================================
  // 9. Assignments
  // =========================================================
  console.log('Creating assignments...')
  const assignmentIds = {
    americanDream: createId(),
    cellStructure: createId(),
    fractionsWord: createId(),
    poetryAnalysis: createId(),
    narrativeWriting: createId(),
    geneticsLab: createId(),
    ecosystemPoster: createId(),
    multiplicationStories: createId(),
    readingResponse: createId(),
  }

  await db.insert(schema.assignments).values([
    {
      id: assignmentIds.americanDream,
      title: 'The American Dream Essay',
      description: 'Write a 4-5 paragraph argumentative essay exploring the concept of the American Dream. Use evidence from at least two texts we have read in class to support your argument about whether the American Dream is still achievable today.',
      instructions: 'Your essay should include: a clear thesis statement, at least 3 pieces of textual evidence with analysis, counterargument and rebuttal, and a strong conclusion. Minimum 500 words.',
      type: 'essay',
      gradeLevel: '8',
      subject: 'ELA',
      dueDate: daysAgo(3),
      status: 'grading',
      classId: classIds.riveraPeriod1,
      teacherId: userIds.rivera,
      rubricId: rubricIds.essay,
      successCriteria: JSON.stringify([
        'I can write a clear thesis that states my position on the American Dream.',
        'I can use evidence from at least two texts to support my argument.',
        'I can analyze evidence, not just summarize it.',
        'I can address a counterargument and explain why my position is stronger.',
        'I can organize my essay with an introduction, body paragraphs, and conclusion.',
      ]),
    },
    {
      id: assignmentIds.cellStructure,
      title: 'Cell Structure Lab Report',
      description: 'After completing the microscopy lab, write a formal lab report documenting your observations of plant and animal cells. Compare and contrast the structures you observed.',
      instructions: 'Your lab report must include: Title, Hypothesis, Materials & Methods, Data (including labeled diagrams), Analysis, and Conclusion. Follow the scientific lab report format discussed in class.',
      type: 'lab_report',
      gradeLevel: '10',
      subject: 'Science',
      dueDate: daysAgo(5),
      status: 'published',
      classId: classIds.okaforPeriod1,
      teacherId: userIds.okafor,
      rubricId: rubricIds.labReport,
      successCriteria: JSON.stringify([
        'I can write a testable hypothesis about cell structures.',
        'I can describe my methods clearly enough for someone else to repeat the experiment.',
        'I can create labeled diagrams of plant and animal cells.',
        'I can analyze my observations and connect them to what I know about cell biology.',
      ]),
    },
    {
      id: assignmentIds.fractionsWord,
      title: 'Fractions Word Problems',
      description: 'Solve the following word problems involving fractions. Show your work and explain your thinking for each problem.',
      instructions: 'Read each problem carefully. Draw a model or picture to help you solve it. Write a number sentence. Explain your answer in words.',
      type: 'short_answer',
      gradeLevel: '3',
      subject: 'Math',
      dueDate: daysFromNow(2),
      status: 'published',
      classId: classIds.chenAllSubjects,
      teacherId: userIds.chen,
      rubricId: null,
      successCriteria: JSON.stringify([
        'I can read a word problem and figure out what fraction it is asking about.',
        'I can draw a picture to show a fraction.',
        'I can explain what a fraction means using words.',
      ]),
    },
    // --- New Assignments ---
    {
      id: assignmentIds.poetryAnalysis,
      title: 'Poetry Analysis: The Road Not Taken',
      description: 'Write a 3-4 paragraph analytical essay examining Robert Frost\'s "The Road Not Taken." Analyze the poem\'s use of figurative language, tone, and theme to explain what Frost is saying about choices and regret.',
      instructions: 'Your essay should include: an introduction with a clear thesis about the poem\'s meaning, body paragraphs analyzing at least 2 literary devices (metaphor, imagery, symbolism, tone), and a conclusion connecting the poem\'s message to broader human experience. Use direct quotes from the poem as evidence.',
      type: 'essay',
      gradeLevel: '8',
      subject: 'ELA',
      dueDate: daysAgo(21),
      status: 'completed',
      classId: classIds.riveraPeriod2,
      teacherId: userIds.rivera,
      rubricId: rubricIds.essay,
      successCriteria: JSON.stringify([
        'I can identify and explain at least two literary devices used in the poem.',
        'I can write a thesis that makes a claim about the poem\'s deeper meaning.',
        'I can use direct quotes from the poem as evidence for my analysis.',
        'I can connect the poem\'s theme to a broader idea about life or human nature.',
      ]),
    },
    {
      id: assignmentIds.narrativeWriting,
      title: 'Narrative Writing: A Turning Point',
      description: 'Write a personal narrative about a moment that changed the way you saw yourself or the world. Use vivid sensory details, dialogue, and reflection to bring the story to life for your reader.',
      instructions: 'Your narrative should be 3-5 paragraphs. Include: a compelling opening that hooks the reader, sensory details that help the reader see, hear, and feel the experience, at least one line of realistic dialogue, and a reflective conclusion that explains why this moment mattered. Minimum 400 words.',
      type: 'essay',
      gradeLevel: '8',
      subject: 'ELA',
      dueDate: daysAgo(7),
      status: 'grading',
      classId: classIds.riveraPeriod1,
      teacherId: userIds.rivera,
      rubricId: rubricIds.essay,
      successCriteria: JSON.stringify([
        'I can begin my narrative with an engaging opening.',
        'I can use sensory details to make the reader feel present in the story.',
        'I can include realistic dialogue that reveals character.',
        'I can reflect on why this experience was a turning point.',
        'I can organize my narrative with a clear beginning, middle, and end.',
      ]),
    },
    {
      id: assignmentIds.geneticsLab,
      title: 'Genetics and Heredity Lab',
      description: 'Conduct the Mendelian genetics simulation using the provided corn ear samples. Document your observations of kernel phenotypes, calculate phenotypic ratios, and determine whether the observed ratios match expected Mendelian ratios using a chi-square analysis.',
      instructions: 'Your lab report must include: Title, Hypothesis (predict the expected phenotypic ratio), Materials & Methods, Data Table (phenotype counts for each ear), Chi-Square Calculation, Analysis (explain whether results support or refute your hypothesis), and Conclusion (connect findings to Mendel\'s laws). Follow the formal lab report format.',
      type: 'lab_report',
      gradeLevel: '10',
      subject: 'Science',
      dueDate: daysAgo(14),
      status: 'completed',
      classId: classIds.okaforPeriod1,
      teacherId: userIds.okafor,
      rubricId: rubricIds.labReport,
      successCriteria: JSON.stringify([
        'I can write a testable hypothesis about expected phenotypic ratios.',
        'I can accurately count and record phenotype data in a data table.',
        'I can perform a chi-square calculation and interpret the result.',
        'I can explain whether my data supports Mendelian inheritance patterns.',
      ]),
    },
    {
      id: assignmentIds.ecosystemPoster,
      title: 'Ecosystem Research Poster',
      description: 'Research one of the world\'s major biomes and create a scientific poster documenting the ecosystem\'s characteristics, food web, biodiversity, and current threats. Your poster should communicate complex scientific information in a visually clear and engaging format.',
      instructions: 'Choose one biome: tropical rainforest, coral reef, tundra, desert, temperate forest, or grassland. Your poster must include: biome overview (climate, location, key features), a food web with at least 8 organisms, biodiversity data, human impact and conservation status, and at least 3 cited sources.',
      type: 'essay',
      gradeLevel: '10',
      subject: 'Science',
      dueDate: daysFromNow(7),
      status: 'published',
      classId: classIds.okaforPeriod2,
      teacherId: userIds.okafor,
      rubricId: null,
      successCriteria: JSON.stringify([
        'I can describe the key characteristics of my chosen biome.',
        'I can create an accurate food web showing energy flow through the ecosystem.',
        'I can explain how human activity threatens the biome\'s biodiversity.',
        'I can cite at least 3 reliable scientific sources.',
      ]),
    },
    {
      id: assignmentIds.multiplicationStories,
      title: 'Multiplication Stories',
      description: 'Read each story problem and use multiplication to solve it. Draw an array or equal groups picture to show your thinking, then write a number sentence and explain your answer.',
      instructions: 'For each of the 6 story problems: 1) Draw a picture (array or groups), 2) Write the multiplication number sentence, 3) Write the answer in a complete sentence. Remember to label your pictures and show all your work!',
      type: 'short_answer',
      gradeLevel: '3',
      subject: 'Math',
      dueDate: daysAgo(10),
      status: 'completed',
      classId: classIds.chenAllSubjects,
      teacherId: userIds.chen,
      rubricId: null,
      successCriteria: JSON.stringify([
        'I can draw arrays or equal groups to show multiplication.',
        'I can write a multiplication number sentence to match a story.',
        'I can explain what my answer means using words.',
      ]),
    },
    {
      id: assignmentIds.readingResponse,
      title: 'Reading Response: Charlotte\'s Web',
      description: 'After reading chapters 10-12 of Charlotte\'s Web, write a reading response that describes how Charlotte helps Wilbur and explains what this tells us about friendship.',
      instructions: 'Write at least 5 sentences. Include: 1) What Charlotte does for Wilbur in these chapters, 2) How Wilbur feels about Charlotte\'s help, 3) What you think the author is trying to teach us about being a good friend. Use details from the book to support your ideas.',
      type: 'essay',
      gradeLevel: '3',
      subject: 'ELA',
      dueDate: daysAgo(5),
      status: 'grading',
      classId: classIds.chenAllSubjects,
      teacherId: userIds.chen,
      rubricId: null,
      successCriteria: JSON.stringify([
        'I can describe what happens in the chapters using details from the book.',
        'I can explain how a character feels and why.',
        'I can share what I think the author wants us to learn.',
      ]),
    },
  ])
  console.log('  9 assignments created.')

  // =========================================================
  // 10. Student Submissions (American Dream Essay)
  // =========================================================
  console.log('Creating student submissions...')

  const submissions = [
    // --- Excellent ---
    {
      studentId: userIds.aisha,
      quality: 'excellent',
      content: `The American Dream: A Promise Still Worth Pursuing

The American Dream has been a guiding light for generations of people who came to this country seeking a better life. But in today's world, with rising costs of living and growing inequality, many people question whether this dream is still within reach. I believe the American Dream is still achievable, but it looks different than it did fifty years ago, and it requires more than just hard work -- it requires access to education and opportunity.

In "A Raisin in the Sun," the Younger family demonstrates that the American Dream is about dignity and self-determination, not just wealth. When Walter Lee finally stands up to Mr. Lindner and refuses to sell their house, Mama says he has "come into his manhood." This shows that the American Dream is not about getting rich -- it is about having the freedom to make choices about your own life and being treated with respect. The Youngers did not become millionaires, but they achieved something more important: they kept their pride and moved into the home they earned. This is evidence that the Dream is achievable because it is about values, not just money.

Similarly, in "The Great Gatsby," Fitzgerald warns us about what happens when the American Dream becomes only about material success. Gatsby accumulates enormous wealth but never achieves real happiness or acceptance. His dream of winning Daisy was always an illusion. Some might argue this proves the Dream is dead, but I think it proves the opposite: when we define the Dream correctly -- as opportunity, education, and the freedom to build a meaningful life -- it is still alive. The problem is not the Dream itself but how we define it.

Of course, there are real barriers today. College costs have skyrocketed, and many families struggle just to pay rent. A counterargument is that the system is rigged against ordinary people. There is truth to this concern, but programs like community colleges, scholarships, and public libraries still provide pathways. My own family came to this country with very little, and my mother worked her way through community college to build a career. The path is harder than it should be, but it exists.

In conclusion, the American Dream is not a guarantee -- it never was. But it remains a powerful and achievable ideal when we define it as the opportunity to build a life of purpose and dignity through education and hard work. Both "A Raisin in the Sun" and "The Great Gatsby" teach us that the Dream fails when it becomes about status and money, and succeeds when it is about human dignity.`,
    },
    // --- Excellent ---
    {
      studentId: userIds.students[0],
      quality: 'excellent',
      content: `Is the American Dream Still Alive?

People talk about the American Dream like it is one thing, but I think it means different things to different people. For some, it means owning a house. For others, it means being free. After reading the texts in class, I believe the American Dream is still possible, but only if we are honest about the obstacles that make it harder for some people than others.

In "A Raisin in the Sun," Lorraine Hansberry shows a Black family in 1950s Chicago trying to build a better life. The Younger family faces racism, poverty, and limited choices. When they receive the insurance money, each family member has a different dream -- Walter wants a business, Beneatha wants to be a doctor, and Mama wants a house. What is powerful is that Mama's dream of a simple home with a garden is treated as just as valid as Walter's business ambition. Hansberry is telling us that the American Dream is about having choices, not about achieving some specific level of wealth. When the family moves to Clybourne Park despite the threats from the neighborhood association, they are claiming their right to dream. This is still relevant today because many families still face discrimination in housing.

"The Great Gatsby" gives us the other side. Jay Gatsby has all the money anyone could want, but he is miserable. He throws parties for hundreds of people but has no real friends. Fitzgerald uses the green light at the end of Daisy's dock as a symbol of a dream that can never be reached. Nick Carraway, the narrator, concludes that we are all "boats against the current, borne back ceaselessly into the past." This might seem like the Dream is impossible, but I think Fitzgerald is criticizing a specific version of the Dream -- the version that says you are only successful if you are wealthy and admired. The real Dream, the one the Youngers fight for, is still alive.

A counterargument is that inequality is worse than ever. The richest people keep getting richer while wages stay flat. This is a valid concern, and I do not want to minimize it. However, I have seen in my own community how access to education changes families. My neighbor's parents did not go to college, but she got a scholarship and is now studying engineering. Opportunity is not equal, but it is not zero either.

The American Dream lives on, but it demands that we work together to remove barriers and expand access. It is not just an individual achievement -- it is a collective responsibility.`,
    },
    // --- Good / Proficient ---
    {
      studentId: userIds.students[1],
      quality: 'proficient',
      content: `The American Dream Essay

The American Dream is the idea that anyone can succeed in America if they work hard. I think the American Dream is still possible but it is harder than before. I will use evidence from "A Raisin in the Sun" and "The Great Gatsby" to explain my thinking.

In "A Raisin in the Sun" the Younger family wants to move out of their small apartment. They get money from the father's life insurance and Mama uses it to buy a house. Walter almost loses the money but in the end the family moves to their new house. This shows that the American Dream is about having a home and being together as a family. Even though people tried to stop them they kept going.

In "The Great Gatsby" Jay Gatsby tries to get rich and impress Daisy but he fails. He dies and almost nobody comes to his funeral. This shows that just having money does not make you happy. The American Dream should be about more than money.

Some people say the American Dream is dead because everything costs too much now. College is expensive and so are houses. But I think there are still ways to succeed. My parents always say education is the key and I believe that. There are scholarships and financial aid that can help.

In conclusion the American Dream is still real but it is not easy. We need to make sure everyone has a fair chance to achieve it.`,
    },
    // --- Developing ---
    {
      studentId: userIds.students[2],
      quality: 'developing',
      content: `The American Dream

The american dream is about being successful in america. Some people think its still possible and some people dont. I think it is still possible.

In "a raisin in the sun" the family wants to buy a house and they do. This shows that the american dream works because they worked hard and got what they wanted. Walter made some mistakes but it turned out ok in the end.

In "the great gatsby" gatsby has a lot of money and a big house. He throws big parties. But he is not happy because the girl he likes doesnt like him back. So money doesnt make you happy.

The american dream is still alive because people can still work hard and get a good job. My uncle came to america and now he has his own restaurant. So it is possible.

In conclusion the american dream is real and people should keep trying to achieve it.`,
    },
    // --- Developing ---
    {
      studentId: userIds.students[3],
      quality: 'developing',
      content: `American Dream Essay

The American Dream means that people in America can have a good life. I read two books about it and they show different things about the Dream.

In "A Raisin in the Sun" the family has problems. They dont have much money. The mom wants a house. Walter wants to start a business. They fight about it but then they get a house in the end. I think this shows the Dream is real because they got what they wanted.

In the other book "The Great Gatsby" the guy is really rich. He has a mansion and fancy cars and stuff. But he's sad because he can't have the girl. This is showing that money isn't everything I guess.

I think the American Dream is still achieveable because there are lots of successful people in America. You just have to work hard.`,
    },
    // --- Beginning / Struggling ---
    {
      studentId: userIds.deshawn,
      quality: 'beginning',
      content: `American Dream

The american dream is when people want to be succesful. I think its still real.

In raisin in the sun they wanted stuff and they got it. The mom got a house. That was good.

In gatsby he was rich but sad. Money dont make you happy.

Thats why I think the american dream is still real because you can still get stuff if you try.`,
    },
    // --- Good / Proficient ---
    {
      studentId: userIds.students[4],
      quality: 'proficient',
      content: `Still Dreaming: The American Dream in 2025

When my grandmother came to the United States from Mexico, she had $200 and no English. Today she owns a small house and all three of her children graduated from high school. That is her American Dream. It is not a mansion or a fancy car. It is stability and opportunity for the next generation. Based on the texts we read, I argue that the American Dream is still alive, but we need to update what we mean by it.

In "A Raisin in the Sun," the Younger family's dream is simple: a house with enough room, in a decent neighborhood, with a yard where Travis can play. Mama says her plant represents her dream -- something she nurtures every day even though it does not get enough light. This is a metaphor for the Dream itself -- you have to keep working at it even when conditions are not ideal. The family achieves their dream not through wealth but through resilience and family unity.

"The Great Gatsby" is the opposite story. Gatsby reinvents himself, acquires enormous wealth, and still cannot get what he really wants. Fitzgerald seems to be saying that the Dream, when it becomes about impressing others or recapturing the past, is doomed to fail. But the Dream that Mama Younger pursues -- dignity, safety, opportunity -- that Dream is not doomed. It is achievable.

Critics will point out that housing prices, student debt, and stagnant wages make the Dream harder than ever. These are real problems. But harder does not mean impossible. Community colleges, trade schools, and programs like FAFSA still exist as ladders for people willing to climb.

The American Dream is not dead. It just needs to be redefined -- not as endless wealth, but as the chance to build something meaningful, the way my grandmother did.`,
    },
  ]

  const submissionRecords = submissions.map((s) => ({
    id: createId(),
    assignmentId: assignmentIds.americanDream,
    studentId: s.studentId,
    content: s.content,
    status: 'submitted' as const,
    submittedAt: daysAgo(3),
    totalScore: null,
    maxScore: null,
    letterGrade: null,
  }))

  await db.insert(schema.submissions).values(submissionRecords)
  console.log(`  ${submissionRecords.length} essay submissions created.`)

  // =========================================================
  // 11. Feedback Drafts (for a few submissions)
  // =========================================================
  console.log('Creating feedback drafts...')

  const feedbackData = [
    {
      submissionId: submissionRecords[0].id, // Aisha - excellent
      aiFeedback: 'Aisha, this is an outstanding essay. Your thesis is nuanced and specific -- arguing that the Dream is achievable when properly defined is a sophisticated position. Your evidence from both texts is well-chosen and, more importantly, well-analyzed. You do not just quote the texts; you explain what the evidence means and why it matters. Your counterargument paragraph is particularly strong because you acknowledge the validity of the opposing view before explaining your position. One area to strengthen: your conclusion could push further into what "redefining the Dream" looks like in concrete terms.',
      strengths: JSON.stringify(['Nuanced, specific thesis', 'Deep analysis of textual evidence rather than summary', 'Strong counterargument with genuine engagement', 'Personal connection adds authenticity']),
      improvements: JSON.stringify(['Conclusion could be more specific about what a "redefined" Dream looks like', 'Could vary sentence structure more in the second paragraph']),
      nextSteps: JSON.stringify(['Try incorporating a third text or outside source in your next essay', 'Practice writing conclusions that propose specific actions or visions']),
    },
    {
      submissionId: submissionRecords[2].id, // Sofia Martinez - proficient
      aiFeedback: 'This essay has a clear structure and uses evidence from both texts, which shows you understand the assignment requirements. Your thesis is straightforward and takes a position. Two areas to work on: First, you summarize the texts rather than analyzing them. When you write "This shows that the American Dream is about having a home," push yourself to explain why that matters and how it connects to your argument. Second, your counterargument paragraph is brief -- spend more time engaging with the opposing view. You have good ideas; the next step is going deeper with them.',
      strengths: JSON.stringify(['Clear thesis statement', 'Uses evidence from both required texts', 'Logical structure with introduction and conclusion', 'Personal connection in counterargument']),
      improvements: JSON.stringify(['Move from summary to analysis -- explain why evidence matters', 'Develop counterargument more fully', 'Add transitions between paragraphs', 'Include specific quotes rather than paraphrasing']),
      nextSteps: JSON.stringify(['Practice the "So what?" technique: after each piece of evidence, ask yourself why it matters', 'Try writing your counterargument paragraph first, then build your response around it']),
    },
    {
      submissionId: submissionRecords[5].id, // DeShawn - beginning
      aiFeedback: 'DeShawn, I can see you understand the basic concept of the American Dream and have an opinion about it. That is a good foundation. To improve this essay, you need to develop your ideas more fully. Right now, your paragraphs are only 1-2 sentences each. Try expanding each paragraph to at least 4-5 sentences. When you mention "A Raisin in the Sun," include a specific example or quote from the text. Instead of "they wanted stuff and they got it," describe what the family wanted and why it was important to them. Also, check your capitalization -- titles of books should be capitalized, and sentences should start with capital letters.',
      strengths: JSON.stringify(['Has a clear opinion about the American Dream', 'References both assigned texts', 'Short and direct -- shows ability to get to the point']),
      improvements: JSON.stringify(['Develop paragraphs with more detail and explanation', 'Use specific evidence and quotes from the texts', 'Capitalize titles and beginning of sentences', 'Add a counterargument', 'Expand to meet the minimum word count']),
      nextSteps: JSON.stringify(['Start by picking one quote from each text and writing 3 sentences about what it means', 'Use the sentence starter "This is important because..." after each piece of evidence', 'Review the capitalization rules handout from Unit 1']),
    },
  ]

  await db.insert(schema.feedbackDrafts).values(
    feedbackData.map((f) => ({
      id: createId(),
      submissionId: f.submissionId,
      teacherId: userIds.rivera,
      aiFeedback: f.aiFeedback,
      status: 'draft',
      strengths: f.strengths,
      improvements: f.improvements,
      nextSteps: f.nextSteps,
    }))
  )
  console.log(`  ${feedbackData.length} feedback drafts created.`)

  // =========================================================
  // 12. IEP Data (DeShawn Williams)
  // =========================================================
  console.log('Creating IEP data for DeShawn Williams...')
  const iepId = createId()

  await db.insert(schema.ieps).values({
    id: iepId,
    studentId: userIds.deshawn,
    authorId: userIds.rodriguez,
    status: 'active',
    startDate: daysAgo(180),
    endDate: daysFromNow(185),
    presentLevels: `DeShawn is a 14-year-old 8th grader at Washington Middle School. He is a kind and social young man who enjoys sports, music, and hands-on learning activities. DeShawn was identified with a Specific Learning Disability (SLD) in the area of reading in 4th grade.

Academic Performance - Reading:
DeShawn currently reads at approximately a 5th grade level as measured by the Fountas & Pinnell Benchmark Assessment (Level T, administered October 2025). His oral reading fluency is 97 words per minute on grade-level passages, compared to the 8th grade benchmark of 145 wpm. He demonstrates strength in using context clues to determine word meaning but struggles with multi-syllabic word decoding and reading comprehension of complex texts. On the STAR Reading assessment (September 2025), DeShawn scored at the 18th percentile for 8th grade, with a grade equivalent of 5.2.

Academic Performance - Written Expression:
DeShawn can write paragraphs with topic sentences and supporting details when given graphic organizers and sentence starters. His spelling accuracy is approximately 72% on grade-level words. He struggles with organizing multi-paragraph essays independently and tends to write in fragments or run-on sentences. His writing samples show creative ideas but difficulty translating those ideas into structured written form.

Academic Performance - Math:
DeShawn performs near grade level in mathematics (42nd percentile on STAR Math). He demonstrates strength in geometry and spatial reasoning. Computation with fractions and multi-step word problems remain areas of difficulty.

Functional Performance:
DeShawn is well-liked by peers and participates actively in class discussions when text is read aloud. He avoids independent reading tasks and sometimes becomes frustrated when asked to read in front of peers. He benefits from extended time, audiobooks, and text-to-speech technology. His attendance is excellent (97% this year).

Impact of Disability:
DeShawn's specific learning disability in reading significantly impacts his ability to access grade-level curriculum across all content areas. His reading level, approximately 3 years below grade level, affects his performance in ELA, social studies, and science, where grade-level texts are the primary instructional materials.`,
    disabilityCategory: 'Specific Learning Disability (SLD)',
    accommodations: JSON.stringify([
      { type: 'instructional', description: 'Extended time (1.5x) on all reading-based assignments and assessments' },
      { type: 'instructional', description: 'Access to audiobooks and text-to-speech technology for grade-level texts' },
      { type: 'instructional', description: 'Graphic organizers and sentence starters for written assignments' },
      { type: 'instructional', description: 'Preferential seating near instruction' },
      { type: 'assessment', description: 'Extended time (1.5x) on all standardized assessments' },
      { type: 'assessment', description: 'Separate testing environment for state assessments' },
      { type: 'assessment', description: 'Text-to-speech for math word problems' },
      { type: 'environmental', description: 'Reduced-distraction seating for independent work' },
    ]),
    modifications: JSON.stringify([
      { type: 'reading', description: 'Modified reading level texts (5th-6th grade Lexile) for independent reading assignments' },
    ]),
    relatedServices: JSON.stringify([
      { service: 'Specialized Academic Instruction', frequency: '250 minutes per week', location: 'Resource Room', provider: 'Ms. Rodriguez' },
      { service: 'Speech-Language Services', frequency: '30 minutes, 1x weekly', location: 'Speech Room', provider: 'SLP' },
    ]),
    meetingDate: daysAgo(180),
    meetingNotes: 'Annual IEP meeting held with parent (Marcus Williams), gen ed teacher (Ms. Rivera), SPED teacher (Ms. Rodriguez), school psychologist, and administrator. Parent expressed satisfaction with DeShawn\'s progress in writing and requested more information about reading interventions. Team agreed on updated goals for reading fluency and written expression.',
    parentInput: 'Marcus shared that DeShawn enjoys listening to audiobooks at home and has been reading graphic novels independently. He would like DeShawn to receive more support with reading fluency so he can keep up with his peers in class. Marcus also mentioned that DeShawn is motivated by sports and responds well to positive reinforcement.',
  })

  // IEP Goals
  const goalIds = {
    readingFluency: createId(),
    writtenExpression: createId(),
  }

  await db.insert(schema.iepGoals).values([
    {
      id: goalIds.readingFluency,
      iepId,
      area: 'Reading Fluency',
      goalText: 'By the end of the IEP period, DeShawn will read 8th grade-level passages at a rate of 110 words per minute with 95% accuracy, as measured by curriculum-based measurement probes administered bi-weekly by the special education teacher, improving from a baseline of 85 wpm.',
      baseline: '85 words per minute on 8th grade passages (October 2025)',
      target: '110 words per minute on 8th grade passages with 95% accuracy',
      measureMethod: 'Curriculum-based measurement (CBM) oral reading fluency probes',
      frequency: 'Bi-weekly',
      timeline: '12 months',
      status: 'active',
      aiGenerated: false,
    },
    {
      id: goalIds.writtenExpression,
      iepId,
      area: 'Written Expression',
      goalText: 'By the end of the IEP period, DeShawn will independently write a 5-paragraph essay that includes a thesis statement, 3 body paragraphs with topic sentences and supporting details, and a conclusion, scoring at least 3 out of 4 on the classroom writing rubric, in 4 out of 5 consecutive writing samples.',
      baseline: 'Currently writes 2-3 paragraph responses with graphic organizer support. Scores 2 out of 4 on classroom rubric.',
      target: '5-paragraph essay scoring 3/4 on rubric in 4 out of 5 samples',
      measureMethod: 'Classroom writing rubric, writing samples collected monthly',
      frequency: 'Monthly',
      timeline: '12 months',
      status: 'active',
      aiGenerated: false,
    },
  ])

  // Progress data points over 3 months (reading fluency)
  const fluencyDataPoints = [
    { value: 85, date: daysAgo(180), notes: 'Baseline assessment' },
    { value: 87, date: daysAgo(166), notes: 'Slight improvement, practicing with repeated readings' },
    { value: 86, date: daysAgo(152), notes: 'Plateau, adjusting intervention' },
    { value: 89, date: daysAgo(138), notes: 'Responding well to paired reading strategy' },
    { value: 91, date: daysAgo(124), notes: 'Steady growth' },
    { value: 90, date: daysAgo(110), notes: 'Minor dip, was tired during assessment' },
    { value: 93, date: daysAgo(96), notes: 'Good progress, more confident with longer passages' },
    { value: 95, date: daysAgo(82), notes: 'Showing improved phrasing and expression' },
    { value: 94, date: daysAgo(68), notes: 'Consistent performance' },
    { value: 97, date: daysAgo(54), notes: 'Reached 97 wpm -- on track for goal' },
    { value: 96, date: daysAgo(40), notes: 'Maintained progress' },
    { value: 99, date: daysAgo(26), notes: 'Approaching 100 wpm milestone' },
  ]

  // Progress data points (written expression - scores out of 4)
  const writingDataPoints = [
    { value: 2.0, date: daysAgo(170), notes: 'Baseline: 2 paragraphs with support, limited organization' },
    { value: 2.0, date: daysAgo(140), notes: 'Still needs graphic organizer, topic sentences improving' },
    { value: 2.5, date: daysAgo(110), notes: 'Writing 3 paragraphs independently, thesis present but weak' },
    { value: 2.5, date: daysAgo(80), notes: 'Evidence use improving, still relies on sentence starters' },
    { value: 3.0, date: daysAgo(50), notes: 'First essay scoring 3/4! Strong topic sentences, developing analysis' },
    { value: 2.5, date: daysAgo(20), notes: 'Regression on timed writing, performs better with extended time' },
  ]

  await db.insert(schema.progressDataPoints).values([
    ...fluencyDataPoints.map((dp) => ({
      id: createId(),
      goalId: goalIds.readingFluency,
      studentId: userIds.deshawn,
      value: dp.value,
      unit: 'wpm',
      date: dp.date,
      notes: dp.notes,
      recordedBy: userIds.rodriguez,
    })),
    ...writingDataPoints.map((dp) => ({
      id: createId(),
      goalId: goalIds.writtenExpression,
      studentId: userIds.deshawn,
      value: dp.value,
      unit: 'rubric score (0-4)',
      date: dp.date,
      notes: dp.notes,
      recordedBy: userIds.rodriguez,
    })),
  ])
  console.log(`  1 IEP with 2 goals and ${fluencyDataPoints.length + writingDataPoints.length} progress data points created.`)

  // Compliance deadlines
  await db.insert(schema.complianceDeadlines).values([
    {
      id: createId(),
      type: 'annual_review',
      studentId: userIds.deshawn,
      dueDate: daysFromNow(185),
      status: 'upcoming',
      notes: 'Annual IEP review due. Parent (Marcus Williams) to be invited 10 days prior.',
    },
    {
      id: createId(),
      type: 'triennial',
      studentId: userIds.deshawn,
      dueDate: daysFromNow(550),
      status: 'upcoming',
      notes: 'Triennial re-evaluation. Will need updated psychoeducational assessment.',
    },
  ])
  console.log('  2 compliance deadlines created.')

  // =========================================================
  // 13. Mastery Records (sample data for a few students)
  // =========================================================
  console.log('Creating mastery records...')
  const masteryData = [
    // Aisha - strong in ELA
    { studentId: userIds.aisha, standardCode: 'W.8.1', level: 'advanced', score: 92 },
    { studentId: userIds.aisha, standardCode: 'RL.8.1', level: 'proficient', score: 85 },
    { studentId: userIds.aisha, standardCode: 'RL.8.2', level: 'proficient', score: 82 },
    { studentId: userIds.aisha, standardCode: 'L.8.1', level: 'proficient', score: 80 },
    // DeShawn - struggling in ELA
    { studentId: userIds.deshawn, standardCode: 'W.8.1', level: 'beginning', score: 35 },
    { studentId: userIds.deshawn, standardCode: 'RL.8.1', level: 'beginning', score: 40 },
    { studentId: userIds.deshawn, standardCode: 'RL.8.2', level: 'developing', score: 50 },
    { studentId: userIds.deshawn, standardCode: 'L.8.1', level: 'beginning', score: 38 },
    // Jayden Park - proficient overall
    { studentId: userIds.students[0], standardCode: 'W.8.1', level: 'advanced', score: 90 },
    { studentId: userIds.students[0], standardCode: 'RL.8.1', level: 'advanced', score: 88 },
    // Sofia Martinez - developing
    { studentId: userIds.students[1], standardCode: 'W.8.1', level: 'proficient', score: 75 },
    { studentId: userIds.students[1], standardCode: 'RL.8.1', level: 'proficient', score: 72 },
    // Ethan Nakamura - developing
    { studentId: userIds.students[2], standardCode: 'W.8.1', level: 'developing', score: 55 },
    { studentId: userIds.students[2], standardCode: 'RL.8.1', level: 'developing', score: 58 },
  ]

  await db.insert(schema.masteryRecords).values(
    masteryData.map((m) => ({
      id: createId(),
      studentId: m.studentId,
      standardId: standardIds[m.standardCode],
      level: m.level,
      score: m.score,
      source: assignmentIds.americanDream,
      assessedAt: daysAgo(3),
    }))
  )
  console.log(`  ${masteryData.length} mastery records created.`)

  // =========================================================
  // 14. Graded Submissions for New Assignments
  // =========================================================
  console.log('Creating submissions for new assignments...')

  // Poetry Analysis (completed, Period 2 = students[5..9])
  const poetrySubmissions = [
    { studentId: userIds.students[5], content: 'Robert Frost\'s "The Road Not Taken" uses the extended metaphor of two diverging paths in a wood to explore the human tendency to wonder about the choices we did not make. The speaker says the roads were "really about the same," suggesting that in the moment, most choices feel equivalent. It is only later, "ages and ages hence," that we construct a narrative about our decisions being decisive. Frost\'s ironic tone reveals that the poem is less about bold individualism and more about the stories we tell ourselves to make sense of our lives. The imagery of the "yellow wood" evokes autumn, a time of transition and endings, reinforcing the theme of irreversible choice.', totalScore: 88, letterGrade: 'B+', level1: 'Advanced', score1: 23, level2: 'Proficient', score2: 22, level3: 'Advanced', score3: 23, level4: 'Proficient', score4: 20 },
    { studentId: userIds.students[6], content: 'In "The Road Not Taken," Robert Frost writes about a person walking in the woods who has to choose between two paths. The poem uses a metaphor because the roads represent choices in life. The speaker picks the road "less traveled by" and says it "made all the difference." I think Frost is saying that the choices we make define who we become. The tone is thoughtful and a little sad because the speaker knows he can never go back. The yellow wood creates a picture of fall, which could symbolize getting older and running out of time to make choices.', totalScore: 74, letterGrade: 'C', level1: 'Proficient', score1: 20, level2: 'Developing', score2: 18, level3: 'Proficient', score3: 20, level4: 'Developing', score4: 16 },
    { studentId: userIds.students[7], content: '"The Road Not Taken" by Robert Frost is about making choices. The speaker is in a yellow wood and sees two roads. He picks one and says it made all the difference. The metaphor is that the roads are like life choices. I think the theme is that you should be brave and pick the path nobody else picks. The poem uses imagery like "grassy" and "wanted wear" to describe the road he chose.', totalScore: 58, letterGrade: 'D+', level1: 'Developing', score1: 15, level2: 'Developing', score2: 15, level3: 'Developing', score3: 15, level4: 'Beginning', score4: 13 },
    { studentId: userIds.students[8], content: 'Robert Frost uses "The Road Not Taken" as a meditation on the nature of decision-making and the stories we construct about our pasts. The two roads "had worn them really about the same," yet the speaker claims he took the one "less traveled." This contradiction is the heart of the poem: we often rewrite our histories to give our choices more meaning than they had in the moment. Frost employs imagery of a "yellow wood" to ground the abstract theme of choice in a sensory, autumnal landscape. The sigh the speaker anticipates in the final stanza carries both satisfaction and regret, creating an ambiguous emotional tone that mirrors the complexity of looking back on one\'s life.', totalScore: 94, letterGrade: 'A', level1: 'Advanced', score1: 24, level2: 'Advanced', score2: 24, level3: 'Advanced', score3: 23, level4: 'Advanced', score4: 23 },
    { studentId: userIds.students[9], content: 'In this poem Robert Frost talks about two roads in a yellow wood. He picks one road and says it made all the difference. I think the poem means you should follow your own path in life. The roads are a metaphor. One road is less traveled which means not many people go that way. Frost is saying be different.', totalScore: 48, letterGrade: 'D', level1: 'Beginning', score1: 12, level2: 'Beginning', score2: 12, level3: 'Developing', score3: 14, level4: 'Beginning', score4: 10 },
  ]

  const poetrySubRecords = poetrySubmissions.map((s) => ({
    id: createId(),
    assignmentId: assignmentIds.poetryAnalysis,
    studentId: s.studentId,
    content: s.content,
    status: 'graded' as const,
    submittedAt: daysAgo(22),
    gradedAt: daysAgo(18),
    totalScore: s.totalScore,
    maxScore: 100,
    letterGrade: s.letterGrade,
  }))

  await db.insert(schema.submissions).values(poetrySubRecords)

  // Feedback drafts for poetry submissions (all approved)
  const poetryFeedback = poetrySubRecords.map((sub, i) => ({
    id: createId(),
    submissionId: sub.id,
    teacherId: userIds.rivera,
    aiFeedback: [
      'Strong analytical essay with sophisticated reading of Frost\'s irony. Your insight about the roads being "really about the same" is exactly right and shows close reading. Consider exploring the significance of the final stanza\'s shift in tense to deepen your analysis further.',
      'Good identification of the central metaphor and supporting imagery. To strengthen your analysis, push beyond identifying devices to explaining how they create meaning. Why does the autumn setting matter? What does the sad tone tell us about the speaker\'s perspective on choices?',
      'You identify the basic metaphor and theme, which is a solid start. To improve, use direct quotes from the poem and explain what they mean rather than just summarizing the plot. Your claim about bravery is interesting but the poem is more nuanced than that interpretation suggests.',
      'Exceptional analysis that captures the poem\'s central irony with precision. Your reading of the contradiction between the roads being equally worn and the speaker\'s later claim is insightful and well-supported. The connection between the autumnal imagery and the theme of retrospection is particularly effective.',
      'You have identified the basic metaphor, which shows comprehension. To develop this into analysis, you need to use specific quotes from the poem and explain what the language means. Move beyond summarizing what happens to explaining why it matters and what Frost is communicating about choices.',
    ][i],
    status: 'approved',
    strengths: JSON.stringify([
      ['Close reading of irony', 'Strong use of quotes', 'Sophisticated thesis'][i % 3],
      ['Clear structure', 'Identifies key literary devices'][i % 2],
    ]),
    improvements: JSON.stringify([
      ['Explore tense shifts', 'Add more textual evidence'][i % 2],
      ['Deepen analysis beyond identification'][0],
    ]),
    nextSteps: JSON.stringify(['Practice connecting literary devices to theme in your next analysis']),
  }))

  await db.insert(schema.feedbackDrafts).values(poetryFeedback)

  // Criterion scores for poetry submissions
  const poetryCriterionScores = poetrySubmissions.flatMap((s, i) => [
    { submissionId: poetrySubRecords[i].id, criterionId: criterionIds.thesis, level: s.level1, score: s.score1, maxScore: 25 },
    { submissionId: poetrySubRecords[i].id, criterionId: criterionIds.evidence, level: s.level2, score: s.score2, maxScore: 25 },
    { submissionId: poetrySubRecords[i].id, criterionId: criterionIds.organization, level: s.level3, score: s.score3, maxScore: 25 },
    { submissionId: poetrySubRecords[i].id, criterionId: criterionIds.language, level: s.level4, score: s.score4, maxScore: 25 },
  ])

  await db.insert(schema.criterionScores).values(
    poetryCriterionScores.map((cs) => ({
      id: createId(),
      submissionId: cs.submissionId,
      criterionId: cs.criterionId,
      level: cs.level,
      score: cs.score,
      maxScore: cs.maxScore,
      justification: `Scored ${cs.score}/${cs.maxScore} at ${cs.level} level.`,
    }))
  )

  // Narrative Writing submissions (grading, Period 1 = Aisha, DeShawn, students[0..4])
  const narrativeSubmissions = [
    { studentId: userIds.aisha, content: 'The summer I turned thirteen, my family drove from our apartment in the city to the coast for the first time. I had never seen the ocean. When we parked and I heard the waves before I saw them, something shifted inside me. The salt air stung my nostrils, and the sand was so hot I had to hop from foot to foot until we reached the wet part near the water. My little brother grabbed my hand and said, "Mija, is it always this big?" I did not know how to answer because I was wondering the same thing. Standing at the edge of that enormous, restless water, I realized how small my world had been. The ocean did not care about our tiny apartment or the bills on the kitchen table. It just kept rolling. That was the day I started believing there was more out there for me, and I have not stopped believing it since.' },
    { studentId: userIds.deshawn, content: 'The day everything changed was when coach put me in the game in the fourth quarter. We were down by 6 and I was nervous. My hands were sweating. He said "DeShawn you got this." I caught the ball and ran. Everybody was yelling. I scored and we won. After that I felt like I could do things I didnt think I could.' },
    { studentId: userIds.students[0], content: 'I always thought I was good at everything until the day of the math competition in sixth grade. I walked into the auditorium confident, my sharpened pencils lined up on the desk like soldiers. The first three problems were fine. Then I hit problem four, and my mind went blank. The numbers swam on the page. I could hear other pencils scratching around me. My face burned. When the timer buzzed, I had left four problems blank. Walking to the car afterward, my mom asked how it went. "Fine," I said, staring out the window. But it was not fine. That night, lying in bed, I made a decision: I would stop coasting. I would actually study, actually practice, actually ask for help when I did not understand. The embarrassment of that competition taught me that talent without effort is just potential, and potential does not win anything.' },
    { studentId: userIds.students[1], content: 'My turning point was when my grandmother got sick and my family had to move in with her to help. I was upset because I had to leave my friends and change schools. The new school was smaller and I felt like an outsider. But my grandmother would sit with me after school and tell me stories about her childhood in Mexico. She taught me that change is not always bad. Sometimes it brings you closer to people you might have missed. When she got better, we stayed because it felt like home. I learned that home is about people, not places.' },
    { studentId: userIds.students[2], content: 'A turning point for me was when I got my first C on a report card. I was always a good student but this time I didnt try very hard. My parents were disappointed and I felt bad. After that I started doing my homework right when I got home instead of waiting. My grades got better. I learned that you have to put in the work.' },
    { studentId: userIds.students[3], content: 'The moment that changed me was when my family moved to a new state. I didnt know anyone and everything was different. The food was different the weather was different and the kids talked different. I was scared on my first day. But then this kid named Carlos sat with me at lunch and we became best friends. I learned that being scared of new things is normal but good things can come from it too.' },
  ]

  const narrativeSubRecords = narrativeSubmissions.map((s) => ({
    id: createId(),
    assignmentId: assignmentIds.narrativeWriting,
    studentId: s.studentId,
    content: s.content,
    status: 'submitted' as const,
    submittedAt: daysAgo(7),
    totalScore: null,
    maxScore: null,
    letterGrade: null,
  }))

  await db.insert(schema.submissions).values(narrativeSubRecords)

  // Draft feedback for first 3 narrative submissions
  await db.insert(schema.feedbackDrafts).values([
    {
      id: createId(),
      submissionId: narrativeSubRecords[0].id,
      teacherId: userIds.rivera,
      aiFeedback: 'Aisha, this is a beautifully written narrative. Your sensory details are vivid and natural -- the hot sand, the salt air, your brother\'s hand. The dialogue with your brother is perfectly placed and reveals the wonder you both felt. Your reflective conclusion ties the experience to personal growth without being heavy-handed. Consider expanding the middle section to slow down the moment at the water\'s edge even further.',
      status: 'draft',
      strengths: JSON.stringify(['Exceptional sensory details', 'Natural dialogue that reveals character', 'Strong reflective conclusion']),
      improvements: JSON.stringify(['Could expand the climactic moment at the water\'s edge', 'Consider adding internal thoughts during the drive']),
      nextSteps: JSON.stringify(['Experiment with pacing -- try stretching a single moment across an entire paragraph']),
    },
    {
      id: createId(),
      submissionId: narrativeSubRecords[1].id,
      teacherId: userIds.rivera,
      aiFeedback: 'DeShawn, you chose a powerful moment and I can feel the excitement of the game. The dialogue from your coach is a nice touch. To strengthen this narrative, expand each moment with more sensory details. What did the field look like? What sounds did you hear? What did it feel like to catch the ball? Right now the story moves very quickly -- slow down and let the reader experience each moment with you.',
      status: 'draft',
      strengths: JSON.stringify(['Strong, exciting moment chosen', 'Includes dialogue', 'Clear turning point identified']),
      improvements: JSON.stringify(['Add sensory details to each scene', 'Slow down the pacing', 'Expand the reflection at the end', 'Check punctuation and capitalization']),
      nextSteps: JSON.stringify(['Try the "five senses" technique: for one key moment, describe what you saw, heard, felt, smelled, and tasted']),
    },
    {
      id: createId(),
      submissionId: narrativeSubRecords[2].id,
      teacherId: userIds.rivera,
      aiFeedback: 'Jayden, this is a compelling narrative with excellent pacing. The detail of the pencils "lined up like soldiers" is a perfect image that conveys your confidence before the fall. The contrast between your public "Fine" and private devastation is sophisticated storytelling. Your reflective conclusion articulates the lesson clearly. One suggestion: show us the moment of studying differently -- what did that look like in practice?',
      status: 'draft',
      strengths: JSON.stringify(['Vivid imagery and metaphor', 'Strong contrast between confidence and failure', 'Mature reflection on growth']),
      improvements: JSON.stringify(['Show the change in action, not just statement', 'Could add more internal dialogue during the competition']),
      nextSteps: JSON.stringify(['Try writing a follow-up scene that shows you actually studying differently']),
    },
  ])

  // Genetics Lab submissions (completed, Okafor Period 1 = students[0..7])
  const geneticsSubmissions = [
    { studentId: userIds.students[0], content: 'Hypothesis: If the corn ear is the result of a monohybrid cross between two heterozygous parents (Pp x Pp), then the expected phenotypic ratio of purple to yellow kernels will be 3:1. Methods: We received one ear of corn and counted the purple and yellow kernels in 4 rows, then calculated the total for the entire ear. Data: Purple kernels: 312, Yellow kernels: 98, Total: 410. Expected ratio 3:1 would predict 307.5 purple and 102.5 yellow. Chi-square calculation: X2 = (312-307.5)2/307.5 + (98-102.5)2/102.5 = 0.066 + 0.198 = 0.264. With 1 degree of freedom, the critical value at p=0.05 is 3.841. Since 0.264 < 3.841, we fail to reject the null hypothesis. Conclusion: The observed phenotypic ratio is consistent with a 3:1 Mendelian ratio, supporting the hypothesis that kernel color is determined by a single gene with complete dominance.', totalScore: 92, letterGrade: 'A-' },
    { studentId: userIds.students[1], content: 'Hypothesis: The corn ear will show a 3:1 ratio of purple to yellow kernels if it came from a cross of two heterozygous parents. Methods: We counted kernels on the entire ear, separating by color. Data: Purple: 287, Yellow: 103, Total: 390. Expected: 292.5 purple, 97.5 yellow. Chi-square: (287-292.5)2/292.5 + (103-97.5)2/97.5 = 0.103 + 0.310 = 0.413. Since 0.413 < 3.841, the data fits a 3:1 ratio. Conclusion: The results support Mendel\'s law of segregation. The purple allele appears to be dominant over yellow.', totalScore: 85, letterGrade: 'B' },
    { studentId: userIds.students[2], content: 'Hypothesis: I think the corn will have more purple than yellow kernels, maybe 3 to 1. Methods: I counted the kernels. Data: Purple: 295, Yellow: 105. I think this is close to 3:1 because 295 divided by 105 is about 2.8. Conclusion: The ratio is pretty close to 3:1 so Mendel was right about dominant and recessive traits.', totalScore: 62, letterGrade: 'D' },
    { studentId: userIds.students[3], content: 'Hypothesis: If the parent plants were both heterozygous for kernel color, then the offspring should show a 3:1 phenotypic ratio. Methods: Each pair counted one ear of corn. We separated purple and yellow kernels into cups and counted them. Data: Purple: 301, Yellow: 99, Total: 400. Expected: 300 and 100. Chi-square: (301-300)2/300 + (99-100)2/100 = 0.003 + 0.01 = 0.013. This is well below the critical value, so we accept the null hypothesis. Conclusion: Our results strongly support a monohybrid cross with complete dominance, consistent with Mendel\'s first law.', totalScore: 88, letterGrade: 'B+' },
    { studentId: userIds.students[4], content: 'Hypothesis: The kernels will show Mendel\'s 3:1 ratio for a monohybrid cross with purple dominant. Methods: We were given ears of corn and counted the different colors. Data: Purple 278, Yellow 112, Total 390. I calculated chi-square and got 2.89. This is less than 3.841 so the data fits. Conclusion: The experiment supports Mendelian genetics. The ratio was close to 3:1 which means the purple color is dominant. I learned that we can predict offspring ratios using Punnett squares.', totalScore: 78, letterGrade: 'C+' },
    { studentId: userIds.students[5], content: 'Hypothesis: The corn ear from heterozygous parents will produce a 3:1 ratio of purple to yellow kernels based on Mendel\'s law of segregation. Methods: Working with my lab partner, we carefully removed and counted every kernel from our assigned ear, sorting into purple and yellow categories. We recorded counts in groups of 50 for accuracy. Data: Purple: 308, Yellow: 92, Total: 400. Expected: 300 purple, 100 yellow. Chi-square: (308-300)2/300 + (92-100)2/100 = 0.213 + 0.64 = 0.853. With df=1 and alpha=0.05, critical value is 3.841. Since 0.853 < 3.841, we fail to reject the null. Conclusion: Our data is consistent with a 3:1 Mendelian ratio. The slight deviation toward more purple kernels could be due to sampling variation or slight viability differences between genotypes.', totalScore: 96, letterGrade: 'A' },
  ]

  const geneticsSubRecords = geneticsSubmissions.map((s) => ({
    id: createId(),
    assignmentId: assignmentIds.geneticsLab,
    studentId: s.studentId,
    content: s.content,
    status: 'graded' as const,
    submittedAt: daysAgo(15),
    gradedAt: daysAgo(12),
    totalScore: s.totalScore,
    maxScore: 100,
    letterGrade: s.letterGrade,
  }))

  await db.insert(schema.submissions).values(geneticsSubRecords)

  // Feedback drafts for genetics lab (approved)
  await db.insert(schema.feedbackDrafts).values(
    geneticsSubRecords.map((sub, i) => ({
      id: createId(),
      submissionId: sub.id,
      teacherId: userIds.okafor,
      aiFeedback: [
        'Excellent lab report with a clear hypothesis, thorough data collection, and correct chi-square analysis. Your conclusion effectively connects the statistical result to Mendel\'s laws. Strong work.',
        'Solid report with correct calculations and a clear connection to Mendel\'s law of segregation. To improve, add more detail to your methods section so another student could replicate your experiment.',
        'You have the right idea about the 3:1 ratio, but your report needs a formal chi-square calculation, not just a rough estimate. Your methods section is too brief to be reproducible. Review the lab report format and include all required sections.',
        'Well-structured report with accurate calculations. Your chi-square value is impressively close to expected, and your conclusion clearly states the scientific significance. Consider discussing potential sources of error.',
        'Good report with correct chi-square analysis. Your conclusion is solid. To strengthen your methods, describe the counting procedure in more detail. Also consider what might cause deviations from the expected ratio.',
        'Outstanding lab report. Your methods are the most detailed and reproducible in the class. The suggestion about viability differences in your conclusion shows genuine scientific thinking beyond what was required.',
      ][i],
      status: 'approved',
      strengths: JSON.stringify(['Correct chi-square analysis', 'Clear hypothesis']),
      improvements: JSON.stringify(['Add more detail to methods', 'Discuss sources of error']),
      nextSteps: JSON.stringify(['Apply chi-square analysis to the dihybrid cross lab next week']),
    }))
  )

  // Multiplication Stories submissions (completed, Chen class = students[14..19])
  const multiplicationSubRecords = [
    { studentId: userIds.students[14], content: 'Problem 1: There are 4 rows of desks with 6 desks in each row. I drew an array with 4 rows and 6 columns. 4 x 6 = 24. There are 24 desks in the classroom.\nProblem 2: Mom bought 3 bags of apples with 5 apples in each bag. I drew 3 groups of 5. 3 x 5 = 15. Mom bought 15 apples.', totalScore: 92, letterGrade: 'A-' },
    { studentId: userIds.students[15], content: 'Problem 1: 4 rows, 6 desks each. 4x6=24 desks. I drew the array.\nProblem 2: 3 bags, 5 apples each. 3x5=15 apples. I drew groups.', totalScore: 78, letterGrade: 'C+' },
    { studentId: userIds.students[16], content: 'Problem 1: I counted the desks and got 24. 4 times 6 is 24. I drew a picture of the desks.\nProblem 2: She has 15 apples because 3 times 5 is 15. I drew circles for the apples.', totalScore: 85, letterGrade: 'B' },
    { studentId: userIds.students[17], content: 'Problem 1: There are 24 desks. 4x6=24. I drew it.\nProblem 2: 15 apples. 3x5=15.', totalScore: 65, letterGrade: 'D' },
    { studentId: userIds.students[18], content: 'Problem 1: I made a 4 by 6 array and counted 24 squares. So 4 x 6 = 24. There are 24 desks in all. The array shows 4 equal groups of 6.\nProblem 2: I drew 3 circles and put 5 dots in each one. That is 3 groups of 5. 3 x 5 = 15. Mom bought 15 apples in all.', totalScore: 95, letterGrade: 'A' },
  ].map((s) => ({
    id: createId(),
    assignmentId: assignmentIds.multiplicationStories,
    studentId: s.studentId,
    content: s.content,
    status: 'graded' as const,
    submittedAt: daysAgo(11),
    gradedAt: daysAgo(9),
    totalScore: s.totalScore,
    maxScore: 100,
    letterGrade: s.letterGrade,
  }))

  await db.insert(schema.submissions).values(multiplicationSubRecords)

  // Reading Response: Charlotte's Web submissions (grading, Chen class = students[14..19])
  const readingResponseSubmissions = [
    { studentId: userIds.students[14], content: 'In chapters 10-12, Charlotte helps Wilbur by writing words in her web. She writes "SOME PIG" and then "TERRIFIC" to make people think Wilbur is special. This is important because the farmer was going to turn Wilbur into bacon and Charlotte wanted to save his life. Wilbur feels so happy and grateful because Charlotte is the best friend he has ever had. He tells her she is the best friend anyone could have. I think the author E.B. White is trying to teach us that a good friend will do anything to help you, even if it is really hard. Charlotte stayed up all night to write in her web. That is what a real friend does.' },
    { studentId: userIds.students[15], content: 'Charlotte writes words in her web to help Wilbur not get killed. She is a very smart spider. Wilbur is happy she is helping. I think the author is saying friends help each other.' },
    { studentId: userIds.students[16], content: 'Charlotte is a spider who is Wilbur the pig\'s friend. In these chapters she writes "TERRIFIC" in her web so the farmer will think Wilbur is amazing and won\'t make him into ham. Wilbur feels really thankful and he says Charlotte is a true friend. Charlotte works really hard at night when nobody is watching. I think the author wants us to know that good friends help you even when nobody is looking and even when it is hard for them. Charlotte is tired from making the web but she does it anyway because she loves Wilbur.' },
    { studentId: userIds.students[17], content: 'Charlotte helps Wilbur by putting words in the web. She writes stuff like some pig and terriffic. Wilbur is glad she helped him. The book is about friendship and how friends help each other. I liked these chapters because the spider is cool.' },
    { studentId: userIds.students[18], content: 'In chapters 10, 11, and 12 of Charlotte\'s Web, Charlotte helps Wilbur by spinning special words into her web. First she writes "SOME PIG" and all the people in the town come to see it. Then she writes "TERRIFIC" because she needs a new word to keep people interested. Charlotte does all of this at night when it is dark and quiet. She has to take apart her old web and build a new one with the letters. Wilbur watches her work and he feels amazed and lucky to have such a wonderful friend. He even tries to spin a web himself but he can\'t because he is a pig, not a spider. I think the author is teaching us that being a good friend means using your special talents to help the people you care about. Charlotte is good at making webs and she uses that talent to save Wilbur\'s life. Everyone has something they are good at and they can use it to help their friends.' },
  ]

  const readingResponseSubRecords = readingResponseSubmissions.map((s) => ({
    id: createId(),
    assignmentId: assignmentIds.readingResponse,
    studentId: s.studentId,
    content: s.content,
    status: 'submitted' as const,
    submittedAt: daysAgo(5),
    totalScore: null,
    maxScore: null,
    letterGrade: null,
  }))

  await db.insert(schema.submissions).values(readingResponseSubRecords)

  // Feedback drafts for reading responses
  await db.insert(schema.feedbackDrafts).values([
    {
      id: createId(),
      submissionId: readingResponseSubRecords[0].id,
      teacherId: userIds.chen,
      aiFeedback: 'Great job! You clearly explained what Charlotte does for Wilbur and why it matters. Your connection to the idea that "a real friend does" hard things for others shows strong thinking. Try adding one more detail from the book about how Wilbur shows his gratitude.',
      status: 'draft',
      strengths: JSON.stringify(['Explains Charlotte\'s actions with detail', 'Strong connection to the friendship theme', 'Meets the sentence requirement']),
      improvements: JSON.stringify(['Could add more about Wilbur\'s feelings', 'Try using a quote from the book']),
      nextSteps: JSON.stringify(['Practice finding exact words from the book to use as evidence']),
    },
    {
      id: createId(),
      submissionId: readingResponseSubRecords[1].id,
      teacherId: userIds.chen,
      aiFeedback: 'You have the right idea about Charlotte helping Wilbur! Your response needs more details. Can you tell me what specific words Charlotte writes? How does Wilbur feel? Try to write at least 5 sentences and include details from the chapters.',
      status: 'draft',
      strengths: JSON.stringify(['Identifies the main idea correctly', 'Understands the friendship theme']),
      improvements: JSON.stringify(['Needs more sentences (at least 5)', 'Add specific details from the chapters', 'Explain how Wilbur feels using examples']),
      nextSteps: JSON.stringify(['Use the sentence starter: "In the book, Charlotte..." to add more details']),
    },
  ])

  console.log('  New assignment submissions created (poetry: 5, narrative: 6, genetics: 6, multiplication: 5, reading response: 5).')

  // =========================================================
  // 15. Lesson Plans
  // =========================================================
  console.log('Creating lesson plans...')

  await db.insert(schema.lessonPlans).values([
    {
      id: createId(),
      title: 'Analyzing Persuasive Techniques in Media',
      subject: 'ELA',
      gradeLevel: '8',
      duration: '50 min',
      standards: JSON.stringify(['RL.8.1', 'W.8.1']),
      objectives: JSON.stringify([
        'Students will identify at least 3 persuasive techniques (ethos, pathos, logos) in a media text.',
        'Students will evaluate the effectiveness of persuasive techniques using textual evidence.',
        'Students will write a short analysis paragraph explaining which technique is most effective and why.',
      ]),
      warmUp: 'Display two contrasting advertisements for the same product (one using emotional appeal, one using statistics). Students write a quick-write: "Which ad would make you more likely to buy this product? Why?" Share with a partner. This activates prior knowledge about persuasion and primes students to think analytically about how messages are crafted to influence audiences.',
      directInstruction: 'Define ethos, pathos, and logos with clear examples from everyday life. Show a 3-minute video advertisement and pause at key moments to identify each technique. Model annotation of a print advertisement, thinking aloud about which technique is being used and how to find evidence. Introduce the analysis paragraph structure: claim about the most effective technique, evidence from the text, explanation of why it works.',
      guidedPractice: 'In pairs, students analyze a second print advertisement using a graphic organizer with columns for each persuasive technique. They identify specific words, images, and design choices that represent each technique. Teacher circulates and conferences with pairs, asking probing questions: "What emotion is this image trying to create?" and "Where do you see the creator establishing credibility?" Pairs share their findings with another pair, comparing observations.',
      independentPractice: 'Students choose one advertisement from a provided set of 4 options. They independently complete the graphic organizer and write an analysis paragraph (4-6 sentences) identifying the dominant persuasive technique and evaluating its effectiveness using specific evidence from the ad. Students who finish early can analyze a second advertisement or write a counterargument about why a different technique might be more effective.',
      closure: 'Exit ticket: Students respond to the prompt "Name one persuasive technique you noticed in a real ad, social media post, or video you saw recently outside of school." Whole-class share of 3-4 responses reinforces that persuasion is everywhere, not just in English class. Preview tomorrow\'s lesson on writing persuasive arguments of their own.',
      materials: JSON.stringify(['Projector and speakers', '4 print advertisements (color copies)', 'Persuasive techniques graphic organizer', 'Video advertisement (pre-loaded)', 'Exit ticket slips']),
      differentiation: JSON.stringify({
        belowGrade: 'Provide a word bank of persuasive technique vocabulary with definitions. Pair with a stronger reader for the analysis. Offer sentence frames for the analysis paragraph.',
        onGrade: 'Standard lesson as described above.',
        aboveGrade: 'Analyze a more complex text (political speech excerpt). Write a full paragraph for each technique rather than choosing one. Evaluate which technique is least effective and why.',
      }),
      assessmentPlan: 'Formative: exit ticket responses and analysis paragraphs collected for review. Check graphic organizers during circulation for understanding of the three techniques.',
      teacherId: userIds.rivera,
    },
    {
      id: createId(),
      title: 'Introduction to Poetry: Figurative Language',
      subject: 'ELA',
      gradeLevel: '8',
      duration: '45 min',
      standards: JSON.stringify(['RL.8.1', 'RL.8.2', 'RL.8.3']),
      objectives: JSON.stringify([
        'Students will identify simile, metaphor, and personification in poems.',
        'Students will explain how figurative language contributes to a poem\'s meaning and tone.',
        'Students will write original examples of each figurative language type.',
      ]),
      warmUp: 'Write the sentence "The cafeteria was a zoo at lunchtime" on the board. Ask students to discuss with a partner: "Is this literally true? What does it actually mean? Why is this more interesting than saying the cafeteria was loud and crowded?" This surfaces the concept that writers use comparisons to create vivid meaning. Collect a few responses to transition into figurative language vocabulary.',
      directInstruction: 'Present definitions and examples of simile, metaphor, and personification using a short anchor chart. Read aloud Langston Hughes\'s "Dreams" and model identifying the two metaphors ("life is a broken-winged bird" and "life is a barren field frozen with snow"). Think aloud about what each metaphor communicates about the importance of dreams. Emphasize that figurative language is a tool poets use to make abstract ideas concrete and emotional.',
      guidedPractice: 'Distribute copies of 3 short poems. Students work in small groups to highlight and label examples of figurative language, then discuss what each example adds to the poem\'s meaning. Groups record their findings on chart paper. Teacher conferences with each group, asking "How does this metaphor change the way you picture this?" and "What feeling does this personification create?" Groups present their best example to the class.',
      independentPractice: 'Students write 3 original sentences: one simile, one metaphor, one personification. Each sentence should relate to a topic of their choice (school, sports, family, nature). Below each sentence, students write 1-2 sentences explaining what their figurative language communicates that a literal statement would not. Students who finish early can write a 4-line poem incorporating all three types.',
      closure: 'Volunteers share their favorite original example. Class votes on the most creative simile, metaphor, and personification. Remind students that tomorrow they will apply these skills to analyzing a full poem independently.',
      materials: JSON.stringify(['Langston Hughes "Dreams" copies', '3 short poems handout', 'Chart paper and markers', 'Figurative language anchor chart', 'Lined paper for writing practice']),
      differentiation: JSON.stringify({
        belowGrade: 'Provide a reference sheet with definitions and 2 examples of each type. Work in a teacher-guided small group during independent practice. Use sentence starters: "School is like..." or "The wind..."',
        onGrade: 'Standard lesson as described.',
        aboveGrade: 'Analyze a more complex poem (Emily Dickinson or Robert Frost). Identify how multiple figurative language devices work together to create meaning. Write a full stanza rather than individual sentences.',
      }),
      assessmentPlan: 'Collect independent practice writing samples. Check for accurate identification in group work. Exit conversation during closure assesses understanding informally.',
      teacherId: userIds.rivera,
    },
    {
      id: createId(),
      title: 'Argumentative Writing Workshop',
      subject: 'ELA',
      gradeLevel: '8',
      duration: '50 min',
      standards: JSON.stringify(['W.8.1', 'L.8.1', 'L.8.2']),
      objectives: JSON.stringify([
        'Students will draft a thesis statement that takes a clear, arguable position.',
        'Students will organize supporting evidence into a logical outline.',
        'Students will write a counterargument and rebuttal paragraph.',
      ]),
      warmUp: 'Display two thesis statements: one strong ("Schools should replace letter grades with mastery-based assessments because grades create anxiety without improving learning") and one weak ("Grades are bad"). Students discuss which is stronger and why. This reinforces the qualities of an effective thesis: specific, arguable, and gives a reason.',
      directInstruction: 'Review the components of an argumentative essay using a visual organizer on the board: hook, thesis, body paragraphs (claim + evidence + analysis), counterargument and rebuttal, conclusion. Model the process of turning a topic into a thesis by choosing a class-relevant topic and thinking aloud through three drafts of increasing specificity. Demonstrate outlining one body paragraph: claim, two pieces of evidence with planned analysis, transition to next point.',
      guidedPractice: 'Students receive a list of 5 debatable topics. They choose one and draft a thesis statement on a whiteboard. Teacher circulates and provides feedback. Students who have a strong thesis move on to outlining body paragraphs. Those who need more support work in a small group with the teacher to revise their thesis using the "Position + Because + Reason" formula.',
      independentPractice: 'Students complete a full outline for their argumentative essay, including: thesis statement, 3 body paragraph claims with planned evidence, a counterargument they will address, and a rebuttal strategy. Students then draft their counterargument and rebuttal paragraph in full sentences, as this is the most challenging component for most writers.',
      closure: 'Partner share: students read their counterargument paragraph to a partner. The partner rates it on a 1-3 scale: (1) I am not convinced, (2) you addressed the other side but I have questions, (3) strong rebuttal. Partners provide one specific suggestion for improvement. This peer feedback prepares students for tomorrow\'s full drafting session.',
      materials: JSON.stringify(['Argumentative essay visual organizer', 'Debatable topics list', 'Individual whiteboards and markers', 'Outline template handout', 'Peer feedback rubric']),
      differentiation: JSON.stringify({
        belowGrade: 'Provide thesis sentence frames and a filled-in model outline. Reduce to 2 body paragraphs. Counterargument paragraph can use sentence starters.',
        onGrade: 'Standard lesson as described.',
        aboveGrade: 'Address two counterarguments. Include a qualification in the thesis. Draft introduction and conclusion in addition to the outline.',
      }),
      assessmentPlan: 'Collect outlines and counterargument paragraphs at the end of class. Use peer feedback scores as a quick formative check on counterargument quality.',
      teacherId: userIds.rivera,
    },
    {
      id: createId(),
      title: 'Cell Division: Mitosis and Meiosis',
      subject: 'Science',
      gradeLevel: '10',
      duration: '55 min',
      standards: JSON.stringify(['HS-LS1-1', 'HS-LS1-2']),
      objectives: JSON.stringify([
        'Students will describe the stages of mitosis and explain the purpose of each stage.',
        'Students will compare and contrast mitosis and meiosis in terms of purpose, process, and products.',
        'Students will explain why meiosis produces genetic diversity while mitosis produces identical copies.',
      ]),
      warmUp: 'Show a time-lapse video of a cell dividing (90 seconds). Ask students to sketch what they observe and write one question they have. Share questions with a partner. This visual hook engages curiosity and surfaces prior knowledge about cell division before formal vocabulary is introduced.',
      directInstruction: 'Present the stages of mitosis using animated diagrams: prophase, metaphase, anaphase, telophase, and cytokinesis. Explain the biological purpose (growth, repair, replacement). Then present meiosis with emphasis on how it differs: two divisions, crossing over, independent assortment, haploid products. Use a side-by-side comparison chart that students copy into their notebooks. Emphasize the key takeaway: mitosis makes copies, meiosis makes variety.',
      guidedPractice: 'Lab activity: students use pipe cleaners of two colors to model chromosome behavior during mitosis and meiosis I. Working in pairs, they physically move the "chromosomes" through each stage while referencing the comparison chart. Teacher circulates with checkpoint questions: "How many chromosomes does each daughter cell have after mitosis? After meiosis I? After meiosis II?" Pairs sketch their models at each stage.',
      independentPractice: 'Students complete a Venn diagram comparing mitosis and meiosis with at least 4 characteristics in each section. Then they respond to the application question: "A skin cell and a sperm cell both come from your body. Explain why they are produced by different types of cell division and why this matters for the organism." Response should be 4-6 sentences with specific biological vocabulary.',
      closure: 'Quick quiz (ungraded): 5 true/false statements about mitosis and meiosis displayed on the projector. Students respond with thumbs up or thumbs down. Teacher addresses any statements where more than 30% of the class responds incorrectly. Preview the genetics lab that will build on today\'s understanding of meiosis and genetic variation.',
      materials: JSON.stringify(['Cell division time-lapse video', 'Pipe cleaners (2 colors per pair)', 'Comparison chart handout', 'Venn diagram template', 'Quick quiz slides']),
      differentiation: JSON.stringify({
        belowGrade: 'Provide a partially completed comparison chart. Use simplified vocabulary list with definitions. Pair with a peer mentor for the pipe cleaner activity.',
        onGrade: 'Standard lesson as described.',
        aboveGrade: 'Research and present on a specific disease caused by errors in cell division (e.g., Down syndrome, cancer). Explain the cellular mechanism behind the condition.',
      }),
      assessmentPlan: 'Formative: pipe cleaner model checkpoints and Venn diagrams. Quick quiz provides instant data on class understanding. Written response assesses application-level thinking.',
      teacherId: userIds.okafor,
    },
    {
      id: createId(),
      title: 'Introduction to Genetics and Heredity',
      subject: 'Science',
      gradeLevel: '10',
      duration: '50 min',
      standards: JSON.stringify(['HS-LS1-1', 'HS-LS1-3']),
      objectives: JSON.stringify([
        'Students will define key genetics vocabulary: gene, allele, genotype, phenotype, dominant, recessive.',
        'Students will use Punnett squares to predict offspring ratios for monohybrid crosses.',
        'Students will explain the relationship between genotype and phenotype using real-world examples.',
      ]),
      warmUp: 'Display photos of a family with visible trait variation (e.g., eye color, hair texture). Ask: "Why do children look similar to their parents but not identical?" Students write 2-3 sentences in their journals, then share with a partner. This taps into students\' everyday observations and builds a bridge to formal genetics vocabulary.',
      directInstruction: 'Introduce Gregor Mendel and his pea plant experiments through a brief narrative about his life and discoveries. Define key terms (gene, allele, dominant, recessive, homozygous, heterozygous, genotype, phenotype) with clear examples tied to observable traits. Model a monohybrid Punnett square using flower color (PP x Pp), walking through each step: identifying parent genotypes, setting up the grid, filling in offspring genotypes, determining the phenotypic ratio.',
      guidedPractice: 'Students work through 3 guided Punnett square problems with increasing complexity: (1) homozygous dominant x homozygous recessive, (2) heterozygous x heterozygous, (3) heterozygous x homozygous recessive. For each problem, students predict the ratio before completing the square, then check their prediction. Teacher projects student work and discusses common errors such as confusing genotype with phenotype.',
      independentPractice: 'Students complete a set of 4 Punnett square problems independently, then answer the analysis question: "A couple who are both heterozygous for a trait (Bb) want to know the probability their child will show the recessive phenotype. Explain your answer using a Punnett square and genetics vocabulary." Students who finish early tackle a challenge problem involving two traits.',
      closure: 'Exit ticket: "Explain in your own words why two brown-eyed parents can have a blue-eyed child. Use the words genotype, phenotype, and recessive in your answer." Collect for formative assessment. Preview the corn genetics lab where students will test Mendelian ratios with real data.',
      materials: JSON.stringify(['Family trait photos', 'Genetics vocabulary handout', 'Punnett square practice worksheet', 'Exit ticket slips', 'Colored pencils for phenotype coding']),
      differentiation: JSON.stringify({
        belowGrade: 'Provide a Punnett square template with labels. Include a vocabulary reference sheet. Start with a concrete manipulative (colored tiles) before moving to the abstract grid.',
        onGrade: 'Standard lesson as described.',
        aboveGrade: 'Introduce incomplete dominance and codominance examples. Attempt a dihybrid cross. Research a genetic disorder and explain its inheritance pattern.',
      }),
      assessmentPlan: 'Formative: exit ticket responses, Punnett square accuracy during guided practice. Collect independent practice for grading.',
      teacherId: userIds.okafor,
    },
    {
      id: createId(),
      title: 'Multiplying by Multiples of 10',
      subject: 'Math',
      gradeLevel: '3',
      duration: '40 min',
      standards: JSON.stringify(['3.OA.1', '3.NBT.1', '3.NBT.2']),
      objectives: JSON.stringify([
        'Students will use place value understanding to multiply one-digit numbers by multiples of 10.',
        'Students will explain the pattern of adding a zero when multiplying by 10.',
        'Students will solve word problems involving multiples of 10 using arrays and equations.',
      ]),
      warmUp: 'Skip-count by 10s as a class from 10 to 100, clapping on each number. Then display: "3 x 10 = ?" and "3 x 1 = ?" Ask: "What do you notice about these two problems? Talk to your neighbor." This builds on students\' existing fluency with counting by 10s and primes them to discover the pattern themselves.',
      directInstruction: 'Use base-ten blocks to build 3 groups of 10 on the document camera. Count the total (30). Write the equation 3 x 10 = 30. Repeat with 4 x 10 and 5 x 10. Ask students what pattern they notice. Guide them to articulate: "When you multiply by 10, the answer is the number with a zero added." Then build 3 groups of 20 using base-ten blocks. Students predict the answer before counting. Write 3 x 20 = 60 and connect it to 3 x 2 tens = 6 tens = 60.',
      guidedPractice: 'Students work with a partner using base-ten blocks to solve 4 problems: 2 x 30, 5 x 20, 4 x 40, 3 x 50. For each problem, they build with blocks, draw a quick sketch, and write the equation. Teacher circulates and asks questions: "How many tens are in each group?" and "How many tens do you have altogether?" Class reconvenes to share strategies and compare methods.',
      independentPractice: 'Students complete a worksheet with 8 multiplication problems involving multiples of 10, then solve 2 word problems. Example: "There are 4 bags of marbles. Each bag has 30 marbles. How many marbles are there altogether? Draw a picture and write an equation." Students who finish early create their own word problem for a classmate to solve.',
      closure: 'Show three equations: 6 x 10 = 60, 6 x 20 = 120, 6 x 30 = 180. Ask: "What pattern do you see? What would 6 x 40 be? How do you know?" Students share predictions. Remind them that understanding this pattern will help with bigger multiplication problems they will tackle next week.',
      materials: JSON.stringify(['Base-ten blocks (sets for each pair)', 'Document camera', 'Practice worksheet', 'Word problem handout', 'Lined paper for creating problems']),
      differentiation: JSON.stringify({
        belowGrade: 'Keep base-ten blocks available throughout independent practice. Provide number line support. Reduce to 5 practice problems and 1 word problem.',
        onGrade: 'Standard lesson as described.',
        aboveGrade: 'Extend to multiplying by multiples of 100 (3 x 200, 4 x 300). Solve multi-step word problems combining addition and multiplication.',
      }),
      assessmentPlan: 'Observe partner work with base-ten blocks for conceptual understanding. Collect worksheets and word problems for accuracy check. Closure discussion reveals who has grasped the pattern.',
      teacherId: userIds.chen,
    },
  ])
  console.log('  6 lesson plans created.')

  // =========================================================
  // 16. Additional Mastery Records (all students)
  // =========================================================
  console.log('Creating additional mastery records...')

  const additionalMastery: Array<{ studentId: string; standardCode: string; level: string; score: number; source: string }> = []

  // Helper to generate a score within a level range
  function scoreForLevel(level: string): number {
    switch (level) {
      case 'advanced': return 85 + Math.floor(Math.random() * 16) // 85-100
      case 'proficient': return 70 + Math.floor(Math.random() * 15) // 70-84
      case 'developing': return 50 + Math.floor(Math.random() * 20) // 50-69
      case 'beginning': return 20 + Math.floor(Math.random() * 30) // 20-49
      default: return 50
    }
  }

  // ELA students: Aisha and DeShawn already have records. Add remaining ELA standards for them.
  // Aisha: add W.8.2, W.8.3, RL.8.3, L.8.2
  for (const { code, level } of [
    { code: 'W.8.2', level: 'proficient' }, { code: 'W.8.3', level: 'advanced' },
    { code: 'RL.8.3', level: 'proficient' }, { code: 'L.8.2', level: 'proficient' },
  ]) {
    additionalMastery.push({ studentId: userIds.aisha, standardCode: code, level, score: scoreForLevel(level), source: assignmentIds.americanDream })
  }

  // DeShawn: add W.8.2, W.8.3, RL.8.3, L.8.2
  for (const { code, level } of [
    { code: 'W.8.2', level: 'developing' }, { code: 'W.8.3', level: 'developing' },
    { code: 'RL.8.3', level: 'beginning' }, { code: 'L.8.2', level: 'beginning' },
  ]) {
    additionalMastery.push({ studentId: userIds.deshawn, standardCode: code, level, score: scoreForLevel(level), source: assignmentIds.americanDream })
  }

  // Students[0] Jayden: add more ELA standards
  for (const { code, level } of [
    { code: 'RL.8.2', level: 'advanced' }, { code: 'W.8.2', level: 'proficient' },
    { code: 'W.8.3', level: 'advanced' }, { code: 'L.8.1', level: 'proficient' },
  ]) {
    additionalMastery.push({ studentId: userIds.students[0], standardCode: code, level, score: scoreForLevel(level), source: assignmentIds.americanDream })
  }

  // Students[1] Sofia: add more ELA
  for (const { code, level } of [
    { code: 'RL.8.2', level: 'proficient' }, { code: 'W.8.2', level: 'developing' },
    { code: 'L.8.1', level: 'proficient' }, { code: 'L.8.2', level: 'developing' },
  ]) {
    additionalMastery.push({ studentId: userIds.students[1], standardCode: code, level, score: scoreForLevel(level), source: assignmentIds.americanDream })
  }

  // Students[2] Ethan: add more ELA
  for (const { code, level } of [
    { code: 'RL.8.2', level: 'developing' }, { code: 'W.8.2', level: 'beginning' },
    { code: 'L.8.1', level: 'developing' }, { code: 'L.8.2', level: 'beginning' },
  ]) {
    additionalMastery.push({ studentId: userIds.students[2], standardCode: code, level, score: scoreForLevel(level), source: assignmentIds.americanDream })
  }

  // Students[3] Zara: ELA
  for (const { code, level } of [
    { code: 'W.8.1', level: 'developing' }, { code: 'RL.8.1', level: 'developing' },
    { code: 'RL.8.2', level: 'beginning' }, { code: 'W.8.3', level: 'developing' },
    { code: 'L.8.1', level: 'developing' },
  ]) {
    additionalMastery.push({ studentId: userIds.students[3], standardCode: code, level, score: scoreForLevel(level), source: assignmentIds.americanDream })
  }

  // Students[4] Lucas: ELA
  for (const { code, level } of [
    { code: 'W.8.1', level: 'proficient' }, { code: 'RL.8.1', level: 'proficient' },
    { code: 'RL.8.2', level: 'proficient' }, { code: 'W.8.3', level: 'advanced' },
    { code: 'L.8.1', level: 'proficient' },
  ]) {
    additionalMastery.push({ studentId: userIds.students[4], standardCode: code, level, score: scoreForLevel(level), source: assignmentIds.americanDream })
  }

  // Period 2 students (5-9): ELA mastery from poetry analysis
  const period2Levels: Array<Array<{ code: string; level: string }>> = [
    [{ code: 'W.8.1', level: 'proficient' }, { code: 'RL.8.1', level: 'advanced' }, { code: 'RL.8.2', level: 'proficient' }, { code: 'L.8.1', level: 'proficient' }], // Amara
    [{ code: 'W.8.1', level: 'developing' }, { code: 'RL.8.1', level: 'developing' }, { code: 'RL.8.2', level: 'proficient' }, { code: 'L.8.1', level: 'developing' }], // Noah
    [{ code: 'W.8.1', level: 'beginning' }, { code: 'RL.8.1', level: 'developing' }, { code: 'RL.8.2', level: 'beginning' }, { code: 'L.8.1', level: 'beginning' }], // Priya
    [{ code: 'W.8.1', level: 'advanced' }, { code: 'RL.8.1', level: 'advanced' }, { code: 'RL.8.2', level: 'advanced' }, { code: 'L.8.1', level: 'proficient' }], // Isaiah
    [{ code: 'W.8.1', level: 'beginning' }, { code: 'RL.8.1', level: 'beginning' }, { code: 'RL.8.2', level: 'developing' }, { code: 'L.8.1', level: 'beginning' }], // Mei-Lin
  ]
  for (let i = 0; i < 5; i++) {
    for (const { code, level } of period2Levels[i]) {
      additionalMastery.push({ studentId: userIds.students[5 + i], standardCode: code, level, score: scoreForLevel(level), source: assignmentIds.poetryAnalysis })
    }
  }

  // Period 3 students (10-14): ELA
  const period3Levels = [
    'proficient', 'developing', 'advanced', 'beginning', 'proficient',
  ]
  for (let i = 0; i < 5; i++) {
    const baseLevel = period3Levels[i]
    for (const code of ['W.8.1', 'RL.8.1', 'RL.8.2', 'L.8.1']) {
      additionalMastery.push({ studentId: userIds.students[10 + i], standardCode: code, level: baseLevel, score: scoreForLevel(baseLevel), source: assignmentIds.americanDream })
    }
  }

  // Period 4 students (15-17): ELA
  for (let i = 0; i < 3; i++) {
    const levels = ['advanced', 'developing', 'proficient'][i]
    for (const code of ['W.8.1', 'RL.8.1', 'RL.8.2', 'L.8.1']) {
      additionalMastery.push({ studentId: userIds.students[15 + i], standardCode: code, level: levels, score: scoreForLevel(levels), source: assignmentIds.americanDream })
    }
  }

  // Period 5 students (18-19): ELA
  for (let i = 0; i < 2; i++) {
    const levels = ['proficient', 'developing'][i]
    for (const code of ['W.8.1', 'RL.8.1', 'RL.8.2', 'L.8.1']) {
      additionalMastery.push({ studentId: userIds.students[18 + i], standardCode: code, level: levels, score: scoreForLevel(levels), source: assignmentIds.americanDream })
    }
  }

  // Science mastery: students[0..7] in Okafor Period 1
  const scienceLevels = ['advanced', 'proficient', 'developing', 'proficient', 'proficient', 'advanced', 'developing', 'beginning']
  for (let i = 0; i < 8; i++) {
    for (const code of ['HS-LS1-1', 'HS-LS1-2', 'HS-LS1-3']) {
      additionalMastery.push({ studentId: userIds.students[i], standardCode: code, level: scienceLevels[i], score: scoreForLevel(scienceLevels[i]), source: assignmentIds.geneticsLab })
    }
  }

  // Science mastery: students[8..13] in Okafor Period 2
  const scienceLevels2 = ['proficient', 'developing', 'advanced', 'beginning', 'proficient', 'developing']
  for (let i = 0; i < 6; i++) {
    for (const code of ['HS-LS1-1', 'HS-LS1-2']) {
      additionalMastery.push({ studentId: userIds.students[8 + i], standardCode: code, level: scienceLevels2[i], score: scoreForLevel(scienceLevels2[i]), source: assignmentIds.cellStructure })
    }
  }

  // Math mastery: students[14..19] in Chen class
  const mathLevels = ['advanced', 'proficient', 'proficient', 'developing', 'advanced', 'beginning']
  for (let i = 0; i < 6; i++) {
    for (const code of ['3.OA.1', '3.OA.2', '3.NBT.1', '3.NBT.2', '3.NF.1']) {
      additionalMastery.push({ studentId: userIds.students[14 + i], standardCode: code, level: mathLevels[i], score: scoreForLevel(mathLevels[i]), source: assignmentIds.multiplicationStories })
    }
  }

  if (additionalMastery.length > 0) {
    await db.insert(schema.masteryRecords).values(
      additionalMastery.map((m) => ({
        id: createId(),
        studentId: m.studentId,
        standardId: standardIds[m.standardCode],
        level: m.level,
        score: m.score,
        source: m.source,
        assessedAt: daysAgo(7),
      }))
    )
  }
  console.log(`  ${additionalMastery.length} additional mastery records created.`)

  // =========================================================
  // 17. Tutor Sessions
  // =========================================================
  console.log('Creating tutor sessions...')

  await db.insert(schema.tutorSessions).values([
    {
      id: createId(),
      studentId: userIds.aisha,
      subject: 'Math',
      topic: 'Linear Equations',
      messages: JSON.stringify([
        { role: 'user', content: 'I need help with linear equations. I don\'t understand how to solve 2x + 5 = 13.' },
        { role: 'assistant', content: 'I\'d be happy to help you think through this! Let\'s start with what you already know. In the equation 2x + 5 = 13, what do you think the goal is? What are we trying to find?' },
        { role: 'user', content: 'We\'re trying to find what x equals?' },
        { role: 'assistant', content: 'Exactly! We want to find the value of x that makes the equation true. Now, think about it like a balance scale. Both sides need to stay equal. Right now, x has two things happening to it: it\'s being multiplied by 2, and then 5 is being added. To get x by itself, which operation do you think we should undo first?' },
        { role: 'user', content: 'We should get rid of the 5 first? So subtract 5 from both sides?' },
        { role: 'assistant', content: 'Great reasoning! When you subtract 5 from both sides, what does the equation look like now? Go ahead and work it out.' },
      ]),
      startedAt: daysAgo(5),
      endedAt: daysAgo(5),
      metadata: JSON.stringify({ duration: 420, messagesCount: 6 }),
    },
    {
      id: createId(),
      studentId: userIds.deshawn,
      subject: 'ELA',
      topic: 'Main Idea and Supporting Details',
      messages: JSON.stringify([
        { role: 'user', content: 'I have to find the main idea of a passage but I don\'t really get how to do that.' },
        { role: 'assistant', content: 'That\'s a great thing to work on! Let\'s build this skill step by step. When you read a paragraph, what do you think the "main idea" means? In your own words, what is it?' },
        { role: 'user', content: 'It\'s like what the paragraph is mostly about?' },
        { role: 'assistant', content: 'Exactly right! It\'s the big point the author is making. Here\'s a trick that works well: after you read a paragraph, try to summarize it in one sentence. If you can do that, you\'ve probably found the main idea. Want to try with a short example? Imagine a paragraph that talks about how dolphins communicate using clicks, whistles, and body movements, and how scientists are studying these to understand dolphin language. What would you say the main idea is?' },
        { role: 'user', content: 'That dolphins have different ways to talk to each other?' },
        { role: 'assistant', content: 'That\'s a strong main idea! You identified the key point. Now, the details about clicks, whistles, body movements, and scientists studying them are supporting details. They help explain or prove the main idea. Think of supporting details as the evidence. Can you see how each detail connects back to your main idea about dolphin communication?' },
        { role: 'user', content: 'Yeah, the clicks and whistles are examples of how they communicate.' },
        { role: 'assistant', content: 'You\'ve got it! The main idea is like an umbrella, and the supporting details are everything underneath it. Here\'s a question to test yourself: if someone removed one supporting detail, would the main idea still make sense? Why or why not?' },
        { role: 'user', content: 'Yeah it would still make sense because the main idea is bigger than one detail. You\'d still know dolphins communicate even without one example.' },
        { role: 'assistant', content: 'That is an excellent observation. You clearly understand the relationship between main ideas and supporting details. When you tackle your reading assignment, try this: read each paragraph, pause, and ask yourself "What is the one big thing this paragraph is saying?" Then look for 2-3 details that support it. Would you like to practice with another example?' },
      ]),
      startedAt: daysAgo(8),
      endedAt: daysAgo(8),
      metadata: JSON.stringify({ duration: 600, messagesCount: 8 }),
    },
    {
      id: createId(),
      studentId: userIds.students[0],
      subject: 'Science',
      topic: 'Cell Structure',
      messages: JSON.stringify([
        { role: 'user', content: 'What\'s the difference between plant and animal cells? I keep mixing them up.' },
        { role: 'assistant', content: 'That\'s a really common confusion, so you\'re in good company! Before I help you sort it out, tell me what you already know. Can you name any parts that you think are different between the two?' },
        { role: 'user', content: 'Plant cells have a cell wall and animal cells don\'t? And something about chloroplasts?' },
        { role: 'assistant', content: 'You\'re already on the right track with both of those! Plant cells do have a cell wall and chloroplasts that animal cells lack. Now, why do you think plant cells need a cell wall but animal cells don\'t? Think about what plants and animals do differently in their everyday existence.' },
        { role: 'user', content: 'Plants don\'t move so they need something rigid to hold them up?' },
        { role: 'assistant', content: 'Excellent reasoning! The cell wall provides structural support since plants can\'t rely on a skeleton like animals do. Now, what about chloroplasts -- why would plants need them but animals wouldn\'t? Think about how each type of organism gets its energy.' },
        { role: 'user', content: 'Because plants make their own food with photosynthesis and animals eat food instead.' },
      ]),
      startedAt: daysAgo(12),
      endedAt: daysAgo(12),
      metadata: JSON.stringify({ duration: 350, messagesCount: 5 }),
    },
    {
      id: createId(),
      studentId: userIds.students[1],
      subject: 'ELA',
      topic: 'Thesis Statement Writing',
      messages: JSON.stringify([
        { role: 'user', content: 'I need to write a thesis statement for my essay about social media but I don\'t know how to make it good.' },
        { role: 'assistant', content: 'Writing a strong thesis statement is one of the most important skills in essay writing, so it\'s great that you want to get it right! First, what is your opinion about social media? Do you think it\'s mostly positive, mostly negative, or somewhere in between?' },
        { role: 'user', content: 'I think it\'s bad for teenagers because it makes them compare themselves to others.' },
        { role: 'assistant', content: 'That\'s a clear opinion, which is a great starting point! A strong thesis needs three things: a topic, your position, and a reason. You have all three: topic (social media), position (harmful for teenagers), reason (comparison). Now, can you combine those into one sentence? Give it a try.' },
        { role: 'user', content: 'Social media is bad for teenagers because it makes them compare themselves to others.' },
        { role: 'assistant', content: 'Good start! That covers the basics. Now let\'s strengthen it. The word "bad" is vague. Can you replace it with something more specific? What exactly does comparison do to teenagers? Think about the effect.' },
        { role: 'user', content: 'Social media damages teenagers\' self-esteem because constant exposure to idealized images leads them to compare themselves negatively to others?' },
        { role: 'assistant', content: 'That is a dramatically stronger thesis! Notice what you did: "damages self-esteem" is more specific than "bad," "constant exposure to idealized images" gives a concrete mechanism, and "compare themselves negatively" clarifies the direction of the comparison. This thesis gives your essay a clear, arguable claim and a roadmap for your body paragraphs. Your reader already knows what to expect. Well done!' },
      ]),
      startedAt: daysAgo(4),
      endedAt: daysAgo(4),
      metadata: JSON.stringify({ duration: 480, messagesCount: 6 }),
    },
    {
      id: createId(),
      studentId: userIds.students[7],
      subject: 'Math',
      topic: 'Fractions',
      messages: JSON.stringify([
        { role: 'user', content: 'I don\'t understand how to add fractions with different denominators like 1/3 + 1/4.' },
        { role: 'assistant', content: 'Fractions with different denominators can be tricky! Let me ask you this: why do you think we can\'t just add 1/3 + 1/4 by adding the tops and bottoms separately? What would go wrong?' },
        { role: 'user', content: 'Because the pieces are different sizes? Like thirds and fourths are not the same.' },
        { role: 'assistant', content: 'Exactly! You can\'t add pieces of different sizes any more than you can add 1 apple + 1 orange and call it 2 apples. So what do we need to do to make the pieces the same size? Think about what number both 3 and 4 can divide into evenly.' },
        { role: 'user', content: '12? Because 3 times 4 is 12.' },
        { role: 'assistant', content: 'That works! 12 is a common denominator for 3 and 4. Now, if we change 1/3 into twelfths, how many twelfths equal 1/3? Think about it: if you cut each third into 4 equal pieces, how many pieces do you have?' },
      ]),
      startedAt: daysAgo(3),
      endedAt: daysAgo(3),
      metadata: JSON.stringify({ duration: 300, messagesCount: 4 }),
    },
  ])
  console.log('  5 tutor sessions created.')

  // =========================================================
  // 18. Messages
  // =========================================================
  console.log('Creating messages...')

  await db.insert(schema.messages).values([
    {
      id: createId(),
      senderId: userIds.rivera,
      receiverId: userIds.sarah_chen,
      subject: 'Aisha\'s Progress Update: The American Dream Essay',
      content: 'Dear Ms. Chen,\n\nI wanted to share an update on Aisha\'s progress in 8th Grade ELA. She recently submitted her argumentative essay on the American Dream, and her work continues to demonstrate exceptional writing ability.\n\nAisha wrote a nuanced thesis arguing that the American Dream is still achievable when properly defined. She supported her argument with well-analyzed evidence from both "A Raisin in the Sun" and "The Great Gatsby," and her counterargument paragraph showed genuine engagement with opposing viewpoints. Her writing is consistently among the strongest in the class.\n\nOne area we are working on together is writing more specific conclusions. Aisha tends to end with broad statements rather than concrete proposals. For her next essay, I have encouraged her to practice writing conclusions that offer specific actions or visions.\n\nAt home, you might encourage Aisha to explain the main argument of things she reads -- articles, books, or even opinion pieces online. Practicing "What\'s the evidence for that claim?" conversations strengthens the analytical thinking that makes her writing so strong.\n\nPlease do not hesitate to reach out if you have any questions.\n\nWarm regards,\nMs. Rivera',
      type: 'progress_update',
      language: 'en',
      isAIGenerated: true,
      status: 'read',
      createdAt: daysAgo(2),
    },
    {
      id: createId(),
      senderId: userIds.rivera,
      receiverId: userIds.sarah_chen,
      subject: 'Weekly Learning Digest: Aisha Torres',
      content: 'Weekly Summary for Aisha Torres -- 8th Grade ELA\n\nThis week in class, students worked on argumentative writing skills and began analyzing persuasive techniques in media. Aisha participated actively in class discussions and completed all assignments on time.\n\nStrengths this week: Aisha demonstrated strong analytical thinking during our media literacy lesson, identifying persuasive techniques that many of her peers missed. Her ability to connect classroom concepts to real-world examples is a real asset.\n\nUpcoming: Next week we begin our poetry analysis unit with Robert Frost\'s "The Road Not Taken." Students will practice identifying figurative language and explaining how it contributes to meaning.\n\nOne thing you can do at home: Ask Aisha about the persuasive techniques she learned (ethos, pathos, logos). See if she can spot them in TV commercials or social media ads -- it makes for fun dinner conversation!\n\nThis summary was generated by AI from classroom data and reviewed by Ms. Rivera before sending.',
      type: 'weekly_digest',
      language: 'en',
      isAIGenerated: true,
      status: 'read',
      createdAt: daysAgo(9),
    },
    {
      id: createId(),
      senderId: userIds.rivera,
      receiverId: userIds.marcus_williams,
      subject: 'Checking in About DeShawn\'s Reading Progress',
      content: 'Dear Mr. Williams,\n\nI wanted to reach out to check in about DeShawn\'s progress in ELA. He is a great kid and I enjoy having him in class -- his contributions to class discussions when we read texts aloud are thoughtful and show real comprehension.\n\nI have noticed that DeShawn struggles with independent reading tasks and written assignments that require reading complex texts on his own. His recent American Dream essay was very short and lacked the textual evidence the assignment required. I know Ms. Rodriguez is working with him on reading fluency, and I want to make sure my classroom supports align with his IEP accommodations.\n\nWould you be available for a brief phone call or email exchange this week? I would like to discuss strategies we can coordinate between home and school. I know DeShawn enjoys audiobooks -- perhaps we can find ways to leverage that interest.\n\nThank you for your partnership in DeShawn\'s education.\n\nBest,\nMs. Rivera',
      type: 'alert',
      language: 'en',
      isAIGenerated: false,
      status: 'read',
      createdAt: daysAgo(2),
    },
    {
      id: createId(),
      senderId: userIds.rodriguez,
      receiverId: userIds.marcus_williams,
      subject: 'DeShawn\'s IEP Progress Update',
      content: 'Dear Mr. Williams,\n\nThis is your monthly progress update on DeShawn\'s IEP goals.\n\nReading Fluency Goal: DeShawn\'s oral reading fluency has improved from 85 words per minute at the start of the year to 99 words per minute as of last week. His annual goal is 110 wpm, and he is on track to meet it. He has responded particularly well to the paired reading strategy and is showing more confidence with longer passages. His phrasing and expression have improved noticeably.\n\nWritten Expression Goal: DeShawn is making steady progress. He scored 3 out of 4 on the classroom writing rubric for the first time last month, which was an exciting milestone. He is now writing 3-paragraph responses independently and is working toward the 5-paragraph goal. He continues to benefit from graphic organizers and extended time.\n\nDeShawn\'s attendance remains excellent, and he is a positive presence in the resource room. He is working hard, and his effort is paying off.\n\nPlease let me know if you have any questions or would like to schedule time to discuss his progress.\n\nBest regards,\nMs. Rodriguez',
      type: 'progress_update',
      language: 'en',
      isAIGenerated: true,
      status: 'sent',
      createdAt: daysAgo(5),
    },
    {
      id: createId(),
      senderId: userIds.sarah_chen,
      receiverId: userIds.rivera,
      subject: 'Re: Aisha\'s Progress Update',
      content: 'Ms. Rivera,\n\nThank you so much for the detailed update on Aisha. We are very proud of her writing progress. Your suggestion about practicing "What\'s the evidence?" conversations is wonderful -- we will definitely try that at dinner!\n\nAisha talks about your class all the time. She loves the texts you choose and says ELA is her favorite subject this year.\n\nThank you for everything you do.\n\nSarah Chen',
      type: 'general',
      language: 'en',
      isAIGenerated: false,
      status: 'read',
      createdAt: daysAgo(1),
    },
    {
      id: createId(),
      senderId: userIds.marcus_williams,
      receiverId: userIds.rivera,
      subject: 'Re: Checking in About DeShawn\'s Reading',
      content: 'Hi Ms. Rivera,\n\nThank you for reaching out. I appreciate you keeping me in the loop. DeShawn does struggle with reading and it has been a challenge at home too. He loves listening to audiobooks though -- he finishes 2-3 a month.\n\nI am available for a call Thursday after 6 PM or Friday morning before 10. Would either of those work?\n\nAlso, do you have any recommendations for books at his reading level that might keep him interested? He likes sports and adventure stories.\n\nThanks,\nMarcus',
      type: 'general',
      language: 'en',
      isAIGenerated: false,
      status: 'read',
      createdAt: daysAgo(1),
    },
    {
      id: createId(),
      senderId: userIds.marcus_williams,
      receiverId: userIds.rodriguez,
      subject: 'Tutoring resources for DeShawn?',
      content: 'Hi Ms. Rodriguez,\n\nThank you for the progress update. It is great to hear DeShawn is improving. I noticed you mentioned the paired reading strategy is working well. Is that something I could do with him at home too?\n\nAlso, are there any tutoring programs or apps you would recommend for reading practice over the weekends? I have about 30 minutes a day I could dedicate to working with him.\n\nThanks for all you do for DeShawn.\n\nMarcus Williams',
      type: 'general',
      language: 'en',
      isAIGenerated: false,
      status: 'sent',
      createdAt: daysAgo(4),
    },
    {
      id: createId(),
      senderId: userIds.rivera,
      receiverId: userIds.sarah_chen,
      subject: 'Assignment Insight: Aisha\'s Narrative Writing',
      content: 'Aisha submitted her personal narrative "A Turning Point" today. Her essay about seeing the ocean for the first time is beautifully written, with vivid sensory details and natural dialogue. She used imagery (the hot sand, the salt air) and a reflective conclusion that connected the experience to personal growth.\n\nStrength: Aisha\'s ability to use sensory details to immerse the reader in a scene is well above grade level.\n\nGrowth area: She could expand key moments with even more detail, slowing down the pacing to let the reader experience the most important parts more fully.\n\nAt home: Encourage Aisha to keep a journal of vivid moments from her day. Even a few sentences capturing what she saw, heard, or felt builds the observation skills that make her writing so strong.\n\nThis insight was generated by AI from assignment data and reviewed by Ms. Rivera.',
      type: 'assignment_insight',
      language: 'en',
      isAIGenerated: true,
      status: 'sent',
      createdAt: daysAgo(6),
    },
    {
      id: createId(),
      senderId: userIds.rodriguez,
      receiverId: userIds.marcus_williams,
      subject: 'Monthly Summary: DeShawn\'s Overall Progress',
      content: 'Monthly Learning Summary for DeShawn Williams\n\nAcademic Overview:\nDeShawn continues to make meaningful progress across all areas. His reading fluency has improved 16% since the start of the year (85 to 99 wpm), and his writing scores have moved from consistently 2/4 to averaging 2.5/4 with one score of 3/4. His math performance remains near grade level.\n\nHighlights This Month:\n- Reached 99 words per minute on fluency probes, approaching the 100 wpm milestone\n- Scored 3/4 on the classroom writing rubric for the first time\n- Participated actively in class discussions during the American Dream unit\n- Attendance: 100% this month\n\nAreas to Monitor:\n- Written expression on timed assessments shows more difficulty than with extended time\n- His American Dream essay was below the minimum length requirement\n- Needs continued support with multi-syllabic word decoding\n\nRecommendations for Home:\n- Continue audiobook use -- it builds vocabulary and comprehension\n- Try 10-minute paired reading sessions 3-4 times per week\n- Celebrate the 100 wpm milestone when he reaches it!\n\nThis summary was generated by AI from classroom and IEP data and reviewed by Ms. Rodriguez.',
      type: 'weekly_digest',
      language: 'en',
      isAIGenerated: true,
      status: 'sent',
      createdAt: daysAgo(15),
    },
    {
      id: createId(),
      senderId: userIds.rivera,
      receiverId: userIds.sarah_chen,
      subject: 'Upcoming: Poetry Analysis Unit',
      content: 'Dear Ms. Chen,\n\nJust a quick note to let you know that we are starting our poetry analysis unit next week. Students will be reading and analyzing poems by Robert Frost, Langston Hughes, and Maya Angelou.\n\nIf Aisha would like to get a head start, she could read any of these poets\' work and come to class with observations about the language the poet uses. There are great collections available at the public library.\n\nLooking forward to seeing Aisha\'s analytical skills shine in this unit!\n\nMs. Rivera',
      type: 'general',
      language: 'en',
      isAIGenerated: false,
      status: 'sent',
      createdAt: daysAgo(12),
    },
  ])
  console.log('  10 messages created.')

  // =========================================================
  // 19. Report Cards
  // =========================================================
  console.log('Creating report cards...')

  await db.insert(schema.reportCards).values([
    {
      id: createId(),
      studentId: userIds.aisha,
      classId: classIds.riveraPeriod1,
      gradingPeriod: 'Fall 2025',
      narrative: 'Aisha is one of the strongest writers in 8th Grade ELA this semester. Her argumentative essays demonstrate a sophisticated ability to develop nuanced thesis statements, integrate textual evidence with analysis rather than summary, and engage genuinely with counterarguments. Her American Dream essay was exemplary in its use of personal voice alongside academic rigor. Aisha participates thoughtfully in class discussions, often building on peers\' ideas with specific textual references. Her next area of growth is writing more concrete, specific conclusions that move beyond broad statements to propose particular actions or visions.',
      strengths: JSON.stringify(['Exceptional argumentative writing with nuanced thesis development', 'Strong textual analysis that goes beyond summary', 'Active and thoughtful class participation']),
      areasForGrowth: JSON.stringify(['Writing more specific and concrete conclusions', 'Varying sentence structure in body paragraphs']),
      recommendations: JSON.stringify(['Consider advanced or honors ELA placement for 9th grade', 'Encourage participation in school literary magazine or writing competitions']),
      gradeRecommendation: 'A-',
      status: 'approved',
      approvedAt: daysAgo(1),
      approvedBy: userIds.rivera,
    },
    {
      id: createId(),
      studentId: userIds.deshawn,
      classId: classIds.riveraPeriod1,
      gradingPeriod: 'Fall 2025',
      narrative: 'DeShawn brings enthusiasm and insightful observations to class discussions, particularly when texts are read aloud. He demonstrates comprehension of complex themes and can articulate his ideas verbally with confidence. His written work this semester shows developing skills in paragraph structure and topic sentence writing, with meaningful progress from the beginning of the year. DeShawn\'s essays are often short of the required length and need more textual evidence to support his arguments. He is working with Ms. Rodriguez on reading fluency and written expression, and the strategies from the resource room are beginning to show results in the general education classroom. With continued support and his strong work ethic, DeShawn is positioned to make significant gains in the spring.',
      strengths: JSON.stringify(['Strong verbal comprehension and discussion contributions', 'Good work ethic and positive attitude toward learning', 'Improving paragraph structure and topic sentences']),
      areasForGrowth: JSON.stringify(['Expanding written responses to meet length requirements', 'Incorporating specific textual evidence in essays', 'Independent reading comprehension of complex texts']),
      recommendations: JSON.stringify(['Continue IEP accommodations including extended time and graphic organizers', 'Pair audiobook listening with text to build fluency', 'Encourage graphic novel reading at home to build reading stamina']),
      gradeRecommendation: 'C+',
      status: 'approved',
      approvedAt: daysAgo(1),
      approvedBy: userIds.rivera,
    },
    {
      id: createId(),
      studentId: userIds.students[0],
      classId: classIds.riveraPeriod1,
      gradingPeriod: 'Fall 2025',
      narrative: 'Jayden is an exceptional student whose writing consistently demonstrates advanced analytical thinking. His American Dream essay was among the strongest in the class, featuring a sophisticated thesis about collective responsibility and carefully selected textual evidence with deep analysis. Jayden\'s vocabulary is precise and varied, and his essay organization creates engaging, cohesive reading experiences. He is also a generous peer collaborator, often helping classmates refine their ideas during workshop sessions. His one area for development is incorporating more diverse perspectives into his arguments -- his essays tend to present one strong viewpoint without fully exploring the complexity of opposing positions.',
      strengths: JSON.stringify(['Advanced analytical writing with sophisticated thesis statements', 'Precise vocabulary and varied sentence structures', 'Strong peer collaboration skills']),
      areasForGrowth: JSON.stringify(['Exploring multiple perspectives more fully in argumentative writing', 'Engaging more deeply with counterarguments']),
      recommendations: JSON.stringify(['Consider advanced or honors placement for 9th grade', 'Encourage independent reading of opinion and editorial writing to strengthen perspective-taking']),
      gradeRecommendation: 'A',
      status: 'approved',
      approvedAt: daysAgo(1),
      approvedBy: userIds.rivera,
    },
    {
      id: createId(),
      studentId: userIds.students[1],
      classId: classIds.riveraPeriod1,
      gradingPeriod: 'Fall 2025',
      narrative: 'Sofia has shown steady growth as a writer this semester. Her essays demonstrate a solid understanding of essay structure and she consistently includes evidence from assigned texts. Her American Dream essay had a clear thesis and logical organization. The primary area for development is moving from summarizing texts to analyzing them -- explaining not just what happened but why it matters and how it connects to the argument. Sofia\'s class participation has increased over the semester, and she shows particular strength when discussing themes related to family and identity. Her personal connections in writing add authenticity that enriches her arguments.',
      strengths: JSON.stringify(['Clear essay structure with logical organization', 'Consistent use of textual evidence', 'Meaningful personal connections that enrich arguments']),
      areasForGrowth: JSON.stringify(['Moving from summary to analysis of evidence', 'Developing counterarguments more fully', 'Adding transitions between paragraphs']),
      recommendations: JSON.stringify(['Practice the "So what?" technique after citing evidence', 'Read model essays to see how strong writers analyze evidence']),
      gradeRecommendation: 'B+',
      status: 'approved',
      approvedAt: daysAgo(1),
      approvedBy: userIds.rivera,
    },
    {
      id: createId(),
      studentId: userIds.students[2],
      classId: classIds.riveraPeriod1,
      gradingPeriod: 'Fall 2025',
      narrative: 'Ethan has the ideas and comprehension to succeed in 8th Grade ELA but struggles to translate his understanding into polished written work. His essays show that he grasps the core concepts of the texts we study, but his writing lacks the development and evidence use required at the 8th grade level. Capitalization, punctuation, and spelling errors are frequent and sometimes impede comprehension. Ethan benefits from structured support such as graphic organizers and tends to produce stronger work when given extended time. He participates in class discussions when called upon but rarely volunteers. Building his confidence as a writer and establishing consistent revision habits will be key goals for the spring semester.',
      strengths: JSON.stringify(['Demonstrates comprehension of complex themes in discussion', 'Responds well to structured supports and graphic organizers', 'Shows creative thinking in his ideas']),
      areasForGrowth: JSON.stringify(['Developing paragraphs with sufficient detail and evidence', 'Grammar, capitalization, and spelling accuracy', 'Building confidence to participate voluntarily in discussions']),
      recommendations: JSON.stringify(['Establish a revision checklist habit: capitalize, punctuate, then check evidence', 'Consider additional writing support through after-school tutoring', 'Focus on one mechanical skill at a time to avoid overwhelm']),
      gradeRecommendation: 'B-',
      status: 'draft',
    },
  ])
  console.log('  5 report cards created.')

  // =========================================================
  // 20. Quizzes
  // =========================================================
  console.log('Creating quizzes...')

  const quizIds = {
    elaVocab: createId(),
    cellBiology: createId(),
  }

  await db.insert(schema.quizzes).values([
    {
      id: quizIds.elaVocab,
      title: 'ELA Vocabulary: Unit 3',
      subject: 'ELA',
      gradeLevel: '8',
      standards: JSON.stringify(['RL.8.1', 'L.8.1']),
      difficultyLevel: 'mixed',
      timeLimit: 20,
      createdBy: userIds.rivera,
    },
    {
      id: quizIds.cellBiology,
      title: 'Cell Biology Review',
      subject: 'Science',
      gradeLevel: '10',
      standards: JSON.stringify(['HS-LS1-1', 'HS-LS1-2']),
      difficultyLevel: 'mixed',
      timeLimit: 25,
      createdBy: userIds.okafor,
    },
  ])

  // ELA Vocabulary quiz questions
  const elaQuestions = [
    { text: 'What does the word "ambiguous" mean?', options: ['Clear and obvious', 'Having more than one possible meaning', 'Angry or hostile', 'Extremely old'], answer: 'Having more than one possible meaning', explanation: 'Ambiguous means open to more than one interpretation or having a double meaning.', blooms: 'Remember', points: 1 },
    { text: 'Which sentence uses "juxtaposition" correctly?', options: ['The juxtaposition of wealth and poverty in the novel highlighted social inequality.', 'She juxtapositioned her bag on the table.', 'The juxtaposition was very loud.', 'He felt a juxtaposition in his stomach.'], answer: 'The juxtaposition of wealth and poverty in the novel highlighted social inequality.', explanation: 'Juxtaposition means placing two things side by side for comparison or contrast.', blooms: 'Understand', points: 1 },
    { text: 'The word "benevolent" most closely means:', options: ['Evil and harmful', 'Well-meaning and kindly', 'Confused and lost', 'Extremely wealthy'], answer: 'Well-meaning and kindly', explanation: 'Benevolent describes someone who is kind, generous, and well-intentioned.', blooms: 'Remember', points: 1 },
    { text: 'Read the sentence: "The politician\'s rhetoric was designed to appeal to voters\' emotions." What does "rhetoric" mean in this context?', options: ['Physical gestures', 'The art of persuasive speaking or writing', 'A type of government policy', 'Factual data and statistics'], answer: 'The art of persuasive speaking or writing', explanation: 'Rhetoric refers to the art of effective or persuasive language, especially in public speaking.', blooms: 'Apply', points: 1 },
    { text: 'Which word is a synonym for "ephemeral"?', options: ['Permanent', 'Fleeting', 'Beautiful', 'Dangerous'], answer: 'Fleeting', explanation: 'Ephemeral means lasting for a very short time, making "fleeting" the closest synonym.', blooms: 'Remember', points: 1 },
    { text: 'In the sentence "Her voice was mellifluous," the author is suggesting the voice was:', options: ['Harsh and grating', 'Sweet and musical', 'Extremely quiet', 'Deep and booming'], answer: 'Sweet and musical', explanation: 'Mellifluous means sweet-sounding, pleasant to hear, like flowing honey.', blooms: 'Understand', points: 1 },
    { text: 'Which of the following is an example of a "paradox"?', options: ['The early bird catches the worm', 'Less is more', 'Time flies when you\'re having fun', 'A stitch in time saves nine'], answer: 'Less is more', explanation: 'A paradox is a statement that contradicts itself but contains truth. "Less is more" contradicts itself (less cannot literally be more) but expresses a real insight.', blooms: 'Analyze', points: 1 },
    { text: 'What is the difference between "connotation" and "denotation"?', options: ['Connotation is the dictionary definition; denotation is the emotional meaning', 'Connotation is the emotional association; denotation is the literal dictionary meaning', 'They mean the same thing', 'Connotation refers to nouns; denotation refers to verbs'], answer: 'Connotation is the emotional association; denotation is the literal dictionary meaning', explanation: 'Denotation is the literal, dictionary definition of a word, while connotation is the emotional or cultural associations a word carries beyond its literal meaning.', blooms: 'Understand', points: 1 },
    { text: 'An author who uses "sardonic" humor is being:', options: ['Gentle and warm', 'Silly and playful', 'Mocking and cynical', 'Sad and melancholy'], answer: 'Mocking and cynical', explanation: 'Sardonic describes humor that is grimly mocking or cynical, often with an edge of contempt.', blooms: 'Apply', points: 1 },
    { text: 'Analyze this passage: "The old house stood silently, its windows like hollow eyes watching the street." Which literary device is being used, and what effect does it create?', options: ['Simile and personification -- the house is compared to a living thing with eyes, creating an eerie atmosphere', 'Only metaphor -- the house is literally alive', 'Alliteration -- the repeated "s" sounds create suspense', 'Hyperbole -- the author is exaggerating for humor'], answer: 'Simile and personification -- the house is compared to a living thing with eyes, creating an eerie atmosphere', explanation: 'The passage uses simile ("like hollow eyes") and personification (the house "watching") to create a haunting, eerie tone.', blooms: 'Analyze', points: 2 },
  ]

  await db.insert(schema.quizQuestions).values(
    elaQuestions.map((q, i) => ({
      id: createId(),
      quizId: quizIds.elaVocab,
      type: 'multiple_choice',
      questionText: q.text,
      options: JSON.stringify(q.options),
      correctAnswer: q.answer,
      explanation: q.explanation,
      bloomsLevel: q.blooms,
      points: q.points,
      orderIndex: i + 1,
    }))
  )

  // Cell Biology quiz questions
  const cellQuestions = [
    { type: 'multiple_choice', text: 'Which organelle is responsible for producing energy (ATP) in the cell?', options: JSON.stringify(['Nucleus', 'Mitochondria', 'Ribosome', 'Golgi apparatus']), answer: 'Mitochondria', explanation: 'Mitochondria are often called the "powerhouse of the cell" because they produce ATP through cellular respiration.', blooms: 'Remember', points: 1 },
    { type: 'multiple_choice', text: 'What is the primary function of the cell membrane?', options: JSON.stringify(['Store genetic information', 'Produce proteins', 'Control what enters and exits the cell', 'Break down waste materials']), answer: 'Control what enters and exits the cell', explanation: 'The cell membrane is selectively permeable, regulating the movement of substances into and out of the cell.', blooms: 'Remember', points: 1 },
    { type: 'multiple_choice', text: 'Which structure is found in plant cells but NOT in animal cells?', options: JSON.stringify(['Mitochondria', 'Cell wall', 'Nucleus', 'Ribosomes']), answer: 'Cell wall', explanation: 'Plant cells have a rigid cell wall outside the cell membrane that provides structural support. Animal cells lack this structure.', blooms: 'Remember', points: 1 },
    { type: 'multiple_choice', text: 'A cell is placed in a hypertonic solution. What will happen?', options: JSON.stringify(['The cell will swell', 'The cell will shrink as water moves out', 'Nothing will change', 'The cell will divide']), answer: 'The cell will shrink as water moves out', explanation: 'In a hypertonic solution, water moves out of the cell by osmosis because the concentration of solutes is higher outside the cell.', blooms: 'Apply', points: 1 },
    { type: 'short_answer', text: 'Explain how the structure of the mitochondria relates to its function. Include the terms "inner membrane," "cristae," and "surface area" in your response.', options: null, answer: 'The mitochondria has a folded inner membrane forming cristae, which increases the surface area available for the chemical reactions of cellular respiration, allowing more ATP to be produced efficiently.', explanation: 'The folded inner membrane (cristae) maximizes surface area for the electron transport chain, the final stage of cellular respiration where most ATP is produced.', blooms: 'Analyze', points: 3 },
    { type: 'multiple_choice', text: 'During which phase of mitosis do chromosomes line up along the center of the cell?', options: JSON.stringify(['Prophase', 'Metaphase', 'Anaphase', 'Telophase']), answer: 'Metaphase', explanation: 'During metaphase, chromosomes align along the metaphase plate (cell equator), preparing for separation.', blooms: 'Remember', points: 1 },
    { type: 'multiple_choice', text: 'What is the relationship between DNA, genes, and chromosomes?', options: JSON.stringify(['DNA is made of chromosomes, which contain genes', 'Genes are made of chromosomes, which contain DNA', 'Chromosomes contain DNA, which is organized into genes', 'They are three different names for the same thing']), answer: 'Chromosomes contain DNA, which is organized into genes', explanation: 'Chromosomes are structures made of DNA. Genes are specific segments of DNA that code for particular proteins or traits.', blooms: 'Understand', points: 1 },
    { type: 'short_answer', text: 'Compare and contrast passive transport and active transport across a cell membrane. Give one example of each.', options: null, answer: 'Passive transport moves substances from high to low concentration without energy (e.g., osmosis or diffusion). Active transport moves substances from low to high concentration and requires energy/ATP (e.g., sodium-potassium pump). Both move substances across the cell membrane.', explanation: 'The key distinction is energy requirement: passive transport follows the concentration gradient naturally, while active transport works against it and requires cellular energy.', blooms: 'Analyze', points: 3 },
  ]

  await db.insert(schema.quizQuestions).values(
    cellQuestions.map((q, i) => ({
      id: createId(),
      quizId: quizIds.cellBiology,
      type: q.type,
      questionText: q.text,
      options: q.options,
      correctAnswer: q.answer,
      explanation: q.explanation,
      bloomsLevel: q.blooms,
      points: q.points,
      orderIndex: i + 1,
    }))
  )
  console.log('  2 quizzes with 18 questions created.')

  // =========================================================
  // 21. Second IEP (Ethan Nakamura - ADHD)
  // =========================================================
  console.log('Creating IEP data for Ethan Nakamura...')

  // Add Ethan to Rodriguez's Resource Room
  await db.insert(schema.classMembers).values({
    classId: classIds.rodriguezResource,
    userId: userIds.students[2],
    role: 'student',
  })

  const ethanIepId = createId()

  await db.insert(schema.ieps).values({
    id: ethanIepId,
    studentId: userIds.students[2],
    authorId: userIds.rodriguez,
    status: 'active',
    startDate: daysAgo(120),
    endDate: daysFromNow(245),
    presentLevels: `Ethan is a 13-year-old 8th grader at Washington Middle School. He is a creative and curious student who shows strong verbal reasoning skills and genuine interest in science and technology. Ethan was identified with Attention-Deficit/Hyperactivity Disorder (ADHD), predominantly inattentive presentation, in 5th grade.

Academic Performance - ELA:
Ethan demonstrates grade-level reading comprehension when he is engaged with the material. His oral contributions during class discussions are often insightful and show strong inferential thinking. Written work is inconsistent: when Ethan is focused and uses organizational supports, he produces work in the developing-to-proficient range. Without supports, his writing tends to be disorganized, with incomplete thoughts and frequent errors in capitalization and punctuation. His most recent STAR Reading score placed him at the 45th percentile. Written assignments are frequently submitted late or incomplete.

Academic Performance - Math/Science:
Ethan performs at grade level in mathematics (55th percentile on STAR Math) and shows particular strength in science, where hands-on labs and visual materials maintain his attention. He scored well on the cell structure lab report when given extended time and a structured template.

Functional Performance:
Ethan has difficulty sustaining attention during independent work periods longer than 10-15 minutes. He frequently loses materials, forgets assignment due dates, and struggles with multi-step directions. He benefits from visual schedules, check-in reminders, and proximity to instruction. Ethan is well-liked by peers and has a good sense of humor. He does not exhibit behavioral difficulties but can become withdrawn when he feels overwhelmed by workload.

Impact of Disability:
Ethan's ADHD significantly impacts his ability to organize, initiate, and complete academic tasks independently. His attention difficulties result in incomplete assignments, missed deadlines, and written work that does not reflect his true understanding of the material. These challenges affect his performance across all content areas.`,
    disabilityCategory: 'Other Health Impairment (ADHD)',
    accommodations: JSON.stringify([
      { type: 'instructional', description: 'Preferential seating near instruction and away from distractions' },
      { type: 'instructional', description: 'Check-in at the start of each independent work period to ensure understanding of directions' },
      { type: 'instructional', description: 'Break long assignments into smaller, manageable chunks with intermediate deadlines' },
      { type: 'instructional', description: 'Visual schedule and assignment tracker reviewed daily' },
      { type: 'assessment', description: 'Extended time (1.5x) on tests and quizzes' },
      { type: 'assessment', description: 'Separate, reduced-distraction testing environment' },
      { type: 'environmental', description: 'Movement breaks every 20 minutes during extended work sessions' },
      { type: 'environmental', description: 'Access to noise-canceling headphones during independent work' },
    ]),
    modifications: JSON.stringify([]),
    relatedServices: JSON.stringify([
      { service: 'Specialized Academic Instruction', frequency: '150 minutes per week', location: 'Resource Room', provider: 'Ms. Rodriguez' },
    ]),
    meetingDate: daysAgo(120),
    meetingNotes: 'Annual IEP meeting attended by parent, gen ed teacher (Ms. Rivera), SPED teacher (Ms. Rodriguez), school psychologist, and assistant principal. Team reviewed Ethan\'s progress on organizational goals from the previous IEP. Parent reported that Ethan responds well to visual checklists and timers at home. Team agreed on a new goal focused on task initiation and completion.',
    parentInput: 'Ethan\'s parents shared that he is most productive when tasks are broken into small steps with clear expectations. They use a visual checklist at home that has helped with homework completion. They requested that teachers provide advance notice of major assignments so they can help Ethan plan at home.',
  })

  const ethanGoalId = createId()

  await db.insert(schema.iepGoals).values({
    id: ethanGoalId,
    iepId: ethanIepId,
    area: 'Organization and Task Completion',
    goalText: 'By the end of the IEP period, Ethan will independently initiate and complete 80% of in-class assignments within the allotted time using his visual checklist and self-monitoring strategies, as measured by weekly teacher tracking logs, improving from a baseline of 45% assignment completion.',
    baseline: '45% of in-class assignments completed within allotted time (October 2025)',
    target: '80% of in-class assignments completed within allotted time',
    measureMethod: 'Weekly teacher tracking log recording assignment initiation and completion',
    frequency: 'Weekly',
    timeline: '12 months',
    status: 'active',
    aiGenerated: false,
  })

  // Progress data for Ethan's goal
  const ethanProgressData = [
    { value: 45, date: daysAgo(120), notes: 'Baseline: 45% completion rate over 2-week observation period' },
    { value: 48, date: daysAgo(106), notes: 'Introduced visual checklist. Ethan is learning to use it but needs frequent prompts.' },
    { value: 52, date: daysAgo(92), notes: 'Slight improvement. Ethan initiates tasks more quickly when checklist is visible on desk.' },
    { value: 55, date: daysAgo(78), notes: 'Added self-monitoring timer. Ethan checks off steps independently about half the time.' },
    { value: 60, date: daysAgo(64), notes: 'Good week. Completed 6 of 10 assignments on time. Responds well to movement breaks.' },
    { value: 58, date: daysAgo(50), notes: 'Slight dip after a long weekend. Took 2 days to re-establish routine.' },
    { value: 63, date: daysAgo(36), notes: 'Steady improvement. Using checklist independently most of the time.' },
    { value: 65, date: daysAgo(22), notes: 'Completed 13 of 20 assignments this period. On track for goal.' },
  ]

  await db.insert(schema.progressDataPoints).values(
    ethanProgressData.map((dp) => ({
      id: createId(),
      goalId: ethanGoalId,
      studentId: userIds.students[2],
      value: dp.value,
      unit: '% assignments completed',
      date: dp.date,
      notes: dp.notes,
      recordedBy: userIds.rodriguez,
    }))
  )

  // Compliance deadline for Ethan
  await db.insert(schema.complianceDeadlines).values({
    id: createId(),
    type: 'annual_review',
    studentId: userIds.students[2],
    dueDate: daysFromNow(90),
    status: 'upcoming',
    notes: 'Annual IEP review for Ethan Nakamura. Parent to be invited 10 days prior.',
  })

  console.log('  1 IEP (Ethan) with 1 goal, 8 progress data points, and 1 compliance deadline created.')

  // =========================================================
  // Done
  // =========================================================
  console.log('\nSeed complete!')
  console.log('Summary:')
  console.log(`  Users: ${usersToInsert.length}`)
  console.log('  District: 1, Schools: 2')
  console.log(`  Classes: ${classesToInsert.length}`)
  console.log(`  Class memberships: ${classMembersToInsert.length + 1} (includes Ethan in Resource Room)`)
  console.log('  Parent-child links: 2')
  console.log(`  Standards: ${standardsToInsert.length}`)
  console.log('  Rubrics: 2, Criteria: 8')
  console.log('  Assignments: 9')
  console.log(`  Submissions: ${submissionRecords.length + poetrySubRecords.length + narrativeSubRecords.length + geneticsSubRecords.length + multiplicationSubRecords.length + readingResponseSubRecords.length}`)
  console.log(`  Feedback drafts: ${feedbackData.length + poetryFeedback.length + 3 + geneticsSubRecords.length + 2}`)
  console.log('  Criterion scores: 20 (poetry)')
  console.log('  IEPs: 2, Goals: 3')
  console.log(`  Progress data points: ${fluencyDataPoints.length + writingDataPoints.length + ethanProgressData.length}`)
  console.log('  Compliance deadlines: 3')
  console.log(`  Mastery records: ${masteryData.length + additionalMastery.length}`)
  console.log('  Lesson plans: 6')
  console.log('  Tutor sessions: 5')
  console.log('  Messages: 10')
  console.log('  Report cards: 5')
  console.log('  Quizzes: 2, Questions: 18')

  await client.end()
}

seed().catch((err) => {
  console.error('Seed failed:', err)
  process.exit(1)
})
