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
  ])
  console.log('  3 assignments created.')

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
  // Done
  // =========================================================
  console.log('\nSeed complete!')
  console.log('Summary:')
  console.log(`  Users: ${usersToInsert.length}`)
  console.log('  District: 1, Schools: 2')
  console.log(`  Classes: ${classesToInsert.length}`)
  console.log(`  Class memberships: ${classMembersToInsert.length}`)
  console.log('  Parent-child links: 2')
  console.log(`  Standards: ${standardsToInsert.length}`)
  console.log('  Rubrics: 2, Criteria: 8')
  console.log('  Assignments: 3')
  console.log(`  Submissions: ${submissionRecords.length}`)
  console.log(`  Feedback drafts: ${feedbackData.length}`)
  console.log('  IEPs: 1, Goals: 2')
  console.log(`  Progress data points: ${fluencyDataPoints.length + writingDataPoints.length}`)
  console.log('  Compliance deadlines: 2')
  console.log(`  Mastery records: ${masteryData.length}`)

  await client.end()
}

seed().catch((err) => {
  console.error('Seed failed:', err)
  process.exit(1)
})
