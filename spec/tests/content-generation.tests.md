# Content Generation Tests

Behavioral specification for rubrics, lesson plans, quizzes, and exit tickets. Covers CRUD operations, AI generation, validation, authorization, and response shapes.

---

## Rubrics

### 1. Unauthenticated request to list rubrics returns 401

**Given** no user is signed in

**When** a request is sent: GET /api/rubrics

**Then** the response status is 401
**And** the response body contains:
  - error: "Unauthorized"

---

### 2. Authenticated teacher can list their rubrics

**Given** a teacher "Ms. Rivera" is signed in with role "teacher"
**And** she owns one rubric with:
  - id: "r1"
  - title: "Essay Rubric"
  - type: "analytical"
  - levels: ["Beginning", "Developing", "Proficient", "Advanced"]
  - isTemplate: false
**And** that rubric has 2 criteria rows in the rubric_criteria table

**When** she sends GET /api/rubrics

**Then** the response status is 200
**And** the response body is a JSON array with 1 element
**And** the first element contains:
  - title: "Essay Rubric"
  - levels: ["Beginning", "Developing", "Proficient", "Advanced"] (parsed from stored JSON string)
  - criteriaCount: 2

---

### 3. Teacher with no rubrics receives an empty array

**Given** a teacher "Ms. Rivera" is signed in with role "teacher"
**And** she has no rubrics in the database

**When** she sends GET /api/rubrics

**Then** the response status is 200
**And** the response body is an empty JSON array: []

---

### 4. Unauthenticated request to create a rubric returns 401

**Given** no user is signed in

**When** a request is sent: POST /api/rubrics with body:
  - title: "Test Rubric"
  - levels: ["Beginning", "Proficient"]

**Then** the response status is 401
**And** the response body contains:
  - error: "Unauthorized"

---

### 5. Creating a rubric without title returns 400

**Given** a teacher "Ms. Rivera" is signed in with role "teacher"

**When** she sends POST /api/rubrics with body:
  - description: "Some rubric"

**Then** the response status is 400
**And** the response body contains:
  - error: a string containing "Missing required fields"

---

### 6. Creating a rubric with empty levels array returns 400

**Given** a teacher "Ms. Rivera" is signed in with role "teacher"

**When** she sends POST /api/rubrics with body:
  - title: "Test Rubric"
  - levels: []

**Then** the response status is 400
**And** the response body contains:
  - error: a string containing "Missing required fields"

---

### 7. Creating a rubric without levels returns 400

**Given** a teacher "Ms. Rivera" is signed in with role "teacher"

**When** she sends POST /api/rubrics with body:
  - title: "Test Rubric"

**Then** the response status is 400
**And** the response body contains:
  - error: a string containing "Missing required fields: title, levels"

---

### 8. Authenticated teacher can create a rubric with criteria

**Given** a teacher "Ms. Rivera" is signed in with role "teacher"

**When** she sends POST /api/rubrics with body:
  - title: "Essay Rubric"
  - levels: ["Beginning", "Developing", "Proficient", "Advanced"]
  - criteria:
    - { name: "Thesis", description: "Has a clear thesis", weight: 0.5, descriptors: { "Beginning": "No thesis", "Proficient": "Clear thesis" } }

**Then** the response status is 201
**And** the response body contains:
  - id: a unique string identifier
  - title: "Essay Rubric"
  - type: "analytical" (the default)
  - levels: ["Beginning", "Developing", "Proficient", "Advanced"] (parsed array, not JSON string)
  - teacherId: matching the signed-in teacher's ID
  - isTemplate: false
  - criteria: an array with 1 element, where each element has:
    - name: "Thesis"
    - descriptors: an object (parsed from JSON), not a JSON string

---

### 9. Creating a rubric sets defaults for optional fields

**Given** a teacher "Ms. Rivera" is signed in with role "teacher"

**When** she sends POST /api/rubrics with body:
  - title: "Minimal Rubric"
  - levels: ["Pass", "Fail"]

**Then** the response status is 201
**And** the response body contains:
  - type: "analytical" (default when type not provided)
  - description: null (default when description not provided)
  - isTemplate: false (default when isTemplate not provided)

---

### 10. Unauthenticated request to get rubric detail returns 401

**Given** no user is signed in

**When** a request is sent: GET /api/rubrics/r1

**Then** the response status is 401
**And** the response body contains:
  - error: "Unauthorized"

---

### 11. Getting a rubric that does not exist returns 404

**Given** a teacher "Ms. Rivera" is signed in with role "teacher"
**And** no rubric with id "nonexistent" exists for this teacher

**When** she sends GET /api/rubrics/nonexistent

**Then** the response status is 404
**And** the response body contains:
  - error: "Rubric not found"

---

### 12. Teacher can only access their own rubrics

**Given** a teacher "Ms. Rivera" is signed in with role "teacher"
**And** a rubric with id "r1" exists but belongs to a different teacher

**When** she sends GET /api/rubrics/r1

**Then** the response status is 404
**And** the response body contains:
  - error: "Rubric not found"

---

### 13. Authenticated teacher can get rubric detail with criteria

**Given** a teacher "Ms. Rivera" is signed in with role "teacher"
**And** she owns a rubric with:
  - id: "r1"
  - title: "Essay Rubric"
  - levels: stored as JSON string '["Beginning", "Developing", "Proficient", "Advanced"]'
**And** that rubric has criteria:
  - { name: "Thesis", weight: 0.4, descriptors: stored as JSON string '{"Beginning":"No thesis","Proficient":"Clear thesis"}' }
  - { name: "Evidence", weight: 0.6, descriptors: stored as JSON string '{"Beginning":"No evidence","Proficient":"Strong evidence"}' }

**When** she sends GET /api/rubrics/r1

**Then** the response status is 200
**And** the response body contains:
  - id: "r1"
  - title: "Essay Rubric"
  - levels: ["Beginning", "Developing", "Proficient", "Advanced"] (parsed array)
  - criteria: an array with 2 elements
**And** each criterion has:
  - name: a string
  - weight: a number
  - descriptors: a parsed object mapping level names to descriptor strings

---

### 14. Unauthenticated request to update a rubric returns 401

**Given** no user is signed in

**When** a request is sent: PUT /api/rubrics/r1 with body:
  - title: "Updated Rubric"

**Then** the response status is 401
**And** the response body contains:
  - error: "Unauthorized"

---

### 15. Updating a rubric that does not belong to the teacher returns 404

**Given** a teacher "Ms. Rivera" is signed in with role "teacher"
**And** no rubric with id "r1" exists for this teacher

**When** she sends PUT /api/rubrics/r1 with body:
  - title: "Updated Rubric"

**Then** the response status is 404
**And** the response body contains:
  - error: "Rubric not found"

---

### 16. Authenticated teacher can update rubric fields

**Given** a teacher "Ms. Rivera" is signed in with role "teacher"
**And** she owns a rubric with id "r1"

**When** she sends PUT /api/rubrics/r1 with body:
  - title: "Updated Essay Rubric"
  - description: "Revised for clarity"
  - levels: ["Novice", "Competent", "Expert"]

**Then** the response status is 200
**And** the response body contains:
  - title: "Updated Essay Rubric"
  - description: "Revised for clarity"
  - levels: ["Novice", "Competent", "Expert"] (parsed array)
  - criteria: an array (may be empty if no criteria exist)

---

### 17. Updating rubric criteria replaces all existing criteria

**Given** a teacher "Ms. Rivera" is signed in with role "teacher"
**And** she owns a rubric with id "r1" that currently has 3 criteria

**When** she sends PUT /api/rubrics/r1 with body:
  - criteria:
    - { name: "New Criterion", weight: 1.0, descriptors: { "Novice": "Needs work", "Expert": "Excellent" } }

**Then** the response status is 200
**And** the old criteria are deleted from the rubric_criteria table
**And** the new criteria are inserted
**And** the response body criteria array contains exactly 1 element
**And** that element has name: "New Criterion"

---

### 18. Unauthenticated request to delete a rubric returns 401

**Given** no user is signed in

**When** a request is sent: DELETE /api/rubrics/r1

**Then** the response status is 401
**And** the response body contains:
  - error: "Unauthorized"

---

### 19. Deleting a rubric that does not belong to the teacher returns 404

**Given** a teacher "Ms. Rivera" is signed in with role "teacher"
**And** no rubric with id "r1" exists for this teacher

**When** she sends DELETE /api/rubrics/r1

**Then** the response status is 404
**And** the response body contains:
  - error: "Rubric not found"

---

### 20. Authenticated teacher can delete their rubric

**Given** a teacher "Ms. Rivera" is signed in with role "teacher"
**And** she owns a rubric with id "r1"

**When** she sends DELETE /api/rubrics/r1

**Then** the response status is 200
**And** the response body contains:
  - success: true
**And** the rubric row is removed from the rubrics table
**And** associated rubric_criteria rows are cascade-deleted

---

### 21. Unauthenticated request to generate a rubric returns 401

**Given** no user is signed in

**When** a request is sent: POST /api/rubrics/generate with body:
  - title: "Essay Rubric"
  - subject: "ELA"
  - gradeLevel: "8"
  - assignmentDescription: "Analyze the use of metaphor in poetry"

**Then** the response status is 401
**And** the response body contains:
  - error: "Unauthorized"

---

### 22. Generating a rubric without required fields returns 400

**Given** a teacher "Ms. Rivera" is signed in with role "teacher"

**When** she sends POST /api/rubrics/generate with body:
  - title: "Essay Rubric"
  - subject: "ELA"

**Then** the response status is 400
**And** the response body contains:
  - error: a string containing "Missing required fields: title, subject, gradeLevel, assignmentDescription"

---

### 23. Authenticated teacher can generate a rubric via AI

**Given** a teacher "Ms. Rivera" is signed in with role "teacher"

**When** she sends POST /api/rubrics/generate with body:
  - title: "Persuasive Essay Rubric"
  - subject: "ELA"
  - gradeLevel: "8"
  - assignmentDescription: "Write a persuasive essay arguing for or against school uniforms"

**Then** the AI service generateRubric is called with:
  - title: "Persuasive Essay Rubric"
  - subject: "ELA"
  - gradeLevel: "8"
  - assignmentDescription: the provided description
**And** the response status is 201
**And** the response body contains:
  - id: a unique string identifier (the rubric was persisted to the database)
  - title: a string (from the AI-generated output)
  - description: a string
  - type: "analytical" or "holistic"
  - levels: an array of strings (parsed, not JSON string)
  - teacherId: matching the signed-in teacher's ID
  - criteria: an array where each element has:
    - name: a string
    - description: a string
    - weight: a number
    - descriptors: an object (parsed, mapping level names to descriptor strings)
  - successCriteria: an array of strings ("I can..." statements from the AI)

---

### 24. AI rubric generation uses default proficiency levels when none provided

**Given** a teacher "Ms. Rivera" is signed in with role "teacher"

**When** she sends POST /api/rubrics/generate with body:
  - title: "Lab Report Rubric"
  - subject: "Science"
  - gradeLevel: "10"
  - assignmentDescription: "Design and report on a controlled experiment"
  - (levels field omitted)

**Then** the AI service is called with levels defaulting to: ["Beginning", "Developing", "Proficient", "Advanced"]

---

### 25. AI rubric generation accepts custom proficiency levels

**Given** a teacher "Ms. Rivera" is signed in with role "teacher"

**When** she sends POST /api/rubrics/generate with body:
  - title: "Project Rubric"
  - subject: "Math"
  - gradeLevel: "5"
  - assignmentDescription: "Create a scale model"
  - levels: ["Novice", "Intermediate", "Expert"]

**Then** the AI service is called with levels: ["Novice", "Intermediate", "Expert"]

---

### 26. AI rubric generation accepts optional standards alignment

**Given** a teacher "Ms. Rivera" is signed in with role "teacher"

**When** she sends POST /api/rubrics/generate with body:
  - title: "Writing Rubric"
  - subject: "ELA"
  - gradeLevel: "8"
  - assignmentDescription: "Write an argumentative essay"
  - standards: ["CCSS.ELA-LITERACY.W.8.1", "CCSS.ELA-LITERACY.W.8.4"]

**Then** the AI service is called with standards: ["CCSS.ELA-LITERACY.W.8.1", "CCSS.ELA-LITERACY.W.8.4"]

---

## AI Rubric Generation Contract

### 27. AI rubric generation returns structured output via tool_use

**Given** a valid rubric generation input with title, subject, gradeLevel, and assignmentDescription

**When** the generateRubric AI service is called

**Then** it sends a request to the Claude API with:
  - model: the configured AI_MODEL constant
  - max_tokens: 4096
  - a system prompt describing an expert K-12 curriculum designer
  - a tool named "create_rubric" with forced tool_choice
  - a user message containing the title, subject, gradeLevel, assignmentDescription, and proficiency levels

**And** the response is parsed from the tool_use content block
**And** the returned object conforms to the GeneratedRubric interface:
  - title: string
  - description: string
  - type: "analytical" or "holistic"
  - levels: string[]
  - criteria: array of objects, each with:
    - name: string
    - description: string
    - weight: number (all weights sum to 1.0)
    - descriptors: object mapping each level name to a performance descriptor string
    - standardCode: optional string
  - successCriteria: string[] (student-facing "I can" statements)

---

## Lesson Plans

### 28. Unauthenticated request to list lesson plans returns 401

**Given** no user is signed in

**When** a request is sent: GET /api/lesson-plans

**Then** the response status is 401
**And** the response body contains:
  - error: "Unauthorized"

---

### 29. Authenticated teacher can list their lesson plans

**Given** a teacher "Ms. Rivera" is signed in with role "teacher"
**And** she owns one lesson plan with:
  - id: "lp-1"
  - title: "Introduction to Persuasive Writing"
  - subject: "ELA"
  - gradeLevel: "8"
  - duration: "45 min"
  - standards: stored as JSON string '["CCSS.ELA-LITERACY.W.8.1"]'
  - objectives: stored as JSON string '["Students will write a persuasive paragraph"]'
  - materials: stored as JSON string '["Whiteboard", "Handouts"]'
  - differentiation: stored as JSON string '{"below": "Sentence starters", "above": "Extended essay"}'
  - aiMetadata: stored as JSON string '{"model": "claude-opus-4-6"}'

**When** she sends GET /api/lesson-plans

**Then** the response status is 200
**And** the response body is a JSON array with 1 element
**And** the first element contains:
  - title: "Introduction to Persuasive Writing"
  - standards: ["CCSS.ELA-LITERACY.W.8.1"] (parsed array)
  - objectives: ["Students will write a persuasive paragraph"] (parsed array)
  - materials: ["Whiteboard", "Handouts"] (parsed array)
  - differentiation: {"below": "Sentence starters", "above": "Extended essay"} (parsed object)
  - aiMetadata: {"model": "claude-opus-4-6"} (parsed object)

---

### 30. Lesson plan list returns empty array when teacher has no plans

**Given** a teacher "Ms. Rivera" is signed in with role "teacher"
**And** she has no lesson plans

**When** she sends GET /api/lesson-plans

**Then** the response status is 200
**And** the response body is an empty JSON array: []

---

### 31. Lesson plan with null optional fields returns safe defaults

**Given** a teacher "Ms. Rivera" is signed in with role "teacher"
**And** she owns a lesson plan with:
  - standards: null
  - materials: null
  - differentiation: null
  - aiMetadata: null

**When** she sends GET /api/lesson-plans

**Then** the response status is 200
**And** for that plan:
  - standards: [] (empty array, not null)
  - materials: [] (empty array, not null)
  - differentiation: null
  - aiMetadata: null

---

### 32. Unauthenticated request to create a lesson plan returns 401

**Given** no user is signed in

**When** a request is sent: POST /api/lesson-plans with body:
  - title: "Test Plan"
  - subject: "ELA"
  - gradeLevel: "8"
  - objectives: ["Write an essay"]

**Then** the response status is 401
**And** the response body contains:
  - error: "Unauthorized"

---

### 33. Creating a lesson plan without required fields returns 400

**Given** a teacher "Ms. Rivera" is signed in with role "teacher"

**When** she sends POST /api/lesson-plans with body:
  - title: "Incomplete Plan"

**Then** the response status is 400
**And** the response body contains:
  - error: a string containing "Missing required fields: title, subject, gradeLevel, objectives"

---

### 34. Creating a lesson plan without title returns 400

**Given** a teacher "Ms. Rivera" is signed in with role "teacher"

**When** she sends POST /api/lesson-plans with body:
  - subject: "ELA"
  - gradeLevel: "8"
  - objectives: ["Write an essay"]

**Then** the response status is 400
**And** the response body contains:
  - error: a string containing "Missing required fields"

---

### 35. Authenticated teacher can create a lesson plan with all fields

**Given** a teacher "Ms. Rivera" is signed in with role "teacher"

**When** she sends POST /api/lesson-plans with body:
  - title: "Persuasive Writing"
  - subject: "ELA"
  - gradeLevel: "8"
  - duration: "45 min"
  - standards: ["CCSS.ELA-LITERACY.W.8.1"]
  - objectives: ["Write a persuasive paragraph"]
  - warmUp: "Quick debate"
  - directInstruction: "Model techniques"
  - guidedPractice: "Partner work"
  - independentPractice: "Solo writing"
  - closure: "Gallery walk"
  - materials: ["Handouts", "Rubric"]
  - differentiation: { "below": "Sentence starters", "above": "Extended response" }
  - assessmentPlan: "Rubric scoring"
  - aiMetadata: { "model": "claude-opus-4-6" }

**Then** the response status is 201
**And** the response body contains:
  - id: a unique string identifier
  - title: "Persuasive Writing"
  - subject: "ELA"
  - gradeLevel: "8"
  - teacherId: matching the signed-in teacher's ID
  - standards: ["CCSS.ELA-LITERACY.W.8.1"] (parsed array)
  - objectives: ["Write a persuasive paragraph"] (parsed array)
  - materials: ["Handouts", "Rubric"] (parsed array)
  - differentiation: { "below": "Sentence starters", "above": "Extended response" } (parsed object)
  - aiMetadata: { "model": "claude-opus-4-6" } (parsed object)

---

### 36. Authenticated teacher can create a lesson plan with only required fields

**Given** a teacher "Ms. Rivera" is signed in with role "teacher"

**When** she sends POST /api/lesson-plans with body:
  - title: "Basic Math"
  - subject: "Math"
  - gradeLevel: "5"
  - objectives: ["Learn addition"]

**Then** the response status is 201
**And** the response body contains:
  - title: "Basic Math"
  - standards: [] (empty array)
  - materials: [] (empty array)
  - differentiation: null
  - aiMetadata: null
  - warmUp: null
  - directInstruction: null
  - guidedPractice: null
  - independentPractice: null
  - closure: null

---

### 37. Unauthenticated request to get lesson plan detail returns 401

**Given** no user is signed in

**When** a request is sent: GET /api/lesson-plans/lp-1

**Then** the response status is 401
**And** the response body contains:
  - error: "Unauthorized"

---

### 38. Getting a lesson plan that does not exist returns 404

**Given** a teacher "Ms. Rivera" is signed in with role "teacher"
**And** no lesson plan with id "nonexistent" exists for this teacher

**When** she sends GET /api/lesson-plans/nonexistent

**Then** the response status is 404
**And** the response body contains:
  - error: "Lesson plan not found"

---

### 39. Teacher can only access their own lesson plans

**Given** a teacher "Ms. Rivera" is signed in with role "teacher"
**And** a lesson plan with id "lp-1" exists but belongs to a different teacher

**When** she sends GET /api/lesson-plans/lp-1

**Then** the response status is 404
**And** the response body contains:
  - error: "Lesson plan not found"

---

### 40. Authenticated teacher can get lesson plan detail

**Given** a teacher "Ms. Rivera" is signed in with role "teacher"
**And** she owns a lesson plan with:
  - id: "lp-1"
  - title: "Persuasive Writing"
  - standards: stored as JSON string '["CCSS.ELA-LITERACY.W.8.1"]'
  - objectives: stored as JSON string '["Write a persuasive paragraph"]'
  - materials: stored as JSON string '["Handouts"]'
  - differentiation: stored as JSON string '{"belowGrade":"Scaffolds","onGrade":"Core path","aboveGrade":"Extensions"}'

**When** she sends GET /api/lesson-plans/lp-1

**Then** the response status is 200
**And** the response body contains:
  - id: "lp-1"
  - title: "Persuasive Writing"
  - standards: ["CCSS.ELA-LITERACY.W.8.1"] (parsed)
  - objectives: ["Write a persuasive paragraph"] (parsed)
  - materials: ["Handouts"] (parsed)
  - differentiation: an object with belowGrade, onGrade, aboveGrade keys (parsed)

---

### 41. Unauthenticated request to update a lesson plan returns 401

**Given** no user is signed in

**When** a request is sent: PUT /api/lesson-plans/lp-1 with body:
  - title: "Updated Plan"

**Then** the response status is 401
**And** the response body contains:
  - error: "Unauthorized"

---

### 42. Updating a lesson plan that does not belong to the teacher returns 404

**Given** a teacher "Ms. Rivera" is signed in with role "teacher"
**And** no lesson plan with id "lp-1" exists for this teacher

**When** she sends PUT /api/lesson-plans/lp-1 with body:
  - title: "Updated Plan"

**Then** the response status is 404
**And** the response body contains:
  - error: "Lesson plan not found"

---

### 43. Authenticated teacher can update lesson plan fields

**Given** a teacher "Ms. Rivera" is signed in with role "teacher"
**And** she owns a lesson plan with id "lp-1"

**When** she sends PUT /api/lesson-plans/lp-1 with body:
  - title: "Revised Persuasive Writing"
  - warmUp: "New warm-up activity"
  - objectives: ["Revised objective 1", "Revised objective 2"]

**Then** the response status is 200
**And** the response body contains:
  - title: "Revised Persuasive Writing"
  - warmUp: "New warm-up activity"
  - objectives: ["Revised objective 1", "Revised objective 2"] (parsed array)
**And** unchanged fields retain their previous values
**And** updatedAt is set to the current timestamp

---

### 44. Lesson plan update supports partial updates

**Given** a teacher "Ms. Rivera" is signed in with role "teacher"
**And** she owns a lesson plan with id "lp-1" with title "Original Title" and warmUp "Original warm-up"

**When** she sends PUT /api/lesson-plans/lp-1 with body:
  - warmUp: "New warm-up only"

**Then** the response status is 200
**And** the response body contains:
  - title: "Original Title" (unchanged)
  - warmUp: "New warm-up only" (updated)

---

### 45. Unauthenticated request to delete a lesson plan returns 401

**Given** no user is signed in

**When** a request is sent: DELETE /api/lesson-plans/lp-1

**Then** the response status is 401
**And** the response body contains:
  - error: "Unauthorized"

---

### 46. Deleting a lesson plan that does not belong to the teacher returns 404

**Given** a teacher "Ms. Rivera" is signed in with role "teacher"
**And** no lesson plan with id "lp-1" exists for this teacher

**When** she sends DELETE /api/lesson-plans/lp-1

**Then** the response status is 404
**And** the response body contains:
  - error: "Lesson plan not found"

---

### 47. Authenticated teacher can delete their lesson plan

**Given** a teacher "Ms. Rivera" is signed in with role "teacher"
**And** she owns a lesson plan with id "lp-1"

**When** she sends DELETE /api/lesson-plans/lp-1

**Then** the response status is 200
**And** the response body contains:
  - success: true
**And** the lesson plan row is removed from the lesson_plans table

---

### 48. Unauthenticated request to generate a lesson plan returns 401

**Given** no user is signed in

**When** a request is sent: POST /api/lesson-plans/generate with body:
  - subject: "ELA"
  - gradeLevel: "8"
  - topic: "Persuasive writing techniques"

**Then** the response status is 401
**And** the response body contains:
  - error: "Unauthorized"

---

### 49. Generating a lesson plan without required fields returns 400

**Given** a teacher "Ms. Rivera" is signed in with role "teacher"

**When** she sends POST /api/lesson-plans/generate with body:
  - subject: "ELA"

**Then** the response status is 400
**And** the response body contains:
  - error: a string containing "Missing required fields: subject, gradeLevel, topic"

---

### 50. Authenticated teacher can generate a lesson plan via AI

**Given** a teacher "Ms. Rivera" is signed in with role "teacher"

**When** she sends POST /api/lesson-plans/generate with body:
  - subject: "ELA"
  - gradeLevel: "8"
  - topic: "Persuasive writing techniques"
  - duration: "45 minutes"

**Then** the AI service generateLessonPlan is called with:
  - subject: "ELA"
  - gradeLevel: "8"
  - topic: "Persuasive writing techniques"
  - duration: "45 minutes"
**And** the response status is 201
**And** the response body contains:
  - id: a unique string identifier (persisted to database)
  - title: a string (from AI output)
  - subject: "ELA"
  - gradeLevel: "8"
  - teacherId: matching the signed-in teacher's ID
  - objectives: a parsed array of strings
  - standards: a parsed array of strings (or empty array)
  - warmUp: a string
  - directInstruction: a string
  - guidedPractice: a string
  - independentPractice: a string
  - closure: a string
  - materials: a parsed array of strings (or empty array)
  - differentiation: a parsed object or null
  - assessmentPlan: a string
  - aiMetadata: a parsed object containing:
    - generatedAt: an ISO timestamp string
    - model: "claude-opus-4-6"
    - input: an object with subject, gradeLevel, topic, duration, instructionalModel fields

---

### 51. Lesson plan generation normalizes comma-separated standards to array

**Given** a teacher "Ms. Rivera" is signed in with role "teacher"

**When** she sends POST /api/lesson-plans/generate with body:
  - subject: "Math"
  - gradeLevel: "5"
  - topic: "Adding fractions"
  - standards: "CCSS.MATH.5.NF.A.1, CCSS.MATH.5.NF.A.2"

**Then** the AI service is called with standards as an array: ["CCSS.MATH.5.NF.A.1", "CCSS.MATH.5.NF.A.2"]

---

### 52. Lesson plan generation accepts optional instructional model

**Given** a teacher "Ms. Rivera" is signed in with role "teacher"

**When** she sends POST /api/lesson-plans/generate with body:
  - subject: "Science"
  - gradeLevel: "6"
  - topic: "The water cycle"
  - instructionalModel: "inquiry"

**Then** the AI service is called with instructionalModel: "inquiry"

---

## AI Lesson Plan Generation Contract

### 53. AI lesson plan generation returns structured output via tool_use

**Given** a valid lesson plan generation input with subject, gradeLevel, and topic

**When** the generateLessonPlan AI service is called

**Then** it sends a request to the Claude API with:
  - model: the configured AI_MODEL constant
  - max_tokens: 4096
  - a system prompt describing an expert K-12 instructional designer
  - a tool named "create_lesson_plan" with forced tool_choice
  - a user message containing subject, gradeLevel, topic, and optional duration/standards/instructionalModel

**And** the response is parsed from the tool_use content block
**And** the returned object conforms to the GeneratedLessonPlan interface:
  - title: string
  - objectives: string[]
  - standards: string[]
  - warmUp: string
  - directInstruction: string
  - guidedPractice: string
  - independentPractice: string
  - closure: string
  - materials: string[]
  - differentiation: object with keys:
    - belowGrade: string (scaffolds for below grade-level)
    - onGrade: string (core instructional path)
    - aboveGrade: string (extensions for above grade-level)
  - assessmentPlan: string
  - estimatedDuration: string

---

## Quizzes

### 54. Unauthenticated request to list quizzes returns 401

**Given** no user is signed in

**When** a request is sent: GET /api/quizzes

**Then** the response status is 401
**And** the response body contains:
  - error: "Unauthorized"

---

### 55. Authenticated teacher can list their quizzes with question counts

**Given** a teacher "Ms. Rivera" is signed in with role "teacher"
**And** she owns one quiz with:
  - id: "q1"
  - title: "Math Quiz: Fractions"
  - subject: "Math"
  - gradeLevel: "4"
**And** that quiz has 3 questions in the quiz_questions table

**When** she sends GET /api/quizzes

**Then** the response status is 200
**And** the response body is a JSON array with 1 element
**And** the first element contains:
  - title: "Math Quiz: Fractions"
  - questionCount: 3

---

### 56. Teacher with no quizzes receives an empty array

**Given** a teacher "Ms. Rivera" is signed in with role "teacher"
**And** she has no quizzes

**When** she sends GET /api/quizzes

**Then** the response status is 200
**And** the response body is an empty JSON array: []

---

### 57. Unauthenticated request to generate a quiz returns 401

**Given** no user is signed in

**When** a request is sent: POST /api/quizzes/generate with body:
  - topic: "Fractions"
  - gradeLevel: "4"
  - subject: "Math"

**Then** the response status is 401
**And** the response body contains:
  - error: "Unauthorized"

---

### 58. Student cannot generate a quiz (403)

**Given** a student "Aisha Torres" is signed in with role "student"

**When** she sends POST /api/quizzes/generate with body:
  - topic: "Fractions"
  - gradeLevel: "4"
  - subject: "Math"

**Then** the response status is 403
**And** the response body contains:
  - error: "Only teachers can generate quizzes"

---

### 59. Parent cannot generate a quiz (403)

**Given** a parent "Sarah Chen" is signed in with role "parent"

**When** she sends POST /api/quizzes/generate with body:
  - topic: "Fractions"
  - gradeLevel: "4"
  - subject: "Math"

**Then** the response status is 403
**And** the response body contains:
  - error: "Only teachers can generate quizzes"

---

### 60. Admin cannot generate a quiz (403)

**Given** an admin is signed in with role "admin"

**When** they send POST /api/quizzes/generate with body:
  - topic: "Fractions"
  - gradeLevel: "4"
  - subject: "Math"

**Then** the response status is 403
**And** the response body contains:
  - error: "Only teachers can generate quizzes"

---

### 61. Generating a quiz without required fields returns 400

**Given** a teacher "Ms. Rivera" is signed in with role "teacher"

**When** she sends POST /api/quizzes/generate with body:
  - topic: "Fractions"

**Then** the response status is 400
**And** the response body contains:
  - error: a string containing "Missing required fields: topic, gradeLevel, subject"

---

### 62. Generating a quiz without topic returns 400

**Given** a teacher "Ms. Rivera" is signed in with role "teacher"

**When** she sends POST /api/quizzes/generate with body:
  - gradeLevel: "4"
  - subject: "Math"

**Then** the response status is 400
**And** the response body contains:
  - error: a string containing "Missing required fields"

---

### 63. Authenticated teacher can generate a quiz via AI

**Given** a teacher "Ms. Rivera" is signed in with role "teacher"

**When** she sends POST /api/quizzes/generate with body:
  - topic: "Fractions"
  - gradeLevel: "4"
  - subject: "Math"

**Then** the AI service generateQuiz is called
**And** the response status is 200
**And** the response body contains:
  - quiz: an object with:
    - id: a unique string identifier (persisted to database)
    - title: a string (from AI output)
    - subject: "Math"
    - gradeLevel: "4"
  - questions: an array where each element has:
    - id: a unique string identifier
    - quizId: matching the quiz id
    - type: a string (e.g., "multiple_choice" or "short_answer")
    - questionText: a string
    - options: a parsed array or null (parsed from stored JSON)
    - correctAnswer: a string
    - explanation: a string
    - bloomsLevel: a string (one of: remember, understand, apply, analyze, evaluate, create)
    - points: a number
    - orderIndex: an integer starting from 0

---

### 64. Quiz generation clamps numberOfQuestions between 1 and 20

**Given** a teacher "Ms. Rivera" is signed in with role "teacher"

**When** she sends POST /api/quizzes/generate with body:
  - topic: "Fractions"
  - gradeLevel: "4"
  - subject: "Math"
  - numberOfQuestions: 50

**Then** the AI service is called with numQuestions: 20 (clamped to maximum)

---

### 65. Quiz generation clamps numberOfQuestions minimum to 1

**Given** a teacher "Ms. Rivera" is signed in with role "teacher"

**When** she sends POST /api/quizzes/generate with body:
  - topic: "Fractions"
  - gradeLevel: "4"
  - subject: "Math"
  - numberOfQuestions: 0

**Then** the AI service is called with numQuestions: 1 (clamped to minimum)

---

### 66. Quiz generation defaults numberOfQuestions to 10 when not provided

**Given** a teacher "Ms. Rivera" is signed in with role "teacher"

**When** she sends POST /api/quizzes/generate with body:
  - topic: "Fractions"
  - gradeLevel: "4"
  - subject: "Math"
  - (numberOfQuestions omitted)

**Then** the AI service is called with numQuestions: 10

---

### 67. Quiz generation defaults questionTypes when not provided

**Given** a teacher "Ms. Rivera" is signed in with role "teacher"

**When** she sends POST /api/quizzes/generate with body:
  - topic: "Fractions"
  - gradeLevel: "4"
  - subject: "Math"
  - (questionTypes omitted)

**Then** the AI service is called with questionTypes: ["multiple_choice", "short_answer"]

---

### 68. Quiz generation normalizes comma-separated standards to array

**Given** a teacher "Ms. Rivera" is signed in with role "teacher"

**When** she sends POST /api/quizzes/generate with body:
  - topic: "Fractions"
  - gradeLevel: "4"
  - subject: "Math"
  - standards: "CCSS.MATH.4.NF.A.1, CCSS.MATH.4.NF.A.2"

**Then** the AI service is called with standards as an array: ["CCSS.MATH.4.NF.A.1", "CCSS.MATH.4.NF.A.2"]
**And** the saved quiz record stores standards as a JSON string of that array

---

### 69. SPED teacher can generate a quiz

**Given** a SPED teacher "Ms. Rodriguez" is signed in with role "sped_teacher"

**When** she sends POST /api/quizzes/generate with body:
  - topic: "Reading Comprehension"
  - gradeLevel: "6"
  - subject: "ELA"

**Then** the response status is 200
**And** the response body contains quiz and questions

---

## AI Quiz Generation Contract

### 70. AI quiz generation returns structured output via tool_use

**Given** a valid quiz generation input with subject, gradeLevel, and topic

**When** the generateQuiz AI service is called

**Then** it sends a request to the Claude API with:
  - model: the configured AI_MODEL constant
  - max_tokens: 4096
  - a system prompt describing an expert K-12 assessment designer
  - a tool named "create_quiz" with forced tool_choice
  - a user message containing subject, gradeLevel, topic, numQuestions, questionTypes, and optional difficultyLevel/standards

**And** the response is parsed from the tool_use content block
**And** the returned object conforms to the GeneratedQuiz interface:
  - title: string
  - questions: array of objects, each with:
    - type: "multiple_choice" | "short_answer" | "essay"
    - questionText: string
    - options: string[] (for multiple_choice) or omitted
    - correctAnswer: string
    - explanation: string
    - bloomsLevel: one of "remember", "understand", "apply", "analyze", "evaluate", "create"
    - standardCode: optional string
    - points: number

---

## Exit Tickets

### 71. Unauthenticated request to generate an exit ticket returns 401

**Given** no user is signed in

**When** a request is sent: POST /api/exit-tickets/generate with body:
  - topic: "Fractions"
  - gradeLevel: "4"
  - subject: "Math"

**Then** the response status is 401
**And** the response body contains:
  - error: "Unauthorized"

---

### 72. Student cannot generate an exit ticket (403)

**Given** a student "Aisha Torres" is signed in with role "student"

**When** she sends POST /api/exit-tickets/generate with body:
  - topic: "Fractions"
  - gradeLevel: "4"
  - subject: "Math"

**Then** the response status is 403
**And** the response body contains:
  - error: a string containing "Only teachers can generate exit tickets"

---

### 73. Parent cannot generate an exit ticket (403)

**Given** a parent "Sarah Chen" is signed in with role "parent"

**When** she sends POST /api/exit-tickets/generate with body:
  - topic: "Fractions"
  - gradeLevel: "4"
  - subject: "Math"

**Then** the response status is 403
**And** the response body contains:
  - error: a string containing "Only teachers can generate exit tickets"

---

### 74. Generating an exit ticket without required fields returns 400

**Given** a teacher "Ms. Rivera" is signed in with role "teacher"

**When** she sends POST /api/exit-tickets/generate with body:
  - topic: "Fractions"

**Then** the response status is 400
**And** the response body contains:
  - error: a string containing "Missing required fields: topic, gradeLevel, subject"

---

### 75. Authenticated teacher can generate an exit ticket via AI

**Given** a teacher "Ms. Rivera" is signed in with role "teacher"

**When** she sends POST /api/exit-tickets/generate with body:
  - topic: "Fractions"
  - gradeLevel: "4"
  - subject: "Math"
  - numberOfQuestions: 3

**Then** the AI service generateExitTicket is called with:
  - topic: "Fractions"
  - gradeLevel: "4"
  - subject: "Math"
  - numberOfQuestions: 3
**And** the response status is 200
**And** the response body contains:
  - title: a string
  - questions: an array where each element has:
    - questionText: a string
    - questionType: one of "multiple_choice", "short_answer", "true_false"
    - options: a string array (for multiple_choice) or omitted
    - correctAnswer: a string
    - explanation: a string
    - targetSkill: a string describing the assessed skill

---

### 76. SPED teacher can generate an exit ticket

**Given** a SPED teacher "Ms. Rodriguez" is signed in with role "sped_teacher"

**When** she sends POST /api/exit-tickets/generate with body:
  - topic: "Reading Comprehension"
  - gradeLevel: "6"
  - subject: "ELA"

**Then** the response status is 200
**And** the response body contains a title and questions array

---

### 77. Exit ticket generation clamps numberOfQuestions between 3 and 5

**Given** a teacher "Ms. Rivera" is signed in with role "teacher"

**When** she sends POST /api/exit-tickets/generate with body:
  - topic: "Fractions"
  - gradeLevel: "4"
  - subject: "Math"
  - numberOfQuestions: 10

**Then** the AI service is called with numberOfQuestions: 5 (clamped to maximum)

---

### 78. Exit ticket generation clamps minimum numberOfQuestions to 3

**Given** a teacher "Ms. Rivera" is signed in with role "teacher"

**When** she sends POST /api/exit-tickets/generate with body:
  - topic: "Fractions"
  - gradeLevel: "4"
  - subject: "Math"
  - numberOfQuestions: 1

**Then** the AI service is called with numberOfQuestions: 3 (clamped to minimum)

---

### 79. Exit ticket generation defaults numberOfQuestions to 3 when not provided

**Given** a teacher "Ms. Rivera" is signed in with role "teacher"

**When** she sends POST /api/exit-tickets/generate with body:
  - topic: "Fractions"
  - gradeLevel: "4"
  - subject: "Math"
  - (numberOfQuestions omitted)

**Then** the AI service is called with numberOfQuestions: 3

---

### 80. Exit ticket generation accepts optional lessonContext

**Given** a teacher "Ms. Rivera" is signed in with role "teacher"

**When** she sends POST /api/exit-tickets/generate with body:
  - topic: "The water cycle"
  - gradeLevel: "6"
  - subject: "Science"
  - lessonContext: "Students explored evaporation and condensation through a lab experiment today."

**Then** the AI service is called with lessonContext: "Students explored evaporation and condensation through a lab experiment today."

---

## AI Exit Ticket Generation Contract

### 81. AI exit ticket generation returns structured output via tool_use

**Given** a valid exit ticket generation input with topic, gradeLevel, and subject

**When** the generateExitTicket AI service is called

**Then** it sends a request to the Claude API with:
  - model: the configured AI_MODEL constant
  - max_tokens: 4096
  - a system prompt describing an expert K-12 teacher creating formative exit tickets
  - a tool named "exit_ticket" with forced tool_choice
  - a user message containing topic, subject, gradeLevel, numberOfQuestions, and optional lessonContext

**And** the response is parsed from the tool_use content block
**And** the returned object conforms to the GeneratedExitTicket interface:
  - title: string
  - questions: array of objects, each with:
    - questionText: string
    - questionType: "multiple_choice" | "short_answer" | "true_false"
    - options: string[] (for multiple_choice, omitted for others)
    - correctAnswer: string
    - explanation: string
    - targetSkill: string

---

## Cross-Cutting: Data Persistence

### 82. Generated rubric is persisted with criteria in separate table

**Given** a teacher generates a rubric via POST /api/rubrics/generate

**When** the AI returns a rubric with 4 criteria

**Then** one row is inserted into the rubrics table with the teacher's ID
**And** 4 rows are inserted into the rubric_criteria table, each with rubricId matching the new rubric
**And** each criterion's descriptors are stored as a JSON string in the descriptors column
**And** the rubric's levels are stored as a JSON string in the levels column

---

### 83. Generated quiz is persisted with questions in separate table

**Given** a teacher generates a quiz via POST /api/quizzes/generate

**When** the AI returns a quiz with 10 questions

**Then** one row is inserted into the quizzes table with the teacher's ID in createdBy
**And** 10 rows are inserted into the quiz_questions table, each with quizId matching the new quiz
**And** each question's orderIndex corresponds to its position (0-indexed)
**And** multiple_choice question options are stored as a JSON string in the options column

---

### 84. Generated lesson plan is persisted with AI metadata

**Given** a teacher generates a lesson plan via POST /api/lesson-plans/generate

**When** the AI returns a complete lesson plan

**Then** one row is inserted into the lesson_plans table with the teacher's ID
**And** the aiMetadata column contains a JSON string with:
  - generatedAt: an ISO timestamp
  - model: "claude-opus-4-6"
  - input: the original generation parameters (subject, gradeLevel, topic, duration, instructionalModel)

---

### 85. Exit tickets are not persisted to the database

**Given** a teacher generates an exit ticket via POST /api/exit-tickets/generate

**When** the AI returns exit ticket questions

**Then** the response is returned directly from the AI service
**And** no rows are inserted into any database table
**And** the exit ticket exists only in the API response (ephemeral)
