# Grading, Batch Processing, Analytics, and Differentiation

Tests covering the full grading lifecycle: student submission, single and batch AI grading against rubrics, feedback review and approval, grading analytics, and assessment-driven differentiation.

---

## GET /api/grading -- List Submissions

### 1. Unauthenticated request is rejected

**Given** no user is signed in

**When** a request is sent to GET /api/grading

**Then** the response status is 401
**And** the response body contains `{ "error": "Unauthorized" }`

### 2. Teacher gets submissions for their assignments

**Given** a teacher "Ms. Rivera" is signed in with role "teacher"
**And** she owns an assignment "Poetry Analysis Essay" (id: "a1")
**And** student "Aisha Torres" has submitted work for that assignment with status "submitted"

**When** she sends GET /api/grading

**Then** the response status is 200
**And** the response is an array containing the submission with:
  - id: a unique string identifier
  - assignmentId: "a1"
  - studentName: "Aisha Torres"
  - assignmentTitle: "Poetry Analysis Essay"
  - content: the student's submitted text
  - status: "submitted"
  - totalScore: null
  - maxScore: null
  - letterGrade: null
  - submittedAt: a valid timestamp
  - gradedAt: null

### 3. Teacher sees empty list when they have no assignments

**Given** a teacher "Ms. Rivera" is signed in with role "teacher"
**And** she has no assignments

**When** she sends GET /api/grading

**Then** the response status is 200
**And** the response is an empty array `[]`

### 4. Teacher can filter submissions by assignmentId

**Given** a teacher "Ms. Rivera" is signed in with role "teacher"
**And** she owns assignment "a1" with 3 submissions
**And** she owns assignment "a2" with 2 submissions

**When** she sends GET /api/grading?assignmentId=a1

**Then** the response status is 200
**And** the response contains only submissions where assignmentId is "a1"
**And** no submissions for assignment "a2" are included

### 5. Teacher can filter submissions by status

**Given** a teacher "Ms. Rivera" is signed in with role "teacher"
**And** she has submissions in statuses "submitted", "graded", and "returned"

**When** she sends GET /api/grading?status=submitted

**Then** the response status is 200
**And** every submission in the response has status "submitted"

### 6. Submissions from other teachers' assignments are not visible

**Given** a teacher "Ms. Rivera" is signed in with role "teacher"
**And** another teacher "Mr. Okafor" owns assignment "a3" with submissions

**When** Ms. Rivera sends GET /api/grading

**Then** the response status is 200
**And** no submissions for assignment "a3" appear in the response

### 7. Submissions are ordered by submission date descending

**Given** a teacher "Ms. Rivera" is signed in with role "teacher"
**And** she has submissions submitted at different times

**When** she sends GET /api/grading

**Then** the response status is 200
**And** submissions are ordered with the most recently submitted first

---

## POST /api/grading -- Grade Single Submission

### 8. Unauthenticated grading request is rejected

**Given** no user is signed in

**When** a request is sent to POST /api/grading with body:
  - submissionId: "sub-1"

**Then** the response status is 401
**And** the response body contains `{ "error": "Unauthorized" }`

### 9. Request with no submissionId and no inline submission fields returns 400

**Given** a teacher "Ms. Rivera" is signed in with role "teacher"

**When** she sends POST /api/grading with an empty body `{}`

**Then** the response status is 400
**And** the response error message mentions "submissionId"

### 10. Grading a non-existent submission returns 404

**Given** a teacher "Ms. Rivera" is signed in with role "teacher"

**When** she sends POST /api/grading with body:
  - submissionId: "nonexistent-sub"

**Then** the response status is 404
**And** the response body contains `{ "error": "Submission not found" }`

### 11. Teacher cannot grade a submission on an assignment they do not own

**Given** a teacher "Ms. Rivera" is signed in with role "teacher"
**And** a submission "sub-1" exists for an assignment owned by teacher "Mr. Okafor"

**When** Ms. Rivera sends POST /api/grading with body:
  - submissionId: "sub-1"

**Then** the response status is 403
**And** the response error message contains "do not have access"

### 12. Grading fails when the assignment has no rubric

**Given** a teacher "Ms. Rivera" is signed in with role "teacher"
**And** she owns an assignment "a1" with rubricId set to null
**And** a submission "sub-1" exists for assignment "a1"

**When** she sends POST /api/grading with body:
  - submissionId: "sub-1"

**Then** the response status is 400
**And** the response error message contains "no rubric"

### 13. AI grades a submission against the rubric and returns structured feedback

**Given** a teacher "Ms. Rivera" is signed in with role "teacher"
**And** she owns assignment "a1" (title: "Poetry Analysis Essay", subject: "ELA", gradeLevel: "8")
**And** assignment "a1" has a rubric "Essay Rubric" with levels ["Beginning", "Developing", "Proficient", "Advanced"]
**And** the rubric has criteria including "Thesis" (weight: 0.5) and "Evidence" (weight: 0.5)
**And** student "Aisha Torres" has submitted work for "a1" (submission "sub-1")

**When** Ms. Rivera sends POST /api/grading with body:
  - submissionId: "sub-1"

**Then** the response status is 201
**And** the response body contains:
  - submissionId: "sub-1"
  - status: "graded"
  - totalScore: a number between 0 and 100
  - maxScore: 100
  - letterGrade: one of "A+", "A", "A-", "B+", "B", "B-", "C+", "C", "C-", "D+", "D", "D-", "F"
  - feedback: a non-empty string (the overall feedback narrative)
  - strengths: an array of 2-4 specific strengths
  - improvements: an array of 2-4 specific improvement areas
  - nextSteps: an array of 2-3 actionable next steps
  - criterionScores: an array with one entry per rubric criterion

### 14. Each criterion score has required fields

**Given** the same preconditions as test 13

**When** the grading response is received

**Then** each entry in criterionScores contains:
  - criterionId: matching a criterion from the rubric
  - criterionName: the name of that criterion (e.g. "Thesis")
  - level: one of the rubric levels ("Beginning", "Developing", "Proficient", or "Advanced")
  - score: a number between 0 and maxScore
  - maxScore: a number derived from the criterion weight
  - justification: a non-empty string referencing the student's actual work

### 15. Feedback draft is saved with "draft" status

**Given** the same preconditions as test 13
**And** the AI grading completes successfully

**When** the grading result is persisted

**Then** a feedback_drafts record is created with:
  - submissionId: "sub-1"
  - teacherId: Ms. Rivera's user ID
  - aiFeedback: the overall feedback text
  - status: "draft"
  - strengths: a JSON string array of the identified strengths
  - improvements: a JSON string array of the identified improvements
  - nextSteps: a JSON string array of the identified next steps
  - aiMetadata: a JSON object containing misconceptions and letterGrade

### 16. Criterion scores are persisted to the database

**Given** the same preconditions as test 13
**And** the AI grading completes successfully

**When** the grading result is persisted

**Then** criterion_scores records are created, one per rubric criterion
**And** each record contains submissionId, criterionId, level, score, maxScore, and justification

### 17. The submission record is updated after grading

**Given** the same preconditions as test 13
**And** the AI grading completes successfully

**When** the grading result is persisted

**Then** the submission record is updated with:
  - status: "graded"
  - totalScore: the sum of criterion scores
  - maxScore: the sum of criterion max scores
  - letterGrade: the assigned letter grade
  - gradedAt: a valid timestamp

### 18. Teacher can create a submission and grade it in one request

**Given** a teacher "Ms. Rivera" is signed in with role "teacher"
**And** she owns assignment "a1" with a rubric

**When** she sends POST /api/grading with body:
  - assignmentId: "a1"
  - studentId: "student-001"
  - content: "The student's essay text about poetry..."

**Then** the response status is 201
**And** a new submission is created with status "graded"
**And** the response contains grading results as described in test 13

---

## GET /api/grading/[submissionId] -- Get Submission Detail

### 19. Unauthenticated detail request is rejected

**Given** no user is signed in

**When** a request is sent to GET /api/grading/sub-1

**Then** the response status is 401

### 20. Returns full submission detail with feedback and criterion scores

**Given** a teacher "Ms. Rivera" is signed in with role "teacher"
**And** she owns the assignment for submission "sub-1"
**And** submission "sub-1" has been graded with feedback and criterion scores

**When** she sends GET /api/grading/sub-1

**Then** the response status is 200
**And** the response contains a "submission" object with:
  - id, assignmentId, studentId, studentName, content, status, totalScore, maxScore, letterGrade, submittedAt, gradedAt
**And** the response contains an "assignment" object with:
  - title, description, subject, gradeLevel
**And** the response contains a "feedback" object with:
  - id, aiFeedback, teacherEdits, finalFeedback, status
  - strengths: a parsed JSON array
  - improvements: a parsed JSON array
  - nextSteps: a parsed JSON array
  - aiMetadata: a parsed JSON object
**And** the response contains a "criterionScores" array where each entry has:
  - id, criterionId, criterionName, level, score, maxScore, justification

### 21. Returns 404 for a non-existent submission

**Given** a teacher "Ms. Rivera" is signed in with role "teacher"

**When** she sends GET /api/grading/nonexistent-id

**Then** the response status is 404
**And** the response body contains `{ "error": "Submission not found" }`

### 22. Returns 403 when teacher does not own the submission's assignment

**Given** a teacher "Ms. Rivera" is signed in with role "teacher"
**And** submission "sub-1" belongs to an assignment owned by "Mr. Okafor"

**When** Ms. Rivera sends GET /api/grading/sub-1

**Then** the response status is 403
**And** the response error message contains "do not have access"

### 23. Returns null feedback when submission has not been graded

**Given** a teacher "Ms. Rivera" is signed in with role "teacher"
**And** she owns the assignment for submission "sub-1"
**And** submission "sub-1" has status "submitted" and no feedback exists

**When** she sends GET /api/grading/sub-1

**Then** the response status is 200
**And** the "feedback" field is null
**And** the "criterionScores" array is empty

---

## PUT /api/grading/[submissionId] -- Approve, Edit, or Regenerate Feedback

### 24. Unauthenticated update request is rejected

**Given** no user is signed in

**When** a request is sent to PUT /api/grading/sub-1 with body:
  - action: "approve"

**Then** the response status is 401

### 25. Invalid action returns 400

**Given** a teacher "Ms. Rivera" is signed in with role "teacher"
**And** she owns the assignment for submission "sub-1"

**When** she sends PUT /api/grading/sub-1 with body:
  - action: "invalid_action"

**Then** the response status is 400
**And** the response error message mentions "approve, edit, or regenerate"

### 26. Approve action changes feedback to approved and submission to returned

**Given** a teacher "Ms. Rivera" is signed in with role "teacher"
**And** submission "sub-1" has a feedback draft with status "draft" and aiFeedback "Good essay."

**When** she sends PUT /api/grading/sub-1 with body:
  - action: "approve"

**Then** the response status is 200
**And** the response contains:
  - status: "approved"
  - finalFeedback: "Good essay." (falls back to aiFeedback when no edits exist)
  - submissionStatus: "returned"
**And** the feedback_drafts record is updated: status becomes "approved", finalFeedback is set
**And** the submission record is updated: status becomes "returned"

### 27. Approve with custom finalFeedback uses the provided text

**Given** a teacher "Ms. Rivera" is signed in with role "teacher"
**And** submission "sub-1" has a feedback draft

**When** she sends PUT /api/grading/sub-1 with body:
  - action: "approve"
  - finalFeedback: "Excellent work, Aisha. Keep it up!"

**Then** the response status is 200
**And** the finalFeedback in the response is "Excellent work, Aisha. Keep it up!"

### 28. Edit action updates teacher edits on the feedback draft

**Given** a teacher "Ms. Rivera" is signed in with role "teacher"
**And** submission "sub-1" has a feedback draft with status "draft"

**When** she sends PUT /api/grading/sub-1 with body:
  - action: "edit"
  - teacherEdits: "I've adjusted the feedback to be more specific."

**Then** the response status is 200
**And** the response contains:
  - status: "edited"
  - teacherEdits: "I've adjusted the feedback to be more specific."
**And** the feedback_drafts record is updated: status becomes "edited", teacherEdits is set

### 29. Edit action without content returns 400

**Given** a teacher "Ms. Rivera" is signed in with role "teacher"
**And** submission "sub-1" has a feedback draft

**When** she sends PUT /api/grading/sub-1 with body:
  - action: "edit"

**Then** the response status is 400
**And** the response error message mentions "teacherEdits or finalFeedback"

### 30. Regenerate action triggers new AI grading and resets feedback to draft

**Given** a teacher "Ms. Rivera" is signed in with role "teacher"
**And** submission "sub-1" has a feedback draft with status "edited"
**And** the assignment has a rubric

**When** she sends PUT /api/grading/sub-1 with body:
  - action: "regenerate"

**Then** the response status is 200
**And** the response contains:
  - status: "regenerated"
  - totalScore: a number
  - maxScore: a number
  - letterGrade: a valid letter grade
  - feedback: a non-empty string (new AI feedback)
  - criterionScores: an array of criterion scores
  - strengths: an array
  - improvements: an array
  - nextSteps: an array
**And** the feedback_drafts record is updated: status reverts to "draft", aiFeedback is replaced
**And** old criterion_scores are deleted and new ones are inserted
**And** the submission scores are updated to reflect the new grading

### 31. Regenerate accepts an optional feedbackTone parameter

**Given** a teacher "Ms. Rivera" is signed in with role "teacher"
**And** submission "sub-1" has a feedback draft and the assignment has a rubric

**When** she sends PUT /api/grading/sub-1 with body:
  - action: "regenerate"
  - feedbackTone: "socratic"

**Then** the response status is 200
**And** the AI service is called with feedbackTone "socratic"
**And** the regenerated feedback reflects the Socratic tone (guiding questions, reflective prompts)

### 32. Returns 404 when no feedback draft exists for the submission

**Given** a teacher "Ms. Rivera" is signed in with role "teacher"
**And** submission "sub-1" has not been graded (no feedback_drafts record)

**When** she sends PUT /api/grading/sub-1 with body:
  - action: "approve"

**Then** the response status is 404
**And** the response error message contains "No feedback draft found"

---

## POST /api/grading/batch -- Batch Grade

### 33. Unauthenticated batch grading request is rejected

**Given** no user is signed in

**When** a request is sent to POST /api/grading/batch with body:
  - assignmentId: "a1"

**Then** the response status is 401
**And** the response body contains `{ "error": "Unauthorized" }`

### 34. Missing assignmentId returns 400

**Given** a teacher "Ms. Rivera" is signed in with role "teacher"

**When** she sends POST /api/grading/batch with an empty body `{}`

**Then** the response status is 400
**And** the response error message contains "assignmentId"

### 35. Non-owner cannot batch grade an assignment

**Given** a teacher "Ms. Rivera" is signed in with role "teacher"
**And** assignment "a1" is owned by "Mr. Okafor"

**When** Ms. Rivera sends POST /api/grading/batch with body:
  - assignmentId: "a1"

**Then** the response status is 403
**And** the response error message contains "do not have access"

### 36. Assignment without a rubric cannot be batch graded

**Given** a teacher "Ms. Rivera" is signed in with role "teacher"
**And** she owns assignment "a1" with rubricId set to null

**When** she sends POST /api/grading/batch with body:
  - assignmentId: "a1"

**Then** the response status is 400
**And** the response error message contains "no rubric"

### 37. Batch grades all ungraded submissions for an assignment

**Given** a teacher "Ms. Rivera" is signed in with role "teacher"
**And** she owns assignment "a1" with a rubric
**And** assignment "a1" has 3 submissions with status "submitted"

**When** she sends POST /api/grading/batch with body:
  - assignmentId: "a1"

**Then** the response status is 200
**And** the response contains:
  - total: 3
  - graded: 3
  - failed: 0
**And** all 3 submissions are updated to status "graded" with scores and letter grades
**And** feedback_drafts and criterion_scores records are created for each submission

### 38. Batch grading skips already-graded submissions

**Given** a teacher "Ms. Rivera" is signed in with role "teacher"
**And** she owns assignment "a1" with a rubric
**And** assignment "a1" has 2 submissions with status "submitted" and 1 with status "graded"

**When** she sends POST /api/grading/batch with body:
  - assignmentId: "a1"

**Then** the response status is 200
**And** the response contains:
  - total: 2 (only ungraded submissions)
  - graded: 2
  - failed: 0
**And** the already-graded submission is unchanged

### 39. Returns zero totals when no ungraded submissions exist

**Given** a teacher "Ms. Rivera" is signed in with role "teacher"
**And** she owns assignment "a1" with a rubric
**And** all submissions for "a1" have status "graded" or "returned"

**When** she sends POST /api/grading/batch with body:
  - assignmentId: "a1"

**Then** the response status is 200
**And** the response contains:
  - total: 0
  - graded: 0
  - failed: 0
  - message: "No ungraded submissions found for this assignment."

### 40. Batch grading accepts an optional feedbackTone parameter

**Given** a teacher "Ms. Rivera" is signed in with role "teacher"
**And** she owns assignment "a1" with a rubric and 2 ungraded submissions

**When** she sends POST /api/grading/batch with body:
  - assignmentId: "a1"
  - feedbackTone: "growth_mindset"

**Then** the response status is 200
**And** the AI batch grading service is called with feedbackTone "growth_mindset"

### 41. Failed individual gradings are counted and submission status is reverted

**Given** a teacher "Ms. Rivera" is signed in with role "teacher"
**And** she owns assignment "a1" with a rubric and 3 ungraded submissions
**And** the persistence step fails for one submission

**When** she sends POST /api/grading/batch with body:
  - assignmentId: "a1"

**Then** the response status is 200
**And** the response contains:
  - total: 3
  - graded: 2
  - failed: 1
**And** the failed submission's status is reverted to "submitted"

---

## GET /api/grading/analytics -- Grading Analytics

### 42. Unauthenticated analytics request is rejected

**Given** no user is signed in

**When** a request is sent to GET /api/grading/analytics?assignmentId=a1

**Then** the response status is 401

### 43. Missing assignmentId query parameter returns 400

**Given** a teacher "Ms. Rivera" is signed in with role "teacher"

**When** she sends GET /api/grading/analytics (no query params)

**Then** the response status is 400
**And** the response error message contains "assignmentId"

### 44. Non-owner cannot access analytics for an assignment

**Given** a teacher "Ms. Rivera" is signed in with role "teacher"
**And** assignment "a1" is owned by "Mr. Okafor"

**When** Ms. Rivera sends GET /api/grading/analytics?assignmentId=a1

**Then** the response status is 403

### 45. Returns comprehensive analytics for a graded assignment

**Given** a teacher "Ms. Rivera" is signed in with role "teacher"
**And** she owns assignment "a1" (title: "Poetry Analysis Essay")
**And** "a1" has 5 submissions, all graded, with scores: 92, 85, 78, 65, 45

**When** she sends GET /api/grading/analytics?assignmentId=a1

**Then** the response status is 200
**And** the response contains:
  - assignmentId: "a1"
  - assignmentTitle: "Poetry Analysis Essay"
  - totalSubmissions: 5
  - gradedCount: 5
  - averageScore: the average of the total scores
  - averagePercentage: a number reflecting the percentage

### 46. Score distribution buckets are computed in 10% ranges

**Given** the same preconditions as test 45

**When** the analytics response is received

**Then** the scoreDistribution object contains keys:
  "0-9%", "10-19%", "20-29%", "30-39%", "40-49%", "50-59%", "60-69%", "70-79%", "80-89%", "90-100%"
**And** each value is a count of submissions falling into that percentage range
**And** the sum of all bucket values equals the gradedCount

### 47. Letter grade distribution counts each grade

**Given** the same preconditions as test 45

**When** the analytics response is received

**Then** the letterGradeDistribution is an object mapping letter grades to counts
**And** the sum of all counts equals the gradedCount

### 48. Per-criterion averages are computed

**Given** a teacher "Ms. Rivera" is signed in with role "teacher"
**And** she owns assignment "a1" with a rubric containing criteria "Thesis" and "Evidence"
**And** "a1" has 2 graded submissions with criterion scores

**When** she sends GET /api/grading/analytics?assignmentId=a1

**Then** the response contains a criterionAverages array
**And** each entry has:
  - criterionId: matching a rubric criterion
  - criterionName: the name of that criterion
  - averageScore: the mean score for that criterion across submissions
  - averageMaxScore: the mean max score
  - averagePercentage: (averageScore / averageMaxScore) * 100

### 49. Common misconceptions are aggregated from feedback metadata

**Given** a teacher "Ms. Rivera" is signed in with role "teacher"
**And** "a1" has graded submissions where feedback aiMetadata includes misconceptions
**And** the misconception "Summarizes rather than analyzes" appears in 3 feedbacks

**When** she sends GET /api/grading/analytics?assignmentId=a1

**Then** the response contains a commonMisconceptions array
**And** the array is sorted by count descending
**And** the entry for "Summarizes rather than analyzes" has count 3
**And** at most 10 misconceptions are returned

### 50. Class performance lists each student's score

**Given** the same preconditions as test 45

**When** the analytics response is received

**Then** the classPerformance array contains one entry per scored submission
**And** each entry has: studentId, studentName, totalScore, maxScore, percentage, letterGrade

### 51. Returns empty analytics when no submissions are scored

**Given** a teacher "Ms. Rivera" is signed in with role "teacher"
**And** she owns assignment "a1" with submissions that have null scores

**When** she sends GET /api/grading/analytics?assignmentId=a1

**Then** the response status is 200
**And** the response contains:
  - gradedCount: 0
  - averageScore: null
  - averagePercentage: null
  - scoreDistribution: all values are 0
  - criterionAverages: an empty array
  - classPerformance: an empty array

---

## POST /api/grading/differentiate -- Generate Differentiation

### 52. Unauthenticated differentiation request is rejected

**Given** no user is signed in

**When** a request is sent to POST /api/grading/differentiate with body:
  - assignmentId: "a1"

**Then** the response status is 401

### 53. Student role is forbidden from generating differentiation

**Given** a student "Aisha Torres" is signed in with role "student"

**When** she sends POST /api/grading/differentiate with body:
  - assignmentId: "a1"

**Then** the response status is 403
**And** the response body contains `{ "error": "Forbidden" }`

### 54. Parent role is forbidden from generating differentiation

**Given** a parent "Sarah Chen" is signed in with role "parent"

**When** she sends POST /api/grading/differentiate with body:
  - assignmentId: "a1"

**Then** the response status is 403
**And** the response body contains `{ "error": "Forbidden" }`

### 55. Missing assignmentId returns 400

**Given** a teacher "Ms. Rivera" is signed in with role "teacher"

**When** she sends POST /api/grading/differentiate with an empty body `{}`

**Then** the response status is 400
**And** the response error message contains "assignmentId"

### 56. Non-owner cannot generate differentiation for an assignment

**Given** a teacher "Ms. Rivera" is signed in with role "teacher"
**And** assignment "a1" is owned by "Mr. Okafor"

**When** Ms. Rivera sends POST /api/grading/differentiate with body:
  - assignmentId: "a1"

**Then** the response status is 403
**And** the response error message contains "not found"

### 57. Returns 400 when no graded submissions exist

**Given** a teacher "Ms. Rivera" is signed in with role "teacher"
**And** she owns assignment "a1"
**And** "a1" has no scored submissions (all null scores or no submissions)

**When** she sends POST /api/grading/differentiate with body:
  - assignmentId: "a1"

**Then** the response status is 400
**And** the response error message contains "No graded submissions"

### 58. Returns three tiers with students clustered by performance

**Given** a teacher "Ms. Rivera" is signed in with role "teacher"
**And** she owns assignment "a1" (subject: "ELA", gradeLevel: "8")
**And** "a1" has scored submissions:
  - Student A: 45/100 (45%)
  - Student B: 55/100 (55%)
  - Student C: 70/100 (70%)
  - Student D: 75/100 (75%)
  - Student E: 90/100 (90%)
  - Student F: 95/100 (95%)

**When** she sends POST /api/grading/differentiate with body:
  - assignmentId: "a1"

**Then** the response status is 200
**And** the response contains a "tiers" array with exactly 3 entries

**And** tier[0] has:
  - level: "below_grade"
  - label: "Below Grade"
  - studentCount: 2 (students scoring below 60%)
  - students: [{name: "Student A", score: 45}, {name: "Student B", score: 55}] sorted by score ascending
  - activity.title: a non-empty string
  - activity.description: a non-empty string
  - activity.instructions: a non-empty string
  - activity.scaffolds: an array of scaffolding supports

**And** tier[1] has:
  - level: "on_grade"
  - label: "On Grade"
  - studentCount: 2 (students scoring 60%-84%)
  - students: [{name: "Student C", score: 70}, {name: "Student D", score: 75}] sorted by score ascending

**And** tier[2] has:
  - level: "above_grade"
  - label: "Above Grade"
  - studentCount: 2 (students scoring 85%+)
  - students: [{name: "Student F", score: 95}, {name: "Student E", score: 90}] sorted by score descending
  - activity.extensions: an array of enrichment challenges

### 59. SPED teacher can generate differentiation

**Given** a SPED teacher "Ms. Rodriguez" is signed in with role "sped_teacher"
**And** she owns assignment "a1" with scored submissions

**When** she sends POST /api/grading/differentiate with body:
  - assignmentId: "a1"

**Then** the response status is 200
**And** the response contains a "tiers" array with 3 entries

---

## POST /api/submissions -- Student Submit Work

### 60. Unauthenticated submission is rejected

**Given** no user is signed in

**When** a request is sent to POST /api/submissions with body:
  - assignmentId: "a1"
  - content: "My essay..."

**Then** the response status is 401

### 61. Non-student role is forbidden

**Given** a teacher "Ms. Rivera" is signed in with role "teacher"

**When** she sends POST /api/submissions with body:
  - assignmentId: "a1"
  - content: "My essay..."

**Then** the response status is 403
**And** the response body contains `{ "error": "Forbidden" }`

### 62. Missing required fields returns 400

**Given** a student "Aisha Torres" is signed in with role "student"

**When** she sends POST /api/submissions with body:
  - assignmentId: "a1"
  (content is missing)

**Then** the response status is 400
**And** the response error message contains "assignmentId, content"

### 63. Student cannot submit to a non-existent assignment

**Given** a student "Aisha Torres" is signed in with role "student"

**When** she sends POST /api/submissions with body:
  - assignmentId: "nonexistent"
  - content: "My essay..."

**Then** the response status is 404
**And** the response body contains `{ "error": "Assignment not found" }`

### 64. Student cannot submit to a draft assignment

**Given** a student "Aisha Torres" is signed in with role "student"
**And** assignment "a1" exists with status "draft"

**When** she sends POST /api/submissions with body:
  - assignmentId: "a1"
  - content: "My essay..."

**Then** the response status is 404
**And** the response body contains `{ "error": "Assignment not found" }`

### 65. Student must be enrolled in the assignment's class

**Given** a student "Aisha Torres" is signed in with role "student"
**And** assignment "a1" belongs to a class she is not enrolled in

**When** she sends POST /api/submissions with body:
  - assignmentId: "a1"
  - content: "My essay..."

**Then** the response status is 404
**And** the response error message contains "Not enrolled"

### 66. Student successfully submits work

**Given** a student "Aisha Torres" is signed in with role "student"
**And** assignment "a1" exists with status "published"
**And** Aisha is enrolled in the class for assignment "a1"

**When** she sends POST /api/submissions with body:
  - assignmentId: "a1"
  - content: "In this essay, I will argue that metaphor is the most powerful literary device..."

**Then** the response status is 200
**And** the response contains a submission with:
  - id: a unique string identifier
  - assignmentId: "a1"
  - studentId: Aisha's user ID
  - content: the submitted text
  - status: "submitted"
  - submittedAt: a valid timestamp

### 67. Re-submitting updates the existing submission

**Given** a student "Aisha Torres" is signed in with role "student"
**And** she has already submitted work for assignment "a1"

**When** she sends POST /api/submissions with body:
  - assignmentId: "a1"
  - content: "My revised essay with better analysis..."

**Then** the response status is 200
**And** the existing submission is updated (not a new record)
**And** the content is "My revised essay with better analysis..."
**And** the status is reset to "submitted"
**And** the submittedAt timestamp is updated

---

## Grading UI Pages

### 68. Grading overview page lists assignments with submission stats

**Given** a teacher "Ms. Rivera" is signed in and visits /dashboard/grading
**And** she has assignments with submissions

**Then** the page displays:
  - heading "Assessment & Grading"
  - a card for each assignment that has submissions
  - each card shows: assignment title, class name, subject
  - each card shows a progress bar with "[graded] of [total] graded" and a percentage
  - each card shows the average score as "[X]% avg" when graded submissions exist
  - a "Complete" badge when all submissions are graded, or "[N] to grade" badge otherwise
  - each card links to /dashboard/grading/[assignmentId]

### 69. Grading overview shows empty state when no assignments exist

**Given** a teacher "Ms. Rivera" is signed in and visits /dashboard/grading
**And** she has no assignments

**Then** the page displays "No assignments to grade"
**And** a message about creating assignments and waiting for submissions

### 70. Grading overview shows waiting state when assignments have no submissions

**Given** a teacher "Ms. Rivera" is signed in and visits /dashboard/grading
**And** she has assignments but none have any submissions

**Then** the page displays "Waiting for submissions"

### 71. Assignment grading page shows submissions with stat cards

**Given** a teacher "Ms. Rivera" is signed in and visits /dashboard/grading/[assignmentId]
**And** the assignment has 5 submissions: 3 graded, 2 ungraded

**Then** the page displays:
  - the assignment title as the heading
  - a back link to /dashboard/grading
  - stat cards for: Total (5), Graded (3), Ungraded (2), Average (the computed average or "N/A")
  - a "Grade All Ungraded (2)" button
  - a list of submission cards, sorted with ungraded submissions first

### 72. Assignment grading page shows "Grade All Ungraded" batch button

**Given** a teacher "Ms. Rivera" is signed in and visits /dashboard/grading/[assignmentId]
**And** the assignment has ungraded submissions

**Then** the page displays a "Grade All Ungraded ([count])" button
**And** clicking it calls POST /api/grading/batch with the assignmentId
**And** a loading state shows "Grading X of Y..."
**And** on success, a toast notification confirms the number graded

### 73. Batch grade button is hidden when all submissions are graded

**Given** a teacher "Ms. Rivera" is signed in and visits /dashboard/grading/[assignmentId]
**And** all submissions for the assignment have status "graded" or "returned"

**Then** no "Grade All Ungraded" button is rendered

### 74. Submission cards display student info and status

**Given** a teacher views the assignment grading page

**Then** each submission card shows:
  - the student's initials in a circular avatar
  - the student's name (or "Unknown Student" if unavailable)
  - the submission date formatted as "MMM d, h:mm a"
  - the score as a percentage and raw score (e.g., "85%" and "85/100") when graded
  - a status badge: "Submitted" (blue), "Grading" (amber with spinner), "Graded" (green), or "Returned" (gray)
  - the card links to /dashboard/grading/[assignmentId]/[submissionId]

### 75. Submission detail page shows split view with student work and AI feedback

**Given** a teacher "Ms. Rivera" is signed in and visits /dashboard/grading/[assignmentId]/[submissionId]
**And** the submission has been graded

**Then** the page displays a two-column (or stacked) layout:
  - Left/Top: "Student Work" card with the student's submitted text, submission timestamp
  - Right/Bottom: "AI Feedback" card with the FeedbackPanel component
  - The student's name and initials are shown in the header
  - A status badge shows the current submission status
  - The score is displayed as a percentage
  - A back link navigates to the assignment grading page

### 76. Feedback panel shows rubric scores with criterion-level detail

**Given** a teacher views a graded submission's detail page
**And** the submission has criterion scores for "Thesis" (Proficient, 22/25) and "Evidence" (Developing, 15/25)

**Then** the feedback panel shows a "Rubric Scores" section
**And** each criterion is displayed as a card with:
  - the criterion name (e.g., "Thesis")
  - a color-coded level badge (e.g., "Proficient" in green, "Developing" in amber)
  - the score as "[score]/[maxScore]" (e.g., "22/25")
  - the justification text explaining the score

### 77. Feedback panel shows strengths, improvements, and next steps in distinct sections

**Given** a teacher views a graded submission's detail page

**Then** the feedback panel displays:
  - "Strengths" section with green icons and listed items
  - "Areas for Improvement" section with amber icons and listed items
  - "Next Steps" section with blue icons and listed items

### 78. Feedback panel provides Approve & Return, Edit, and Regenerate action buttons

**Given** a teacher views a graded submission's detail page with feedback in "draft" status

**Then** the feedback panel displays three action buttons:
  - "Approve & Return" (green button) -- approves feedback and returns to student
  - "Edit Feedback" (outline button) -- opens an inline text editor for the teacher
  - "Regenerate" (outline button) -- triggers re-grading via the API

### 79. Edit mode shows a textarea and save/cancel buttons

**Given** a teacher clicks "Edit Feedback" on the feedback panel

**Then** the overall feedback text is replaced by an editable textarea pre-filled with the current feedback
**And** "Save Edits" and "Cancel" buttons appear
**And** clicking "Save Edits" calls PUT /api/grading/[submissionId] with action "edit"
**And** clicking "Cancel" exits edit mode without saving

### 80. Feedback tone dropdown offers four options

**Given** a teacher views a graded submission's feedback panel

**Then** a "Feedback tone:" dropdown is present with options:
  - "Encouraging"
  - "Direct"
  - "Socratic"
  - "Growth Mindset"
**And** the default selected value is "Encouraging"

### 81. "Powered by Claude" badge is displayed on the feedback panel

**Given** a teacher views a graded submission's feedback panel

**Then** a ClaudeBadge component is rendered at the bottom of the panel

### 82. Feedback panel shows empty state when no feedback exists

**Given** a teacher views a submission that has not been graded

**Then** the feedback panel displays "No feedback yet"
**And** a message about using batch grading or grading individually

### 83. Differentiation panel appears when graded submissions exist

**Given** a teacher views the assignment grading page
**And** at least one submission has been graded

**Then** a "Assessment-Driven Differentiation" section is visible
**And** it contains a "Generate Differentiated Follow-up" button
**And** clicking it calls POST /api/grading/differentiate with the assignmentId

### 84. Differentiation panel displays three tier cards after generation

**Given** a teacher clicks "Generate Differentiated Follow-up" and the API returns results

**Then** three tier cards are displayed in a grid:
  - "Below Grade" card (orange accent) showing student count, student names with scores, activity title, description, instructions, and scaffolds
  - "On Grade" card (blue accent) showing student count, student names with scores, activity title, description, and instructions
  - "Above Grade" card (green accent) showing student count, student names with scores, activity title, description, instructions, and extensions
**And** each card has a "Copy Activity" button that copies the activity content to the clipboard
**And** a "Regenerate" button allows generating new activities

---

## Student Feedback View

### 85. Student sees approved feedback on the progress page

**Given** a student "Aisha Torres" is signed in with role "student" and visits /dashboard/progress
**And** her submissions have been graded and returned

**Then** the page shows her mastery data organized by subject
**And** subject summary cards display average mastery scores with status badges ("On Track", "Developing", or "Needs Help")
**And** detailed skill breakdowns show per-standard progress bars color-coded by score level

### 86. Feedback tone options map to distinct AI system instructions

**Given** the AI grading service is called with each feedbackTone option

**Then** "encouraging" uses warm, supportive language ("You're on the right track", "Great effort on")
**And** "direct" uses clear, factual language ("This essay demonstrates", "This section lacks")
**And** "socratic" uses guiding questions ("What do you think would happen if", "How might you strengthen")
**And** "growth_mindset" emphasizes effort and learning from mistakes ("Your effort shows in", "You haven't mastered this yet, but")

### 87. Letter grades follow the standard percentage scale

**Given** the AI grading service produces a total percentage score

**Then** the letter grade is assigned as:
  - A range (90-100%)
  - B range (80-89%)
  - C range (70-79%)
  - D range (60-69%)
  - F (below 60%)
**And** plus/minus modifiers (A+, A, A-, B+, etc.) are permitted

---

## AI Service Contracts

### 88. gradeSubmission uses the tool_use pattern with forced tool_choice

**Given** the AI grading service is called

**Then** it sends a request to the Anthropic API with:
  - model: the configured AI_MODEL
  - max_tokens: 4096
  - a system message containing grading instructions, the rubric, and the assignment
  - a tool named "grade_student_work" with the complete input schema
  - tool_choice forcing the "grade_student_work" tool
  - a user message containing the student's work

### 89. batchGradeSubmissions processes submissions sequentially with prompt caching

**Given** the batch grading service is called with 3 submissions

**Then** it creates a cached system message (with cache_control on the rubric/assignment block)
**And** it sends 3 sequential API requests, one per submission
**And** each request uses the same system message and tool definition
**And** each response is parsed into a BatchGradingResult with submissionId and result

### 90. assessmentDrivenDifferentiation generates tiered follow-up activities

**Given** the differentiation AI service is called with assignment info and tier stats

**Then** it sends a request to the Anthropic API with:
  - a system message about differentiation design
  - a tool named "differentiated_activities"
  - student performance data (counts and averages per tier)
**And** the response contains below_grade (with scaffolds), on_grade, and above_grade (with extensions) activities

### 91. persistGradingResult handles re-grading by replacing existing records

**Given** a submission has existing feedback and criterion scores

**When** persistGradingResult is called for that submission

**Then** the existing feedback_drafts record for that submission is deleted
**And** the existing criterion_scores for that submission are deleted
**And** new feedback_drafts and criterion_scores records are inserted
**And** the submission record is updated with new scores, grade, and gradedAt timestamp
