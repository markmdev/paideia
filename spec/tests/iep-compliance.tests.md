# IEP/SPED -- IEP Lifecycle, Goals, Progress Monitoring, Compliance, AI Generation

This file specifies the behavioral tests for the Special Education module: IEP CRUD, goal management, progress monitoring, AI-assisted generation of present levels/goals/accommodations/narratives, and compliance deadline tracking.

**Roles with access:** `sped_teacher`, `admin`. All other roles (`teacher`, `parent`, `student`) are denied with 403.

**Seed users referenced in these tests:**

| Alias              | Email                   | Role          |
|--------------------|-------------------------|---------------|
| Ms. Rodriguez      | rodriguez@school.edu    | sped_teacher  |
| Dr. Williams       | williams@school.edu     | admin         |
| Ms. Rivera         | rivera@school.edu       | teacher       |
| Sarah Chen         | sarah.chen@email.com    | parent        |
| Aisha Torres       | aisha@student.edu       | student       |
| DeShawn Williams   | deshawn@student.edu     | student       |

---

## IEP CRUD

### 1. Unauthenticated request to list IEPs returns 401

**Given** no user is signed in

**When** a request is sent to GET /api/iep

**Then** the response status is 401
**And** the response body contains `{ "error": "Unauthorized" }`

---

### 2. Regular teacher cannot list IEPs

**Given** Ms. Rivera is signed in with role "teacher"

**When** she sends GET /api/iep

**Then** the response status is 403
**And** the response body contains `{ "error": "Forbidden: SPED teacher or admin role required" }`

---

### 3. Student cannot list IEPs

**Given** Aisha Torres is signed in with role "student"

**When** she sends GET /api/iep

**Then** the response status is 403
**And** the response body contains an error mentioning "Forbidden"

---

### 4. Parent cannot list IEPs

**Given** Sarah Chen is signed in with role "parent"

**When** she sends GET /api/iep

**Then** the response status is 403
**And** the response body contains an error mentioning "Forbidden"

---

### 5. SPED teacher sees only their own caseload

**Given** Ms. Rodriguez is signed in with role "sped_teacher"
**And** she has authored an IEP (id: "iep-rodriguez-1") for student DeShawn Williams with disability category "SLD"
**And** another SPED teacher has authored an IEP (id: "iep-other-1") for a different student

**When** Ms. Rodriguez sends GET /api/iep

**Then** the response status is 200
**And** the response is a JSON array
**And** every IEP in the array has authorId equal to Ms. Rodriguez's user ID
**And** the IEP "iep-other-1" is NOT present in the array

---

### 6. Admin sees all IEPs district-wide

**Given** Dr. Williams is signed in with role "admin"
**And** multiple IEPs exist authored by different SPED teachers

**When** he sends GET /api/iep

**Then** the response status is 200
**And** the response is a JSON array containing IEPs from all SPED teachers
**And** no filtering by authorId is applied

---

### 7. IEP list includes student name, disability category, goal count, and timestamps

**Given** Ms. Rodriguez is signed in with role "sped_teacher"
**And** she has authored an IEP for DeShawn Williams with disability category "SLD", start date "2025-09-01", end date "2026-06-15"
**And** that IEP has 3 goals

**When** she sends GET /api/iep

**Then** the response status is 200
**And** each IEP object in the array contains:
  - id: a string
  - studentId: a string
  - studentName: "DeShawn Williams"
  - authorId: Ms. Rodriguez's user ID
  - status: "draft"
  - disabilityCategory: "SLD"
  - startDate: "2025-09-01..."
  - endDate: "2026-06-15..."
  - meetingDate: null or a date
  - goalCount: 3 (a number)
  - createdAt: a valid timestamp
  - updatedAt: a valid timestamp

---

### 8. IEP list can be filtered by studentId

**Given** Ms. Rodriguez is signed in with role "sped_teacher"
**And** she has authored IEPs for two students: DeShawn (student-001) and another student (student-002)

**When** she sends GET /api/iep?studentId=student-001

**Then** the response status is 200
**And** every IEP in the array has studentId equal to "student-001"

---

### 9. IEP list can be filtered by status

**Given** Ms. Rodriguez is signed in with role "sped_teacher"
**And** she has IEPs with status "draft" and "active"

**When** she sends GET /api/iep?status=active

**Then** the response status is 200
**And** every IEP in the array has status equal to "active"

---

### 10. IEP list is ordered by updatedAt descending

**Given** Ms. Rodriguez is signed in with role "sped_teacher"
**And** she has multiple IEPs with different updatedAt timestamps

**When** she sends GET /api/iep

**Then** the response status is 200
**And** the IEPs are sorted with the most recently updated first

---

### 11. SPED teacher sees empty array when no IEPs exist on their caseload

**Given** Ms. Rodriguez is signed in with role "sped_teacher"
**And** she has not authored any IEPs

**When** she sends GET /api/iep

**Then** the response status is 200
**And** the response is an empty JSON array `[]`

---

### 12. Unauthenticated request to create IEP returns 401

**Given** no user is signed in

**When** a request is sent to POST /api/iep with body:
  - studentId: "student-001"
  - disabilityCategory: "SLD"

**Then** the response status is 401
**And** the response body contains `{ "error": "Unauthorized" }`

---

### 13. Regular teacher cannot create IEP

**Given** Ms. Rivera is signed in with role "teacher"

**When** she sends POST /api/iep with body:
  - studentId: "student-001"
  - disabilityCategory: "SLD"

**Then** the response status is 403

---

### 14. Creating IEP without required fields returns 400

**Given** Ms. Rodriguez is signed in with role "sped_teacher"

**When** she sends POST /api/iep with body:
  - studentId: "student-001"
  (missing disabilityCategory)

**Then** the response status is 400
**And** the response body contains `{ "error": "Missing required fields: studentId, disabilityCategory" }`

---

### 15. Creating IEP for nonexistent student returns 404

**Given** Ms. Rodriguez is signed in with role "sped_teacher"

**When** she sends POST /api/iep with body:
  - studentId: "nonexistent-id"
  - disabilityCategory: "SLD"

**Then** the response status is 404
**And** the response body contains `{ "error": "Student not found" }`

---

### 16. SPED teacher creates IEP successfully

**Given** Ms. Rodriguez is signed in with role "sped_teacher"
**And** a student DeShawn Williams exists with id "student-001"

**When** she sends POST /api/iep with body:
  - studentId: "student-001"
  - disabilityCategory: "ADHD"
  - startDate: "2025-09-01"
  - endDate: "2026-06-15"

**Then** the response status is 201
**And** the response body contains:
  - id: a unique string identifier
  - studentId: "student-001"
  - authorId: Ms. Rodriguez's user ID
  - disabilityCategory: "ADHD"
  - status: "draft" (always starts as draft)
  - studentName: "DeShawn Williams"
  - goalCount: 0

---

### 17. Get single IEP with full detail

**Given** Ms. Rodriguez is signed in with role "sped_teacher"
**And** she has authored IEP "iep-001" for DeShawn Williams
**And** that IEP has present levels text, 2 goals (each with progress data points), accommodations (JSON), and related services (JSON)

**When** she sends GET /api/iep/iep-001

**Then** the response status is 200
**And** the response body contains:
  - id: "iep-001"
  - studentId: DeShawn's user ID
  - presentLevels: the present levels text
  - accommodations: a parsed JSON array (not a raw string)
  - modifications: a parsed JSON value or null
  - relatedServices: a parsed JSON value or null
  - transitionPlan: a parsed JSON value or null
  - aiMetadata: a parsed JSON value or null
  - student: { id, name, email }
  - goals: an array of 2 goal objects, each containing:
    - id, iepId, area, goalText, baseline, target, measureMethod, frequency, timeline, status, aiGenerated
    - progressData: an array of data point objects for that goal

---

### 18. SPED teacher cannot access another teacher's IEP

**Given** Ms. Rodriguez is signed in with role "sped_teacher"
**And** another SPED teacher authored IEP "iep-other-1"

**When** Ms. Rodriguez sends GET /api/iep/iep-other-1

**Then** the response status is 404
**And** the response body contains `{ "error": "IEP not found" }`

---

### 19. Admin can access any IEP

**Given** Dr. Williams is signed in with role "admin"
**And** IEP "iep-001" exists (authored by any SPED teacher)

**When** he sends GET /api/iep/iep-001

**Then** the response status is 200
**And** the response includes the full IEP detail regardless of who authored it

---

### 20. Update IEP fields

**Given** Ms. Rodriguez is signed in with role "sped_teacher"
**And** she authored IEP "iep-001" with status "draft"

**When** she sends PUT /api/iep/iep-001 with body:
  - presentLevels: "Updated present levels narrative."
  - status: "review"
  - meetingDate: "2026-03-15"
  - accommodations: [{ "type": "instructional", "description": "Chunked directions" }]

**Then** the response status is 200
**And** the response body contains:
  - presentLevels: "Updated present levels narrative."
  - status: "review"
  - meetingDate: a date matching "2026-03-15"
  - updatedAt: a timestamp later than the original updatedAt

---

### 21. Update IEP with JSON fields stores them as stringified JSON

**Given** Ms. Rodriguez is signed in with role "sped_teacher"
**And** she authored IEP "iep-001"

**When** she sends PUT /api/iep/iep-001 with body:
  - relatedServices: [{ "service": "Speech Therapy", "frequency": "2x/week", "location": "pull-out", "provider": "SLP" }]
  - transitionPlan: { "postSecondary": "Community college", "activities": ["job shadowing"] }

**Then** the response status is 200
**And** the relatedServices and transitionPlan fields are stored (when retrieved via GET, they are returned as parsed JSON)

---

### 22. Update nonexistent IEP returns 404

**Given** Ms. Rodriguez is signed in with role "sped_teacher"

**When** she sends PUT /api/iep/nonexistent-id with body:
  - status: "active"

**Then** the response status is 404
**And** the response body contains `{ "error": "IEP not found" }`

---

### 23. Delete IEP performs a soft delete (archives)

**Given** Ms. Rodriguez is signed in with role "sped_teacher"
**And** she authored IEP "iep-001" with status "draft"

**When** she sends DELETE /api/iep/iep-001

**Then** the response status is 200
**And** the response body contains the IEP with status set to "archived"
**And** the updatedAt timestamp is refreshed
**And** the IEP still exists in the database (it is NOT hard-deleted)

---

### 24. Delete IEP that does not belong to the SPED teacher returns 404

**Given** Ms. Rodriguez is signed in with role "sped_teacher"
**And** another SPED teacher authored IEP "iep-other-1"

**When** Ms. Rodriguez sends DELETE /api/iep/iep-other-1

**Then** the response status is 404

---

## IEP Goals

### 25. List goals for an IEP includes latest progress and data point count

**Given** Ms. Rodriguez is signed in with role "sped_teacher"
**And** she authored IEP "iep-001"
**And** that IEP has 2 goals:
  - Goal A (area: "Reading Fluency", baseline: "85 wpm", target: "110 wpm") with 5 progress data points
  - Goal B (area: "Written Expression") with 0 progress data points

**When** she sends GET /api/iep/iep-001/goals

**Then** the response status is 200
**And** the response is a JSON array of 2 goal objects
**And** Goal A includes:
  - latestProgress: the most recent data point (by date)
  - dataPointCount: 5
**And** Goal B includes:
  - latestProgress: null
  - dataPointCount: 0

---

### 26. Create goal with required and optional fields

**Given** Ms. Rodriguez is signed in with role "sped_teacher"
**And** she authored IEP "iep-001"

**When** she sends POST /api/iep/iep-001/goals with body:
  - area: "Reading Fluency"
  - goalText: "By the end of the annual IEP period, DeShawn will read grade-level passages at 110 wpm with 95% accuracy."
  - baseline: "85 wpm"
  - target: "110 wpm"
  - measureMethod: "curriculum-based measure"
  - frequency: "bi-weekly"
  - timeline: "by the end of the annual IEP period"
  - aiGenerated: false

**Then** the response status is 201
**And** the response body contains:
  - id: a unique string identifier
  - iepId: "iep-001"
  - area: "Reading Fluency"
  - goalText: the full SMART goal text
  - baseline: "85 wpm"
  - target: "110 wpm"
  - measureMethod: "curriculum-based measure"
  - frequency: "bi-weekly"
  - timeline: "by the end of the annual IEP period"
  - status: "active" (default)
  - aiGenerated: false

---

### 27. Create goal with only required fields succeeds

**Given** Ms. Rodriguez is signed in with role "sped_teacher"
**And** she authored IEP "iep-001"

**When** she sends POST /api/iep/iep-001/goals with body:
  - area: "Social Skills"
  - goalText: "Student will initiate peer interactions 3 times per recess period."

**Then** the response status is 201
**And** the response body contains:
  - area: "Social Skills"
  - goalText: "Student will initiate peer interactions 3 times per recess period."
  - baseline: null
  - target: null
  - measureMethod: null
  - frequency: null
  - timeline: null
  - aiGenerated: false (default)

---

### 28. Create goal without required fields returns 400

**Given** Ms. Rodriguez is signed in with role "sped_teacher"
**And** she authored IEP "iep-001"

**When** she sends POST /api/iep/iep-001/goals with body:
  - goalText: "Some goal text without an area"
  (missing area)

**Then** the response status is 400
**And** the response body contains `{ "error": "Missing required fields: area, goalText" }`

---

### 29. Create goal on another teacher's IEP returns 404

**Given** Ms. Rodriguez is signed in with role "sped_teacher"
**And** IEP "iep-other-1" was authored by a different SPED teacher

**When** Ms. Rodriguez sends POST /api/iep/iep-other-1/goals with body:
  - area: "Math"
  - goalText: "Some goal"

**Then** the response status is 404
**And** the response body contains `{ "error": "IEP not found" }`

---

### 30. Update goal fields

**Given** Ms. Rodriguez is signed in with role "sped_teacher"
**And** she authored IEP "iep-001" which has goal "goal-001" with area "Reading Fluency"

**When** she sends PUT /api/iep/iep-001/goals/goal-001 with body:
  - target: "120 wpm"
  - status: "met"
  - similarityScore: 0.45

**Then** the response status is 200
**And** the response body contains:
  - target: "120 wpm"
  - status: "met"
  - similarityScore: 0.45

---

### 31. Update goal that does not belong to the IEP returns 404

**Given** Ms. Rodriguez is signed in with role "sped_teacher"
**And** she authored IEP "iep-001"
**And** goal "goal-from-other-iep" belongs to a different IEP

**When** she sends PUT /api/iep/iep-001/goals/goal-from-other-iep with body:
  - status: "met"

**Then** the response status is 404
**And** the response body contains `{ "error": "Goal not found" }`

---

### 32. Delete goal removes it from the database

**Given** Ms. Rodriguez is signed in with role "sped_teacher"
**And** she authored IEP "iep-001" which has goal "goal-001"

**When** she sends DELETE /api/iep/iep-001/goals/goal-001

**Then** the response status is 200
**And** the response body contains `{ "success": true }`
**And** the goal and its associated progress data points are cascade-deleted

---

### 33. Delete goal on another teacher's IEP returns 404

**Given** Ms. Rodriguez is signed in with role "sped_teacher"
**And** IEP "iep-other-1" was authored by a different SPED teacher and has goal "goal-other-1"

**When** Ms. Rodriguez sends DELETE /api/iep/iep-other-1/goals/goal-other-1

**Then** the response status is 404
**And** the response body contains `{ "error": "IEP not found" }`

---

## Progress Monitoring

### 34. List progress entries grouped by goal

**Given** Ms. Rodriguez is signed in with role "sped_teacher"
**And** she authored IEP "iep-001" with 2 goals (goal-A and goal-B)
**And** goal-A has 3 data points and goal-B has 1 data point

**When** she sends GET /api/iep/iep-001/progress

**Then** the response status is 200
**And** the response is a JSON array of 2 objects, each containing:
  - goal: { id, area, goalText, baseline, target, status }
  - dataPoints: an array of data point objects sorted by date descending
**And** goal-A's entry has 3 data points and goal-B's entry has 1 data point

---

### 35. List progress entries returns empty array when IEP has no goals

**Given** Ms. Rodriguez is signed in with role "sped_teacher"
**And** she authored IEP "iep-001" with 0 goals

**When** she sends GET /api/iep/iep-001/progress

**Then** the response status is 200
**And** the response is an empty JSON array `[]`

---

### 36. Record a progress data point

**Given** Ms. Rodriguez is signed in with role "sped_teacher"
**And** she authored IEP "iep-001" for student "student-001"
**And** that IEP has goal "goal-001"

**When** she sends POST /api/iep/iep-001/progress with body:
  - goalId: "goal-001"
  - value: 92
  - unit: "wpm"
  - notes: "Improved fluency on narrative passages"

**Then** the response status is 201
**And** the response body contains:
  - id: a unique string identifier
  - goalId: "goal-001"
  - studentId: "student-001"
  - value: 92
  - unit: "wpm"
  - notes: "Improved fluency on narrative passages"
  - recordedBy: Ms. Rodriguez's user ID
  - date: a valid timestamp (defaults to now)

---

### 37. Record progress data point with missing required fields returns 400

**Given** Ms. Rodriguez is signed in with role "sped_teacher"
**And** she authored IEP "iep-001" with goal "goal-001"

**When** she sends POST /api/iep/iep-001/progress with body:
  - goalId: "goal-001"
  - value: 92
  (missing unit)

**Then** the response status is 400
**And** the response body contains `{ "error": "Missing required fields: goalId, value, unit" }`

---

### 38. Record progress data point for a goal not on this IEP returns 404

**Given** Ms. Rodriguez is signed in with role "sped_teacher"
**And** she authored IEP "iep-001"
**And** "goal-from-other-iep" belongs to a different IEP

**When** she sends POST /api/iep/iep-001/progress with body:
  - goalId: "goal-from-other-iep"
  - value: 50
  - unit: "percent"

**Then** the response status is 404
**And** the response body contains `{ "error": "Goal not found on this IEP" }`

---

### 39. Progress data point with value of 0 is accepted

**Given** Ms. Rodriguez is signed in with role "sped_teacher"
**And** she authored IEP "iep-001" with goal "goal-001"

**When** she sends POST /api/iep/iep-001/progress with body:
  - goalId: "goal-001"
  - value: 0
  - unit: "percent"

**Then** the response status is 201
**And** the response body contains value: 0

---

---

## AI Generation

### 40. Generate present levels (PLAAFP) from student data

**Given** Ms. Rodriguez is signed in with role "sped_teacher"
**And** student DeShawn Williams exists with id "student-001"
**And** DeShawn has mastery records linking to standards

**When** she sends POST /api/iep/generate/present-levels with body:
  - studentId: "student-001"
  - teacherObservations: "DeShawn participates actively in class discussions but struggles with independent reading."
  - classroomPerformance: "Below grade level in reading fluency and written expression."
  - disabilityCategory: "SLD"
  - gradeLevel: "10"

**Then** the response status is 201
**And** the response body contains:
  - academicPerformance: a non-empty string narrative
  - functionalPerformance: a non-empty string narrative
  - strengths: an array of strings (3-6 items)
  - areasOfNeed: an array of strings (3-6 items)
  - impactOfDisability: a non-empty string
  - baselineData: an array of objects each with { area, baseline, source }
  - draftNotice: "DRAFT -- Requires IEP Team Review"
  - audit: { modelVersion: "claude-opus-4-6", generatedAt: a valid ISO timestamp }

---

### 41. Generate present levels without required fields returns 400

**Given** Ms. Rodriguez is signed in with role "sped_teacher"

**When** she sends POST /api/iep/generate/present-levels with body:
  - studentId: "student-001"
  (missing teacherObservations and classroomPerformance)

**Then** the response status is 400
**And** the response body contains an error mentioning "Missing required fields: studentId, teacherObservations, classroomPerformance"

---

### 42. Generate present levels for nonexistent student returns 404

**Given** Ms. Rodriguez is signed in with role "sped_teacher"

**When** she sends POST /api/iep/generate/present-levels with body:
  - studentId: "nonexistent-id"
  - teacherObservations: "Some observations"
  - classroomPerformance: "Some performance data"

**Then** the response status is 404
**And** the response body contains `{ "error": "Student not found" }`

---

### 43. Generate present levels is forbidden for student role

**Given** Aisha Torres is signed in with role "student"

**When** she sends POST /api/iep/generate/present-levels with body:
  - studentId: "student-001"
  - teacherObservations: "observations"
  - classroomPerformance: "performance"

**Then** the response status is 403

---

### 44. Generate present levels is forbidden for parent role

**Given** Sarah Chen is signed in with role "parent"

**When** she sends POST /api/iep/generate/present-levels with body:
  - studentId: "student-001"
  - teacherObservations: "observations"
  - classroomPerformance: "performance"

**Then** the response status is 403

---

### 45. Generate SMART IEP goals from present levels

**Given** Ms. Rodriguez is signed in with role "sped_teacher"
**And** she authored IEP "iep-001" with disability category "SLD" and present levels text

**When** she sends POST /api/iep/generate/goals with body:
  - iepId: "iep-001"
  - area: "Reading"
  - gradeLevel: "10"
  - subject: "ELA"

**Then** the response status is 201
**And** the response body contains:
  - goals: an array of 2-4 goal objects, each containing:
    - area: a string (e.g., "Reading Fluency")
    - goalText: a SMART goal statement
    - baseline: a measurable baseline value
    - target: a measurable target value
    - measureMethod: a string describing how progress is measured
    - frequency: a string describing monitoring frequency (e.g., "bi-weekly")
    - timeline: a string (e.g., "by the end of the annual IEP period")
    - similarityFlag: a boolean
  - audit: { modelVersion: "claude-opus-4-6", generatedAt: a valid ISO timestamp }

---

### 46. Generate goals detects similarity with existing caseload goals

**Given** Ms. Rodriguez is signed in with role "sped_teacher"
**And** she authored IEP "iep-001" with disability category "SLD"
**And** she has other IEPs on her caseload with existing goals

**When** she sends POST /api/iep/generate/goals with body:
  - iepId: "iep-001"
  - area: "Reading"

**Then** the response status is 201
**And** if any generated goal is >80% similar in wording or substance to an existing caseload goal, that goal has:
  - similarityFlag: true
  - similarityNote: a string explaining the resemblance and how to further individualize

---

### 47. Generate goals auto-fetches existing caseload goals for similarity detection

**Given** Ms. Rodriguez is signed in with role "sped_teacher"
**And** she authored IEP "iep-001"
**And** she has authored other IEPs with goals on her caseload
**And** the request does NOT include existingCaseloadGoals

**When** she sends POST /api/iep/generate/goals with body:
  - iepId: "iep-001"
  - area: "Math"

**Then** the system automatically fetches goals from Ms. Rodriguez's other IEPs (joined via ieps.authorId) for similarity detection
**And** the response status is 201

---

### 48. Generate goals without required fields returns 400

**Given** Ms. Rodriguez is signed in with role "sped_teacher"

**When** she sends POST /api/iep/generate/goals with body:
  - area: "Reading"
  (missing iepId)

**Then** the response status is 400
**And** the response body contains `{ "error": "Missing required fields: iepId, area" }`

---

### 49. Generate goals for nonexistent IEP returns 404

**Given** Ms. Rodriguez is signed in with role "sped_teacher"

**When** she sends POST /api/iep/generate/goals with body:
  - iepId: "nonexistent-iep"
  - area: "Reading"

**Then** the response status is 404
**And** the response body contains `{ "error": "IEP not found" }`

---

### 50. Generate goals logs to audit trail

**Given** Ms. Rodriguez is signed in with role "sped_teacher"
**And** she authored IEP "iep-001"

**When** she sends POST /api/iep/generate/goals with body:
  - iepId: "iep-001"
  - area: "Reading"

**Then** the response status is 201
**And** an audit log entry is created with:
  - entityType: "iep_goal"
  - entityId: "iep-001"
  - action: "ai_generate"
  - userId: Ms. Rodriguez's user ID
  - aiModel: "claude-opus-4-6"
  - aiPrompt: "generateIEPGoals"

---

### 51. Generate accommodations by disability category

**Given** Ms. Rodriguez is signed in with role "sped_teacher"
**And** she authored IEP "iep-001" with disability category "SLD" and present levels text

**When** she sends POST /api/iep/generate/accommodations with body:
  - iepId: "iep-001"

**Then** the response status is 201
**And** the response body contains:
  - instructional: an array of objects each with { accommodation, rationale }
  - assessment: an array of objects each with { accommodation, rationale }
  - environmental: an array of objects each with { accommodation, rationale }
  - behavioral: an array of objects each with { accommodation, rationale }
  - audit: { modelVersion: "claude-opus-4-6", generatedAt: a valid ISO timestamp }

---

### 52. Generate accommodations without iepId returns 400

**Given** Ms. Rodriguez is signed in with role "sped_teacher"

**When** she sends POST /api/iep/generate/accommodations with body: {}

**Then** the response status is 400
**And** the response body contains `{ "error": "Missing required field: iepId" }`

---

### 53. Generate accommodations when IEP lacks disability category returns 400

**Given** Ms. Rodriguez is signed in with role "sped_teacher"
**And** she authored IEP "iep-no-category" with disabilityCategory set to null

**When** she sends POST /api/iep/generate/accommodations with body:
  - iepId: "iep-no-category"

**Then** the response status is 400
**And** the response body contains `{ "error": "IEP is missing disability category" }`

---

### 54. Generate accommodations for parent role returns 403

**Given** Sarah Chen is signed in with role "parent"

**When** she sends POST /api/iep/generate/accommodations with body:
  - iepId: "iep-001"

**Then** the response status is 403

---

### 55. Generate accommodations logs to audit trail

**Given** Ms. Rodriguez is signed in with role "sped_teacher"
**And** she authored IEP "iep-001" with disability category "SLD"

**When** she sends POST /api/iep/generate/accommodations with body:
  - iepId: "iep-001"

**Then** the response status is 201
**And** an audit log entry is created with:
  - entityType: "iep_accommodations"
  - entityId: "iep-001"
  - action: "ai_generate"
  - userId: Ms. Rodriguez's user ID
  - aiModel: "claude-opus-4-6"
  - aiPrompt: "generateAccommodations"

---

### 56. Generate progress narrative from data points

**Given** Ms. Rodriguez is signed in with role "sped_teacher"
**And** she authored IEP "iep-001" for student DeShawn Williams
**And** goal "goal-001" belongs to that IEP with goalText "Read grade-level passages at 110 wpm" and target "110"
**And** goal "goal-001" has data points:
  - { date: "2025-10-01", value: 85, unit: "wpm" }
  - { date: "2025-11-01", value: 90, unit: "wpm" }
  - { date: "2025-12-01", value: 95, unit: "wpm" }

**When** she sends POST /api/iep/iep-001/progress/narrative with body:
  - goalId: "goal-001"

**Then** the response status is 201
**And** the response body contains:
  - narrative: a parent-friendly 3-5 sentence text describing progress
  - trend: one of "on_track", "at_risk", or "off_track"
  - currentLevel: 95 (the most recent data point value)
  - progressPercent: 86 (Math.round(95/110 * 100))
  - recommendation: a specific actionable next-step string
  - audit: { modelVersion: "claude-opus-4-6", generatedAt: a valid ISO timestamp }

---

### 57. Generate progress narrative without goalId returns 400

**Given** Ms. Rodriguez is signed in with role "sped_teacher"
**And** she authored IEP "iep-001"

**When** she sends POST /api/iep/iep-001/progress/narrative with body: {}

**Then** the response status is 400
**And** the response body contains `{ "error": "Missing required field: goalId" }`

---

### 58. Generate progress narrative for goal not on this IEP returns 404

**Given** Ms. Rodriguez is signed in with role "sped_teacher"
**And** she authored IEP "iep-001"
**And** "goal-from-other-iep" belongs to a different IEP

**When** she sends POST /api/iep/iep-001/progress/narrative with body:
  - goalId: "goal-from-other-iep"

**Then** the response status is 404
**And** the response body contains `{ "error": "Goal not found on this IEP" }`

---

### 59. Generate progress narrative logs to audit trail

**Given** Ms. Rodriguez is signed in with role "sped_teacher"
**And** she authored IEP "iep-001" with goal "goal-001"

**When** she sends POST /api/iep/iep-001/progress/narrative with body:
  - goalId: "goal-001"

**Then** the response status is 201
**And** an audit log entry is created with:
  - entityType: "iep_progress_narrative"
  - entityId: "goal-001"
  - action: "ai_generate"
  - userId: Ms. Rodriguez's user ID
  - aiModel: "claude-opus-4-6"
  - aiPrompt: "generateProgressNarrative"

---

### 60. Progress narrative currentLevel and progressPercent are server-computed

**Given** Ms. Rodriguez is signed in with role "sped_teacher"
**And** IEP "iep-001" has goal "goal-001" with target "100"
**And** goal "goal-001" has data points with the most recent value of 75

**When** she sends POST /api/iep/iep-001/progress/narrative with body:
  - goalId: "goal-001"

**Then** the response status is 201
**And** currentLevel is 75 (taken from the chronologically last data point)
**And** progressPercent is 75 (Math.round(75/100 * 100))
**And** these values override whatever the AI model returns, ensuring consistency

---

## Compliance

### 61. Unauthenticated request to list compliance deadlines returns 401

**Given** no user is signed in

**When** a request is sent to GET /api/compliance

**Then** the response status is 401

---

### 62. Regular teacher cannot access compliance deadlines

**Given** Ms. Rivera is signed in with role "teacher"

**When** she sends GET /api/compliance

**Then** the response status is 403
**And** the response body contains an error mentioning "Forbidden"

---

### 63. Student cannot access compliance deadlines

**Given** Aisha Torres is signed in with role "student"

**When** she sends GET /api/compliance

**Then** the response status is 403

---

### 64. Parent cannot access compliance deadlines

**Given** Sarah Chen is signed in with role "parent"

**When** she sends GET /api/compliance

**Then** the response status is 403

---

### 65. Compliance deadlines are color-coded by urgency

**Given** Dr. Williams is signed in with role "admin"
**And** the following compliance deadlines exist:
  - Deadline A: due 45 days from now, status "upcoming"
  - Deadline B: due 20 days from now, status "upcoming"
  - Deadline C: due 7 days from now, status "upcoming"
  - Deadline D: due 5 days ago, status "upcoming"
  - Deadline E: due 10 days from now, status "completed", completedAt is set

**When** he sends GET /api/compliance

**Then** the response status is 200
**And** the response body contains:
  - deadlines: an array of 5 objects, each with a "color" field:
    - Deadline A color: "green" (30+ days remaining)
    - Deadline B color: "yellow" (15-30 days remaining)
    - Deadline C color: "red" (<15 days remaining)
    - Deadline D color: "overdue" (past due, not completed)
    - Deadline E color: "completed"
  - summary: { total: 5, overdue: 1, red: 1, yellow: 1, green: 1, completed: 1 }

---

### 66. Each compliance deadline includes daysUntilDue

**Given** Dr. Williams is signed in with role "admin"
**And** a deadline exists due 20 days from now

**When** he sends GET /api/compliance

**Then** each deadline object contains a "daysUntilDue" field
**And** for the deadline due 20 days from now, daysUntilDue is approximately 20 (within 1 day of rounding)
**And** for overdue deadlines, daysUntilDue is negative

---

### 67. SPED teacher sees only deadlines for students on their caseload

**Given** Ms. Rodriguez is signed in with role "sped_teacher"
**And** she has authored IEPs for student-001 only
**And** deadlines exist for student-001 and student-999

**When** she sends GET /api/compliance

**Then** the response status is 200
**And** all deadlines in the response have studentId "student-001"
**And** no deadline for student-999 appears

---

### 68. Admin sees all deadlines district-wide

**Given** Dr. Williams is signed in with role "admin"
**And** deadlines exist for students across multiple SPED teachers' caseloads

**When** he sends GET /api/compliance

**Then** the response status is 200
**And** deadlines for all students are included regardless of which teacher authored the IEP

---

### 69. Compliance deadlines can be filtered by status=overdue

**Given** Dr. Williams is signed in with role "admin"
**And** both overdue and upcoming deadlines exist

**When** he sends GET /api/compliance?status=overdue

**Then** the response status is 200
**And** all deadlines in the response have a dueDate in the past and status "upcoming" (not yet marked completed)

---

### 70. Compliance deadlines can be filtered by status=upcoming

**Given** Dr. Williams is signed in with role "admin"
**And** both overdue and upcoming deadlines exist

**When** he sends GET /api/compliance?status=upcoming

**Then** the response status is 200
**And** all deadlines in the response have a dueDate in the future

---

### 71. Get student-specific compliance timeline

**Given** Ms. Rodriguez is signed in with role "sped_teacher"
**And** she has authored an IEP for student "student-001"

**When** she sends GET /api/compliance/student-001

**Then** the response status is 200
**And** the response body contains:
  - student: { id: "student-001", name, email }
  - deadlines: an array of compliance deadline objects (each color-coded with daysUntilDue)
  - ieps: an array of IEP summary objects with { id, status, startDate, endDate, authorId, disabilityCategory, updatedAt }
  - progressMonitoring: { totalGoals: a number, totalDataPoints: a number }

---

### 72. Student compliance returns 404 for nonexistent student

**Given** Ms. Rodriguez is signed in with role "sped_teacher"

**When** she sends GET /api/compliance/nonexistent-student

**Then** the response status is 404
**And** the response body contains `{ "error": "Student not found" }`

---

### 73. SPED teacher cannot view compliance for a student not on their caseload

**Given** Ms. Rodriguez is signed in with role "sped_teacher"
**And** she has NOT authored any IEP for student "student-999"

**When** she sends GET /api/compliance/student-999

**Then** the response status is 403
**And** the response body contains `{ "error": "You do not have an IEP for this student" }`

---

### 74. Admin can view compliance for any student

**Given** Dr. Williams is signed in with role "admin"
**And** student "student-001" exists (regardless of which SPED teacher authored the IEP)

**When** he sends GET /api/compliance/student-001

**Then** the response status is 200
**And** the response includes the student's full compliance timeline

---

### 75. Student compliance timeline includes deadline color coding

**Given** Ms. Rodriguez is signed in with role "sped_teacher"
**And** she has an IEP for student "student-001"
**And** student-001 has a compliance deadline due 5 days from now

**When** she sends GET /api/compliance/student-001

**Then** the response status is 200
**And** the deadline in the response has color "red" and a daysUntilDue near 5

---

## IEP UI Pages

### 76. IEP caseload page displays summary statistics

**Given** Ms. Rodriguez is signed in and viewing /dashboard/iep
**And** she has 4 IEPs: 2 active, 1 draft, 1 in review
**And** 1 active IEP has an endDate within 30 days

**Then** the page displays summary stat cards:
  - Total Caseload: 4
  - Active IEPs: 2
  - In Draft/Review: 2
  - Upcoming Deadlines: 1

---

### 77. IEP caseload page separates active and draft/archived IEPs

**Given** Ms. Rodriguez is signed in and viewing /dashboard/iep
**And** she has active and draft IEPs

**Then** the page has two sections:
  - "Active IEPs" showing IEPs with status "active"
  - "Drafts & Archived" showing IEPs with status "draft", "review", or "archived"
**And** each IEP card shows student name, disability category, goal count, and goals met count

---

### 78. IEP caseload page shows empty state with create button

**Given** Ms. Rodriguez is signed in and viewing /dashboard/iep
**And** she has no IEPs on her caseload

**Then** the page shows:
  - heading "IEP Management"
  - an empty-state message "No IEPs on your caseload"
  - a "Create First IEP" button linking to /dashboard/iep/new

---

### 79. IEP detail page shows student name, status badge, disability category, and date range

**Given** Ms. Rodriguez is signed in and viewing /dashboard/iep/[iepId]
**And** the IEP is for student DeShawn Williams, status "active", disability "SLD", dates Sep 1, 2025 - Jun 15, 2026

**Then** the page header displays:
  - "DeShawn Williams" as the heading
  - a status badge showing "Active" in emerald/green
  - disability category "SLD"
  - date range "Sep 1, 2025 -- Jun 15, 2026"
  - an "Edit IEP" button linking to /dashboard/iep/[iepId]/edit

---

### 80. IEP detail page renders present levels as markdown

**Given** Ms. Rodriguez is viewing an IEP detail page
**And** the IEP has present levels text containing markdown formatting

**Then** the "Present Levels" section renders the markdown as formatted HTML (headings, lists, tables)
**And** an AI badge is displayed below the rendered content

---

### 81. IEP detail page shows goals with status, baseline, target, data points, and trend

**Given** Ms. Rodriguez is viewing an IEP detail page
**And** the IEP has a goal with area "Reading Fluency", status "active", baseline "85 wpm", target "110 wpm", 5 data points, latest value 95 wpm, trend "up"

**Then** the goals section shows:
  - the area label "READING FLUENCY" in uppercase
  - the full goal text
  - status badge "active" in emerald/green
  - "Baseline: 85 wpm | Target: 110 wpm"
  - "5 data points | Latest: 95 wpm | Trend: up"

---

### 82. IEP detail page shows accommodations and modifications

**Given** Ms. Rodriguez is viewing an IEP detail page
**And** the IEP has accommodations: [{ type: "instructional", description: "Chunked directions" }]
**And** the IEP has modifications: [{ type: "assessment", description: "Reduced answer choices" }]

**Then** the "Accommodations & Modifications" section shows:
  - "Instructional: Chunked directions"
  - "Assessment (modification): Reduced answer choices"

---

### 83. IEP detail page shows related services

**Given** Ms. Rodriguez is viewing an IEP detail page
**And** the IEP has related services: [{ service: "Speech Therapy", frequency: "2x/week", location: "pull-out", provider: "SLP" }]

**Then** the "Related Services" section shows:
  - "Speech Therapy: 2x/week, pull-out (SLP)"

---

### 84. IEP detail page shows compliance deadlines with urgency indicators

**Given** Ms. Rodriguez is viewing an IEP detail page
**And** the student has a compliance deadline "Annual Review" due in 5 days

**Then** the "Compliance Deadlines" section shows:
  - "Annual Review" with the formatted due date
  - a badge showing "5d remaining" in amber/red styling (urgent)

---

### 85. IEP creation wizard has 5 steps

**Given** Ms. Rodriguez is signed in and viewing /dashboard/iep/new

**Then** the page shows a 5-step wizard with step indicators:
  1. Student Info
  2. Present Levels
  3. Goals
  4. Accommodations
  5. Review
**And** step 1 is active by default

---

### 86. IEP creation wizard step 1 requires student, disability category, and dates

**Given** Ms. Rodriguez is on step 1 of the IEP creation wizard

**Then** the form shows:
  - a student dropdown populated with students from her classes
  - a disability category dropdown with 13 IDEA categories (e.g., "Specific Learning Disability (SLD)", "Autism Spectrum Disorder", "Emotional Disturbance")
  - start date and end date inputs
**And** the "Next" button is disabled until student and disability category are selected

---

### 87. IEP creation wizard step 2 has AI auto-generate button for present levels

**Given** Ms. Rodriguez has completed step 1 and is on step 2 (Present Levels)

**Then** the page shows:
  - a textarea for present levels text
  - an "Auto-generate with AI" button
**And** clicking the button calls POST /api/iep/generate/present-levels and populates the textarea with the result
**And** a note appears: "Generated by AI -- Review required. Edit as needed before proceeding."

---

### 88. IEP creation wizard step 3 allows adding and removing goals

**Given** Ms. Rodriguez is on step 3 (Goals)

**Then** the page shows an "Add Goal" button and an "AI Suggest" button
**And** clicking "Add Goal" creates a blank goal form with fields: Area, Goal Text, Baseline, Target, Measurement Method, Frequency
**And** each goal has a remove (X) button
**And** clicking "AI Suggest" calls POST /api/iep/generate/goals and appends the suggested goals

---

### 89. IEP creation wizard step 5 shows review summary and creates IEP on submit

**Given** Ms. Rodriguez has completed all steps and is on step 5 (Review)

**Then** the page displays a summary of:
  - Student name and disability category
  - Start and end dates
  - Present levels text (truncated if long)
  - Goals count and each goal's area and text
  - Accommodations count and each accommodation's type and description
**And** a "Create IEP" button submits POST /api/iep and redirects to the new IEP's detail page

---

### 90. IEP edit page loads existing data

**Given** Ms. Rodriguez is viewing /dashboard/iep/[iepId]/edit
**And** the IEP has present levels, 2 goals, and 3 accommodations

**Then** the page heading shows "Edit IEP: [Student Name]"
**And** the edit form is pre-populated with:
  - the existing present levels text
  - the 2 goals with their area, goalText, baseline, target, measureMethod, frequency, and status
  - the 3 accommodations with their type and description

---

### 91. Progress monitoring page shows student list and goal charts

**Given** Ms. Rodriguez is signed in and viewing /dashboard/progress-monitoring
**And** she has 2 students with active IEPs, each with goals and data points

**Then** the page displays:
  - a left sidebar with a "Students" list (each showing student name and goal count)
  - selecting a student shows their goals in the main area
  - each goal card shows: area, trend indicator (up/down/flat), goal text, baseline, target, data point count, latest value
  - a progress chart with data points plotted, baseline line, and target/goal line

---

### 92. Progress monitoring page has Quick Data Entry form

**Given** Ms. Rodriguez is viewing /dashboard/progress-monitoring with a student selected

**Then** the left sidebar shows a "Quick Data Entry" form
**And** the form includes a goal selector, value input, unit, and notes
**And** submitting the form calls POST /api/iep/[iepId]/progress

---

### 93. Progress monitoring page has "Generate Narrative" button per goal

**Given** Ms. Rodriguez is viewing a goal card on /dashboard/progress-monitoring

**Then** each goal card has a "Generate Narrative" button
**And** clicking it calls POST /api/iep/[iepId]/progress/narrative with the goalId

---

### 94. Progress monitoring page shows empty state when no active IEPs

**Given** Ms. Rodriguez is signed in and viewing /dashboard/progress-monitoring
**And** she has no active or in-review IEPs

**Then** the page shows an empty state with:
  - "No active IEPs" heading
  - "Create and activate IEPs for your students to start progress monitoring."

---

### 95. Compliance dashboard shows summary statistics

**Given** Ms. Rodriguez is signed in and viewing /dashboard/compliance
**And** she has deadlines: 1 overdue, 2 critical (<15 days), 1 warning (15-30 days), 3 on track (30+ days), 1 completed

**Then** the page shows summary stat cards:
  - Total Deadlines: 8
  - Overdue: 1
  - <15 Days: 2
  - 15-30 Days: 1
  - On Track: 4 (3 on-track + 1 completed)

---

### 96. Compliance dashboard table shows deadlines sorted by urgency

**Given** Ms. Rodriguez is viewing /dashboard/compliance

**Then** the "All Deadlines" table shows columns: Student, Type, Due Date, Status, Notes
**And** rows are sorted by urgency: overdue first, then critical, warning, ok, completed
**And** the Type column shows human-readable labels: "Initial Evaluation", "Annual Review", "Triennial Re-evaluation"
**And** the Status column shows a color-coded compliance badge

---

### 97. Compliance dashboard distinguishes admin and SPED teacher subtitle

**Given** Dr. Williams (admin) is viewing /dashboard/compliance

**Then** the page subtitle reads "Track IEP compliance deadlines across your district."

**Given** Ms. Rodriguez (sped_teacher) is viewing /dashboard/compliance

**Then** the page subtitle reads "Track IEP compliance deadlines across your caseload."

---

### 98. Compliance dashboard shows empty state when no caseload data

**Given** Ms. Rodriguez is signed in and viewing /dashboard/compliance
**And** she has authored no IEPs (so no student IDs to look up deadlines for)

**Then** the page shows an empty state with:
  - "No compliance data"
  - "Create IEPs for your students to start tracking compliance deadlines."
