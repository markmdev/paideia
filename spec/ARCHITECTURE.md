# Architecture Specification

This document describes the Paideia system architecture in language-agnostic terms. It provides enough detail for any agent to reimplement the platform in any language or framework while preserving equivalent behavior.

---

## 1. System Overview

Paideia is a K-12 education platform that combines five administrative modules with a student-facing AI tutor. It serves as a unified operating system for instructional design, assessment, special education compliance, family engagement, and district-level intelligence.

### 1.1 User Roles

The system has five user roles. Every user has exactly one role, stored on their user record. Role determines sidebar navigation, dashboard content, API access, and data scoping.

| Role | Key | Description |
|------|-----|-------------|
| Teacher | `teacher` | Creates assignments, lesson plans, rubrics, quizzes, exit tickets. Grades student work with AI assistance. Views mastery data and early warnings for their own classes. Sends messages to parents. |
| SPED Teacher | `sped_teacher` | Has all Teacher capabilities. Additionally manages IEPs, tracks IEP goal progress, monitors compliance deadlines. Can generate AI-assisted IEP components (present levels, goals, accommodations, progress narratives). |
| Admin | `admin` | District-level view across all schools, teachers, and students. Accesses analytics dashboards, early warning system (all students), SPED compliance oversight, and AI-generated district insights. Does not create instructional content. |
| Parent | `parent` | Views their children's progress, grades, mastery, and class enrollments. Sends and receives messages with teachers. Messages support AI-powered translation to other languages. |
| Student | `student` | Views assignments from enrolled classes and submits work. Accesses an AI Socratic tutor for homework help. Views personal progress, mastery data, and assignment history. |

### 1.2 Module Descriptions

**Instructional Design** -- Teachers create standards-aligned content with AI assistance: assignments (with rubrics and differentiated versions), lesson plans, standalone rubrics, quizzes, and exit tickets.

**Assessment Intelligence** -- AI-assisted grading against rubrics (single and batch), grading analytics per assignment, longitudinal mastery tracking per standard, standards gap analysis with reteach recommendations, report card narrative generation, and assessment-driven differentiation.

**Special Education (SPED) & Compliance** -- IEP lifecycle management (create, edit, track). AI generates present levels, measurable goals, and accommodations. Progress monitoring with data entry and narrative generation. Compliance deadline tracking with color-coded urgency (green/yellow/red/overdue).

**Family Engagement** -- Parent dashboard showing each child's grades, mastery, and enrollment. Parent-teacher messaging with AI-powered translation. All AI involvement is disclosed.

**District Intelligence** -- Admin dashboards for district-wide metrics: school counts, teacher engagement, student performance, mastery distribution, grading completion rates. AI-generated strategic insights using extended thinking. Early warning system identifying at-risk students with AI-generated intervention recommendations.

**Student AI Tutor** -- A Socratic tutor that streams responses in real time. It guides students through problems with questions rather than providing direct answers. Adapts language complexity to the student's grade level. Stays within the declared subject. Persists conversation history across sessions.

---

## 2. Application Architecture

### 2.1 Web Application Structure

The application is a server-rendered web application with client-side interactivity. It exposes two categories of routes:

- **Page routes** under `/dashboard/*` -- server-rendered pages that compose the dashboard UI
- **API routes** under `/api/*` -- JSON REST endpoints consumed by the dashboard pages and potentially by external clients

Public pages (landing page at `/`, login at `/login`, registration at `/register`) are accessible without authentication.

### 2.2 Authentication

Authentication uses a JWT strategy with a credentials provider (email + password). The system stores bcrypt-hashed passwords on user records. There are no OAuth providers.

**Login flow:**
1. Client sends email and password to the auth endpoint
2. Server looks up user by email, compares password hash with bcrypt
3. On success, returns a JWT containing `user.id` and `user.role`
4. JWT is stored as an HTTP cookie

**Session shape** (available in every authenticated request):
```
session.user.id    -- string, CUID2 format
session.user.role  -- one of: teacher, sped_teacher, admin, parent, student
session.user.email -- string
session.user.name  -- string
```

**Registration flow:**
- POST to `/api/auth/register` with `name`, `email`, `password`
- Password minimum length: 6 characters
- Password hashed with bcrypt (cost factor 12)
- New users default to `teacher` role
- Returns 409 if email already registered

### 2.3 Middleware and Route Protection

A middleware layer intercepts all non-static requests:

| Condition | Behavior |
|-----------|----------|
| Request to `/api/*` | Pass through (API routes handle their own auth) |
| Authenticated user visiting `/login` or `/register` | Redirect to `/dashboard` |
| Unauthenticated user visiting `/dashboard/*` | Redirect to `/login` |
| All other requests | Pass through |

The middleware matches all routes except static assets (`_next/static`, `_next/image`, `favicon.ico`).

### 2.4 Role-Based Access Control

Access control is enforced at two layers:

**API layer** -- Every API route handler checks the session. Unauthorized requests (no session) receive `401`. Role mismatches receive `403`. Data scoping ensures users only see their own data:
- Teachers see assignments they created, classes they belong to, and students in those classes
- SPED teachers see IEPs they authored (admins see all IEPs)
- Parents see only their linked children's data
- Students see only their own submissions, progress, and enrolled classes
- Admins see all data district-wide

**UI layer** -- The sidebar navigation is role-conditional. Each role sees a different set of navigation groups and items (detailed in Section 5). The dashboard homepage renders a different component per role with role-specific stats and quick actions.

### 2.5 AI Integration Layer

All AI features use a single LLM provider (Anthropic Claude). The client is a singleton instance, preventing duplicate connections in development.

**Two patterns for AI calls:**

#### Structured Output (tool_use pattern)
Used by all generation features (assignments, lesson plans, rubrics, quizzes, exit tickets, grading, IEP goals, report cards, differentiation, district insights, early warning interventions, mastery gap recommendations, translation).

The pattern:
1. Define a tool with a JSON Schema describing the desired output structure
2. Send the request with `tool_choice` forced to that specific tool name
3. The LLM is compelled to return structured data matching the schema
4. Extract the `tool_use` block from the response content array
5. Cast the `input` field of the tool_use block to the expected type

This guarantees structured, parseable output without brittle text parsing.

#### Streaming (tutor pattern)
Used exclusively by the Socratic tutor. The AI client opens a streaming connection. Text chunks are emitted as they arrive, encoded as a byte stream. The API route wraps this in a `ReadableStream` response with `Content-Type: text/plain; charset=utf-8`. The session ID is returned via a custom `X-Session-Id` response header.

After the stream completes, the full response is saved to the tutor session record in the database.

### 2.6 Database Design

The database is PostgreSQL. The ORM layer maps tables to typed schema objects. All tables use CUID2 strings as primary keys (not auto-incrementing integers, not UUIDs).

Connection pooling is used with prepared statements disabled (required for connection pooler compatibility).

**Schema files and their tables:**

| Schema File | Tables |
|-------------|--------|
| auth | `users`, `accounts`, `sessions`, `verificationTokens` |
| classes | `schools`, `districts`, `classes`, `classMembers` |
| standards | `standards` |
| assignments | `assignments`, `rubrics`, `rubricCriteria`, `differentiatedVersions` |
| submissions | `studentSubmissions`, `submissionFeedback`, `feedbackDrafts`, `criterionScores` |
| mastery | `masteryRecords` (aliased `studentMastery` in some contexts) |
| lesson-plans | `lessonPlans` |
| quizzes | `quizzes`, `quizQuestions` |
| sped | `ieps`, `iepGoals`, `iepAccommodations`, `iepProgressEntries`, `complianceDeadlines` |
| communication | `messages`, `parentStudents` (parent-child relationships, aliased `parentChildren`) |
| tutor | `tutorSessions`, `tutorMessages` |
| audit | `auditLogs` |
| report-cards | `reportCards` |

**Key relationships:**
- `classMembers` is a join table linking users to classes with a role (`teacher` or `student`)
- `parentChildren` (or `parentStudents`) links parent users to student users
- `assignments` belong to a teacher (via `teacherId`) and a class (via `classId`)
- `assignments` optionally link to a rubric (via `rubricId`)
- `submissions` link a student to an assignment
- `masteryRecords` link a student to a standard with a score and level
- `ieps` link a student to an author (SPED teacher) with goals, accommodations, and progress entries
- `tutorSessions` belong to a student and store conversation history as serialized JSON

### 2.7 Environment Configuration

The application requires four environment variables:

| Variable | Purpose |
|----------|---------|
| `DATABASE_URL` | PostgreSQL connection string (pooler mode) used by the application |
| `DIRECT_URL` | PostgreSQL direct connection string used by schema migration tools |
| `ANTHROPIC_API_KEY` | API key for the LLM provider |
| `AUTH_SECRET` | Secret for signing JWT tokens |

---

## 3. Module Map

### 3.1 Instructional Design

#### Assignments
| Route | Method | Auth | Role | Description |
|-------|--------|------|------|-------------|
| `/api/assignments` | GET | Required | Any (scoped to teacher's assignments) | List assignments created by the authenticated teacher, joined with class names and rubric titles. Ordered by creation date descending. |
| `/api/assignments` | POST | Required | Any authenticated | Create a new assignment. Required fields: `title`, `description`, `classId`, `gradeLevel`, `subject`. Verifies the teacher is a member of the target class. New assignments start in `draft` status. |
| `/api/assignments/[id]` | GET | Required | Any authenticated | Get a single assignment by ID. |
| `/api/assignments/[id]` | PUT | Required | Owner teacher | Update an assignment. |
| `/api/assignments/[id]` | DELETE | Required | Owner teacher | Delete an assignment. |
| `/api/assignments/generate` | POST | Required | Any authenticated | AI-generate a complete assignment package. Input: `objective`, `subject`, `gradeLevel`, `classId`, optional `type` and `standards`. Returns: assignment, rubric with criteria, success criteria ("I can" statements), and three differentiated versions (below grade, on grade, above grade). Saves all artifacts to the database. Assignment starts in `draft` status. |

**Dashboard pages:**
- `/dashboard/assignments` -- List of teacher's assignments (teacher role) or enrolled assignments (student role)
- `/dashboard/assignments/new` -- Create new assignment form
- `/dashboard/assignments/[id]` -- Assignment detail/edit view

#### Lesson Plans
| Route | Method | Auth | Role | Description |
|-------|--------|------|------|-------------|
| `/api/lesson-plans` | GET | Required | Any authenticated | List lesson plans created by the teacher. JSON fields (`standards`, `objectives`, `materials`, `differentiation`, `aiMetadata`) are parsed from stored JSON strings. |
| `/api/lesson-plans` | POST | Required | Any authenticated | Create a lesson plan manually. Required: `title`, `subject`, `gradeLevel`, `objectives`. |
| `/api/lesson-plans/[id]` | GET | Required | Owner teacher | Get a single lesson plan. |
| `/api/lesson-plans/[id]` | PUT | Required | Owner teacher | Update a lesson plan. |
| `/api/lesson-plans/[id]` | DELETE | Required | Owner teacher | Delete a lesson plan. |
| `/api/lesson-plans/generate` | POST | Required | Any authenticated | AI-generate a lesson plan. Input: `subject`, `gradeLevel`, `topic`, optional `duration`, `standards`, `instructionalModel`. The AI produces a structured plan with warm-up, direct instruction, guided practice, independent practice, closure, materials, differentiation strategies, and assessment plan. Saved to database with AI metadata. |

**Dashboard pages:**
- `/dashboard/lesson-plans` -- List of teacher's lesson plans
- `/dashboard/lesson-plans/new` -- Create/generate new lesson plan

#### Rubrics
| Route | Method | Auth | Role | Description |
|-------|--------|------|------|-------------|
| `/api/rubrics` | GET | Required | Any authenticated | List rubrics created by the teacher with criteria counts. `levels` field is parsed from JSON. |
| `/api/rubrics` | POST | Required | Any authenticated | Create a rubric. Required: `title`, `levels` (array of strings). Optional: `criteria` array with `name`, `weight`, `descriptors` (map of level name to description). |
| `/api/rubrics/[id]` | GET | Required | Owner teacher | Get rubric with all criteria. |
| `/api/rubrics/[id]` | PUT | Required | Owner teacher | Update rubric. |
| `/api/rubrics/[id]` | DELETE | Required | Owner teacher | Delete rubric and its criteria. |
| `/api/rubrics/generate` | POST | Required | Any authenticated | AI-generate a rubric. |

**Dashboard pages:**
- `/dashboard/rubrics` -- List of teacher's rubrics

#### Quizzes
| Route | Method | Auth | Role | Description |
|-------|--------|------|------|-------------|
| `/api/quizzes` | GET | Required | Any authenticated | List quizzes created by the teacher with question counts. |
| `/api/quizzes/generate` | POST | Required | Any authenticated | AI-generate a quiz with questions. |

**Dashboard pages:**
- `/dashboard/quizzes` -- List of teacher's quizzes

#### Exit Tickets
| Route | Method | Auth | Role | Description |
|-------|--------|------|------|-------------|
| `/api/exit-tickets/generate` | POST | Required | `teacher` or `sped_teacher` | AI-generate an exit ticket (3-5 formative assessment questions). Input: `topic`, `gradeLevel`, `subject`, optional `numberOfQuestions` (clamped 3-5), `lessonContext`. |

**Dashboard pages:**
- `/dashboard/exit-tickets` -- Generate and view exit tickets

### 3.2 Assessment Intelligence

#### Grading
| Route | Method | Auth | Role | Description |
|-------|--------|------|------|-------------|
| `/api/grading` | GET | Required | Any authenticated | List submissions for the teacher's assignments. Supports query params: `assignmentId`, `status`. Returns student names, scores, letter grades. Only shows submissions for assignments owned by the teacher. |
| `/api/grading` | POST | Required | Any authenticated | Grade a single submission with AI. Provide either `submissionId` (grade existing) or `assignmentId` + `studentId` + `content` (create and grade). Verifies the teacher owns the assignment and that a rubric exists. The AI scores against each rubric criterion, producing: total score, max score, letter grade, overall feedback, per-criterion scores, strengths, improvements, and next steps. |
| `/api/grading/[submissionId]` | GET | Required | Any authenticated | Get detailed grading results for a single submission. |
| `/api/grading/batch` | POST | Required | Any authenticated | Batch-grade all ungraded submissions for an assignment. Input: `assignmentId`, optional `feedbackTone`. Finds all submissions with status `submitted`, marks them `grading`, runs AI grading for each, and persists results. Returns counts of total, graded, and failed. |
| `/api/grading/analytics` | GET | Required | Any authenticated | Assignment-level analytics. Required query param: `assignmentId`. Returns: average score, score distribution (10% buckets), letter grade distribution, per-criterion averages, common misconceptions (extracted from feedback metadata), and per-student performance breakdown. |
| `/api/grading/differentiate` | POST | Required | `teacher` or `sped_teacher` | Assessment-driven differentiation. Input: `assignmentId`. Groups students into three tiers based on scores (below 60%, 60-84%, 85%+). AI generates follow-up activities for each tier with scaffolding and extensions. |

**Dashboard pages:**
- `/dashboard/grading` -- Grading interface with submission list and AI grading tools

#### Mastery Tracking
| Route | Method | Auth | Role | Description |
|-------|--------|------|------|-------------|
| `/api/mastery` | GET | Required | Any authenticated | Get mastery records for students. Required query param: `classId` or `studentId`. For classId, verifies teacher membership. Returns per-student, per-standard mastery data with traffic light status (red/yellow/green). Takes the most recent record per student-standard pair. |
| `/api/mastery/[studentId]` | GET | Required | Any authenticated | Get a single student's mastery detail. |
| `/api/mastery/update` | POST | Required | Any authenticated | Create mastery records from grading results. Input: `submissionId`, `criterionScores` array. Maps criterion scores to standards via the `rubricCriteria.standardId` link. Computes mastery level from score percentage: 90%+ = advanced, 70%+ = proficient, 50%+ = developing, below 50% = beginning. |
| `/api/mastery/gaps` | GET | Required | Any authenticated | Standards gap analysis for a class. Required: `classId`. Optional: `withRecommendations=true`. Identifies standards where >50% of the class is below proficient. When recommendations are requested, AI generates reteach activities and grouping strategies. |

**Dashboard pages:**
- `/dashboard/reports` -- Mastery reports and gap analysis

#### Report Cards
| Route | Method | Auth | Role | Description |
|-------|--------|------|------|-------------|
| `/api/report-cards` | GET | Required | `teacher` or `sped_teacher` | List report cards for the teacher's classes. Optional filter: `classId`. |
| `/api/report-cards` | POST | Required | `teacher` or `sped_teacher` | Generate a report card narrative with AI. Input: `studentId`, `classId`, `gradingPeriod`. Gathers the student's submissions, mastery data, and feedback highlights for the class, then generates a narrative with strengths, areas for growth, recommendations, and a grade recommendation. Saved in `draft` status. |
| `/api/report-cards/[id]` | GET | Required | Teacher of the class | Get a single report card. |
| `/api/report-cards/[id]` | PUT | Required | Teacher of the class | Update/approve a report card (change status from draft to approved). |
| `/api/report-cards/batch` | POST | Required | `teacher` or `sped_teacher` | Generate report cards for all students in a class. |

**Dashboard pages:**
- `/dashboard/report-cards` -- List and manage report cards

#### Early Warning
| Route | Method | Auth | Role | Description |
|-------|--------|------|------|-------------|
| `/api/early-warning` | GET | Required | `teacher`, `sped_teacher`, `admin` | Identify at-risk students. Teachers see students in their classes; admins see all (optionally filtered by `schoolId`). Risk factors: declining score trend, standards below proficient, missing submissions, average score below 70%. Risk levels: 3+ indicators = high risk, 2 = moderate, 0-1 = on track. For flagged students, AI generates intervention recommendations using anonymized identifiers (no PII sent to the LLM). |

**Dashboard pages:**
- `/dashboard/early-warning` -- At-risk student listing with risk indicators and recommendations

### 3.3 Special Education (SPED) & Compliance

#### IEP Management
| Route | Method | Auth | Role | Description |
|-------|--------|------|------|-------------|
| `/api/iep` | GET | Required | `sped_teacher` or `admin` | List IEPs. SPED teachers see only IEPs they authored. Admins see all. Optional filters: `studentId`, `status`. Returns goal count per IEP via subquery. |
| `/api/iep` | POST | Required | `sped_teacher` or `admin` | Create a new IEP. Required: `studentId`, `disabilityCategory`. Optional: `startDate`, `endDate`. Starts in `draft` status. |
| `/api/iep/[iepId]` | GET | Required | `sped_teacher` or `admin` | Get IEP detail with goals, accommodations, and progress entries. |
| `/api/iep/[iepId]` | PUT | Required | `sped_teacher` or `admin` | Update IEP fields. |
| `/api/iep/[iepId]/goals` | GET | Required | `sped_teacher` or `admin` | List goals for an IEP. |
| `/api/iep/[iepId]/goals` | POST | Required | `sped_teacher` or `admin` | Add a goal to an IEP. |
| `/api/iep/[iepId]/goals/[goalId]` | PUT | Required | `sped_teacher` or `admin` | Update a goal. |
| `/api/iep/[iepId]/goals/[goalId]` | DELETE | Required | `sped_teacher` or `admin` | Remove a goal. |
| `/api/iep/[iepId]/progress` | GET | Required | `sped_teacher` or `admin` | List progress entries for an IEP. |
| `/api/iep/[iepId]/progress` | POST | Required | `sped_teacher` or `admin` | Add a progress entry (data point) for an IEP goal. |
| `/api/iep/[iepId]/progress/narrative` | POST | Required | `sped_teacher` or `admin` | AI-generate a progress narrative based on logged data points. |

#### IEP AI Generation
| Route | Method | Auth | Role | Description |
|-------|--------|------|------|-------------|
| `/api/iep/generate/present-levels` | POST | Required | `sped_teacher` or `admin` | AI-generate present levels statement for an IEP. |
| `/api/iep/generate/goals` | POST | Required | `sped_teacher` or `admin` | AI-generate measurable IEP goals. Input: `iepId`, `area`, optional `gradeLevel`, `subject`, `existingCaseloadGoals`. Fetches the teacher's other IEP goals for similarity detection. Creates an audit log entry for the generation. |
| `/api/iep/generate/accommodations` | POST | Required | `sped_teacher` or `admin` | AI-generate recommended accommodations. |

#### Compliance Tracking
| Route | Method | Auth | Role | Description |
|-------|--------|------|------|-------------|
| `/api/compliance` | GET | Required | `sped_teacher` or `admin` | List compliance deadlines. SPED teachers see deadlines for students on their caseload. Admins see all. Optional filter: `status` (upcoming, overdue, all). Color-coding: overdue (past due), red (due within 15 days), yellow (due within 30 days), green (due beyond 30 days), completed. Returns a summary with counts per color. |
| `/api/compliance/[studentId]` | GET | Required | `sped_teacher` or `admin` | Get compliance deadlines for a specific student. |

**Dashboard pages:**
- `/dashboard/iep` -- IEP list and management
- `/dashboard/progress-monitoring` -- Progress monitoring and data entry
- `/dashboard/compliance` -- Compliance deadline dashboard

### 3.4 Family Engagement

#### Parent Dashboard
| Route | Method | Auth | Role | Description |
|-------|--------|------|------|-------------|
| `/api/parent/dashboard` | GET | Required | `parent` | Get the parent dashboard data. Returns an array of children, each with: name, grade level, overall status (traffic light: good/watch/concern based on average score), recent grades, subject mastery averages, and enrolled classes. |
| `/api/parent/children/[childId]` | GET | Required | `parent` | Get detailed data for a specific child. Verifies parent-child relationship. |
| `/api/parent/children/[childId]/progress` | GET | Required | `parent` | Get a child's detailed progress including mastery and submissions. |

**Dashboard pages:**
- `/dashboard/children` -- List of parent's children with summary cards
- `/dashboard/progress` -- Progress overview across all children

#### Messaging
| Route | Method | Auth | Role | Description |
|-------|--------|------|------|-------------|
| `/api/messages` | GET | Required | Any authenticated | List messages where the user is sender or receiver, with sender/receiver names. Limited to 50 most recent. |
| `/api/messages` | POST | Required | Any authenticated | Send a message. Required: `receiverId`, `content`. Optional: `subject`, `type` (default `general`), `isAIGenerated`, `metadata`. Verifies receiver exists. |
| `/api/messages/[messageId]` | PUT | Required | Sender or receiver | Update a message (mark as read). |
| `/api/messages/contacts` | GET | Required | Any authenticated | List potential message recipients. |
| `/api/messages/translate` | POST | Required | Any authenticated | AI-translate a message. Input: `text`, `targetLanguage`. Returns the translated text. |

**Dashboard pages:**
- `/dashboard/messages` -- Messaging interface (both teacher and parent roles)

### 3.5 District Intelligence

| Route | Method | Auth | Role | Description |
|-------|--------|------|------|-------------|
| `/api/admin/overview` | GET | Required | `admin` | District-wide summary counts: schools, teachers (including SPED), students, classes, assignments, submissions, recent activity (assignments created this week, submissions graded this week), and grading pipeline (ungraded submissions). |
| `/api/admin/analytics` | GET | Required | `admin` | Detailed analytics: mastery level distribution, average scores by subject, grading completion rates, and teacher engagement (top 10 teachers by activity, aggregate counts of teachers using each feature). |
| `/api/admin/schools` | GET | Required | `admin` | List all schools with per-school metrics: class count, teacher count, student count, assignment count, average score. |
| `/api/admin/teachers` | GET | Required | `admin` | List all teachers with per-teacher metrics: school, classes taught, assignments created, submissions graded, feedback drafts created. Sorted by activity. |
| `/api/admin/students` | GET | Required | `admin` | List all students with per-student metrics: grade level, classes enrolled, average score, mastery distribution. Optional query param: `search` (searches name and email). |
| `/api/admin/insights` | POST | Required | `admin` | AI-generate district insights. Gathers a comprehensive snapshot of district data (totals, mastery distribution, subject scores, grading completion, teacher engagement metrics) and sends it to the LLM for analysis. Returns strategic insights and recommendations. |

**Dashboard pages:**
- `/dashboard/analytics` -- Analytics dashboards with charts
- `/dashboard/schools` -- School list with metrics
- `/dashboard/teachers` -- Teacher list with activity metrics
- `/dashboard/students` -- Student directory with search

### 3.6 Student Experience

| Route | Method | Auth | Role | Description |
|-------|--------|------|------|-------------|
| `/api/student/progress` | GET | Required | `student` | Get the student's own progress: overall average, total completed assignments, mastery trend (improving/stable/declining), per-subject mastery, recent submissions with scores, strengths (standards scored 80%+), and areas for growth (standards scored below 60%). |
| `/api/submissions` | POST | Required | `student` | Submit work for an assignment. Input: `assignmentId`, `content`. Verifies: assignment exists and is not draft, student is enrolled in the assignment's class, idempotent (updates existing submission if one exists). |
| `/api/tutor` | POST | Required | `student` | Send a message to the AI Socratic tutor. Input: `message`, `subject`, optional `sessionId` (to continue an existing session), `topic`, `assignmentContext`. Creates or continues a tutor session. Returns a streaming text response. The session ID is returned in the `X-Session-Id` response header. Automatically determines the student's grade level from class enrollment. |
| `/api/tutor/sessions` | GET | Required | `student` | List the student's tutor sessions with message counts and preview of the last message. |
| `/api/tutor/sessions/[sessionId]` | GET | Required | `student` | Get full conversation history for a tutor session. |

**Dashboard pages:**
- `/dashboard/tutor` -- AI tutor chat interface
- `/dashboard/student-progress` -- Progress and mastery overview
- `/dashboard/assignments` (student view) -- Enrolled assignments with submission status

### 3.7 Infrastructure

| Route | Method | Auth | Description |
|-------|--------|------|-------------|
| `/api/health` | GET | None | Health check. Executes `SELECT 1` against the database and returns status, timestamp, database connection state, and version. |
| `/api/auth/[...nextauth]` | GET/POST | None | Authentication endpoints (sign in, sign out, session, CSRF). |
| `/api/auth/register` | POST | None | User registration. |

---

## 4. API Design Patterns

### 4.1 Standard Auth Check Pattern

Every API route follows this sequence:

```
1. Get session from auth
2. If no session: return 401 { error: "Unauthorized" }
3. If role required and role mismatch: return 403 { error: "Forbidden" } (or descriptive variant)
4. Validate required fields: return 400 { error: "Missing required fields: ..." }
5. Verify data access (e.g., teacher belongs to class): return 403 { error: "You do not have access to this class" }
6. Execute business logic in try/catch
7. On success: return 200 (for GET/PUT) or 201 (for POST creating resources)
8. On error: log to console.error, return 500 { error: "Failed to ..." }
```

All error responses use the shape `{ error: string }`. All success responses return domain objects or arrays directly.

### 4.2 CRUD Patterns

**List (GET collection):**
- Scope data to the authenticated user (teacher sees their assignments, parent sees their children, admin sees all)
- Apply optional query parameter filters (`?status=draft`, `?classId=...`, `?search=...`)
- Order by creation date descending
- Join related tables to include display names (class name, student name, etc.)
- Parse stored JSON strings into objects before returning

**Create (POST):**
- Validate required fields, return 400 if missing
- Verify access (class membership, parent-child relationship, etc.)
- Insert with all fields, using null for optional missing fields
- Return the created record with status 201

**Read (GET single):**
- Look up by ID from URL parameter
- Verify ownership/access
- Return 404 if not found

**Update (PUT):**
- Look up by ID, verify ownership
- Update with provided fields
- Return updated record

**Delete (DELETE):**
- Look up by ID, verify ownership
- Delete the record
- Return 200 or 204

### 4.3 AI Generation Pattern

All AI generation endpoints follow this pattern:

```
1. Authenticate and authorize
2. Validate inputs
3. Verify data access
4. Build a detailed prompt with context (role-specific system prompt + user content)
5. Define a tool with a JSON Schema describing the desired output structure
6. Call the LLM with forced tool_choice (the model must call that tool)
7. Extract the tool_use block from the response
8. Cast the tool input to the expected type
9. Save generated content to the database (usually in draft status)
10. Return the generated content to the client
```

AI metadata is stored alongside generated content, typically including: generation timestamp, model version, and the input parameters used. This supports audit trails and reproducibility.

### 4.4 Streaming Pattern (Tutor)

The tutor endpoint is the only streaming API:

```
1. Authenticate and authorize (student only)
2. Validate message and subject
3. Determine student grade level from class enrollment
4. Load or create tutor session
5. Append user message to session history
6. Build system prompt (Socratic methodology + grade-level language + optional assignment context)
7. Open streaming connection to LLM with conversation history
8. Pipe text chunks to a ReadableStream response
9. After stream completes, append assistant response to session history
10. Return streaming Response with headers:
    - Content-Type: text/plain; charset=utf-8
    - X-Session-Id: <session-id>
    - Cache-Control: no-cache
```

The tutor system prompt enforces strict Socratic behavior:
- Never provides direct answers to academic questions
- Asks one guiding question at a time
- Detects copy-pasted homework and redirects
- Adapts language to grade level (K-2, 3-5, 6-8, 9-12)
- Stays within the declared subject
- Redirects wellbeing concerns to trusted adults
- Uses growth mindset framing

### 4.5 Query Parameter Conventions

- Filters are passed as query parameters: `?assignmentId=...&status=...`
- Boolean flags: `?withRecommendations=true`
- Search: `?search=...` (searches name and email with case-insensitive partial match)
- Filtering by ID: `?classId=...`, `?studentId=...`, `?standardId=...`, `?schoolId=...`

---

## 5. UI Architecture

### 5.1 Dashboard Shell

The protected dashboard area uses a shell layout with three sections:

**Sidebar (left):**
- Collapsible to icon-only mode
- Header: application logo and name ("Paideia")
- Navigation: role-aware groups and items (see 5.2)
- Footer: current user name and email
- Rail for collapse/expand control

**Top header bar:**
- Sidebar toggle button
- Vertical separator
- Role badge (e.g., "Teacher", "SPED Teacher", "Admin", "Parent", "Student")
- User menu (right-aligned) with sign-out action

**Content area:**
- Scrollable main content with padding
- Responsive: `padding: 1rem` on mobile, `padding: 1.5rem` on medium+ screens

### 5.2 Sidebar Navigation by Role

Active state: exact match for `/dashboard`, prefix match for all other items.

#### Teacher
```
Overview
  - Dashboard           /dashboard
  - My Classes          /dashboard/classes

Instructional Design
  - Assignments         /dashboard/assignments
  - Lesson Plans        /dashboard/lesson-plans
  - Rubrics             /dashboard/rubrics
  - Quizzes             /dashboard/quizzes
  - Exit Tickets        /dashboard/exit-tickets

Assessment
  - Assessment & Grading /dashboard/grading
  - Reports             /dashboard/reports
  - Report Cards        /dashboard/report-cards
  - Early Warning       /dashboard/early-warning

Communication
  - Messages            /dashboard/messages
```

#### SPED Teacher
All Teacher items, plus:
```
Special Education
  - IEP Management      /dashboard/iep
  - Progress Monitoring  /dashboard/progress-monitoring
  - Compliance          /dashboard/compliance
```

#### Parent
```
Overview
  - Dashboard           /dashboard
  - My Children         /dashboard/children

Engagement
  - Progress            /dashboard/progress
  - Messages            /dashboard/messages
```

#### Student
```
Overview
  - Dashboard           /dashboard
  - My Classes          /dashboard/classes

Learning
  - Assignments         /dashboard/assignments
  - AI Tutor            /dashboard/tutor
  - Progress            /dashboard/student-progress
```

#### Admin
```
Overview
  - Dashboard           /dashboard

Management
  - Schools             /dashboard/schools
  - Teachers            /dashboard/teachers
  - Students            /dashboard/students

Intelligence
  - Analytics           /dashboard/analytics
  - Early Warning       /dashboard/early-warning
  - SPED Compliance     /dashboard/compliance
```

### 5.3 Role-Specific Dashboards

Each role sees a different dashboard homepage at `/dashboard`:

**Teacher Dashboard:**
- Welcome message: "Welcome back, {firstName}"
- Subtitle: "Here is an overview of your teaching activity."
- Stat cards (5): My Classes, Pending Grading, Assignments, Students, Unread Messages
- Quick actions (3): Create Assignment, Grade Work, View Reports
- Additional section for SPED teachers: IEP Management, Progress Monitoring, Compliance

**Student Dashboard:**
- Welcome message: "Welcome back, {firstName}"
- Subtitle: "Here is what is happening in your classes."
- Stat cards (4): My Classes, Completed Assignments, Average Score, Tutor Sessions
- Quick actions (3): My Assignments, AI Tutor, My Progress
- Upcoming assignments section: cards showing title, subject, class, due date, submission status (Submitted/Not Submitted)

**Parent Dashboard:**
- Welcome message: "Welcome back, {firstName}"
- Subtitle: "Here is how your children are doing."
- Stat cards (2): Children (with names listed), Unread Messages
- Quick actions (3): My Children, Progress Overview, Messages

**Admin Dashboard:**
- Welcome message: "Welcome back, {firstName}"
- Subtitle: "District-wide overview and compliance status."
- Stat cards (4): Schools, Teachers, Students, Ungraded Submissions
- Quick actions (3): Analytics, SPED Compliance, Schools

### 5.4 UI Component Patterns

**Stat Cards:**
- Icon in the top-right corner
- Title (small, medium weight)
- Large bold value
- Small muted description

**Quick Action Cards:**
- Icon + title in a row
- Short description
- Link button: "Go to {title} -->"
- Hover effect (subtle background change)

**Forms:**
- Form validation using schema-based validators (zod)
- Required field indicators
- Error messages below fields
- Submit button with loading state

**Dialogs:**
- Modal overlays for confirmations and detail views
- Title, content, and action buttons

**Tables:**
- Used for listing assignments, students, submissions, IEPs, etc.
- Sortable columns where applicable
- Status badges with color coding

**Toast Notifications:**
- Success, error, and info toasts
- Positioned in the bottom-right corner

**Empty States:**
- Displayed when lists have no items
- Descriptive message and call-to-action

**Loading States:**
- Skeleton or spinner while data loads
- Disabled buttons during form submission

### 5.5 Landing Page Structure

The public landing page at `/` has these sections:

1. **Header** -- Logo, "Sign In" and "Get Started" buttons. Sticky with backdrop blur.
2. **Hero** -- "Powered by Claude Opus - Anthropic" badge. Headline: "The Operating System for K-12 Teaching". Subheadline describing the platform. CTA buttons: "Try the Demo", "Get Started Free". Warm gradient background (amber/orange/stone).
3. **Stats bar** -- Four metrics: "5+ Hours saved per week", "13 AI-powered features", "100+ Standards aligned", "6 Modules built-in".
4. **Feature cards** -- Six cards (one per module): Instructional Design, Assessment Intelligence, SPED & Compliance, Family Engagement, District Intelligence, Student AI Tutor. Each has an icon, title, description, and accent color.
5. **How It Works** -- Three numbered steps: Create, Assess, Grow. Connected by a horizontal line on desktop.
6. **CTA section** -- "Teachers save 5+ hours every week" with "Start for Free" button.
7. **Demo Credentials** -- Cards showing five demo accounts (Teacher, Admin, Parent, Student, SPED Teacher) with emails. All use password: `password123`.
8. **Footer** -- Logo and compliance badges: FERPA, COPPA, IDEA, SOC 2 Compliant.

### 5.6 Login Page

- Centered card with email/password form
- Error display (red background, red text)
- Loading state on submit button
- Quick demo buttons: five pill-shaped buttons, one per demo role
- Demo buttons auto-fill credentials and sign in
- Link to registration page

### 5.7 Typography and Theming

Three font families:
- **Sans-serif (primary):** Used for body text, buttons, labels
- **Monospace:** Used for code snippets and email addresses
- **Serif (display):** Used for `h1` headings on dashboards (welcome messages, landing page headline)

Color scheme: warm palette centered on amber, stone, and orange tones. Module accent colors: amber, terracotta (orange), sage (emerald), sky, slate (stone), rose.

---

## 6. Key Design Decisions

### 6.1 Forced Tool Use for Structured AI Output

Every AI generation feature uses the LLM's tool calling mechanism with `tool_choice` forced to a specific tool name. This guarantees the LLM returns a structured JSON object matching the declared schema, rather than free-form text that would require fragile parsing. The approach provides:
- Type-safe, predictable output structure
- No regex or text parsing needed
- Schema validation at the LLM level
- Consistent error handling (check for tool_use block presence)

### 6.2 JWT Strategy for Authentication

The system uses JWT tokens rather than database-backed sessions. This means:
- No session table lookups on every request
- Stateless authentication suitable for serverless deployment
- Session data (id, role, email, name) is embedded in the token
- Trade-off: tokens cannot be individually revoked without additional infrastructure

### 6.3 Role-Based Data Scoping

Data isolation is enforced at the API level, not just the UI level:
- Teachers see only assignments they created and students in their classes
- SPED teachers see only IEPs they authored (admins see all)
- Parents see only their linked children
- Students see only their own data and enrolled class content
- Admins have read access to all data across the district
- Class membership is verified before allowing assignment creation or grading

### 6.4 Teacher-in-the-Loop

All AI-generated content is treated as a draft that requires human review:
- AI-generated assignments start in `draft` status
- AI-graded submissions produce feedback that teachers can review and edit
- AI-generated IEP goals are suggestions, not auto-applied
- AI-generated report cards start in `draft` status and require teacher approval
- AI-generated lesson plans are saved but can be edited before use

The system never sends AI-generated content directly to students or parents without teacher review.

### 6.5 AI Disclosure

AI involvement is tracked and disclosed:
- `aiMetadata` fields on assignments, lesson plans, and other generated content store the model version, generation timestamp, and input parameters
- Messages have an `isAIGenerated` boolean flag
- IEP goal generation creates audit log entries with the AI model and prompt type
- The tutor conversation history is fully persisted with role labels

### 6.6 Mastery Level Calculation

Mastery levels map to score percentages:
- **Advanced**: 90%+
- **Proficient**: 70-89%
- **Developing**: 50-69%
- **Beginning**: below 50%

Traffic light mapping for UI display:
- **Green**: advanced or proficient
- **Yellow**: developing
- **Red**: beginning

### 6.7 Early Warning Risk Calculation

Risk indicators are computed from the last 30 days of data:
1. **Declining score trend**: Compare the average of recent scores to the average of older scores; flag if the decline exceeds 5 percentage points
2. **Standards below proficient**: Count mastery records at beginning or developing level
3. **Missing submissions**: Count assignments from enrolled classes with no submission
4. **Low average score**: Flag if the average across graded submissions is below 70%

Risk levels: 3+ indicators = high risk, 2 indicators = moderate risk, 0-1 = on track. Students are sorted with highest risk first.

### 6.8 Compliance Deadline Color Coding

| Color | Condition |
|-------|-----------|
| Completed | Status is `completed` or `completedAt` is set |
| Overdue | Due date is in the past and not completed |
| Red | Due within 15 days |
| Yellow | Due within 30 days |
| Green | Due beyond 30 days |

### 6.9 Tutor Grade-Level Language Adaptation

| Grade Range | Language Style |
|-------------|---------------|
| K-2 | Very simple words, short sentences, extra warm, everyday analogies |
| 3-5 | Clear, accessible, moderate sentence length, relatable examples |
| 6-8 | Subject-specific vocabulary with definitions, conversational, teenager-relatable |
| 9-12 | Advanced terminology with brief clarifications, treat as capable young adult, real-world connections |

### 6.10 Seed Data

The system includes a seeder that creates demonstration data:
- 9+ users across all 5 roles
- Schools, classes, and class memberships
- Standards (academic standards for alignment)
- Sample assignments, submissions, and IEP data
- All demo passwords: `password123`

| Email | Role |
|-------|------|
| rivera@school.edu | teacher (8th grade ELA) |
| okafor@school.edu | teacher (10th grade Biology) |
| chen@school.edu | teacher (3rd grade) |
| rodriguez@school.edu | sped_teacher |
| williams@school.edu | admin |
| sarah.chen@email.com | parent |
| marcus.williams@email.com | parent |
| aisha@student.edu | student (8th grade) |
| deshawn@student.edu | student (10th grade) |
