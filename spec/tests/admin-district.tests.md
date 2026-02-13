# Admin/District Intelligence and Report Cards

> Behavioral tests for the district administration dashboard (overview, analytics, schools, teachers, students, AI insights) and the AI-generated report card system (single generation, batch generation, approval workflow).

---

## Admin Overview (GET /api/admin/overview)

### Returns aggregate totals for an admin user

**Given** the authenticated user has the "admin" role

**When** the client sends GET /api/admin/overview

**Then** the response status is 200
**And** the response body contains a "totals" object with:
  - schools: a number
  - teachers: a number (sum of teacher and sped_teacher users)
  - students: a number
  - classes: a number
  - assignments: a number
  - submissions: a number

---

### Returns recent activity metrics

**Given** the authenticated user has the "admin" role
**And** 3 assignments were created within the last 7 days
**And** 8 submissions were graded within the last 7 days

**When** the client sends GET /api/admin/overview

**Then** the response status is 200
**And** the response body contains a "recentActivity" object with:
  - assignmentsCreatedThisWeek: 3
  - submissionsGradedThisWeek: 8

---

### Returns the grading pipeline count

**Given** the authenticated user has the "admin" role
**And** 5 submissions have status "submitted" (ungraded)

**When** the client sends GET /api/admin/overview

**Then** the response body contains a "gradingPipeline" object with:
  - ungradedSubmissions: 5

---

### Teacher count includes both teacher and sped_teacher roles

**Given** the authenticated user has the "admin" role
**And** there are 3 users with role "teacher" and 1 user with role "sped_teacher"

**When** the client sends GET /api/admin/overview

**Then** the response body field "totals.teachers" is 4

---

### Returns 401 when not authenticated

**Given** no user is authenticated

**When** the client sends GET /api/admin/overview

**Then** the response status is 401
**And** the response body contains error "Unauthorized"

---

### Returns 403 when the user has the teacher role

**Given** the authenticated user has the "teacher" role

**When** the client sends GET /api/admin/overview

**Then** the response status is 403
**And** the response body contains error "Forbidden"

---

### Allows access for district_admin role

**Given** the authenticated user has the "district_admin" role

**When** the client sends GET /api/admin/overview

**Then** the response status is 200
**And** the response body contains a "totals" object

---

## District Analytics (GET /api/admin/analytics)

### Returns standards mastery distribution

**Given** the authenticated user has the "admin" role
**And** mastery records exist with levels: proficient (10 records), developing (5 records)

**When** the client sends GET /api/admin/analytics

**Then** the response status is 200
**And** the response body field "masteryDistribution" is an array
**And** one entry has level "proficient" with count 10
**And** one entry has level "developing" with count 5

---

### Returns average scores by subject

**Given** the authenticated user has the "admin" role
**And** ELA submissions exist with an average score of 82.5% across 15 submissions

**When** the client sends GET /api/admin/analytics

**Then** the response body field "subjectScores" is an array
**And** one entry has subject "ELA", avgScore 82.5, and submissionCount 15

---

### Returns grading completion statistics

**Given** the authenticated user has the "admin" role
**And** there are 30 total submissions, of which 20 are graded or returned

**When** the client sends GET /api/admin/analytics

**Then** the response body field "gradingCompletion" contains:
  - total: 30
  - graded: 20
  - completionRate: 66.67

---

### Returns teacher engagement aggregate counts

**Given** the authenticated user has the "admin" role
**And** 5 total teachers exist (teacher + sped_teacher)
**And** 3 teachers have created assignments
**And** 2 teachers have created lesson plans
**And** 2 teachers have created rubrics
**And** 1 teacher has generated AI feedback drafts

**When** the client sends GET /api/admin/analytics

**Then** the response body field "teacherEngagement" contains:
  - totalTeachers: 5
  - withAssignments: 3
  - withLessonPlans: 2
  - withRubrics: 2
  - withFeedbackDrafts: 1

---

### Returns a top teachers list sorted by assignment count

**Given** the authenticated user has the "admin" role
**And** Ms. Rivera has 5 assignments and Mr. Okafor has 3 assignments

**When** the client sends GET /api/admin/analytics

**Then** the response body field "teacherEngagement.topTeachers" is an array
**And** each entry contains: teacherId, teacherName, teacherEmail, assignmentCount, submissionCount, gradedCount, feedbackCount
**And** the list is limited to at most 10 teachers

---

### Returns 401 when not authenticated

**Given** no user is authenticated

**When** the client sends GET /api/admin/analytics

**Then** the response status is 401
**And** the response body contains error "Unauthorized"

---

### Returns 403 for student role

**Given** the authenticated user has the "student" role

**When** the client sends GET /api/admin/analytics

**Then** the response status is 403
**And** the response body contains error "Forbidden"

---

## Schools (GET /api/admin/schools)

### Returns all schools with computed metrics

**Given** the authenticated user has the "admin" role
**And** a school named "Lincoln Middle School" exists in the "Springfield USD" district
**And** the school has 2 classes, 2 teachers, and 15 students

**When** the client sends GET /api/admin/schools

**Then** the response status is 200
**And** the response body field "schools" is an array
**And** the entry for "Lincoln Middle School" contains:
  - id: a string
  - name: "Lincoln Middle School"
  - district: "Springfield USD"
  - classCount: 2
  - teacherCount: 2
  - studentCount: 15
  - assignmentCount: a number
  - avgScore: a number or null

---

### School avgScore is null when no graded submissions exist

**Given** the authenticated user has the "admin" role
**And** a school "New Academy" has classes but zero graded submissions

**When** the client sends GET /api/admin/schools

**Then** the school entry for "New Academy" has avgScore: null

---

### Returns 401 when not authenticated

**Given** no user is authenticated

**When** the client sends GET /api/admin/schools

**Then** the response status is 401

---

### Returns 403 for teacher role

**Given** the authenticated user has the "teacher" role

**When** the client sends GET /api/admin/schools

**Then** the response status is 403

---

## Teachers (GET /api/admin/teachers)

### Returns all teachers with engagement metrics

**Given** the authenticated user has the "admin" role
**And** a teacher "Ms. Rivera" (rivera@school.edu) teaches at "Lincoln Middle School"
**And** she has 2 classes, 5 assignments, 12 graded submissions, and 8 AI feedback drafts

**When** the client sends GET /api/admin/teachers

**Then** the response status is 200
**And** the response body field "teachers" is an array
**And** the entry for "Ms. Rivera" contains:
  - name: "Ms. Rivera"
  - email: "rivera@school.edu"
  - role: "teacher"
  - school: "Lincoln Middle School"
  - classesTaught: 2
  - assignmentsCreated: 5
  - submissionsGraded: 12
  - feedbackDraftsCreated: 8

---

### Teachers are sorted by total activity (assignments + graded)

**Given** the authenticated user has the "admin" role
**And** Teacher A has 10 assignments and 20 graded submissions
**And** Teacher B has 3 assignments and 5 graded submissions

**When** the client sends GET /api/admin/teachers

**Then** Teacher A appears before Teacher B in the response array

---

### Includes both teacher and sped_teacher roles

**Given** the authenticated user has the "admin" role
**And** a sped_teacher "Ms. Rodriguez" exists

**When** the client sends GET /api/admin/teachers

**Then** Ms. Rodriguez appears in the teachers array with role "sped_teacher"

---

### Returns 401 when not authenticated

**Given** no user is authenticated

**When** the client sends GET /api/admin/teachers

**Then** the response status is 401

---

### Returns 403 for student role

**Given** the authenticated user has the "student" role

**When** the client sends GET /api/admin/teachers

**Then** the response status is 403

---

## Students (GET /api/admin/students)

### Returns all students with performance metrics

**Given** the authenticated user has the "admin" role
**And** a student "Aisha Torres" (aisha@student.edu) is enrolled in 1 class at grade level "8"
**And** Aisha has an average score of 85.2%
**And** Aisha has mastery records: proficient (3), developing (1)

**When** the client sends GET /api/admin/students

**Then** the response status is 200
**And** the response body field "students" is an array
**And** the entry for "Aisha Torres" contains:
  - name: "Aisha Torres"
  - email: "aisha@student.edu"
  - gradeLevel: "8"
  - classesEnrolled: 1
  - avgScore: 85.2
  - mastery: { proficient: 3, developing: 1 }

---

### Supports search by name

**Given** the authenticated user has the "admin" role
**And** students "Aisha Torres" and "DeShawn Williams" exist

**When** the client sends GET /api/admin/students?search=aisha

**Then** the response includes "Aisha Torres"
**And** the response does not include "DeShawn Williams"

---

### Supports search by email

**Given** the authenticated user has the "admin" role
**And** students with emails "aisha@student.edu" and "deshawn@student.edu" exist

**When** the client sends GET /api/admin/students?search=deshawn

**Then** the response includes only students matching "deshawn"

---

### Returns gradeLevel as null when a student has no class enrollments

**Given** the authenticated user has the "admin" role
**And** a student "Unassigned Student" is not enrolled in any class

**When** the client sends GET /api/admin/students

**Then** the entry for "Unassigned Student" has gradeLevel: null and classesEnrolled: 0

---

### Returns 401 when not authenticated

**Given** no user is authenticated

**When** the client sends GET /api/admin/students

**Then** the response status is 401

---

### Returns 403 for teacher role

**Given** the authenticated user has the "teacher" role

**When** the client sends GET /api/admin/students

**Then** the response status is 403

---

## AI District Insights (POST /api/admin/insights)

### Generates structured AI insights from district data

**Given** the authenticated user has the "admin" role
**And** the district has schools, teachers, students, assignments, and submissions

**When** the client sends POST /api/admin/insights

**Then** the response status is 200
**And** the response body field "insights" contains:
  - executiveSummary: a non-empty string
  - keyFindings: an array of 3 to 5 strings
  - concerns: an array of 2 to 3 strings
  - recommendations: an array of 3 to 5 strings

---

### Returns the district snapshot alongside insights

**Given** the authenticated user has the "admin" role

**When** the client sends POST /api/admin/insights

**Then** the response body field "snapshot" contains:
  - schools, teachers, students, classes, assignments, submissions: all numbers
  - gradedSubmissions, ungradedSubmissions, aiFeedbackGenerated: all numbers
  - masteryDistribution: a Record of level to count
  - subjectScores: an array of subject/avgScore/submissions objects
  - gradingCompletionRate: a number
  - teacherEngagement: an object with totalTeachers, withAssignments, withLessonPlans, withRubrics, withFeedbackDrafts

---

### Returns a generatedAt timestamp

**Given** the authenticated user has the "admin" role

**When** the client sends POST /api/admin/insights

**Then** the response body contains a "generatedAt" field in ISO 8601 format

---

### Uses tool_use pattern for structured output

**Given** the district insights AI service is called

**When** generateDistrictInsights receives a DistrictSnapshot

**Then** the Anthropic API is called with:
  - a tool named "district_insights" with required fields: executiveSummary, keyFindings, concerns, recommendations
  - tool_choice forcing the "district_insights" tool
**And** the result is extracted from the tool_use content block

---

### Returns 401 when not authenticated

**Given** no user is authenticated

**When** the client sends POST /api/admin/insights

**Then** the response status is 401

---

### Returns 403 for non-admin roles

**Given** the authenticated user has the "teacher" role

**When** the client sends POST /api/admin/insights

**Then** the response status is 403

---

## Report Cards (GET /api/report-cards)

### Returns report cards for a teacher's classes

**Given** the authenticated user has the "teacher" role
**And** the teacher is a member of class "8th ELA" (class-001)
**And** a report card exists for student "Aisha Torres" in class-001

**When** the client sends GET /api/report-cards

**Then** the response status is 200
**And** the response body is an array containing the report card
**And** each entry has: id, studentId, studentName, classId, className, subject, gradeLevel, gradingPeriod, narrative, strengths, areasForGrowth, recommendations, gradeRecommendation, status, generatedAt, approvedAt

---

### Parses JSON-encoded strengths, areasForGrowth, and recommendations into arrays

**Given** the authenticated user has the "teacher" role
**And** a report card has strengths stored as JSON: '["Excellent thesis writing", "Strong evidence use"]'

**When** the client sends GET /api/report-cards

**Then** the strengths field in the response is the array ["Excellent thesis writing", "Strong evidence use"], not a JSON string

---

### Filters by classId query parameter

**Given** the authenticated user has the "teacher" role
**And** the teacher is a member of class-001 and class-002
**And** report cards exist for both classes

**When** the client sends GET /api/report-cards?classId=class-001

**Then** the response only includes report cards from class-001

---

### Returns empty array when classId is not one of the teacher's classes

**Given** the authenticated user has the "teacher" role
**And** the teacher is a member of class-001

**When** the client sends GET /api/report-cards?classId=class-999

**Then** the response status is 200
**And** the response body is an empty array

---

### Returns empty array when teacher has no class memberships

**Given** the authenticated user has the "teacher" role
**And** the teacher is not a member of any class

**When** the client sends GET /api/report-cards

**Then** the response status is 200
**And** the response body is an empty array

---

### Returns 401 when not authenticated

**Given** no user is authenticated

**When** the client sends GET /api/report-cards

**Then** the response status is 401

---

### Returns 403 for student role

**Given** the authenticated user has the "student" role

**When** the client sends GET /api/report-cards

**Then** the response status is 403
**And** the response body error contains "teacher role required"

---

### Returns 403 for parent role

**Given** the authenticated user has the "parent" role

**When** the client sends GET /api/report-cards

**Then** the response status is 403
**And** the response body error contains "teacher role required"

---

## Report Card Generation (POST /api/report-cards)

### Generates a single report card with AI narrative

**Given** the authenticated user has the "teacher" role
**And** the teacher is a member of class "8th ELA" (class-001)
**And** student "Aisha Torres" (student-001) is enrolled in class-001
**And** Aisha has submissions and mastery records for this class

**When** the client sends POST /api/report-cards with body:
  - studentId: "student-001"
  - classId: "class-001"
  - gradingPeriod: "Q1 2025"

**Then** the response status is 201
**And** the response body contains:
  - id: a non-empty string
  - studentName: "Aisha Torres"
  - className: "8th ELA"
  - gradingPeriod: "Q1 2025"
  - narrative: a non-empty string (the AI-generated overall assessment)
  - strengths: an array of strings
  - areasForGrowth: an array of strings
  - recommendations: an array of strings
  - gradeRecommendation: a letter grade (e.g., "A-")
  - status: "draft"

---

### AI narrative generation uses student's first name only (PII reduction)

**Given** the report card AI service is called for student "Aisha Torres"

**When** generateReportCardNarrative is invoked

**Then** the prompt sent to the Anthropic API references the student as "Aisha" (first name only), not "Aisha Torres"

---

### Returns 400 when required fields are missing

**Given** the authenticated user has the "teacher" role

**When** the client sends POST /api/report-cards with body:
  - studentId: "student-001"

**Then** the response status is 400
**And** the response body contains error "studentId, classId, and gradingPeriod are required"

---

### Returns 403 when teacher is not a member of the class

**Given** the authenticated user has the "teacher" role
**And** the teacher is not a member of class-999

**When** the client sends POST /api/report-cards with body:
  - studentId: "student-001"
  - classId: "class-999"
  - gradingPeriod: "Q1 2025"

**Then** the response status is 403
**And** the response body contains error "You do not have access to this class"

---

### Returns 400 when student is not enrolled in the class

**Given** the authenticated user has the "teacher" role
**And** the teacher is a member of class-001
**And** student-002 is not enrolled in class-001

**When** the client sends POST /api/report-cards with body:
  - studentId: "student-002"
  - classId: "class-001"
  - gradingPeriod: "Q1 2025"

**Then** the response status is 400
**And** the response body contains error "Student is not a member of this class"

---

### Gathers submissions, mastery data, and feedback highlights as AI input

**Given** the authenticated user has the "teacher" role
**And** student-001 is in class-001
**And** student-001 has a submission for "Essay 1" scoring 88/100 (B+)
**And** student-001 has mastery record for standard RL.8.1 at "proficient" level, score 85
**And** a feedback draft exists with AI feedback text and strengths

**When** the client sends POST /api/report-cards to generate a report card for student-001

**Then** generateReportCardNarrative is called with input containing:
  - submissions: an array including { assignmentTitle: "Essay 1", score: 88, maxScore: 100, letterGrade: "B+" }
  - masteryData: an array including { standardCode: "RL.8.1", level: "proficient", score: 85 }
  - feedbackHighlights: a non-empty array of strings (limited to 8 items)

---

## Report Card Detail (GET /api/report-cards/[id])

### Returns full report card detail with parsed arrays

**Given** the authenticated user has the "teacher" role
**And** the teacher is a member of the class associated with report card "rc-1"
**And** report card "rc-1" exists with narrative, strengths, areasForGrowth, and recommendations

**When** the client sends GET /api/report-cards/rc-1

**Then** the response status is 200
**And** the response body contains:
  - id: "rc-1"
  - studentName, className, subject, gradeLevel, gradingPeriod
  - narrative: a string
  - strengths: a parsed array of strings
  - areasForGrowth: a parsed array of strings
  - recommendations: a parsed array of strings
  - gradeRecommendation, status, generatedAt, approvedAt, approvedBy

---

### Returns 404 when report card does not exist

**Given** the authenticated user has the "teacher" role

**When** the client sends GET /api/report-cards/nonexistent-id

**Then** the response status is 404
**And** the response body contains error "Report card not found"

---

### Returns 403 when teacher lacks access to the report card's class

**Given** the authenticated user has the "teacher" role
**And** report card "rc-1" is in class-002
**And** the teacher is not a member of class-002

**When** the client sends GET /api/report-cards/rc-1

**Then** the response status is 403
**And** the response body contains error "You do not have access to this report card"

---

## Report Card Update (PUT /api/report-cards/[id])

### Approves a draft report card

**Given** the authenticated user has the "teacher" role
**And** report card "rc-1" has status "draft"
**And** the teacher is a member of the associated class

**When** the client sends PUT /api/report-cards/rc-1 with body:
  - action: "approve"

**Then** the response status is 200
**And** the returned report card has:
  - status: "approved"
  - approvedAt: a timestamp
  - approvedBy: the current teacher's user ID

---

### Edits a report card's narrative fields

**Given** the authenticated user has the "teacher" role
**And** report card "rc-1" exists
**And** the teacher is a member of the associated class

**When** the client sends PUT /api/report-cards/rc-1 with body:
  - narrative: "Updated narrative text"
  - strengths: ["New strength 1", "New strength 2"]

**Then** the response status is 200
**And** the returned report card has:
  - narrative: "Updated narrative text"
  - strengths: ["New strength 1", "New strength 2"]

---

### Applies edits along with approval in a single request

**Given** the authenticated user has the "teacher" role
**And** report card "rc-1" has status "draft"

**When** the client sends PUT /api/report-cards/rc-1 with body:
  - action: "approve"
  - narrative: "Teacher-revised narrative"

**Then** the returned report card has status "approved" and narrative "Teacher-revised narrative"

---

### Returns 400 when no fields to update

**Given** the authenticated user has the "teacher" role
**And** report card "rc-1" exists

**When** the client sends PUT /api/report-cards/rc-1 with body: {}

**Then** the response status is 400
**And** the response body contains error "No fields to update"

---

### Returns 404 when report card does not exist

**Given** the authenticated user has the "teacher" role

**When** the client sends PUT /api/report-cards/nonexistent-id with body:
  - action: "approve"

**Then** the response status is 404

---

### Returns 403 when teacher lacks access to the report card's class

**Given** the authenticated user has the "teacher" role
**And** report card "rc-1" is in a class the teacher is not a member of

**When** the client sends PUT /api/report-cards/rc-1 with body:
  - action: "approve"

**Then** the response status is 403

---

## Batch Report Card Generation (POST /api/report-cards/batch)

### Generates report cards for all students in a class

**Given** the authenticated user has the "teacher" role
**And** the teacher is a member of class-001
**And** class-001 has 3 students: Alice, Bob, and Carol
**And** none of them have a report card for "Q1 2025"

**When** the client sends POST /api/report-cards/batch with body:
  - classId: "class-001"
  - gradingPeriod: "Q1 2025"

**Then** the response status is 200
**And** the response body contains:
  - generated: 3
  - skipped: 0
  - total: 3
  - reportCards: an array of 3 entries, each with status "generated"

---

### Skips students who already have a report card for the same grading period

**Given** the authenticated user has the "teacher" role
**And** class-001 has 3 students
**And** Alice already has a report card for "Q1 2025"

**When** the client sends POST /api/report-cards/batch with body:
  - classId: "class-001"
  - gradingPeriod: "Q1 2025"

**Then** the response body contains:
  - generated: 2
  - skipped: 1
  - total: 3
**And** Alice's entry in reportCards has status "skipped"

---

### Returns zero generated when the class has no students

**Given** the authenticated user has the "teacher" role
**And** the teacher is a member of class-empty
**And** class-empty has zero student members

**When** the client sends POST /api/report-cards/batch with body:
  - classId: "class-empty"
  - gradingPeriod: "Q1 2025"

**Then** the response body contains:
  - generated: 0
  - skipped: 0
  - total: 0
  - reportCards: an empty array

---

### Enforces a maximum batch size of 40 students

**Given** the authenticated user has the "teacher" role
**And** class-large has 45 students

**When** the client sends POST /api/report-cards/batch with body:
  - classId: "class-large"
  - gradingPeriod: "Q1 2025"

**Then** the response status is 400
**And** the response body error contains "Batch size exceeds limit"
**And** the error message mentions "Maximum 40 students per batch"

---

### Returns 400 when required fields are missing

**Given** the authenticated user has the "teacher" role

**When** the client sends POST /api/report-cards/batch with body:
  - classId: "class-001"

**Then** the response status is 400
**And** the response body contains error "classId and gradingPeriod are required"

---

### Returns 403 when teacher lacks access to the class

**Given** the authenticated user has the "teacher" role
**And** the teacher is not a member of class-999

**When** the client sends POST /api/report-cards/batch with body:
  - classId: "class-999"
  - gradingPeriod: "Q1 2025"

**Then** the response status is 403

---

### All generated report cards are created with status "draft"

**Given** the authenticated user has the "teacher" role
**And** batch generation completes for 3 students

**When** the client sends POST /api/report-cards/batch

**Then** each report card inserted into the database has status "draft"

---

## Report Card Database Schema

### Report card table has the required columns

**Given** the reportCards table schema

**Then** it has columns:
  - id: text, primary key (cuid2)
  - studentId: text, not null, references users.id
  - classId: text, not null, references classes.id
  - gradingPeriod: text, not null
  - narrative: text, not null
  - strengths: text (JSON array, nullable)
  - areasForGrowth: text (JSON array, nullable)
  - recommendations: text (JSON array, nullable)
  - gradeRecommendation: text (nullable)
  - status: text, not null, default "draft"
  - generatedAt: timestamp, not null, default now
  - approvedAt: timestamp (nullable)
  - approvedBy: text, references users.id (nullable)

---

## Report Card AI Generation

### AI service produces structured output using tool_use

**Given** the report card AI service is called

**When** generateReportCardNarrative receives a ReportCardInput

**Then** the Anthropic API is called with:
  - model: the AI_MODEL constant
  - a tool named "generate_report_card" with required fields: overallNarrative, strengths, areasForGrowth, recommendations, gradeRecommendation
  - tool_choice forcing the "generate_report_card" tool
**And** gradeRecommendation is constrained to standard letter grades (A+ through F)
**And** the result is extracted from the tool_use content block

---

### AI system prompt uses parent-friendly, jargon-free language

**Given** the report card AI service is called

**When** generateReportCardNarrative is invoked

**Then** the system prompt instructs the AI to:
  - write in clear, parent-friendly language
  - avoid educational jargon and standards codes in the narrative
  - frame growth areas constructively as opportunities, not deficits
  - ground every claim in the provided data

---

## Report Card UI (/dashboard/report-cards)

### Displays teacher's classes with report card statistics

**Given** the authenticated user is a teacher
**And** the teacher has 2 classes: "8th ELA" (3 students) and "8th Reading" (5 students)
**And** "8th ELA" has 2 draft report cards and 1 approved report card

**When** the user visits /dashboard/report-cards

**Then** the page displays a class card for "8th ELA" showing:
  - "3 students"
  - "3 report cards"
  - "2 drafts"
  - "1 approved"

---

### Uses correct pluralization for draft and card counts

**Given** the authenticated user is a teacher
**And** a class has 1 draft report card and 1 approved report card

**When** the user visits /dashboard/report-cards

**Then** the card displays "1 draft" (not "1 drafts")
**And** "1 report card" (not "1 report cards")

---

### Shows "Generate All" button only for classes with students

**Given** the authenticated user is a teacher
**And** class "Empty Class" has 0 students
**And** class "Active Class" has 5 students

**When** the user visits /dashboard/report-cards

**Then** "Active Class" shows a "Generate All" button
**And** "Empty Class" does not show a "Generate All" button

---

### Recent report cards table shows student names as links

**Given** the authenticated user is a teacher
**And** report cards exist for this teacher's classes

**When** the user visits /dashboard/report-cards

**Then** the "Recent Report Cards" section shows a table
**And** each row has: student name (as a link), class name, grading period, grade recommendation, status badge, generated date

---

## Report Card Detail UI (/dashboard/report-cards/[id])

### Displays full report card with all sections

**Given** the authenticated user is a teacher
**And** report card "rc-1" has narrative, 3 strengths, 2 areas for growth, and 2 recommendations

**When** the user visits /dashboard/report-cards/rc-1

**Then** the page displays:
  - the student's name as the heading
  - class info: class name, subject, grade level, grading period
  - the letter grade recommendation
  - the "Overall Narrative" section with rendered markdown
  - the "Strengths" section with emerald-colored (green) bullet points
  - the "Areas for Growth" section with amber-colored bullet points
  - the "Recommendations" section with blue-colored bullet points

---

### Shows "Powered by Claude" badge

**Given** the authenticated user is a teacher
**And** report card "rc-1" exists

**When** the user visits /dashboard/report-cards/rc-1

**Then** the page displays a "Powered by Claude" badge below the narrative

---

### Shows AI disclosure text

**Given** report card "rc-1" is a draft

**When** the user visits /dashboard/report-cards/rc-1

**Then** the page displays text stating the narrative was generated by AI from longitudinal student performance data
**And** the disclosure mentions the teacher has not yet approved the content

---

### Shows "Approve Report Card" button for drafts

**Given** report card "rc-1" has status "draft"

**When** the user visits /dashboard/report-cards/rc-1

**Then** the page displays an "Approve Report Card" button
**And** the button is styled with a green (emerald) background

---

### Hides "Approve Report Card" button for approved report cards

**Given** report card "rc-1" has status "approved"

**When** the user visits /dashboard/report-cards/rc-1

**Then** the page does not display an "Approve Report Card" button
**And** the page shows a green "Approved" badge and the approval date

---

## Admin Dashboard UI (/dashboard for admin role)

### Displays welcome message and stat cards

**Given** the authenticated user "Dr. Williams" has the "admin" role
**And** the district has 2 schools, 4 teachers, 22 students, and 5 ungraded submissions

**When** the user visits /dashboard

**Then** the page displays "Welcome back, Dr." (with title prefix)
**And** 4 stat cards appear: Schools (2), Teachers (4), Students (22), Ungraded Submissions (5)

---

### Shows quick action links for Analytics, SPED Compliance, and Schools

**Given** the authenticated user has the "admin" role

**When** the user visits /dashboard

**Then** the "Quick Actions" section contains 3 cards:
  - "Analytics" linking to /dashboard/analytics
  - "SPED Compliance" linking to /dashboard/compliance
  - "Schools" linking to /dashboard/schools

---

## Analytics Page UI (/dashboard/analytics)

### Displays 6 stat cards across the top

**Given** the authenticated user has the "admin" role

**When** the user visits /dashboard/analytics

**Then** the page displays 6 stat cards: Schools, Teachers, Students, Classes, Assignments, Submissions

---

### Shows mastery distribution with four levels

**Given** mastery records exist with levels: advanced, proficient, developing, beginning

**When** the user visits /dashboard/analytics

**Then** the "Standards Mastery Distribution" section displays badges for all four levels with their counts
**And** levels with zero records show count 0

---

### Shows average scores by subject in a table

**Given** subject scores exist for ELA (82%) and Biology (75%)

**When** the user visits /dashboard/analytics

**Then** the "Average Scores by Subject" table lists ELA and Biology with their average scores and submission counts

---

### Shows teacher engagement table with top teachers

**Given** teacher engagement data exists

**When** the user visits /dashboard/analytics

**Then** the "Teacher Engagement" section shows a table with columns: Teacher (name + email), Assignments, Submissions, Graded, AI Feedback

---

### Includes "Generate AI District Insights" button

**Given** the authenticated user has the "admin" role

**When** the user visits /dashboard/analytics

**Then** the page displays a "Generate AI District Insights" button
**And** clicking it triggers a POST /api/admin/insights call

---

## Schools Detail Page UI (/dashboard/schools/[schoolId])

### Displays school overview with stat cards

**Given** the authenticated user has the "admin" role
**And** school "Lincoln Middle School" has 3 teachers, 15 students, 4 classes, and an average score of 79%

**When** the user visits /dashboard/schools/lincoln-id

**Then** the page heading is "Lincoln Middle School"
**And** 4 stat cards appear: Teachers (3), Students (15), Classes (4), Average Score (79%)

---

### Shows teachers table with class and assignment counts

**Given** school "Lincoln Middle School" has teacher "Ms. Rivera" teaching 2 classes with 5 assignments

**When** the user visits /dashboard/schools/lincoln-id

**Then** the "Teachers" section shows a table with Ms. Rivera listed
**And** columns include: Name, Classes, Assignments

---

### Shows classes table with subject, student count, and average score

**Given** school "Lincoln Middle School" has class "8th ELA" (subject ELA, grade 8, 12 students, avg score 82%)

**When** the user visits /dashboard/schools/lincoln-id

**Then** the "Classes" section shows a table
**And** the row for "8th ELA" displays subject "ELA", 12 students, and "82%" avg score badge

---

### Shows top subjects by score

**Given** school "Lincoln Middle School" has graded submissions in ELA (82% avg) and Science (75% avg)

**When** the user visits /dashboard/schools/lincoln-id

**Then** the "Top Subjects by Score" card ranks ELA first (82%) and Science second (75%)

---

### Shows mastery distribution for the school

**Given** school "Lincoln Middle School" has students with mastery records

**When** the user visits /dashboard/schools/lincoln-id

**Then** the "Mastery Distribution" card displays counts for Advanced, Proficient, Developing, and Beginning levels

---

## Student Detail Page UI (/dashboard/students/[studentId])

### Displays student overview with stat cards

**Given** the authenticated user has the "admin" role
**And** student "Aisha Torres" is enrolled in 2 classes, has 5 submissions, an average score of 85%, and 3 tutor sessions

**When** the user visits /dashboard/students/aisha-id

**Then** the page heading is "Aisha Torres" with a grade level badge
**And** 4 stat cards appear: Classes Enrolled (2), Submissions (5), Average Score (85%), Tutor Sessions (3)

---

### Shows class enrollment table with teacher names

**Given** student "Aisha Torres" is enrolled in "8th ELA" taught by "Ms. Rivera"

**When** the user visits /dashboard/students/aisha-id

**Then** the "Class Enrollment" section shows a table with columns: Class, Subject, Grade Level, Period, Teacher
**And** "8th ELA" row shows teacher "Ms. Rivera"

---

### Shows mastery breakdown table with standard codes and levels

**Given** student "Aisha Torres" has mastery records for standards RL.8.1 (proficient, 85%) and W.8.2 (developing, 68%)

**When** the user visits /dashboard/students/aisha-id

**Then** the "Mastery Breakdown" table shows RL.8.1 and W.8.2 with their descriptions, scores, and level badges

---

### Shows recent submissions with scores and status badges

**Given** student "Aisha Torres" has a graded submission for "Essay 1" (88/100, B+)

**When** the user visits /dashboard/students/aisha-id

**Then** the "Recent Submissions" table shows "Essay 1" with score "88%", grade "B+", status badge "graded", and the submission date

---

### Shows IEP status section with "View IEP" link when the student has an IEP

**Given** student "Aisha Torres" has an active IEP with disability category "Specific Learning Disability" and 3 goals

**When** the user visits /dashboard/students/aisha-id

**Then** the "IEP Status" section appears
**And** it shows an "active" status badge, "Specific Learning Disability" category, "3 goals", and start/end dates
**And** a "View IEP" link points to /dashboard/iep/{iep-id}

---

### Hides IEP section when the student has no IEPs

**Given** student "DeShawn Williams" has no IEP records

**When** the user visits /dashboard/students/deshawn-id

**Then** the "IEP Status" section does not appear on the page

---

## Students Table UI (/dashboard/students)

### Provides a search input that filters by name or email

**Given** the authenticated user has the "admin" role
**And** students "Aisha Torres" and "DeShawn Williams" exist

**When** the user types "aisha" into the search input

**Then** only "Aisha Torres" is shown in the table
**And** "DeShawn Williams" is hidden

---

### Student names are clickable links to student detail pages

**Given** the authenticated user has the "admin" role
**And** student "Aisha Torres" has id "stu-1"

**When** the user visits /dashboard/students

**Then** "Aisha Torres" in the table is a link to /dashboard/students/stu-1

---

### Mastery distribution shows abbreviated badges

**Given** a student has mastery: advanced (2), proficient (5), developing (1)

**When** the user views the student row in the table

**Then** the mastery column displays badges: "2 Adv", "5 Pro", "1 Dev"
**And** badges use color coding: emerald for advanced, blue for proficient, amber for developing, red for beginning

---

## Teachers Page UI (/dashboard/teachers)

### Displays a SPED badge for sped_teacher role

**Given** the authenticated user has the "admin" role
**And** teacher "Ms. Rodriguez" has role "sped_teacher"

**When** the user visits /dashboard/teachers

**Then** the row for Ms. Rodriguez displays a violet "SPED" badge next to her name

---

### Shows zero AI feedback as plain text, non-zero as a badge

**Given** teacher "Ms. Rivera" has 8 feedback drafts and teacher "Mr. Chen" has 0

**When** the user visits /dashboard/teachers

**Then** Ms. Rivera's AI Feedback column shows a badge with "8"
**And** Mr. Chen's AI Feedback column shows "0" in muted text
