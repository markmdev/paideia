# Assignments -- CRUD and AI Generation

Tests covering the complete assignment lifecycle: listing, creating, retrieving, updating, deleting, and AI-powered generation with rubrics, success criteria, and differentiated versions.

---

## GET /api/assignments

### 1. Authenticated teacher retrieves their assignments

**Given** a teacher "Ms. Rivera" is signed in with role "teacher"
**And** she owns two assignments: "Poetry Analysis Essay" (created today) and "Vocabulary Quiz" (created yesterday)

**When** she sends GET /api/assignments

**Then** the response status is 200
**And** the response body is a JSON array with 2 items
**And** each item has the shape:
  - `assignment` (object): contains `id`, `title`, `description`, `type`, `subject`, `gradeLevel`, `status`, `classId`, `teacherId`, `rubricId`, `createdAt`, `updatedAt`
  - `className` (string or null): the name of the associated class
  - `rubricTitle` (string or null): the title of the associated rubric
**And** the first item is "Poetry Analysis Essay" (most recent `createdAt` first)
**And** the second item is "Vocabulary Quiz"

### 2. Assignments are scoped to the authenticated teacher

**Given** teacher "Ms. Rivera" is signed in and owns 3 assignments
**And** teacher "Mr. Okafor" owns 2 different assignments

**When** Ms. Rivera sends GET /api/assignments

**Then** the response status is 200
**And** the response body contains exactly 3 assignments
**And** every assignment has `teacherId` matching Ms. Rivera's user ID
**And** none of Mr. Okafor's assignments appear in the response

### 3. Teacher with no assignments receives an empty array

**Given** a teacher "Mr. Chen" is signed in with role "teacher"
**And** he has not created any assignments

**When** he sends GET /api/assignments

**Then** the response status is 200
**And** the response body is an empty JSON array `[]`

### 4. Unauthenticated request returns 401

**Given** no user is signed in

**When** a GET request is sent to /api/assignments

**Then** the response status is 401
**And** the response body contains `{ "error": "Unauthorized" }`

---

## POST /api/assignments

### 5. Teacher creates an assignment with all required fields

**Given** a teacher "Ms. Rivera" is signed in with role "teacher"
**And** a class "Period 1 ELA" exists with id "class-001"
**And** Ms. Rivera is a member of "class-001" with role "teacher"

**When** she sends POST /api/assignments with body:
```json
{
  "title": "Poetry Analysis Essay",
  "description": "Analyze the use of metaphor in selected poems",
  "instructions": "Read the three assigned poems and write a 5-paragraph essay...",
  "type": "essay",
  "subject": "English Language Arts",
  "gradeLevel": "8th",
  "classId": "class-001"
}
```

**Then** the response status is 201
**And** the response body contains the created assignment with:
  - `id`: a unique string identifier (cuid2 format)
  - `title`: "Poetry Analysis Essay"
  - `description`: "Analyze the use of metaphor in selected poems"
  - `instructions`: "Read the three assigned poems and write a 5-paragraph essay..."
  - `type`: "essay"
  - `subject`: "English Language Arts"
  - `gradeLevel`: "8th"
  - `classId`: "class-001"
  - `teacherId`: matching Ms. Rivera's user ID
  - `status`: "draft"
  - `createdAt`: a valid timestamp
  - `updatedAt`: a valid timestamp

### 6. Assignment defaults to type "essay" when type is omitted

**Given** a teacher is signed in and is a member of class "class-001"

**When** she sends POST /api/assignments with body that omits `type`:
```json
{
  "title": "Research Paper",
  "description": "Write a research paper on climate change",
  "classId": "class-001",
  "gradeLevel": "10th",
  "subject": "Science"
}
```

**Then** the response status is 201
**And** the created assignment has `type`: "essay"

### 7. Assignment accepts optional fields: dueDate, rubricId, successCriteria, aiMetadata

**Given** a teacher is signed in and is a member of class "class-001"
**And** a rubric "Essay Rubric" exists with id "rubric-001"

**When** she sends POST /api/assignments with body:
```json
{
  "title": "Persuasive Essay",
  "description": "Write a persuasive essay",
  "classId": "class-001",
  "gradeLevel": "8th",
  "subject": "ELA",
  "dueDate": "2025-06-15T00:00:00.000Z",
  "rubricId": "rubric-001",
  "successCriteria": ["I can state a clear claim", "I can support with evidence"],
  "aiMetadata": { "generatedAt": "2025-01-01", "model": "claude-opus-4-6" }
}
```

**Then** the response status is 201
**And** the created assignment has:
  - `dueDate`: a Date corresponding to June 15 2025
  - `rubricId`: "rubric-001"
  - `successCriteria`: a JSON string encoding the array of "I can" statements
  - `aiMetadata`: a JSON string encoding the metadata object

### 8. Missing required fields return 400

**Given** a teacher is signed in

**When** she sends POST /api/assignments with body:
```json
{
  "title": "Incomplete Assignment"
}
```

**Then** the response status is 400
**And** the response body contains `{ "error": "Missing required fields: title, description, classId, gradeLevel, subject" }`

### 9. Missing `description` returns 400

**Given** a teacher is signed in

**When** she sends POST /api/assignments with body:
```json
{
  "title": "Test",
  "classId": "class-001",
  "gradeLevel": "8th",
  "subject": "ELA"
}
```

**Then** the response status is 400
**And** the response body `error` field contains "Missing required fields"

### 10. Missing `classId` returns 400

**Given** a teacher is signed in

**When** she sends POST /api/assignments with body:
```json
{
  "title": "Test",
  "description": "A test assignment",
  "gradeLevel": "8th",
  "subject": "ELA"
}
```

**Then** the response status is 400
**And** the response body `error` field contains "Missing required fields"

### 11. Teacher without class membership is forbidden

**Given** a teacher "Ms. Rivera" is signed in
**And** a class "AP Chemistry" exists with id "class-999"
**And** Ms. Rivera is NOT a member of "class-999"

**When** she sends POST /api/assignments with body:
```json
{
  "title": "Chemistry Lab Report",
  "description": "Write a lab report",
  "classId": "class-999",
  "gradeLevel": "10th",
  "subject": "Chemistry"
}
```

**Then** the response status is 403
**And** the response body contains `{ "error": "You do not have access to this class" }`

### 12. Unauthenticated request returns 401

**Given** no user is signed in

**When** a POST request is sent to /api/assignments with a valid body

**Then** the response status is 401
**And** the response body contains `{ "error": "Unauthorized" }`

---

## GET /api/assignments/[id]

### 13. Teacher retrieves their assignment with full details

**Given** a teacher "Ms. Rivera" is signed in
**And** she owns assignment "a1" titled "Poetry Analysis Essay" in class "8th ELA"
**And** the assignment has a rubric "r1" with 2 criteria
**And** the assignment has 3 differentiated versions (below_grade, on_grade, above_grade)

**When** she sends GET /api/assignments/a1

**Then** the response status is 200
**And** the response body contains:
  - `assignment` (object): with `id` "a1", `title`, `description`, `instructions`, `type`, `gradeLevel`, `subject`, `status`, `classId`, `teacherId`, `rubricId`, `successCriteria`, `aiMetadata`, `createdAt`, `updatedAt`
  - `className` (string): "8th ELA"
  - `classSubject` (string): the subject of the associated class
  - `rubric` (object): with `id` "r1", `title`, `description`, `type`, `levels`, `teacherId`
  - `criteria` (array): with 2 items, each containing `id`, `rubricId`, `name`, `description`, `weight`, `descriptors`
  - `versions` (array): with 3 items, each containing `id`, `assignmentId`, `tier`, `title`, `content`, `scaffolds`

### 14. Assignment without a rubric returns null rubric and empty criteria

**Given** a teacher "Ms. Rivera" is signed in
**And** she owns assignment "a2" with `rubricId` null

**When** she sends GET /api/assignments/a2

**Then** the response status is 200
**And** `rubric` is null
**And** `criteria` is an empty array `[]`
**And** `versions` is an array (possibly empty)

### 15. Assignment not found returns 404

**Given** a teacher "Ms. Rivera" is signed in

**When** she sends GET /api/assignments/nonexistent-id

**Then** the response status is 404
**And** the response body contains `{ "error": "Assignment not found" }`

### 16. Teacher cannot retrieve another teacher's assignment

**Given** teacher "Mr. Okafor" is signed in
**And** assignment "a1" belongs to teacher "Ms. Rivera"

**When** Mr. Okafor sends GET /api/assignments/a1

**Then** the response status is 404
**And** the response body contains `{ "error": "Assignment not found" }`
**And** no assignment data is leaked to Mr. Okafor

### 17. Unauthenticated request returns 401

**Given** no user is signed in

**When** a GET request is sent to /api/assignments/a1

**Then** the response status is 401
**And** the response body contains `{ "error": "Unauthorized" }`

---

## PUT /api/assignments/[id]

### 18. Teacher updates their assignment

**Given** a teacher "Ms. Rivera" is signed in
**And** she owns assignment "a1" with title "Poetry Analysis Essay" and status "draft"

**When** she sends PUT /api/assignments/a1 with body:
```json
{
  "title": "Updated Poetry Analysis Essay",
  "description": "Revised description with clearer expectations",
  "status": "published"
}
```

**Then** the response status is 200
**And** the response body contains the updated assignment with:
  - `id`: "a1"
  - `title`: "Updated Poetry Analysis Essay"
  - `description`: "Revised description with clearer expectations"
  - `status`: "published"
  - `updatedAt`: a timestamp later than the original `updatedAt`

### 19. Only allowed fields are updatable

**Given** a teacher is signed in and owns assignment "a1"

**When** she sends PUT /api/assignments/a1 with body:
```json
{
  "title": "New Title",
  "description": "New description",
  "instructions": "New instructions",
  "type": "project",
  "gradeLevel": "9th",
  "subject": "History",
  "status": "published",
  "rubricId": "rubric-002",
  "dueDate": "2025-07-01T00:00:00.000Z",
  "successCriteria": ["I can analyze sources"],
  "aiMetadata": { "updated": true }
}
```

**Then** the response status is 200
**And** the allowed fields (`title`, `description`, `instructions`, `type`, `gradeLevel`, `subject`, `status`, `rubricId`, `dueDate`, `successCriteria`, `aiMetadata`) are updated
**And** `updatedAt` is set to the current time

### 20. Teacher cannot update another teacher's assignment

**Given** teacher "Mr. Okafor" is signed in
**And** assignment "a1" belongs to teacher "Ms. Rivera"

**When** Mr. Okafor sends PUT /api/assignments/a1 with body:
```json
{ "title": "Hijacked Title" }
```

**Then** the response status is 404
**And** the response body contains `{ "error": "Assignment not found" }`
**And** the original assignment remains unchanged

### 21. Updating a nonexistent assignment returns 404

**Given** a teacher is signed in

**When** she sends PUT /api/assignments/nonexistent-id with body:
```json
{ "title": "New Title" }
```

**Then** the response status is 404
**And** the response body contains `{ "error": "Assignment not found" }`

### 22. Unauthenticated request returns 401

**Given** no user is signed in

**When** a PUT request is sent to /api/assignments/a1 with body `{ "title": "Updated" }`

**Then** the response status is 401
**And** the response body contains `{ "error": "Unauthorized" }`

---

## DELETE /api/assignments/[id]

### 23. Teacher deletes their assignment

**Given** a teacher "Ms. Rivera" is signed in
**And** she owns assignment "a1"
**And** assignment "a1" has 3 differentiated versions

**When** she sends DELETE /api/assignments/a1

**Then** the response status is 200
**And** the response body contains `{ "success": true }`
**And** the differentiated versions associated with "a1" are deleted first
**And** the assignment "a1" is deleted from the database
**And** subsequent GET /api/assignments/a1 returns 404

### 24. Teacher cannot delete another teacher's assignment

**Given** teacher "Mr. Okafor" is signed in
**And** assignment "a1" belongs to teacher "Ms. Rivera"

**When** Mr. Okafor sends DELETE /api/assignments/a1

**Then** the response status is 404
**And** the response body contains `{ "error": "Assignment not found" }`
**And** assignment "a1" remains in the database

### 25. Deleting a nonexistent assignment returns 404

**Given** a teacher is signed in

**When** she sends DELETE /api/assignments/nonexistent-id

**Then** the response status is 404
**And** the response body contains `{ "error": "Assignment not found" }`

### 26. Unauthenticated request returns 401

**Given** no user is signed in

**When** a DELETE request is sent to /api/assignments/a1

**Then** the response status is 401
**And** the response body contains `{ "error": "Unauthorized" }`

---

## POST /api/assignments/generate

### 27. Teacher generates an AI assignment with complete package

**Given** a teacher "Ms. Rivera" is signed in with role "teacher"
**And** she is a member of class "class-001" with role "teacher"

**When** she sends POST /api/assignments/generate with body:
```json
{
  "objective": "Students will analyze the causes and effects of the American Revolution by evaluating primary source documents and constructing evidence-based arguments",
  "subject": "History",
  "gradeLevel": "8th",
  "type": "essay",
  "standards": "CCSS.ELA-LITERACY.RH.6-8.1",
  "classId": "class-001"
}
```

**Then** the response status is 200
**And** the response body contains:
  - `assignment` (object): a saved assignment record with:
    - `id`: a unique string identifier
    - `title`: an AI-generated title (non-empty string)
    - `description`: an AI-generated description (non-empty string)
    - `instructions`: AI-generated step-by-step instructions (non-empty string)
    - `type`: "essay"
    - `gradeLevel`: "8th"
    - `subject`: "History"
    - `classId`: "class-001"
    - `teacherId`: matching Ms. Rivera's user ID
    - `rubricId`: a non-null string (the created rubric's ID)
    - `status`: "draft"
    - `successCriteria`: a JSON string encoding an array of "I can" statements
    - `aiMetadata`: a JSON string encoding `{ generatedAt, model, objective, standards }`
  - `rubric` (object): a saved rubric record with:
    - `id`: a unique string identifier
    - `title`: an AI-generated rubric title
    - `description`: a rubric description
    - `type`: "analytical"
    - `levels`: a JSON string encoding `["Beginning", "Developing", "Proficient", "Advanced"]`
    - `teacherId`: matching Ms. Rivera's user ID
    - `isTemplate`: false
  - `criteria` (array): 3-5 saved rubric criteria, each with:
    - `id`, `rubricId` (matching the rubric), `name`, `description`, `weight` (number), `descriptors` (JSON string mapping level names to performance descriptors)
  - `versions` (array): 3 saved differentiated versions, each with:
    - `id`, `assignmentId` (matching the assignment), `tier` (one of "below_grade", "on_grade", "above_grade"), `title`, `content`, `scaffolds` (JSON string encoding an array)
  - `successCriteria` (array of strings): the raw AI-generated "I can" statements

### 28. AI assignment defaults to type "essay" when type is omitted

**Given** a teacher is signed in and is a member of class "class-001"

**When** she sends POST /api/assignments/generate with body:
```json
{
  "objective": "Students will identify the parts of a plant cell",
  "subject": "Biology",
  "gradeLevel": "10th",
  "classId": "class-001"
}
```

**Then** the response status is 200
**And** the created assignment has `type`: "essay"

### 29. Missing required fields return 400

**Given** a teacher is signed in

**When** she sends POST /api/assignments/generate with body:
```json
{
  "objective": "Students will learn about photosynthesis"
}
```

**Then** the response status is 400
**And** the response body contains `{ "error": "Missing required fields: objective, subject, gradeLevel, classId" }`

### 30. Missing `objective` returns 400

**Given** a teacher is signed in

**When** she sends POST /api/assignments/generate with body:
```json
{
  "subject": "Math",
  "gradeLevel": "5th",
  "classId": "class-001"
}
```

**Then** the response status is 400
**And** the response body `error` field contains "Missing required fields"

### 31. Teacher without class membership is forbidden

**Given** a teacher "Ms. Rivera" is signed in
**And** she is NOT a member of class "class-999"

**When** she sends POST /api/assignments/generate with body:
```json
{
  "objective": "Students will solve quadratic equations",
  "subject": "Mathematics",
  "gradeLevel": "9th",
  "classId": "class-999"
}
```

**Then** the response status is 403
**And** the response body contains `{ "error": "You do not have access to this class" }`

### 32. Unauthenticated request returns 401

**Given** no user is signed in

**When** a POST request is sent to /api/assignments/generate with a valid body

**Then** the response status is 401
**And** the response body contains `{ "error": "Unauthorized" }`

### 33. AI generation saves all artifacts to the database

**Given** a teacher generates an assignment via POST /api/assignments/generate

**When** the generation succeeds

**Then** the following records exist in the database:
  1. One `rubrics` row with `teacherId` matching the teacher and `type` "analytical"
  2. Multiple `rubric_criteria` rows with `rubricId` matching the created rubric
  3. One `assignments` row with `rubricId` pointing to the created rubric
  4. Three `differentiated_versions` rows with `assignmentId` matching the created assignment, one for each tier: "below_grade", "on_grade", "above_grade"
**And** the assignment's `aiMetadata` JSON contains the `model`, `objective`, `generatedAt`, and `standards` fields

### 34. AI generation handles missing differentiated versions gracefully

**Given** the AI model returns a response where `differentiatedVersions` is partially populated (some tiers are null or missing)

**When** the generation endpoint processes the response

**Then** only the non-null tiers are inserted into the `differentiated_versions` table
**And** the `versions` array in the response contains only the successfully created versions
**And** the overall request does not fail

---

## Assignment UI Pages

### 35. /dashboard/assignments -- teacher sees their assignments as cards

**Given** a teacher "Ms. Rivera" is signed in
**And** she owns 3 assignments: "Poetry Analysis Essay" (essay), "Cell Biology Quiz" (quiz), "History Project" (project)

**When** she navigates to /dashboard/assignments

**Then** the page displays:
  - Heading: "Assignments"
  - Subheading: "Create, manage, and track assignments across your classes."
  - A "Create Assignment" button linking to /dashboard/assignments/new
  - A grid of 3 assignment cards
**And** each card displays:
  - Assignment title
  - Description (truncated to 2 lines)
  - A badge for the assignment type (e.g., "Essay", "Quiz", "Project", "Lab Report", "Short Answer")
  - A badge for subject
  - A badge for grade level
  - A status badge (Draft, Published, Grading, or Completed)
  - Class name (if associated)
  - Due date (if set)
  - A "Rubric" indicator (if a rubric is attached)
**And** each card links to /dashboard/assignments/[id]

### 36. /dashboard/assignments -- teacher with no assignments sees empty state

**Given** a teacher "Mr. Chen" is signed in
**And** he has no assignments

**When** he navigates to /dashboard/assignments

**Then** the page displays:
  - Heading: "No assignments yet"
  - Text: "Get started by creating your first assignment. The Smart Assignment Creator will generate a complete package with rubric, success criteria, and differentiated versions."
  - A "Create Your First Assignment" button linking to /dashboard/assignments/new

### 37. /dashboard/assignments -- student sees published assignments from enrolled classes

**Given** a student "Aisha" is signed in with role "student"
**And** she is enrolled in class "class-001"
**And** class "class-001" has 2 assignments: one with status "published", one with status "draft"

**When** she navigates to /dashboard/assignments

**Then** the page displays:
  - Heading: "Assignments"
  - Subheading: "View assignments from your classes."
  - Only the "published" assignment appears (draft assignments are hidden from students)
  - No "Create Assignment" button is shown

### 38. /dashboard/assignments -- student with no enrolled classes sees empty state

**Given** a student is signed in with role "student"
**And** they are not enrolled in any classes

**When** they navigate to /dashboard/assignments

**Then** the page displays:
  - Heading: "No assignments yet"
  - Text: "No assignments yet. Check back when your teachers post new work."
  - No "Create" button is shown

### 39. /dashboard/assignments/new -- creation wizard with AI generation

**Given** a teacher "Ms. Rivera" is signed in
**And** she is a member of 2 classes: "Period 1 ELA" and "Period 3 ELA"

**When** she navigates to /dashboard/assignments/new

**Then** the page displays:
  - Heading: "Create Assignment"
  - Subheading: "Use the Smart Assignment Creator to generate a complete assignment package powered by AI."
  - A 3-step wizard indicator: "Configure" (active) > "Generate" > "Review"
  - A form card titled "Smart Assignment Creator" with fields:
    - Learning Objective (textarea, required)
    - Class (select dropdown with "Period 1 ELA" and "Period 3 ELA")
    - Assignment Type (select: Essay, Quiz, Short Answer, Project, Lab Report; defaults to "Essay")
    - Subject (select dropdown with 13 subjects)
    - Grade Level (select: K through 12th)
    - Standards (text input, optional, comma-separated)
  - A "Generate with AI" button that is disabled until objective, subject, gradeLevel, and classId are filled

### 40. /dashboard/assignments/new -- class selection auto-fills subject and grade

**Given** a teacher is on the /dashboard/assignments/new page
**And** class "Period 1 ELA" has subject "English Language Arts" and gradeLevel "8th"

**When** she selects "Period 1 ELA" from the Class dropdown
**And** subject and grade level were previously empty

**Then** the Subject field auto-fills to "English Language Arts"
**And** the Grade Level field auto-fills to "8th"

### 41. /dashboard/assignments/new -- generation flow shows loading then review

**Given** a teacher has filled in all required fields on /dashboard/assignments/new

**When** she clicks "Generate with AI"

**Then** the wizard advances to step 2 "Generate" showing:
  - A loading animation with rotating status messages: "Crafting your assignment...", "Designing rubric criteria...", "Building differentiated versions...", "Creating success criteria...", "Aligning to standards...", "Almost there..."
  - Skeleton placeholders
  - Text indicating generation takes 15-30 seconds

**When** the AI generation completes successfully

**Then** the wizard advances to step 3 "Review" showing:
  - The generated assignment title
  - Text: "Review the generated content below. Everything has been saved as a draft."
  - A "Start Over" button to return to step 1
  - A "View Assignment" button linking to the created assignment's detail page
  - Tabs for: Assignment, Rubric, Success Criteria, Differentiated Versions
  - The Assignment tab shows description and instructions rendered as markdown
  - The Rubric tab shows criteria with weights and descriptors
  - The Success Criteria tab shows "I can" statements
  - The Differentiated Versions tab shows 3 version cards labeled "Below Grade Level", "On Grade Level", "Above Grade Level" with content and scaffolds

### 42. /dashboard/assignments/[id] -- teacher detail page with tabs

**Given** a teacher "Ms. Rivera" is signed in
**And** she owns assignment "a1" titled "Poetry Analysis Essay"
**And** the assignment has status "published", subject "ELA", gradeLevel "8th", class "Period 1 ELA"
**And** the assignment has a rubric, success criteria, and 3 differentiated versions
**And** the assignment has a due date

**When** she navigates to /dashboard/assignments/a1

**Then** the page displays:
  - A back link "Assignments" linking to /dashboard/assignments
  - Assignment title: "Poetry Analysis Essay"
  - Badges for: status ("Published"), subject ("ELA"), grade level, class name ("Period 1 ELA"), due date
  - A Delete button (with confirmation flow)
  - Tabs: Assignment, Rubric, Success Criteria, Differentiated Versions
  - The Assignment tab shows the description and instructions rendered as markdown
  - The Rubric tab shows the rubric criteria display
  - The Success Criteria tab shows "I can" statements with checkmark icons
  - The Differentiated Versions tab shows 3 version cards with tier badges, titles, content, and scaffolds

### 43. /dashboard/assignments/[id] -- student detail page with limited tabs

**Given** a student "Aisha" is signed in with role "student"
**And** she is enrolled in a class that has published assignment "a1"
**And** she has not submitted work for "a1"

**When** she navigates to /dashboard/assignments/a1

**Then** the page displays:
  - Assignment title, status badge, subject badge, grade level badge, class name badge, due date badge
  - No Delete button
  - The Assignment tab showing description and instructions
  - No Rubric, Success Criteria, or Differentiated Versions tabs (teacher-only)
  - A submission form to submit work for the assignment

### 44. /dashboard/assignments/[id] -- student with submission sees submission tab

**Given** a student "Aisha" is signed in
**And** she has submitted work for assignment "a1" with status "submitted"

**When** she navigates to /dashboard/assignments/a1

**Then** the page displays tabs: Assignment, Your Submission
**And** the "Your Submission" tab shows:
  - Submission status badge ("Submitted")
  - Submitted date formatted as "MMM d, yyyy at h:mm a"
  - Submission content in a styled container
  - An "Awaiting Teacher Feedback" notice (since no feedback has been approved yet)

### 45. /dashboard/assignments/[id] -- student with graded submission sees feedback tab

**Given** a student "Aisha" is signed in
**And** her submission for assignment "a1" has been graded with letter grade "A-" and score 92/100
**And** approved feedback exists with strengths, improvements, and next steps

**When** she navigates to /dashboard/assignments/a1

**Then** the page displays tabs: Assignment, Your Submission, Feedback
**And** the "Feedback" tab shows:
  - A grade card displaying "A-" and "92 / 100 points"
  - Teacher Feedback section with the narrative rendered as markdown
  - Strengths section with checkmark-prefixed bullet points
  - Areas for Improvement section with numbered items
  - Next Steps section with numbered items
  - An AI disclosure footer: "This feedback was drafted by AI and reviewed by your teacher."

### 46. /dashboard/assignments/[id] -- student cannot view draft assignments

**Given** a student "Aisha" is signed in
**And** assignment "a1" has status "draft" in one of her enrolled classes

**When** she navigates to /dashboard/assignments/a1

**Then** the page returns a 404 Not Found

### 47. /dashboard/assignments/[id] -- delete button requires confirmation

**Given** a teacher is viewing their assignment detail page at /dashboard/assignments/a1

**When** she clicks the "Delete" button

**Then** a confirmation prompt appears with "Delete?" text, a "Confirm" button, and a "Cancel" button

**When** she clicks "Cancel"

**Then** the confirmation prompt disappears and the assignment remains

**When** she clicks "Delete" again and then "Confirm"

**Then** a DELETE request is sent to /api/assignments/a1
**And** on success, the user is redirected to /dashboard/assignments

---

## Data Model Integrity

### 48. Assignments table schema

**Given** the database schema for the `assignments` table

**Then** it has the following columns:
  - `id` (text, primary key, auto-generated cuid2)
  - `title` (text, not null)
  - `description` (text, not null)
  - `instructions` (text, nullable)
  - `type` (text, not null, default "essay") -- values: essay, quiz, short_answer, project, lab_report
  - `grade_level` (text, not null)
  - `subject` (text, not null)
  - `due_date` (timestamp, nullable)
  - `status` (text, not null, default "draft") -- values: draft, published, grading, completed
  - `class_id` (text, not null, foreign key to classes.id)
  - `teacher_id` (text, not null, foreign key to users.id)
  - `rubric_id` (text, nullable, foreign key to rubrics.id)
  - `success_criteria` (text, nullable) -- JSON array
  - `ai_metadata` (text, nullable) -- JSON object
  - `created_at` (timestamp, not null, defaults to now)
  - `updated_at` (timestamp, not null, defaults to now)

### 49. Differentiated versions table schema

**Given** the database schema for the `differentiated_versions` table

**Then** it has the following columns:
  - `id` (text, primary key, auto-generated cuid2)
  - `assignment_id` (text, not null, foreign key to assignments.id with cascade delete)
  - `tier` (text, not null) -- values: below_grade, on_grade, above_grade
  - `title` (text, not null)
  - `content` (text, not null)
  - `scaffolds` (text, nullable) -- JSON array
  - `created_at` (timestamp, not null, defaults to now)
