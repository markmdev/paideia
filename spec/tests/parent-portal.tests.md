# Parent Portal -- Dashboard, Child Detail, Progress

> Behavioral tests for the parent portal: dashboard overview, per-child detail pages, progress tracking, child status calculation, AI transparency, and access control. Parents interact with the system through the `parentChildren` link table, which maps each parent to their children.

---

## Parent Dashboard API (GET /api/parent/dashboard)

### Authenticated parent receives children data

**Given** a parent "Sarah Chen" is signed in
**And** Sarah is linked to child "Aisha Torres" (student-001) in the parentChildren table
**And** Aisha is enrolled in "8th ELA" (subject: ELA, grade: 8)
**And** Aisha has a graded submission for "Essay Assignment" with score 85/100, letter grade "B"
**And** Aisha has mastery data for ELA with an average score of 82

**When** a GET request is sent to /api/parent/dashboard

**Then** the response status is 200
**And** the response body contains a "children" array with 1 entry
**And** the child entry contains:
  - id: "student-001"
  - name: "Aisha Torres"
  - gradeLevel: "8"
  - overallStatus: "good"
  - averageScore: 85
  - recentGrades: an array with 1 entry containing assignment "Essay Assignment", subject "ELA", letterGrade "B"
  - enrolledClasses: an array with 1 entry containing name "8th ELA", subject "ELA"
  - subjects: an array with 1 entry containing subject "ELA", averageMastery 82

---

### Parent with no linked children receives empty array

**Given** a parent is signed in
**And** the parent has no entries in the parentChildren table

**When** a GET request is sent to /api/parent/dashboard

**Then** the response status is 200
**And** the response body is `{ "children": [] }`

---

### Dashboard returns multiple children for a parent with more than one child

**Given** a parent is signed in
**And** the parent is linked to two children: "Aisha Torres" and "DeShawn Williams"

**When** a GET request is sent to /api/parent/dashboard

**Then** the response status is 200
**And** the response body "children" array has 2 entries
**And** each entry has its own id, name, overallStatus, recentGrades, and enrolledClasses

---

### Recent grades are capped at 5 per child

**Given** a parent is signed in with one linked child
**And** the child has 10 graded submissions

**When** a GET request is sent to /api/parent/dashboard

**Then** the response body child entry "recentGrades" array contains at most 5 entries

---

### Unauthenticated request returns 401

**Given** no user is signed in

**When** a GET request is sent to /api/parent/dashboard

**Then** the response status is 401
**And** the response body field "error" is "Unauthorized"

---

### Teacher cannot access parent dashboard

**Given** a user is signed in with role "teacher"

**When** a GET request is sent to /api/parent/dashboard

**Then** the response status is 403
**And** the response body field "error" is "Forbidden"

---

### Student cannot access parent dashboard

**Given** a user is signed in with role "student"

**When** a GET request is sent to /api/parent/dashboard

**Then** the response status is 403
**And** the response body field "error" is "Forbidden"

---

### Admin cannot access parent dashboard

**Given** a user is signed in with role "admin"

**When** a GET request is sent to /api/parent/dashboard

**Then** the response status is 403
**And** the response body field "error" is "Forbidden"

---

## Child Status Calculation

### Status is "good" when average score is 75% or above

**Given** a parent is signed in with one linked child
**And** the child has graded submissions averaging 85%

**When** a GET request is sent to /api/parent/dashboard

**Then** the child's overallStatus is "good"
**And** the child's averageScore is 85

---

### Status is "watch" when average score is between 60% and 74%

**Given** a parent is signed in with one linked child
**And** the child has graded submissions averaging 68%

**When** a GET request is sent to /api/parent/dashboard

**Then** the child's overallStatus is "watch"

---

### Status is "concern" when average score is below 60%

**Given** a parent is signed in with one linked child
**And** the child has graded submissions averaging 45%

**When** a GET request is sent to /api/parent/dashboard

**Then** the child's overallStatus is "concern"
**And** the child's averageScore is 45

---

### Status falls back to mastery data when no graded submissions exist

**Given** a parent is signed in with one linked child
**And** the child has no graded submissions (totalScore is null)
**And** the child has mastery data with an average score of 55%

**When** a GET request is sent to /api/parent/children (the children list page)

**Then** the child's overallStatus is "concern"

---

### Status defaults to "good" when no submissions and no mastery data exist

**Given** a parent is signed in with one linked child
**And** the child has no graded submissions
**And** the child has no mastery data

**When** a GET request is sent to /api/parent/dashboard

**Then** the child's overallStatus is "good"
**And** the child's averageScore is null

---

## Child Detail API (GET /api/parent/children/[childId])

### Parent receives comprehensive child data

**Given** a parent is signed in
**And** the parent is linked to child "Aisha Torres" (student-001)
**And** Aisha is enrolled in "8th ELA" (period 1) and "8th Math" (period 3)
**And** Aisha has a graded submission "Essay on The American Dream" (92/100, grade A) with feedback: strengths ["Clear thesis statement", "Well-organized paragraphs"], improvements ["Analyze evidence rather than summarize"], summary "Strong essay with room for deeper analysis."
**And** Aisha has a graded submission "Linear Equations Quiz" (65/100, grade D) with feedback: strengths ["Correct setup of equations"], improvements ["Check sign errors", "Show all work"]
**And** Aisha has mastery records: ELA standard ELA.W.8.1 "Write arguments to support claims" at proficient (85), Math standard MATH.8.EE.7 "Solve linear equations" at developing (62)

**When** a GET request is sent to /api/parent/children/student-001

**Then** the response status is 200
**And** the response body contains:
  - child: { id: "student-001", name: "Aisha Torres", email: "aisha@student.edu", gradeLevel: "8" }
  - enrolledClasses: 2 entries with className, subject, gradeLevel, period
  - recentSubmissions: 2 entries, each with assignmentTitle, subject, totalScore, maxScore, letterGrade, status, submittedAt, gradedAt
  - mastery: an object keyed by subject ("ELA", "Math"), each containing arrays of { standard, description, level, score }

---

### Feedback is parsed and attached to graded submissions

**Given** a parent is signed in and linked to a child
**And** the child has a graded submission with feedback stored as JSON-encoded strengths and improvements

**When** a GET request is sent to /api/parent/children/[childId]

**Then** each graded submission with feedback includes a "feedback" object containing:
  - strengths: an array of strings (parsed from JSON)
  - improvements: an array of strings (parsed from JSON)
  - summary: a string or null (from finalFeedback)

---

### Submissions without feedback have null feedback field

**Given** a parent is signed in and linked to a child
**And** the child has a graded submission that has no entry in the feedbackDrafts table

**When** a GET request is sent to /api/parent/children/[childId]

**Then** that submission's "feedback" field is null

---

### Child with no submissions and no mastery returns empty data

**Given** a parent is signed in and linked to child "New Student"
**And** "New Student" is enrolled in one class but has no submissions and no mastery records

**When** a GET request is sent to /api/parent/children/[childId]

**Then** the response status is 200
**And** recentSubmissions is an empty array
**And** mastery is an empty object `{}`

---

### Mastery data is deduplicated by standard, keeping the latest assessment

**Given** a parent is signed in and linked to a child
**And** the child has two mastery records for the same standard (assessed at different dates)

**When** a GET request is sent to /api/parent/children/[childId]

**Then** the mastery response contains only one entry for that standard (the most recently assessed)

---

### Mastery data is grouped by subject

**Given** a parent is signed in and linked to a child
**And** the child has mastery records in ELA and Math

**When** a GET request is sent to /api/parent/children/[childId]

**Then** the response body "mastery" object has keys "ELA" and "Math"
**And** each key maps to an array of { standard, description, level, score } entries

---

### Parent cannot view another parent's child

**Given** parent "Other Parent" is signed in
**And** "Other Parent" is not linked to child "student-001" in the parentChildren table

**When** a GET request is sent to /api/parent/children/student-001

**Then** the response status is 403
**And** the response body field "error" is "Child not found or not authorized"

---

### Non-existent child link returns 403 (not 404)

**Given** a parent is signed in
**And** no parentChildren record links this parent to childId "nonexistent-child"

**When** a GET request is sent to /api/parent/children/nonexistent-child

**Then** the response status is 403
**And** the response body field "error" is "Child not found or not authorized"

---

### Link exists but child user record is missing returns 404

**Given** a parent is signed in
**And** a parentChildren record links this parent to childId "ghost-child"
**And** no user record exists with id "ghost-child"

**When** a GET request is sent to /api/parent/children/ghost-child

**Then** the response status is 404
**And** the response body field "error" is "Child not found"

---

### Teacher cannot access child detail

**Given** a user is signed in with role "teacher"

**When** a GET request is sent to /api/parent/children/any-child-id

**Then** the response status is 403
**And** the response body field "error" is "Forbidden"

---

### Student cannot access child detail

**Given** a user is signed in with role "student"

**When** a GET request is sent to /api/parent/children/any-child-id

**Then** the response status is 403
**And** the response body field "error" is "Forbidden"

---

### Admin cannot access child detail

**Given** a user is signed in with role "admin"

**When** a GET request is sent to /api/parent/children/any-child-id

**Then** the response status is 403
**And** the response body field "error" is "Forbidden"

---

## Child Progress API (GET /api/parent/children/[childId]/progress)

### Parent receives progress narratives for their child

**Given** a parent is signed in and linked to child "student-001"
**And** the messages table contains progress_update messages addressed to this parent with metadata containing childId "student-001"

**When** a GET request is sent to /api/parent/children/student-001/progress

**Then** the response status is 200
**And** the response body contains a "narratives" array
**And** each narrative contains: id, subject, content, metadata, isAIGenerated, createdAt

---

### Progress narratives are filtered by child

**Given** a parent is signed in and linked to two children: "student-001" and "student-002"
**And** the messages table contains progress_update messages for both children

**When** a GET request is sent to /api/parent/children/student-001/progress

**Then** the response body "narratives" array contains only messages where metadata.childId equals "student-001"

---

### Parent cannot view progress for an unlinked child

**Given** a parent is signed in
**And** the parent is not linked to child "other-child"

**When** a GET request is sent to /api/parent/children/other-child/progress

**Then** the response status is 403
**And** the response body field "error" is "Child not found or not authorized"

---

### Non-parent roles cannot access child progress

**Given** a user is signed in with role "student"

**When** a GET request is sent to /api/parent/children/any-child-id/progress

**Then** the response status is 403
**And** the response body field "error" is "Forbidden"

---

## Progress Narrative Generation (POST /api/parent/children/[childId]/progress)

### Parent can trigger AI narrative generation for their child

**Given** a parent is signed in and linked to child "student-001"
**And** "student-001" has graded submissions and mastery data for "ELA"

**When** a POST request is sent to /api/parent/children/student-001/progress with body:
  - subject: "ELA"
  - gradingPeriod: "Quarter 1"

**Then** the response status is 201
**And** the response body contains a "narrative" object with: summary (string), strengths (string array), areasToGrow (string array), homeActivity (string), overallStatus ("good", "watch", or "concern")
**And** the response body contains a "messages" array of stored message records

---

### Missing subject or gradingPeriod returns 400

**Given** a parent is signed in and linked to a child

**When** a POST request is sent to /api/parent/children/[childId]/progress with body:
  - subject: "ELA"
  (gradingPeriod is missing)

**Then** the response status is 400
**And** the response body field "error" is "subject and gradingPeriod are required"

---

### Teachers can also trigger narrative generation

**Given** a teacher is signed in
**And** a child "student-001" exists

**When** a POST request is sent to /api/parent/children/student-001/progress with body:
  - subject: "Math"
  - gradingPeriod: "Semester 1"

**Then** the response status is 201

---

### Student cannot trigger narrative generation

**Given** a user is signed in with role "student"

**When** a POST request is sent to /api/parent/children/any-child-id/progress with a valid body

**Then** the response status is 403
**And** the response body field "error" is "Forbidden"

---

## Parent Dashboard UI (/dashboard for parent role)

### Parent sees welcome message and stats

**Given** a parent "Sarah Chen" is signed in
**And** Sarah has 1 linked child and 3 unread messages

**When** the parent navigates to /dashboard

**Then** the page displays "Welcome back, Sarah"
**And** the page displays a "Children" stat card showing "1"
**And** the page displays an "Unread Messages" stat card showing "3" with description "From teachers"

---

### Parent dashboard shows quick action links

**Given** a parent is signed in

**When** the parent navigates to /dashboard

**Then** the page displays three quick action cards:
  - "My Children" linking to /dashboard/children
  - "Progress Overview" linking to /dashboard/progress
  - "Messages" linking to /dashboard/messages

---

## Children List UI (/dashboard/children)

### Children list displays status cards with badges

**Given** a parent is signed in with two linked children
**And** child one has overallStatus "good" (score 92%)
**And** child two has overallStatus "concern" (score 45%)

**When** the parent navigates to /dashboard/children

**Then** the page displays "My Children" as the heading
**And** child one's card shows an "On Track" badge with emerald (green) styling
**And** child two's card shows a "Falling Behind" badge with rose (red) styling
**And** each card is a link to /dashboard/children/[childId]

---

### Watch status displays as "Needs Attention" with amber badge

**Given** a parent is signed in with a child whose overallStatus is "watch"

**When** the parent navigates to /dashboard/children

**Then** the child's card shows a "Needs Attention" badge with amber styling

---

### Child card shows average score, enrolled class subjects, and recent grades

**Given** a parent is signed in with a linked child
**And** the child has averageScore 85%, is enrolled in ELA and Math, and has recent grades

**When** the parent navigates to /dashboard/children

**Then** the child's card displays "85%" as the average
**And** the card shows subject badges for "ELA" and "Math"
**And** the card shows up to 3 recent grades with assignment name and letter grade

---

### No linked children shows empty state

**Given** a parent is signed in with no linked children

**When** the parent navigates to /dashboard/children

**Then** the page displays "No children linked"
**And** the page shows guidance text about contacting the school to set up the connection

---

### Non-parent users are redirected away from children page

**Given** a user is signed in with role "teacher"

**When** the user navigates to /dashboard/children

**Then** the user is redirected to /dashboard

---

## Child Detail UI (/dashboard/children/[childId])

### Child detail page shows stat cards

**Given** a parent is signed in and linked to "Aisha Torres"
**And** Aisha has an average score of 78%, is enrolled in 2 classes, and has 3 graded assignments

**When** the parent navigates to /dashboard/children/[childId]

**Then** the page displays "Aisha Torres" as the heading
**And** the page displays three stat cards:
  - "Average Score" showing "78%"
  - "Classes" showing "2"
  - "Graded Assignments" showing "3"

---

### Child detail page shows Skills Snapshot with mastery levels

**Given** a parent is signed in and viewing a child's detail page
**And** the child has mastery records grouped by subject with levels: proficient, developing, beginning

**When** the page renders

**Then** the Skills Snapshot section groups standards by subject
**And** each standard shows its description and a level badge
**And** proficient/advanced levels use emerald (green) styling
**And** developing levels use amber styling
**And** beginning levels use rose styling

---

### Child detail page shows Recent Feedback with parsed content

**Given** a parent is signed in and viewing a child's detail page
**And** the child has a graded submission with feedback containing strengths and improvements

**When** the page renders

**Then** the Recent Feedback section shows the assignment title
**And** strengths are displayed under a green "Strengths" heading
**And** improvements are displayed under an amber "Areas to Grow" heading
**And** the final feedback summary is rendered in italics below a divider
**And** feedback content is rendered as markdown

---

### Child detail page shows "Back to My Children" navigation

**Given** a parent is signed in and viewing a child's detail page

**When** the page renders

**Then** the page displays a "Back to My Children" link that navigates to /dashboard/children
**And** the page displays a "Message Teacher" button that navigates to /dashboard/messages

---

## AI Transparency

### Child detail page includes AI Transparency panel

**Given** a parent is signed in and viewing a child's detail page

**When** the page renders

**Then** the page displays an "How AI Is Used" panel with sky-blue gradient styling
**And** the panel contains three information cards:
  - "Feedback Drafting" explaining that AI drafts feedback and teachers review every comment
  - "AI Tutoring" explaining that the AI Tutor asks guiding questions and never gives answers directly
  - "Data Privacy" explaining encryption, no data sales, FERPA and COPPA compliance
**And** a "Powered by Claude" badge is displayed
**And** the panel displays the statement "AI assists, humans decide."

---

### AI-generated progress narratives are labeled

**Given** a parent is signed in and viewing a child's detail page
**And** the child has an AI-generated progress narrative (isAIGenerated: true)

**When** the page renders

**Then** the narrative card displays an "AI Summary" badge with violet styling and sparkle icon
**And** the narrative displays a disclaimer: "This summary was generated by AI from your child's teacher's assessment data. The teacher reviewed and approved it before sharing."

---

## Progress Page UI (/dashboard/progress for parent role)

### Parent progress page shows mastery data for all children

**Given** a parent is signed in with two linked children
**And** both children have mastery data in ELA and Math

**When** the parent navigates to /dashboard/progress

**Then** the page displays "Progress" as the heading
**And** the subtitle reads "Track your children's mastery across subjects."
**And** subject summary cards show average mastery percentage with a progress-colored badge:
  - 75% or above: "On Track" with emerald styling
  - 60% to 74%: "Developing" with amber styling
  - Below 60%: "Needs Help" with rose styling

---

### Progress page shows per-standard progress bars

**Given** a parent is signed in and viewing the progress page
**And** a child has mastery records for individual standards

**When** the page renders

**Then** each standard is displayed with its description, a level badge (proficient/developing/beginning), and a progress bar
**And** the progress bar width corresponds to the mastery score percentage
**And** bar colors are emerald (75%+), amber (60-74%), or rose (below 60%)

---

### Progress page shows empty state when no mastery data exists

**Given** a parent is signed in with a linked child
**And** the child has no mastery records

**When** the parent navigates to /dashboard/progress

**Then** the page displays "No mastery data yet"
**And** explains that mastery data will appear as assignments are graded

---

### Progress page shows child names when parent has multiple children

**Given** a parent is signed in with two linked children: "Aisha Torres" and "DeShawn Williams"

**When** the parent navigates to /dashboard/progress

**Then** each child's mastery section is headed with their name

---

### Progress page is accessible to students (for their own data)

**Given** a student is signed in

**When** the student navigates to /dashboard/progress

**Then** the page displays "Progress" as the heading
**And** the subtitle reads "Track your mastery across subjects."
**And** the page shows only the signed-in student's mastery data

---

## AI Service: Progress Narrative Generation

### AI generates structured progress narrative with required fields

**Given** a progress narrative generation request for student "Aisha Torres" in subject "ELA" for "Quarter 1"
**And** the student has recent scores and mastery data

**When** generateParentProgressNarrative is called

**Then** the AI returns a structured object containing:
  - summary: a 3-5 sentence plain-language description
  - strengths: 2-4 items describing what the child does well
  - areasToGrow: 1-3 positively-framed growth opportunities
  - homeActivity: one specific 10-15 minute activity using everyday materials
  - overallStatus: "good", "watch", or "concern"

---

### AI narrative uses warm, jargon-free language

**Given** the system prompt for progress narrative generation

**When** the prompt is inspected

**Then** the system prompt instructs the AI to write as a "warm, supportive K-12 educator"
**And** the prompt instructs never to use standards codes (like "CCSS.ELA-LITERACY.W.8.1")
**And** the prompt instructs to use plain English descriptions of skills

---

## Database Schema

### parentChildren table enforces unique parent-child pairs

**Given** the parentChildren table schema definition

**When** the table indexes are inspected

**Then** there is a unique index on (parentId, childId)
**And** parentId references users.id
**And** childId references users.id

---
