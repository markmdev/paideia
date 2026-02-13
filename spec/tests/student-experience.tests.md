# Student Experience -- Dashboard, Progress, Assignments, AI Tutor

> Behavioral tests for the student-facing experience: dashboard overview, self-service progress tracking, assignment viewing and submission, Socratic AI tutor chat, and access control boundaries.

---

## Student Dashboard

### Student sees a personalized welcome message

**Given** a student "Aisha Torres" is signed in

**When** the dashboard page loads

**Then** the page displays a heading "Welcome back, Aisha"
**And** the page displays the subtitle "Here is what is happening in your classes."

---

### Student dashboard shows four stat cards

**Given** a student is signed in
**And** the student is enrolled in 3 classes, has 7 completed assignments, an average score of 85%, and 4 tutor sessions

**When** the dashboard page loads

**Then** the page displays four stat cards:
  - "My Classes" with value "3" and description "Enrolled this semester"
  - "Completed Assignments" with value "7" and description "Graded submissions"
  - "Average Score" with value "85%" and description "Across graded work"
  - "Tutor Sessions" with value "4" and description "AI tutoring conversations"

---

### Completed assignments count includes graded and returned submissions

**Given** a student is signed in
**And** the student has 3 submissions with status "graded" and 2 submissions with status "returned" and 1 submission with status "submitted"

**When** the dashboard page loads

**Then** the "Completed Assignments" stat card shows value "5"
**And** the pending "submitted" submission is not included in the count

---

### Average score displays "N/A" when no graded submissions exist

**Given** a student is signed in
**And** the student has no graded or returned submissions

**When** the dashboard page loads

**Then** the "Average Score" stat card displays "N/A"

---

### Student dashboard shows quick actions

**Given** a student is signed in

**When** the dashboard page loads

**Then** the page displays a "Quick Actions" section with three action cards:
  - "My Assignments" linking to /dashboard/assignments
  - "AI Tutor" linking to /dashboard/tutor
  - "My Progress" linking to /dashboard/student-progress

---

### Student dashboard shows recent assignments with status badges

**Given** a student is signed in
**And** the student is enrolled in classes that have published assignments

**When** the dashboard page loads

**Then** the page displays a "Your Assignments" section
**And** each assignment card shows the title, subject, class name, and due date
**And** assignments the student has submitted display a "Submitted" badge in green
**And** assignments the student has not submitted display a "Not Submitted" badge in amber

---

### Recent assignments link to assignment detail

**Given** a student is signed in
**And** an assignment "Persuasive Essay" with id "assign-1" exists in the student's enrolled class

**When** the dashboard page loads

**Then** the assignment card for "Persuasive Essay" links to /dashboard/assignments/assign-1
**And** submitted assignments show "View Submission" as the call-to-action text
**And** unsubmitted assignments show "Start Working" as the call-to-action text

---

### Student dashboard limits recent assignments to 6

**Given** a student is signed in
**And** the student's enrolled classes have 10 published assignments

**When** the dashboard page loads

**Then** the "Your Assignments" section displays at most 6 assignment cards

---

## Student Progress API

### GET /api/student/progress returns 401 when not authenticated

**Given** no user is signed in

**When** a GET request is sent to /api/student/progress

**Then** the response status is 401
**And** the response body field "error" is "Unauthorized"

---

### GET /api/student/progress returns 403 for teacher role

**Given** a user is signed in with role "teacher"

**When** a GET request is sent to /api/student/progress

**Then** the response status is 403
**And** the response body field "error" contains "student role required"

---

### GET /api/student/progress returns 403 for parent role

**Given** a user is signed in with role "parent"

**When** a GET request is sent to /api/student/progress

**Then** the response status is 403
**And** the response body field "error" contains "student role required"

---

### GET /api/student/progress returns 403 for admin role

**Given** a user is signed in with role "admin"

**When** a GET request is sent to /api/student/progress

**Then** the response status is 403
**And** the response body field "error" contains "student role required"

---

### GET /api/student/progress returns complete progress data for a student

**Given** a student is signed in
**And** the student has mastery records across ELA and Math
**And** the student has 5 graded submissions with an average score of 78

**When** a GET request is sent to /api/student/progress

**Then** the response status is 200
**And** the response body contains:
  - overallAverage: 78 (a rounded integer)
  - totalCompleted: 5
  - masteryTrend: one of "improving", "stable", or "declining"
  - subjectMastery: an array of objects, each with subject, masteryLevel, and score
  - recentSubmissions: an array of objects, each with assignmentTitle, subject, score (percentage), and submittedAt (ISO string)
  - strengths: an array of standard descriptions (strings)
  - areasForGrowth: an array of standard descriptions (strings)

---

### Progress response groups mastery by subject with dominant level

**Given** a student is signed in
**And** the student has mastery records: ELA with levels ["proficient", "proficient", "developing"], Math with level ["beginning"]

**When** a GET request is sent to /api/student/progress

**Then** the subjectMastery array contains an entry for ELA with masteryLevel "proficient" (the most frequent level)
**And** the subjectMastery array contains an entry for Math with masteryLevel "beginning"

---

### Strengths include standards with score 80 or above

**Given** a student is signed in
**And** the student's latest mastery for standard "Cite textual evidence" has score 90
**And** the student's latest mastery for standard "Determine theme" has score 85

**When** a GET request is sent to /api/student/progress

**Then** the strengths array includes "Cite textual evidence"
**And** the strengths array includes "Determine theme"

---

### Areas for growth include standards with score below 60

**Given** a student is signed in
**And** the student's latest mastery for standard "Analyze central ideas" has score 50
**And** the student's latest mastery for standard "Solve linear equations" has score 40

**When** a GET request is sent to /api/student/progress

**Then** the areasForGrowth array includes "Analyze central ideas"
**And** the areasForGrowth array includes "Solve linear equations"

---

### Mastery trend is "improving" when recent scores exceed older scores by more than 5 points

**Given** a student is signed in
**And** the student has at least 4 mastery records
**And** the average score of the recent half is 89 and the older half is 45

**When** a GET request is sent to /api/student/progress

**Then** the masteryTrend field is "improving"

---

### Mastery trend is "declining" when recent scores fall below older scores by more than 5 points

**Given** a student is signed in
**And** the student has at least 4 mastery records
**And** the average score of the recent half is 40 and the older half is 80

**When** a GET request is sent to /api/student/progress

**Then** the masteryTrend field is "declining"

---

### Mastery trend is "stable" when fewer than 4 mastery records exist

**Given** a student is signed in
**And** the student has only 2 mastery records

**When** a GET request is sent to /api/student/progress

**Then** the masteryTrend field is "stable"

---

### Progress returns empty data when student has no records

**Given** a student is signed in
**And** the student has no mastery records, no submissions

**When** a GET request is sent to /api/student/progress

**Then** the response status is 200
**And** overallAverage is null
**And** totalCompleted is 0
**And** masteryTrend is "stable"
**And** subjectMastery is an empty array
**And** recentSubmissions is an empty array
**And** strengths is an empty array
**And** areasForGrowth is an empty array

---

### Recent submissions are limited to 20 and sorted by graded date descending

**Given** a student is signed in
**And** the student has 30 graded submissions

**When** a GET request is sent to /api/student/progress

**Then** the recentSubmissions array has at most 20 entries
**And** entries are ordered from most recently graded to oldest

---

### Recent submission scores are expressed as percentages

**Given** a student is signed in
**And** the student has a graded submission with totalScore 85 and maxScore 100

**When** a GET request is sent to /api/student/progress

**Then** the corresponding recentSubmission entry has score 85 (computed as round(85/100 * 100))

---

## Student Progress UI

### Progress page shows encouraging message based on mastery trend

**Given** a student visits /dashboard/student-progress
**And** the student's mastery trend is "improving"

**When** the page loads and fetches /api/student/progress

**Then** the page displays the message "You're making great progress! Keep up the good work."

---

### Progress page shows steady encouragement for stable trend

**Given** a student visits /dashboard/student-progress
**And** the student's mastery trend is "stable"

**When** the page loads

**Then** the page displays the message "You're on a steady path. Consistency is the key to growth."

---

### Progress page shows growth-mindset message for declining trend

**Given** a student visits /dashboard/student-progress
**And** the student's mastery trend is "declining"

**When** the page loads

**Then** the page displays the message "Every expert was once a beginner. Let's keep working at it!"

---

### Progress page has "What I'm Good At" section

**Given** a student visits /dashboard/student-progress
**And** the student has strengths: ["Cite textual evidence", "Determine theme"]

**When** the page loads

**Then** the page displays a section titled "What I'm Good At"
**And** the section has an emerald/green visual theme
**And** it displays badges for "Cite textual evidence" and "Determine theme"

---

### Progress page has "Areas to Improve" section

**Given** a student visits /dashboard/student-progress
**And** the student has areasForGrowth: ["Analyze central ideas"]

**When** the page loads

**Then** the page displays a section titled "Areas to Improve"
**And** the section has an amber/yellow visual theme
**And** it displays a badge for "Analyze central ideas"

---

### Subject mastery cards show encouraging per-level messages

**Given** a student visits /dashboard/student-progress
**And** the student has subject mastery: ELA at 90%, Math at 65%, Science at 45%

**When** the page loads

**Then** the ELA card displays "Great job -- keep it up!" in green
**And** the Math card displays "Getting there -- a little more practice will help." in amber
**And** the Science card displays "This is a growing area -- you can do it!" in rose

---

### Progress page shows empty state for new students

**Given** a student visits /dashboard/student-progress
**And** the student has no mastery or submission data

**When** the page loads

**Then** the page displays the text "Your progress will appear here as your work gets graded."
**And** the page displays an empty state card with message "No progress data yet"

---

## Student Assignments

### Student sees assignments from enrolled classes (excluding drafts)

**Given** a student is signed in and enrolled in "8th Grade ELA"
**And** the class has a published assignment "Persuasive Essay" and a draft assignment "Upcoming Quiz"

**When** the student navigates to /dashboard/assignments/[id] for "Persuasive Essay"

**Then** the page displays the assignment "Persuasive Essay"
**And** the draft assignment "Upcoming Quiz" is not accessible to the student (returns 404)

---

### Assignment detail has Assignment tab with description and instructions

**Given** a student is signed in
**And** the student views assignment detail for an assignment with description "Write a persuasive essay..." and instructions "Use at least three sources..."

**When** the assignment detail page loads

**Then** the page displays an "Assignment" tab
**And** the Assignment tab content shows a "Description" section with rendered markdown content
**And** the Assignment tab content shows an "Instructions" section

---

### Student does not see rubric, success criteria, or differentiated versions tabs

**Given** a student is signed in
**And** the assignment has a rubric, success criteria, and differentiated versions

**When** the assignment detail page loads

**Then** the tabs do not include "Rubric"
**And** the tabs do not include "Success Criteria"
**And** the tabs do not include "Differentiated Versions"

---

### Student sees "Your Submission" tab when a submission exists

**Given** a student is signed in
**And** the student has submitted work for the assignment with status "submitted"

**When** the assignment detail page loads

**Then** the page displays a "Your Submission" tab
**And** the tab shows the submitted content
**And** the tab shows a status badge ("Submitted" in sky blue)
**And** the tab shows the submission date and time

---

### Awaiting feedback notice shows when no approved feedback exists

**Given** a student is signed in
**And** the student has a submission but no feedback with status "approved" or "sent"

**When** the assignment detail page loads and the "Your Submission" tab is selected

**Then** the page displays the message "Awaiting Teacher Feedback"
**And** the message "Your teacher is reviewing your work. Feedback will appear here once it is ready."

---

### Student sees Feedback tab when approved feedback exists

**Given** a student is signed in
**And** the student has a submission with a feedback draft that has status "approved"

**When** the assignment detail page loads

**Then** the page displays a "Feedback" tab
**And** the tab contains a grade card showing the letter grade and score out of max points
**And** the tab contains a "Teacher Feedback" section with the narrative feedback
**And** the tab contains a "Strengths" section with a green left border and green checkmark icons
**And** the tab contains an "Areas for Improvement" section with an amber left border and numbered items
**And** the tab contains a "Next Steps" section with a blue left border and numbered items
**And** the tab ends with an AI disclosure: "This feedback was drafted by AI and reviewed by your teacher."

---

### Grade card color reflects the letter grade

**Given** a student is signed in
**And** the student has an approved feedback with letter grade "A"

**When** the Feedback tab is displayed

**Then** the grade card uses an emerald/green gradient background

---

### Student does not see a delete button on the assignment detail page

**Given** a student is signed in

**When** the student views any assignment detail page

**Then** no "Delete" button is rendered on the page

---

## AI Tutor API

### POST /api/tutor returns 401 when not authenticated

**Given** no user is signed in

**When** a POST request is sent to /api/tutor with body:
  - message: "Help me with fractions"
  - subject: "Math"

**Then** the response status is 401
**And** the response body field "error" is "Unauthorized"

---

### POST /api/tutor returns 403 for teacher role

**Given** a user is signed in with role "teacher"

**When** a POST request is sent to /api/tutor with a valid message body

**Then** the response status is 403
**And** the response body field "error" is "Forbidden: only students can access the tutor"

---

### POST /api/tutor returns 400 when message is missing

**Given** a student is signed in

**When** a POST request is sent to /api/tutor with body:
  - subject: "Math"

**Then** the response status is 400
**And** the response body field "error" is "Message is required"

---

### POST /api/tutor returns 400 when subject is missing

**Given** a student is signed in

**When** a POST request is sent to /api/tutor with body:
  - message: "Help me"

**Then** the response status is 400
**And** the response body field "error" is "Subject is required"

---

### POST /api/tutor creates a new session when no sessionId is provided

**Given** a student is signed in

**When** a POST request is sent to /api/tutor with body:
  - message: "What is photosynthesis?"
  - subject: "Science"

**Then** a new tutor session is inserted into the tutorSessions table with the student's ID and subject "Science"
**And** the response includes an "X-Session-Id" header with the new session ID
**And** the response is a streaming text/plain response

---

### POST /api/tutor continues an existing session when sessionId is provided

**Given** a student is signed in
**And** a tutor session exists with id "session-abc" belonging to the student

**When** a POST request is sent to /api/tutor with body:
  - message: "Can you explain that differently?"
  - subject: "Science"
  - sessionId: "session-abc"

**Then** the user's message is appended to the session's messages array
**And** the AI response is streamed back
**And** the assistant's response is appended to the session's messages array after streaming completes

---

### POST /api/tutor returns 404 when sessionId does not belong to the student

**Given** a student "Aisha" is signed in
**And** a tutor session "session-xyz" belongs to a different student "DeShawn"

**When** a POST request is sent to /api/tutor with body:
  - message: "Help me"
  - subject: "Math"
  - sessionId: "session-xyz"

**Then** the response status is 404
**And** the response body field "error" is "Session not found"

---

### POST /api/tutor returns 400 when the session has ended

**Given** a student is signed in
**And** a tutor session exists with id "session-ended" that has a non-null endedAt timestamp

**When** a POST request is sent to /api/tutor with body:
  - message: "One more question"
  - subject: "Math"
  - sessionId: "session-ended"

**Then** the response status is 400
**And** the response body field "error" is "Session has ended"

---

### POST /api/tutor determines student grade level from class enrollment

**Given** a student is signed in
**And** the student is enrolled in a class with gradeLevel "10"

**When** a POST request is sent to /api/tutor with a valid message

**Then** the tutor AI service receives gradeLevel "10"
**And** the system prompt uses high school-appropriate language

---

## Tutor Sessions API

### GET /api/tutor/sessions returns 401 when not authenticated

**Given** no user is signed in

**When** a GET request is sent to /api/tutor/sessions

**Then** the response status is 401
**And** the response body field "error" is "Unauthorized"

---

### GET /api/tutor/sessions returns 403 for non-student roles

**Given** a user is signed in with role "teacher"

**When** a GET request is sent to /api/tutor/sessions

**Then** the response status is 403
**And** the response body field "error" contains "only students"

---

### GET /api/tutor/sessions returns sessions for the authenticated student

**Given** a student is signed in
**And** the student has 2 tutor sessions: one for "Math" with 4 messages, one for "Science" with 0 messages

**When** a GET request is sent to /api/tutor/sessions

**Then** the response status is 200
**And** the response is an array of 2 session summaries
**And** each summary contains: id, subject, topic, startedAt, endedAt, messageCount, lastMessage
**And** the Math session has messageCount 4 and a lastMessage preview (truncated to 120 characters)
**And** the Science session has messageCount 0 and lastMessage null

---

### GET /api/tutor/sessions returns sessions ordered by startedAt descending

**Given** a student is signed in
**And** the student has sessions started at different times

**When** a GET request is sent to /api/tutor/sessions

**Then** the response array is ordered with the most recently started session first

---

### GET /api/tutor/sessions/[sessionId] returns session with all messages

**Given** a student is signed in
**And** a tutor session "session-1" exists with subject "Math", topic "Linear Equations", and 3 messages

**When** a GET request is sent to /api/tutor/sessions/session-1

**Then** the response status is 200
**And** the response body contains: id, subject, topic, startedAt, endedAt, messages
**And** the messages array has 3 entries, each with role, content, and timestamp

---

### GET /api/tutor/sessions/[sessionId] returns 404 for another student's session

**Given** student "Aisha" is signed in
**And** a tutor session "session-other" belongs to student "DeShawn"

**When** a GET request is sent to /api/tutor/sessions/session-other

**Then** the response status is 404
**And** the response body field "error" is "Session not found"

---

### DELETE /api/tutor/sessions/[sessionId] ends the session

**Given** a student is signed in
**And** a tutor session "session-1" exists with endedAt null

**When** a DELETE request is sent to /api/tutor/sessions/session-1

**Then** the response status is 200
**And** the response body field "success" is true
**And** the session's endedAt is set to the current timestamp in the database

---

### DELETE /api/tutor/sessions/[sessionId] returns 404 for another student's session

**Given** student "Aisha" is signed in
**And** a tutor session "session-other" belongs to student "DeShawn"

**When** a DELETE request is sent to /api/tutor/sessions/session-other

**Then** the response status is 404
**And** the response body field "error" is "Session not found"

---

## Tutor Hub UI

### Tutor hub page redirects non-students to /dashboard

**Given** a user with role "teacher" navigates to /dashboard/tutor

**When** the page loads

**Then** the user is redirected to /dashboard

---

### Tutor hub shows a personalized welcome message

**Given** a student "Aisha" is signed in

**When** the student navigates to /dashboard/tutor

**Then** the page displays "Hey Aisha, ready to learn?"
**And** the page explains the Socratic approach: "I will ask questions to help you think, not just give answers."

---

### Tutor hub shows six subject selection cards

**Given** a student is signed in

**When** the student navigates to /dashboard/tutor

**Then** the page displays a "Start a New Session" section with 6 subject cards:
  - Math (blue theme with Calculator icon)
  - Science (emerald theme with FlaskConical icon)
  - ELA (amber theme with BookOpen icon)
  - Social Studies (purple theme with Globe icon)
  - Art (pink theme with Palette icon)
  - Computer Science (cyan theme with Code icon)
**And** each card links to /dashboard/tutor/new?subject=[subject name]

---

### Tutor hub shows suggested practice based on weak mastery areas

**Given** a student is signed in
**And** the student has mastery records below 70% for "Analyze central ideas" (score 35%) in ELA and "Solve linear equations" (score 50%) in Math

**When** the student navigates to /dashboard/tutor

**Then** the page displays a "Suggested Practice" section
**And** the section shows cards for each weak standard with subject badge, mastery percentage, and standard description
**And** each card has a "Practice This" link to /dashboard/tutor/new?subject=[subject]&topic=[standard description]
**And** the weakest standards appear first (sorted by score ascending)

---

### Suggested practice section is hidden when no weak mastery areas exist

**Given** a student is signed in
**And** all of the student's mastery records are at or above 70%

**When** the student navigates to /dashboard/tutor

**Then** no "Suggested Practice" section is displayed

---

### Suggested practice is limited to 4 items

**Given** a student is signed in
**And** the student has 8 mastery records below 70%

**When** the student navigates to /dashboard/tutor

**Then** the "Suggested Practice" section shows at most 4 items

---

### Tutor hub shows recent sessions

**Given** a student is signed in
**And** the student has 3 past tutor sessions

**When** the student navigates to /dashboard/tutor

**Then** the page displays a "Recent Sessions" section
**And** each session card shows the subject, topic (if present), date, message count, and last message preview
**And** active sessions display an "Active" badge in green
**And** ended sessions display an "Ended" badge in gray

---

### Tutor hub shows empty state when no sessions exist

**Given** a student is signed in
**And** the student has no tutor sessions

**When** the student navigates to /dashboard/tutor

**Then** the page displays "No sessions yet. Pick a subject above to get started."

---

## Tutor Chat UI

### Chat interface shows subject badge and timer

**Given** a student opens a tutor session for subject "Math"

**When** the chat page loads at /dashboard/tutor/[sessionId]

**Then** the page header displays a subject badge reading "Math"
**And** the page header displays a duration timer badge
**And** the page header displays an "End Session" button

---

### Chat input has pre-filled text when arriving from "Practice This" link

**Given** a student clicks a "Practice This" link for topic "Analyze central ideas" in subject "ELA"

**When** the page loads at /dashboard/tutor/new?subject=ELA&topic=Analyze%20central%20ideas

**Then** the chat input is pre-filled with "I need help with: Analyze central ideas"

---

### New session shows a welcome message before any messages are sent

**Given** a student starts a new tutor session for "Science"

**When** the chat page loads with no existing messages

**Then** the page displays a welcome message: "Let us get started with Science!"
**And** the page displays: "Ask me a question about what you are working on. I will help you think through it step by step."

---

### User messages are right-aligned with blue background

**Given** a student sends a message "What is the Pythagorean theorem?"

**When** the message appears in the chat

**Then** the message bubble is right-aligned (flex-row-reverse layout)
**And** the bubble has a blue background with white text
**And** a user avatar icon is displayed

---

### Tutor messages are left-aligned with "Powered by Claude" badge

**Given** the tutor responds to the student

**When** the tutor message appears in the chat

**Then** the message bubble is left-aligned (flex-row layout)
**And** the bubble has a stone/gray background
**And** the tutor response is rendered as markdown
**And** a "Powered by Claude" badge appears below the message
**And** a Bot avatar icon is displayed in emerald/green

---

### Streaming indicator shows during AI response

**Given** a student sends a message and the tutor is generating a response

**When** the response is streaming

**Then** the page displays a typing indicator with three bouncing dots while awaiting the first token
**And** once tokens arrive, the response appears with a pulsing cursor at the end
**And** the chat input is disabled during streaming

---

### End Session button closes the session and returns to the hub

**Given** a student is in an active tutor session

**When** the student clicks the "End Session" button

**Then** a DELETE request is sent to /api/tutor/sessions/[sessionId]
**And** the student is redirected to /dashboard/tutor

---

### Ended session disables the chat input

**Given** a student views a tutor session that has already ended (endedAt is not null)

**When** the chat page loads

**Then** the chat input is replaced with the message "This session has ended."
**And** a "Start a new session" button linking to /dashboard/tutor is displayed

---

### Chat input enforces a 2000 character limit

**Given** a student is typing in the chat input

**When** the student types more than 1800 characters (90% of the 2000 limit)

**Then** a character counter appears showing the current count out of 2000
**And** input is capped at 2000 characters

---

### Chat input supports Enter to send and Shift+Enter for new line

**Given** a student has typed a message in the chat input

**When** the student presses Enter

**Then** the message is sent

**When** the student presses Shift+Enter

**Then** a new line is inserted in the input without sending

---

## Tutor Behavior (AI Service)

### Tutor system prompt enforces the Socratic method

**Given** the tutor AI service builds a system prompt for subject "Math" at grade level "8"

**When** the system prompt is inspected

**Then** the prompt contains the instruction "You NEVER provide direct answers to academic questions"
**And** the prompt instructs the tutor to "Ask one guiding question at a time"
**And** the prompt instructs the tutor to "Break complex problems into smaller, manageable steps"

---

### Tutor prompt includes growth mindset framing

**Given** the tutor AI service builds a system prompt

**When** the system prompt is inspected

**Then** the prompt contains guidance on growth mindset framing including "You're on the right track..."
**And** the prompt includes "yet" language guidance: "You haven't gotten this yet, but you're building the skills..."

---

### Tutor adapts language for elementary grade levels

**Given** the tutor is configured for grade level "2"

**When** the system prompt is built

**Then** the language guidance says "Use very simple words and short sentences"
**And** the guidance includes "Be extra warm and encouraging"

---

### Tutor adapts language for middle school grade levels

**Given** the tutor is configured for grade level "7"

**When** the system prompt is built

**Then** the language guidance says "Use language appropriate for middle school students (grades 6-8)"

---

### Tutor adapts language for high school grade levels

**Given** the tutor is configured for grade level "10"

**When** the system prompt is built

**Then** the language guidance says "Use high school-appropriate language (grades 9-12)"
**And** the guidance says "Subject-specific terminology is appropriate"

---

### Tutor prompt includes assignment context when provided

**Given** a student is working on assignment "Persuasive Essay" with description "Write a persuasive essay about climate change"

**When** the tutor AI service builds the system prompt with assignmentContext

**Then** the system prompt includes an "ASSIGNMENT CONTEXT" section referencing "Persuasive Essay"
**And** the prompt includes the assignment description

---

### Tutor prompt includes homework detection instructions

**Given** the tutor AI service builds a system prompt

**When** the system prompt is inspected

**Then** the prompt contains instructions for homework/copy-paste detection
**And** the prompt instructs: "do NOT answer it directly" when detecting pasted homework problems
**And** the prompt instructs to "Ask what part they understand already"

---

### Tutor stays on topic for the configured subject

**Given** the tutor is configured for subject "Math"

**When** the system prompt is inspected

**Then** the prompt includes guidance to redirect off-topic questions: "My specialty is Math though"

---

### Tutor handles student wellbeing concerns

**Given** the tutor AI service builds a system prompt

**When** the system prompt is inspected

**Then** the prompt includes guidance to respond to wellbeing concerns: "Please talk to a trusted adult"

---

## Access Control

### Students cannot access teacher content creation routes

**Given** a student is signed in

**When** a POST request is sent to /api/assignments with a valid body

**Then** the response status is 403

---

### Students cannot access admin routes

**Given** a student is signed in

**When** a GET request is sent to /api/admin/overview

**Then** the response status is 403

---

### Students cannot access parent dashboard

**Given** a student is signed in

**When** a GET request is sent to /api/parent/dashboard

**Then** the response status is 403

---

### Students see only their own progress data

**Given** student "Aisha" is signed in
**And** mastery records exist for both "Aisha" and "DeShawn"

**When** Aisha sends a GET request to /api/student/progress

**Then** the response contains only mastery data where studentId matches Aisha's user ID
**And** DeShawn's mastery records are not included

---

### Students see only their own tutor sessions

**Given** student "Aisha" is signed in
**And** tutor sessions exist for both "Aisha" and "DeShawn"

**When** Aisha sends a GET request to /api/tutor/sessions

**Then** the response contains only sessions where studentId matches Aisha's user ID
**And** DeShawn's sessions are not included

---

## Tutor Data Model

### Tutor sessions table stores messages as a JSON text field

**Given** the tutorSessions table schema

**When** the messages column is inspected

**Then** it is a non-nullable text column containing a JSON array
**And** each message entry has fields: role ("user" or "assistant"), content (string), and timestamp (ISO string)

---

### Tutor sessions table references the users table

**Given** the tutorSessions table schema

**When** the studentId column is inspected

**Then** it is a non-nullable text column with a foreign key reference to users.id

---

### Tutor sessions track start and optional end time

**Given** the tutorSessions table schema

**When** the startedAt and endedAt columns are inspected

**Then** startedAt is a non-nullable timestamp that defaults to now
**And** endedAt is a nullable timestamp (null while the session is active)
