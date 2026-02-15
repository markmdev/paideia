# AI Service Contracts

This document specifies every AI-powered feature in Paideia. Each contract defines the function signature, system prompt intent, tool schema, behavioral expectations, and a representative example. Any reimplementation that satisfies these contracts will produce a functionally equivalent system.

---

## Table of Contents

1. [AI Integration Pattern](#ai-integration-pattern)
2. [generateRubric](#1-generaterubric)
3. [generateLessonPlan](#2-generatelessonplan)
4. [generateSmartAssignment](#3-generatesmartassignment)
5. [generateQuiz](#4-generatequiz)
6. [generateExitTicket](#5-generateexitticket)
7. [differentiateContent](#6-differentiatecontent)
8. [assessmentDrivenDifferentiation](#7-assessmentdrivendifferentiation)
9. [gradeSubmission](#8-gradesubmission)
10. [batchGradeSubmissions](#9-batchgradesubmissions)
11. [generatePresentLevels (IEP)](#10-generatepresentlevels)
12. [generateIEPGoals (IEP)](#11-generateiepgoals)
13. [generateAccommodations (IEP)](#12-generateaccommodations)
14. [generateProgressNarrative (IEP)](#13-generateprogressnarrative-iep)
15. [generateParentProgressNarrative](#14-generateparentprogressnarrative)
16. [generateWeeklyDigest](#15-generateweeklydigest)
17. [translateCommunication](#16-translatecommunication)
18. [streamTutorResponse](#17-streamtutorresponse)
19. [generateDistrictInsights](#18-generatedistrictinsights)
20. [generateReportCardNarrative](#19-generatereportcardnarrative)
21. [generateStudentInterventions (Early Warning)](#20-generatestudentinterventions)
22. [generateReteachActivities (Mastery Gaps)](#21-generatereteachactivities)

---

## AI Integration Pattern

### Client Configuration

The application uses a singleton Anthropic client, instantiated once and reused across all requests. In development mode, the instance is stored on `globalThis` to survive hot-module reloading.

```
Client: Anthropic SDK (@anthropic-ai/sdk)
Model constant: AI_MODEL = "claude-opus-4-6" (configurable)
API key: read from ANTHROPIC_API_KEY environment variable
```

### Structured Output via tool_use

All services except the tutor use the **forced tool_use** pattern for structured output:

1. Define a tool with a JSON Schema `input_schema` that describes the desired output shape.
2. Set `tool_choice: { type: "tool", name: "<tool_name>" }` to force the model to call that tool.
3. Extract the structured data from the `tool_use` content block: `response.content.find(block => block.type === "tool_use").input`.
4. If no `tool_use` block is found, throw an error.

This pattern guarantees the AI returns data conforming to the schema, making the output parseable without free-text extraction.

### Streaming (Tutor Only)

The Socratic tutor is the only service that uses streaming. It calls `anthropic.messages.stream()` and returns a `ReadableStream<Uint8Array>` of text chunks. The stream is piped to the HTTP response with `Content-Type: text/plain; charset=utf-8`.

### Prompt Caching (Batch Grading Only)

Batch grading uses Anthropic prompt caching. The system message is split into two content blocks: the first contains the grading instructions, the second (marked with `cache_control: { type: "ephemeral" }`) contains the rubric and assignment data. This allows the rubric/assignment context to be cached across sequential grading calls for multiple submissions.

### Audit Metadata (IEP Services Only)

All four IEP services attach audit metadata to their return values:

```
audit: {
  modelVersion: string   // The AI_MODEL constant value
  generatedAt: string    // ISO 8601 timestamp of generation
}
```

### PII Minimization

Two services apply PII reduction before sending data to the AI:
- **Report card generation**: sends only the student's first name, not full name.
- **Early warning interventions**: anonymizes students as "Student A", "Student B", etc., then maps recommendations back to real students after the AI responds.

---

## 1. generateRubric

**Purpose**: Generate a standards-aligned assessment rubric from assignment details.

### Function Signature

```
generateRubric(input: RubricInput) -> GeneratedRubric
```

**Input**:
| Field | Type | Required | Description |
|-------|------|----------|-------------|
| title | string | yes | Assignment title |
| subject | string | yes | Academic subject |
| gradeLevel | string | yes | Grade level (e.g., "8th Grade") |
| assignmentDescription | string | yes | What the assignment asks students to do |
| standards | string[] | no | Academic standard codes to align to |
| levels | string[] | no | Proficiency level names (default: ["Beginning", "Developing", "Proficient", "Advanced"]) |

**Output** (`GeneratedRubric`):
| Field | Type | Description |
|-------|------|-------------|
| title | string | Descriptive rubric title |
| description | string | Summary of what the rubric assesses |
| type | "analytical" \| "holistic" | Rubric format |
| levels | string[] | Proficiency levels, lowest to highest |
| criteria | CriterionObject[] | 3-6 criteria (see below) |
| successCriteria | string[] | Student-facing "I can" statements |

**CriterionObject**:
| Field | Type | Required | Description |
|-------|------|----------|-------------|
| name | string | yes | Criterion name (e.g., "Thesis Statement") |
| description | string | yes | What this criterion measures |
| weight | number | yes | Decimal weight; all weights sum to 1.0 |
| standardCode | string | no | Aligned standard code |
| descriptors | Record<string, string> | yes | Map from level name to performance descriptor |

### API Configuration

| Setting | Value |
|---------|-------|
| Method | `messages.create()` |
| max_tokens | 4096 |
| Tool name | `create_rubric` |
| tool_choice | forced |

### System Prompt (summarized)

Role: Expert K-12 curriculum designer and assessment specialist. Creates standards-aligned rubrics with clear, measurable, pedagogically sound criteria. Descriptors are specific, observable, and progression-based across proficiency levels. Success criteria are written as student-facing "I can" statements grounded in learning objectives.

### Behavior

- Generates 3-6 criteria with weights summing to 1.0.
- Each criterion has a descriptor for every proficiency level.
- Descriptors are specific and observable, distinguishing clearly between adjacent levels.
- Success criteria use "I can..." phrasing.
- When standards are provided, criteria align to them and `standardCode` is populated.
- Default levels are Beginning, Developing, Proficient, Advanced; overridable via input.

### Example

**Input**:
```json
{
  "title": "Persuasive Essay on Climate Change",
  "subject": "ELA",
  "gradeLevel": "8th Grade",
  "assignmentDescription": "Write a 5-paragraph persuasive essay arguing for a specific climate action policy",
  "standards": ["CCSS.ELA-LITERACY.W.8.1"]
}
```

**Output** (representative):
```json
{
  "title": "Persuasive Essay Rubric: Climate Change Policy",
  "description": "Assesses students' ability to construct a persuasive argument with clear claims, relevant evidence, and effective rhetorical techniques.",
  "type": "analytical",
  "levels": ["Beginning", "Developing", "Proficient", "Advanced"],
  "criteria": [
    {
      "name": "Thesis Statement & Claim",
      "description": "Clarity and strength of the central argument",
      "weight": 0.25,
      "standardCode": "CCSS.ELA-LITERACY.W.8.1",
      "descriptors": {
        "Beginning": "No clear thesis or claim is present.",
        "Developing": "A thesis is present but vague or not arguable.",
        "Proficient": "A clear, arguable thesis takes a specific position on a climate policy.",
        "Advanced": "A compelling, nuanced thesis takes a specific position and acknowledges complexity."
      }
    }
  ],
  "successCriteria": [
    "I can write a clear thesis statement that takes a specific position on a climate policy.",
    "I can support my argument with relevant evidence from credible sources."
  ]
}
```

---

## 2. generateLessonPlan

**Purpose**: Generate a standards-aligned lesson plan with all instructional components.

### Function Signature

```
generateLessonPlan(input: LessonPlanInput) -> GeneratedLessonPlan
```

**Input**:
| Field | Type | Required | Description |
|-------|------|----------|-------------|
| subject | string | yes | Academic subject |
| gradeLevel | string | yes | Grade level |
| topic | string | yes | Lesson topic |
| duration | string | no | Target duration (e.g., "45 minutes") |
| standards | string[] | no | Standards to align to |
| instructionalModel | string | no | One of: "direct", "inquiry", "project", "socratic", "workshop" |
| existingMasteryContext | string | no | Areas students have been struggling with |

**Output** (`GeneratedLessonPlan`):
| Field | Type | Description |
|-------|------|-------------|
| title | string | Engaging lesson title |
| objectives | string[] | Measurable objectives using Bloom's taxonomy verbs |
| standards | string[] | Academic standards addressed |
| warmUp | string | 5-10 minute warm-up activity |
| directInstruction | string | Explicit teaching: key concepts, modeling, think-alouds |
| guidedPractice | string | Structured practice with teacher support |
| independentPractice | string | Student-driven application |
| closure | string | 5-10 minute synthesis activity |
| materials | string[] | All materials and resources needed |
| differentiation | object | Three-tier differentiation (see below) |
| assessmentPlan | string | Formative assessment methods |
| estimatedDuration | string | Total estimated time |

**differentiation object**:
| Field | Type | Required | Description |
|-------|------|----------|-------------|
| belowGrade | string | yes | Scaffolds for below-grade students |
| onGrade | string | yes | Core instructional path |
| aboveGrade | string | yes | Extensions for above-grade students |

### API Configuration

| Setting | Value |
|---------|-------|
| Method | `messages.create()` |
| max_tokens | 4096 |
| Tool name | `create_lesson_plan` |
| tool_choice | forced |

### System Prompt (summarized)

Role: Expert K-12 instructional designer with deep knowledge of evidence-based pedagogy, standards alignment, and differentiated instruction. Creates structured lesson plans with clear learning objectives, engaging activities, and embedded formative assessment. Every lesson includes three-tier differentiation. When an instructional model is specified (inquiry, workshop, etc.), the lesson structure reflects that pedagogy.

### Behavior

- Objectives use measurable action verbs from Bloom's taxonomy.
- When `instructionalModel` is specified, the lesson structure adapts (e.g., inquiry lessons lead with a driving question, workshop includes mini-lesson + work time + share).
- When `existingMasteryContext` is provided, the lesson addresses those struggle areas.
- Differentiation is always present for below-grade, on-grade, and above-grade learners.
- The assessment plan includes specific formative checks embedded throughout.

### Example

**Input**:
```json
{
  "subject": "Mathematics",
  "gradeLevel": "5th Grade",
  "topic": "Adding Fractions with Unlike Denominators",
  "duration": "60 minutes",
  "standards": ["CCSS.MATH.CONTENT.5.NF.A.1"],
  "instructionalModel": "direct"
}
```

**Output** (representative):
```json
{
  "title": "Finding Common Ground: Adding Fractions with Unlike Denominators",
  "objectives": [
    "Students will be able to find a common denominator for two fractions with unlike denominators.",
    "Students will be able to add fractions with unlike denominators and simplify the result."
  ],
  "standards": ["CCSS.MATH.CONTENT.5.NF.A.1"],
  "warmUp": "Display two fraction bars: 1/3 and 1/4. Ask: Can we add these directly? Why or why not?",
  "directInstruction": "Model finding the LCD using fraction strips...",
  "guidedPractice": "Partner activity: solve 3 problems together using fraction tiles...",
  "independentPractice": "Complete a set of 6 problems independently...",
  "closure": "Exit ticket: solve 2/5 + 1/3 and explain your steps.",
  "materials": ["Fraction strips", "Whiteboards", "Exit ticket handout"],
  "differentiation": {
    "belowGrade": "Provide fraction strip manipulatives and a step-by-step checklist.",
    "onGrade": "Standard problems with optional hint cards available.",
    "aboveGrade": "Include mixed number addition and a word problem requiring fraction addition."
  },
  "assessmentPlan": "Monitor guided practice with circulating check-ins. Exit ticket assesses independent mastery.",
  "estimatedDuration": "60 minutes"
}
```

---

## 3. generateSmartAssignment

**Purpose**: Generate a complete assignment package: the assignment itself, a matching rubric, success criteria, and three differentiated versions.

### Function Signature

```
generateSmartAssignment(input: SmartAssignmentInput) -> GeneratedSmartAssignment
```

**Input**:
| Field | Type | Required | Description |
|-------|------|----------|-------------|
| objective | string | yes | Learning objective |
| subject | string | yes | Academic subject |
| gradeLevel | string | yes | Grade level |
| type | string | yes | One of: "essay", "short_answer", "project", "lab_report" |
| standards | string[] | no | Standards to align to |
| additionalContext | string | no | Extra context for the assignment |

**Output** (`GeneratedSmartAssignment`):
| Field | Type | Description |
|-------|------|-------------|
| assignment | object | `{ title, description, instructions }` |
| rubric | GeneratedRubric | Full rubric (same schema as generateRubric output) |
| successCriteria | string[] | Top-level "I can" statements |
| differentiatedVersions | object | Three versions (see below) |

**assignment object**:
| Field | Type | Required |
|-------|------|----------|
| title | string | yes |
| description | string | yes |
| instructions | string | yes |

**differentiatedVersions** - each tier has:
| Field | Type | Required | Description |
|-------|------|----------|-------------|
| title | string | yes | Version title |
| content | string | yes | Modified assignment content |
| scaffolds | string[] | yes | Scaffolds (below/on) or extensions (above) |

Tiers: `belowGrade`, `onGrade`, `aboveGrade`.

### API Configuration

| Setting | Value |
|---------|-------|
| Method | `messages.create()` |
| max_tokens | 8192 |
| Tool name | `create_smart_assignment` |
| tool_choice | forced |

### System Prompt (summarized)

Role: Expert K-12 curriculum designer specializing in standards-aligned assignment creation. Combines assignment, rubric, success criteria, and three differentiated versions into a single cohesive package. All components align to the same learning objectives. Differentiated versions maintain the same core goal while varying complexity, scaffolding, and entry points. The rubric uses 4 proficiency levels (Beginning, Developing, Proficient, Advanced) with 3-6 weighted criteria.

### Behavior

- The rubric embedded in the output uses the same schema as `GeneratedRubric`.
- All four components (assignment, rubric, criteria, differentiation) target the same learning objective.
- The below-grade version has heavy scaffolds (graphic organizers, sentence starters, word banks).
- The on-grade version has optional light supports.
- The above-grade version has extensions and increased complexity.
- Instructions are written in student-friendly language.

---

## 4. generateQuiz

**Purpose**: Generate a quiz with standards-aligned questions tagged by Bloom's taxonomy level.

### Function Signature

```
generateQuiz(input: QuizInput) -> GeneratedQuiz
```

**Input**:
| Field | Type | Required | Default | Description |
|-------|------|----------|---------|-------------|
| subject | string | yes | | Academic subject |
| gradeLevel | string | yes | | Grade level |
| topic | string | yes | | Quiz topic |
| numQuestions | number | no | 10 | Number of questions |
| questionTypes | string[] | no | ["multiple_choice", "short_answer"] | Allowed types |
| standards | string[] | no | | Standards to align to |
| difficultyLevel | string | no | | Target difficulty |

**Output** (`GeneratedQuiz`):
| Field | Type | Description |
|-------|------|-------------|
| title | string | Quiz title |
| questions | QuestionObject[] | Array of questions |

**QuestionObject**:
| Field | Type | Required | Description |
|-------|------|----------|-------------|
| type | string | yes | "multiple_choice", "short_answer", or "essay" |
| questionText | string | yes | The question prompt |
| options | string[] | no | Answer choices (multiple choice only, typically 4) |
| correctAnswer | string | yes | Correct answer text or key points for essay |
| explanation | string | yes | Why the answer is correct |
| bloomsLevel | string | yes | One of: "remember", "understand", "apply", "analyze", "evaluate", "create" |
| standardCode | string | no | Aligned standard code |
| points | number | yes | Point value |

### API Configuration

| Setting | Value |
|---------|-------|
| Method | `messages.create()` |
| max_tokens | 4096 |
| Tool name | `create_quiz` |
| tool_choice | forced |

### System Prompt (summarized)

Role: Expert K-12 assessment designer. Creates questions that assess genuine understanding across all Bloom's taxonomy levels. Multiple-choice distractors are plausible, based on common student misconceptions, not obviously wrong. Questions are distributed across Bloom's levels for balanced assessment, mixing lower-order (remember, understand) and higher-order (apply, analyze, evaluate, create) items.

### Behavior

- Generates exactly `numQuestions` questions (default 10).
- Questions span multiple Bloom's taxonomy levels.
- Multiple-choice questions have 4 options with plausible distractors.
- Every question has an explanation suitable for student review.
- Point values scale by question type: multiple choice 1-2, short answer 2-5, essay 5-10.
- When `difficultyLevel` is specified, vocabulary and reasoning depth adjust accordingly.

---

## 5. generateExitTicket

**Purpose**: Generate a formative exit ticket for quick end-of-lesson assessment.

### Function Signature

```
generateExitTicket(input: ExitTicketInput) -> GeneratedExitTicket
```

**Input**:
| Field | Type | Required | Default | Description |
|-------|------|----------|---------|-------------|
| topic | string | yes | | Lesson topic |
| gradeLevel | string | yes | | Grade level |
| subject | string | yes | | Academic subject |
| numberOfQuestions | number | no | 3 | Number of questions |
| lessonContext | string | no | | Additional lesson context |

**Output** (`GeneratedExitTicket`):
| Field | Type | Description |
|-------|------|-------------|
| title | string | Exit ticket title |
| questions | ExitTicketQuestion[] | Array of questions |

**ExitTicketQuestion**:
| Field | Type | Required | Description |
|-------|------|----------|-------------|
| questionText | string | yes | The question prompt |
| questionType | string | yes | "multiple_choice", "short_answer", or "true_false" |
| options | string[] | no | Choices for multiple choice |
| correctAnswer | string | yes | Correct answer |
| explanation | string | yes | Why it is correct |
| targetSkill | string | yes | Specific skill assessed (e.g., "Identifying main idea") |

### API Configuration

| Setting | Value |
|---------|-------|
| Method | `messages.create()` |
| max_tokens | 4096 |
| Tool name | `exit_ticket` |
| tool_choice | forced |

### System Prompt (summarized)

Role: Expert K-12 teacher creating formative exit tickets. Questions are quick and focused, assessing key concepts. Total completion time: 2-5 minutes for all questions. Each question targets a specific skill.

### Behavior

- Generates a small number of questions (default 3) designed for under 1 minute each.
- Uses a mix of question types appropriate for the grade level.
- Each question explicitly names the skill it targets via `targetSkill`.
- Questions assess the key concepts of the lesson, not peripheral details.

---

## 6. differentiateContent

**Purpose**: Transform a single piece of instructional content into three differentiated tiers.

### Function Signature

```
differentiateContent(input: DifferentiateInput) -> DifferentiatedContent
```

**Input**:
| Field | Type | Required | Description |
|-------|------|----------|-------------|
| content | string | yes | The original content to differentiate |
| gradeLevel | string | yes | Grade level |
| subject | string | yes | Academic subject |
| contentType | string | yes | "reading_passage", "activity", or "assessment" |

**Output** (`DifferentiatedContent`):

| Tier | Fields |
|------|--------|
| belowGrade | `content` (string), `scaffolds` (string[]), `lexileAdjustment` (string) |
| onGrade | `content` (string), `scaffolds` (string[]) |
| aboveGrade | `content` (string), `extensions` (string[]) |

### API Configuration

| Setting | Value |
|---------|-------|
| Method | `messages.create()` |
| max_tokens | 4096 |
| Tool name | `differentiate_content` |
| tool_choice | forced |

### System Prompt (summarized)

Role: Expert K-12 differentiation specialist. Transforms content into three tiers maintaining the same core learning objective. Below-grade: simplified vocabulary, shorter sentences, scaffolds (graphic organizers, sentence starters, word banks), with Lexile adjustment noted. On-grade: content as intended with optional scaffolds. Above-grade: increased complexity, richer vocabulary, deeper analysis, enrichment challenges.

### Behavior

- All three tiers preserve essential concepts and learning goals.
- `lexileAdjustment` describes how reading level was changed (e.g., "Reduced from approximately 950L to 650L").
- Scaffolds are practical classroom tools (graphic organizers, word banks, sentence starters).
- Extensions include research tasks, cross-curricular connections, leadership roles.

---

## 7. assessmentDrivenDifferentiation

**Purpose**: Generate differentiated follow-up activities based on student performance data from a graded assignment.

### Function Signature

```
assessmentDrivenDifferentiation(input: AssessmentDifferentiationInput) -> AssessmentDifferentiationResult
```

**Input**:
| Field | Type | Required | Description |
|-------|------|----------|-------------|
| assignmentTitle | string | yes | Title of the graded assignment |
| subject | string | yes | Academic subject |
| gradeLevel | string | yes | Grade level |
| instructions | string \| null | yes | Original assignment instructions |
| belowGrade | object | yes | `{ count: number, avgScore: number }` |
| onGrade | object | yes | `{ count: number, avgScore: number }` |
| aboveGrade | object | yes | `{ count: number, avgScore: number }` |

Tier thresholds (applied by the route handler): below grade < 60%, on grade 60-84%, above grade 85%+.

**Output** (`AssessmentDifferentiationResult`):

Each tier (`below_grade`, `on_grade`, `above_grade`) is a `TierActivity`:

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| title | string | yes | Activity title |
| description | string | yes | What the activity addresses |
| instructions | string | yes | Step-by-step student instructions |
| scaffolds | string[] | below_grade only | Scaffolds for struggling students |
| extensions | string[] | above_grade only | Extension challenges |

### API Configuration

| Setting | Value |
|---------|-------|
| Method | `messages.create()` |
| max_tokens | 4096 |
| Tool name | `differentiated_activities` |
| tool_choice | forced |

### System Prompt (summarized)

Role: Expert K-12 instructional designer. Based on student performance data from a graded assignment, generates differentiated follow-up activities for three tiers. All activities target the same learning objective at different complexity levels. Below-grade includes scaffolds; above-grade includes extensions; on-grade reinforces core concepts.

### Behavior

- Activities are follow-ups to a specific graded assignment, informed by actual score distributions.
- Below-grade activity provides foundational skill practice with scaffolding.
- On-grade activity deepens understanding at the appropriate level.
- Above-grade activity challenges with higher-order thinking and extensions.
- Student counts and average scores inform the AI's approach.

---

## 8. gradeSubmission

**Purpose**: Grade a single student submission against a rubric, producing per-criterion scores, feedback, and next steps.

### Function Signature

```
gradeSubmission(input: GradeSubmissionInput) -> GradingResult
```

**Input**:
| Field | Type | Required | Description |
|-------|------|----------|-------------|
| studentWork | string | yes | The student's submission text |
| rubric | object | yes | Rubric data (see below) |
| assignment | object | yes | Assignment data (see below) |
| feedbackTone | string | no | "encouraging" (default), "direct", "socratic", or "growth_mindset" |
| teacherGuidance | string | no | Additional teacher instructions for grading |

**rubric object**:
| Field | Type | Description |
|-------|------|-------------|
| title | string | Rubric title |
| levels | string[] | Proficiency levels |
| criteria | object[] | Array of `{ id, name, description, weight, descriptors }` |

**assignment object**:
| Field | Type | Required | Description |
|-------|------|----------|-------------|
| title | string | yes | Assignment title |
| description | string | yes | Assignment description |
| instructions | string | no | Assignment instructions |
| subject | string | yes | Subject |
| gradeLevel | string | yes | Grade level |
| standards | string[] | no | Aligned standards |

**Output** (`GradingResult`):
| Field | Type | Required | Description |
|-------|------|----------|-------------|
| criterionScores | object[] | yes | Per-criterion scores (see below) |
| totalScore | number | yes | Sum of all criterion scores |
| maxScore | number | yes | Sum of all max scores (should be 100) |
| letterGrade | string | yes | One of: A+, A, A-, B+, B, B-, C+, C, C-, D+, D, D-, F |
| overallFeedback | string | yes | 2-4 sentence overall assessment |
| strengths | string[] | yes | 2-4 specific strengths citing evidence |
| improvements | string[] | yes | 2-4 actionable improvement areas |
| nextSteps | string[] | yes | 2-3 concrete next steps |
| misconceptions | string[] | no | 0-3 detected misconceptions |

**criterionScore object**:
| Field | Type | Description |
|-------|------|-------------|
| criterionId | string | ID of the rubric criterion |
| criterionName | string | Name of the criterion |
| level | string | Proficiency level achieved |
| score | number | Numeric score (0 to maxScore) |
| maxScore | number | Maximum possible = weight * 100 |
| justification | string | Evidence-based justification from student work |

### API Configuration

| Setting | Value |
|---------|-------|
| Method | `messages.create()` |
| max_tokens | 4096 |
| Tool name | `grade_student_work` |
| tool_choice | forced |

### System Prompt (summarized)

Role: Expert K-12 teacher grading student work. Evaluates each submission criterion by criterion against the rubric. Feedback is specific, referencing the student's actual words and ideas. Identifies patterns suggesting common misconceptions.

**Scoring formula**: For each criterion with N levels (0-indexed), a score at level L is: `(L / (N-1)) * (weight * 100)`.

**Letter grade scale**: A (90-100%), B (80-89%), C (70-79%), D (60-69%), F (below 60%).

**Feedback tone options**:
- **encouraging**: Warm, lead with positives, frame improvements as opportunities. Uses "You're on the right track," "Great effort on."
- **direct**: Clear, factual, no sugar-coating. Uses "This essay demonstrates," "This section lacks."
- **socratic**: Prompts reflection with guiding questions. Uses "What do you think would happen if," "How might you strengthen."
- **growth_mindset**: Emphasizes effort, strategy, learning from mistakes. Uses "Your effort shows in," "You haven't mastered this yet, but."

### Behavior

- Every rubric criterion must be scored; the `criterionScores` array must have one entry per criterion.
- Justifications cite specific evidence from the student's work, not generic observations.
- The total score equals the sum of individual criterion scores.
- Letter grade is derived from the percentage (totalScore / maxScore * 100).
- When `teacherGuidance` is provided, it is appended to the system prompt and influences grading.

### Data Persistence

After AI grading, the route handler:
1. Stores a `feedbackDrafts` record with `status: "draft"` (teacher must review before finalization).
2. Stores individual `criterionScores` rows for each criterion.
3. Updates the `submissions` row with `status: "graded"`, `totalScore`, `maxScore`, `letterGrade`, and `gradedAt`.

### Example

**Input**:
```json
{
  "studentWork": "Climate change is a big problem because it makes the earth warmer...",
  "rubric": {
    "title": "Persuasive Essay Rubric",
    "levels": ["Beginning", "Developing", "Proficient", "Advanced"],
    "criteria": [
      {
        "id": "c1",
        "name": "Thesis Statement",
        "description": "Clarity and strength of the central argument",
        "weight": 0.3,
        "descriptors": { "Beginning": "...", "Developing": "...", "Proficient": "...", "Advanced": "..." }
      }
    ]
  },
  "assignment": {
    "title": "Persuasive Essay on Climate Change",
    "description": "Write a persuasive essay...",
    "subject": "ELA",
    "gradeLevel": "8th Grade"
  },
  "feedbackTone": "encouraging"
}
```

**Output** (representative):
```json
{
  "criterionScores": [
    {
      "criterionId": "c1",
      "criterionName": "Thesis Statement",
      "level": "Developing",
      "score": 10,
      "maxScore": 30,
      "justification": "The student states 'climate change is a big problem' but does not take a specific position on a policy action."
    }
  ],
  "totalScore": 10,
  "maxScore": 30,
  "letterGrade": "D",
  "overallFeedback": "You're clearly passionate about climate change, and that energy is a great starting point...",
  "strengths": ["Shows genuine interest in the topic with specific details about temperature changes"],
  "improvements": ["Develop a specific, arguable thesis that names a policy action"],
  "nextSteps": ["Practice writing thesis statements using the formula: [Topic] should [action] because [reason]"],
  "misconceptions": []
}
```

---

## 9. batchGradeSubmissions

**Purpose**: Grade multiple submissions for the same assignment sequentially, using prompt caching for efficiency.

### Function Signature

```
batchGradeSubmissions(
  submissions: BatchSubmission[],
  rubric: GradeSubmissionInput["rubric"],
  assignment: GradeSubmissionInput["assignment"],
  options?: { feedbackTone?: string, teacherGuidance?: string }
) -> BatchGradingResult[]
```

**BatchSubmission**: `{ id: string, studentWork: string }`

**BatchGradingResult**: `{ submissionId: string, result: GradingResult }`

### API Configuration

| Setting | Value |
|---------|-------|
| Method | `messages.create()` (called sequentially per submission) |
| max_tokens | 4096 |
| Tool name | `grade_student_work` |
| tool_choice | forced |
| Prompt caching | System message uses `cache_control: { type: "ephemeral" }` on the rubric/assignment block |

### Behavior

- Iterates over submissions sequentially (not in parallel).
- Uses the same system prompt, rubric, and tool definition for all submissions.
- The rubric and assignment data block is marked for prompt caching, so the second and subsequent calls benefit from cached context.
- Each submission produces a full `GradingResult` identical in schema to single grading.
- If any submission fails, the error includes the submission ID.

### Data Persistence

The batch route handler:
1. Fetches all submissions with `status: "submitted"` for the given assignment.
2. Sets all to `status: "grading"` before starting.
3. After each successful grade, persists via `persistGradingResult` with `{ batchGraded: true }` in metadata.
4. On failure for a submission, reverts that submission to `status: "submitted"`.
5. Returns `{ total, graded, failed }` counts.

---

## 10. generatePresentLevels

**Purpose**: Draft the Present Levels of Academic Achievement and Functional Performance (PLAAFP) section of an IEP.

### Function Signature

```
generatePresentLevels(input: PresentLevelsInput) -> GeneratedPresentLevels & { audit: AuditMeta }
```

**Input**:
| Field | Type | Required | Description |
|-------|------|----------|-------------|
| studentName | string | yes | Student's full name |
| gradeLevel | string | yes | Grade level |
| disabilityCategory | string | yes | Disability classification |
| assessmentData | object[] | no | Array of `{ standard, level, score }` |
| priorIEP | object | no | `{ presentLevels: string, goals: string[] }` |
| teacherObservations | string | no | Free-text teacher observations |
| classroomPerformance | string | no | Free-text classroom performance notes |

**Output** (`GeneratedPresentLevels`):
| Field | Type | Description |
|-------|------|-------------|
| academicPerformance | string | Narrative of current academic performance |
| functionalPerformance | string | Narrative of functional performance (social-emotional, communication, etc.) |
| strengths | string[] | 3-6 data-supported strengths |
| areasOfNeed | string[] | 3-6 areas requiring support |
| impactOfDisability | string | How the disability impacts access to general curriculum |
| baselineData | object[] | Array of `{ area, baseline, source }` |
| draftNotice | string | Always "DRAFT -- Requires IEP Team Review" |
| audit | AuditMeta | `{ modelVersion, generatedAt }` |

### API Configuration

| Setting | Value |
|---------|-------|
| Method | `messages.create()` |
| max_tokens | 4096 |
| Tool name | `draft_present_levels` |
| tool_choice | forced |

### System Prompt (summarized)

Role: Expert special education specialist writing legally compliant IEP Present Levels (PLAAFP). Uses strengths-based language, grounding every statement in specific data and observations. Identifies academic and functional performance areas, articulates disability impact on general curriculum access, and provides measurable baseline data for goal development. All output is a draft requiring IEP team review.

### Behavior

- The `draftNotice` field is always overwritten to "DRAFT -- Requires IEP Team Review" after AI generation (hardcoded enforcement).
- Every claim in the narratives is grounded in the provided data.
- Language is strengths-based (leads with what the student can do).
- Baseline data provides measurable starting points for goal writing.
- Audit metadata is appended with model version and timestamp.

---

## 11. generateIEPGoals

**Purpose**: Draft individualized SMART IEP goals with similarity detection against existing caseload goals.

### Function Signature

```
generateIEPGoals(input: IEPGoalInput) -> { goals: GeneratedIEPGoal[], audit: AuditMeta }
```

**Input**:
| Field | Type | Required | Description |
|-------|------|----------|-------------|
| presentLevels | GeneratedPresentLevels | yes | Output from generatePresentLevels |
| gradeLevel | string | yes | Grade level |
| subject | string | yes | Academic subject |
| disabilityCategory | string | yes | Disability classification |
| priorGoals | object[] | no | Array of `{ goalText, status, progress? }` |
| existingCaseloadGoals | string[] | no | Other goals on the caseload for similarity detection |

**Output** (`GeneratedIEPGoal`):
| Field | Type | Required | Description |
|-------|------|----------|-------------|
| area | string | yes | Academic or functional area (e.g., "Reading Fluency") |
| goalText | string | yes | Full SMART goal statement |
| baseline | string | yes | Current measurable performance |
| target | string | yes | Specific measurable target |
| measureMethod | string | yes | How progress is measured |
| frequency | string | yes | Monitoring frequency |
| timeline | string | yes | When the goal should be met |
| similarityFlag | boolean | yes | True if >80% similar to an existing caseload goal |
| similarityNote | string | no | Explanation of similarity, if flagged |

### API Configuration

| Setting | Value |
|---------|-------|
| Method | `messages.create()` |
| max_tokens | 4096 |
| Tool name | `draft_iep_goals` |
| tool_choice | forced |

### System Prompt (summarized)

Role: Expert special education specialist writing SMART IEP goals (Specific, Measurable, Achievable, Relevant, Time-bound). Goals are individualized to present levels, include clear baseline, measurable target, assessment method, monitoring frequency, and timeline. Detects when a goal is >80% similar in wording or substance to existing caseload goals and flags it. Goals must be legally defensible under IDEA.

### Behavior

- Generates 2-4 goals derived from the present levels data.
- Each goal has a baseline taken from the present levels' baseline data.
- Similarity detection compares each goal against `existingCaseloadGoals` and flags matches.
- When `priorGoals` are provided, the AI considers prior progress to inform new targets.

---

## 12. generateAccommodations

**Purpose**: Recommend categorized accommodations for a student with a disability.

### Function Signature

```
generateAccommodations(input: AccommodationsInput) -> GeneratedAccommodations & { audit: AuditMeta }
```

**Input**:
| Field | Type | Required | Description |
|-------|------|----------|-------------|
| disabilityCategory | string | yes | Disability classification |
| areasOfNeed | string[] | yes | Specific areas requiring support |
| gradeLevel | string | yes | Grade level |
| currentAccommodations | string[] | no | Currently in place |

**Output** - four categories, each an array of `{ accommodation: string, rationale: string }`:
| Category | Description |
|----------|-------------|
| instructional | How instruction is delivered |
| assessment | How student demonstrates learning |
| environmental | Physical/sensory learning environment |
| behavioral | Behavioral support and self-regulation |

Plus `audit: AuditMeta`.

### API Configuration

| Setting | Value |
|---------|-------|
| Method | `messages.create()` |
| max_tokens | 4096 |
| Tool name | `recommend_accommodations` |
| tool_choice | forced |

### System Prompt (summarized)

Role: Expert special education specialist recommending evidence-based accommodations. Organizes by four categories: instructional, assessment, environmental, behavioral. Distinguishes accommodations (changes in access without altering expectations) from modifications (changes that alter expectations). Every recommendation includes a rationale tied to the student's specific needs. Recommendations are practical and implementable in a general education classroom.

### Behavior

- Generates 2-4 accommodations per category.
- Each accommodation has a rationale connecting it to the student's areas of need.
- When `currentAccommodations` are provided, the AI avoids duplicating them and may suggest complementary additions.

---

## 13. generateProgressNarrative (IEP)

**Purpose**: Draft a parent-friendly IEP progress narrative based on data points and trend analysis.

### Function Signature

```
generateProgressNarrative(input: ProgressNarrativeInput) -> GeneratedProgressNarrative & { audit: AuditMeta }
```

**Input**:
| Field | Type | Required | Description |
|-------|------|----------|-------------|
| goalText | string | yes | The IEP goal being tracked |
| dataPoints | object[] | yes | Array of `{ date, value, notes? }` |
| targetValue | number | yes | The goal's target value |
| unit | string | yes | Unit of measurement (e.g., "words per minute") |
| studentName | string | yes | Student name |

**Output** (`GeneratedProgressNarrative`):
| Field | Type | Description |
|-------|------|-------------|
| narrative | string | 3-5 sentence parent-friendly narrative |
| trend | string | "on_track", "at_risk", or "off_track" |
| currentLevel | number | Most recent data point value (computed, not AI-generated) |
| progressPercent | number | (currentLevel / targetValue) * 100 (computed, not AI-generated) |
| recommendation | string | Specific actionable next step |
| audit | AuditMeta | Model version and timestamp |

### API Configuration

| Setting | Value |
|---------|-------|
| Method | `messages.create()` |
| max_tokens | 2048 |
| Tool name | `draft_progress_narrative` |
| tool_choice | forced |

### System Prompt (summarized)

Role: Expert special education specialist writing IEP progress reports for parents. Narratives use clear, jargon-free language any parent can understand. Analyzes data trends relative to the aimline (linear path from first data point to target). Provides honest, specific, and encouraging updates with actionable recommendations.

### Behavior

- Data points are sorted chronologically before analysis.
- `currentLevel` and `progressPercent` are computed by the application, not the AI -- the AI's values are overwritten.
- The AI analyzes the trend (improving, stalling, declining) and classifies as on_track, at_risk, or off_track.
- Narrative is written in plain language suitable for parents.
- Recommendation is specific (e.g., "continue current approach" vs. "schedule IEP team meeting").

---

## 14. generateParentProgressNarrative

**Purpose**: Create a plain-language progress update for parents about their child's learning.

### Function Signature

```
generateParentProgressNarrative(input: ProgressNarrativeInput) -> GeneratedParentProgressNarrative
```

**Input** (note: this is a different `ProgressNarrativeInput` from the IEP version):
| Field | Type | Required | Description |
|-------|------|----------|-------------|
| studentName | string | yes | Student name |
| subject | string | yes | Academic subject |
| gradingPeriod | string | yes | Grading period (e.g., "Q2 2025") |
| recentScores | object[] | yes | Array of `{ assignment, score, maxScore, date }` |
| masteryData | object[] | yes | Array of `{ standard, standardDescription, level, score }` |

**Output** (`GeneratedParentProgressNarrative`):
| Field | Type | Description |
|-------|------|-------------|
| summary | string | 3-5 sentence plain-language summary |
| strengths | string[] | 2-4 observable strengths in plain language |
| areasToGrow | string[] | 1-3 growth opportunities (framed positively) |
| homeActivity | string | One specific 10-15 minute home activity |
| overallStatus | string | "good", "watch", or "concern" |

### API Configuration

| Setting | Value |
|---------|-------|
| Method | `messages.create()` |
| max_tokens | 2048 |
| Tool name | `create_progress_narrative` |
| tool_choice | forced |

### System Prompt (summarized)

Role: Warm, supportive K-12 educator writing progress updates for parents. Language is clear, specific, and jargon-free. Never uses standards codes -- always plain English descriptions. Speaks as if talking directly to a caring parent at a conference. Focuses on what the child is doing well, what they can improve, and one concrete home activity.

### Behavior

- No standards codes appear in the output.
- The home activity is practical, uses everyday materials, and takes 10-15 minutes.
- `overallStatus`: "good" if meeting/exceeding expectations, "watch" if some areas need attention, "concern" if falling behind in multiple areas.
- Growth areas are framed as opportunities, not deficits.

---

## 15. generateWeeklyDigest

**Purpose**: Create a structured weekly summary of student activities for parents.

### Function Signature

```
generateWeeklyDigest(input: WeeklyDigestInput) -> GeneratedWeeklyDigest
```

**Input**:
| Field | Type | Required | Description |
|-------|------|----------|-------------|
| studentName | string | yes | Student name |
| weekOf | string | yes | Week start date |
| activities | object[] | yes | Per-subject activity data (see below) |

**activities array element**:
| Field | Type | Required | Description |
|-------|------|----------|-------------|
| subject | string | yes | Subject name |
| assignments | object[] | yes | Array of `{ title, score?, maxScore?, status }` |
| masteryHighlights | string[] | no | Notable mastery achievements |

**Output** (`GeneratedWeeklyDigest`):
| Field | Type | Description |
|-------|------|-------------|
| greeting | string | Brief warm greeting mentioning student by name |
| highlights | string[] | 2-4 positive highlights from the week |
| concerns | string[] | 0-2 gentle concerns (empty if none) |
| upcomingWork | string[] | 1-3 upcoming assignments or topics |
| encouragement | string | Brief encouraging closing statement |

### API Configuration

| Setting | Value |
|---------|-------|
| Method | `messages.create()` |
| max_tokens | 2048 |
| Tool name | `create_weekly_digest` |
| tool_choice | forced |

### System Prompt (summarized)

Role: Warm, supportive K-12 educator writing weekly digests for parents. Conversational and encouraging tone. Plain language, no educational jargon or standards codes. Gives parents a quick, clear picture of the week.

### Behavior

- Greeting uses the student's name.
- Highlights celebrate specific accomplishments.
- Concerns are phrased gently and constructively.
- The `concerns` array may be empty if there are no issues.

---

## 16. translateCommunication

**Purpose**: Translate school communication text between languages with education-specific vocabulary awareness.

### Function Signature

```
translateCommunication(input: TranslationInput) -> TranslatedContent
```

**Input**:
| Field | Type | Required | Description |
|-------|------|----------|-------------|
| text | string | yes | Text to translate |
| targetLanguage | string | yes | Target language (e.g., "Spanish") |

**Output** (`TranslatedContent`):
| Field | Type | Description |
|-------|------|-------------|
| translatedText | string | Full translated text |
| targetLanguage | string | Language translated into |
| originalLanguage | string | Detected source language |

### API Configuration

| Setting | Value |
|---------|-------|
| Method | `messages.create()` |
| max_tokens | 4096 |
| Tool name | `translate_text` |
| tool_choice | forced |

### System Prompt (summarized)

Role: Expert multilingual translator specializing in K-12 education communication. Preserves warm, supportive tone appropriate for parent communication. Understands education-specific vocabulary and translates it naturally (e.g., "rubric" becomes a culturally appropriate equivalent). Grade levels are expressed in the target language's educational system conventions when relevant. Maintains original formatting, paragraph structure, and emphasis. Does not add or remove content.

### Behavior

- Detects the source language automatically.
- Preserves the original message's structure and tone.
- Education terminology is translated with cultural awareness.
- No content is added or removed during translation.

---

## 17. streamTutorResponse

**Purpose**: Stream a Socratic tutoring response to a student's question, guiding them toward understanding without giving direct answers.

### Function Signature

```
streamTutorResponse(input: TutorInput) -> ReadableStream<Uint8Array>
```

**Input**:
| Field | Type | Required | Description |
|-------|------|----------|-------------|
| message | string | yes | The student's current message |
| conversationHistory | object[] | yes | Prior messages as `{ role, content }` |
| subject | string | yes | Academic subject |
| gradeLevel | string | yes | Grade level |
| assignmentContext | object | no | `{ title, description, instructions? }` |

**Output**: A `ReadableStream<Uint8Array>` of text chunks (not structured JSON). The complete text is captured and stored in the tutor session.

### API Configuration

| Setting | Value |
|---------|-------|
| Method | `messages.stream()` |
| max_tokens | 1024 |
| temperature | 0.7 |
| Tool use | None (plain text streaming) |

### System Prompt (summarized)

Role: Warm, patient, knowledgeable Socratic tutor for K-12 students in the specified subject at the specified grade level.

**Core methodology -- Socratic teaching**:
1. Ask one guiding question at a time.
2. Break complex problems into smaller steps.
3. Build on what the student already knows.
4. Help students identify mistakes through reflection.
5. Celebrate effort and progress.

**Absolute rules (never broken)**:
- Never give a direct answer to academic questions.
- Never solve math problems, write essay paragraphs, or provide solutions.
- Never say "the answer is..." in any form.
- If student asks for the answer, respond with empathy and redirect.
- Detect pasted homework (formal, numbered, multi-part) and redirect to foundational concepts.

**Grade-level language adaptation**:
- K-2: Very simple words, short sentences, extra warm, everyday analogies.
- 3-5: Clear, accessible, moderate sentences, relatable examples.
- 6-8: Subject vocabulary with definitions, conversational but respectful.
- 9-12: Subject-specific terminology, treat student as capable young adult.

**Growth mindset framing**:
- Lead with encouragement.
- Reframe mistakes as learning.
- Use "yet" language.
- Praise specific strategies, not "being smart."

**Topic boundaries**:
- Stays within the specified subject.
- Redirects unrelated questions gently.
- For wellbeing concerns, directs student to a trusted adult.

**Conversation style**:
- Concise responses (2-4 sentences typically).
- One question at a time.
- Uses student's own words as building blocks.
- Reinforces correct answers by explaining WHY they are correct.

### Route Handler Flow

1. Student sends `POST /api/tutor` with `{ message, sessionId?, subject, topic?, assignmentContext? }`.
2. Only `student` role is authorized.
3. Grade level is determined from the student's class enrollment.
4. If no `sessionId`, a new `tutorSessions` record is created.
5. The user message is appended to the session's messages JSON.
6. `streamTutorResponse()` is called, returning a `ReadableStream`.
7. The stream is wrapped: as chunks arrive, they are forwarded to the HTTP response and accumulated.
8. After the stream completes, the full assistant response is saved back to the session.
9. Response headers: `Content-Type: text/plain; charset=utf-8`, `X-Session-Id: <id>`, `Cache-Control: no-cache`.

---

## 18. generateDistrictInsights

**Purpose**: Analyze aggregate district data and generate actionable insights for administrators.

### Function Signature

```
generateDistrictInsights(snapshot: DistrictSnapshot) -> DistrictInsights
```

**Input** (`DistrictSnapshot`):
| Field | Type | Description |
|-------|------|-------------|
| schools | number | Total schools |
| teachers | number | Total teachers |
| students | number | Total students |
| classes | number | Total classes |
| assignments | number | Total assignments |
| submissions | number | Total submissions |
| gradedSubmissions | number | Graded submissions |
| aiFeedbackGenerated | number | AI feedback drafts created |
| ungradedSubmissions | number | Submissions awaiting grading |
| masteryDistribution | Record<string, number> | Mastery level counts |
| subjectScores | object[] | `{ subject, avgScore, submissions }` per subject |
| gradingCompletionRate | number | Percentage of submissions graded |
| teacherEngagement | object | `{ totalTeachers, withAssignments, withLessonPlans, withRubrics, withFeedbackDrafts }` |

**Output** (`DistrictInsights`):
| Field | Type | Description |
|-------|------|-------------|
| executiveSummary | string | 2-3 sentence overview of district health |
| keyFindings | string[] | 3-5 data-backed findings |
| concerns | string[] | 2-3 areas requiring attention |
| recommendations | string[] | 3-5 actionable recommendations |

### API Configuration

| Setting | Value |
|---------|-------|
| Method | `messages.create()` |
| max_tokens | 16000 |
| Tool name | `district_insights` |
| tool_choice | forced |

### System Prompt (summarized)

Role: District education analyst for a K-12 school district using an AI-powered teaching platform. Analysis is data-driven, specific, and focused on improving student outcomes and teacher effectiveness. References exact numbers from the data. Prioritizes findings by impact.

### Behavior

- Executive summary references key metrics and overall health.
- Key findings are backed by specific numbers from the snapshot.
- Findings focus on patterns in student performance, teacher engagement, AI adoption, and grading workflows.
- Concerns highlight gaps, bottlenecks, underperformance, or equity issues.
- Recommendations are specific, implementable, and tied to findings or concerns.

### Example

**Input** (representative snapshot):
```json
{
  "schools": 3,
  "teachers": 12,
  "students": 450,
  "classes": 24,
  "assignments": 87,
  "submissions": 1200,
  "gradedSubmissions": 900,
  "aiFeedbackGenerated": 750,
  "ungradedSubmissions": 300,
  "masteryDistribution": { "advanced": 120, "proficient": 200, "developing": 90, "beginning": 40 },
  "subjectScores": [
    { "subject": "ELA", "avgScore": 78, "submissions": 400 },
    { "subject": "Math", "avgScore": 65, "submissions": 350 }
  ],
  "gradingCompletionRate": 75,
  "teacherEngagement": {
    "totalTeachers": 12,
    "withAssignments": 10,
    "withLessonPlans": 7,
    "withRubrics": 8,
    "withFeedbackDrafts": 6
  }
}
```

**Output** (representative):
```json
{
  "executiveSummary": "The district serves 450 students across 3 schools with 12 teachers actively using the platform. While ELA performance is solid at 78% average, Math lags at 65%, and the 300 ungraded submissions represent a growing backlog.",
  "keyFindings": [
    "10 of 12 teachers (83%) have created assignments, showing strong adoption...",
    "Math average score of 65% is significantly below ELA's 78%...",
    "Only 6 of 12 teachers have used AI feedback, leaving half without this efficiency tool..."
  ],
  "concerns": [
    "300 ungraded submissions (25% of total) may delay student feedback cycles.",
    "Math performance at 65% average suggests a systemic instructional gap."
  ],
  "recommendations": [
    "Prioritize batch grading for the 300 ungraded submissions...",
    "Investigate Math curriculum alignment and provide targeted PD...",
    "Conduct AI feedback training for the 6 teachers not yet using it..."
  ]
}
```

---

## 19. generateReportCardNarrative

**Purpose**: Generate individualized report card narratives based on longitudinal student performance data.

### Function Signature

```
generateReportCardNarrative(input: ReportCardInput) -> GeneratedReportCard
```

**Input**:
| Field | Type | Required | Description |
|-------|------|----------|-------------|
| studentName | string | yes | Full name (only first name is sent to AI) |
| className | string | yes | Class name |
| subject | string | yes | Academic subject |
| gradeLevel | string | yes | Grade level |
| gradingPeriod | string | yes | Grading period |
| submissions | object[] | yes | Array of `{ assignmentTitle, score, maxScore, letterGrade, submittedAt }` (score/maxScore/letterGrade may be null) |
| masteryData | object[] | yes | Array of `{ standardCode, standardDescription, level, score }` |
| feedbackHighlights | string[] | yes | Prior AI feedback highlights |

**Output** (`GeneratedReportCard`):
| Field | Type | Description |
|-------|------|-------------|
| overallNarrative | string | 2-3 paragraph evidence-based narrative |
| strengths | string[] | 3-5 strengths with concrete evidence |
| areasForGrowth | string[] | 2-3 constructive growth areas |
| recommendations | string[] | 2-3 actionable suggestions (home + school) |
| gradeRecommendation | string | Letter grade: A+ through F |

### API Configuration

| Setting | Value |
|---------|-------|
| Method | `messages.create()` |
| max_tokens | 4096 |
| Tool name | `generate_report_card` |
| tool_choice | forced |

### System Prompt (summarized)

Role: Experienced K-12 educator writing report card narratives for parents. Language is clear, specific, evidence-based, and parent-friendly. Avoids educational jargon and standards codes in the narrative -- uses plain skill descriptions instead. Warm, professional tone conveying genuine knowledge of the student. Every claim grounded in provided data. Growth areas framed constructively. Recommendations are specific and actionable for home and school.

### Behavior

- Only the student's first name is sent to the AI (PII minimization).
- The narrative references specific assignments, skills, and growth patterns from the data.
- No standards codes appear in the narrative text (plain language only).
- Grade recommendation uses the standard scale: A (90-100%), B (80-89%), C (70-79%), D (60-69%), F (below 60%).
- Recommendations include a mix of home activities and school-based strategies.

---

## 20. generateStudentInterventions

**Purpose**: Generate intervention recommendations for at-risk students based on anonymized performance data.

### Function Signature

```
generateStudentInterventions(flaggedStudents: FlaggedStudent[]) -> StudentInterventionsResult
```

**Input** (`FlaggedStudent[]`):
| Field | Type | Description |
|-------|------|-------------|
| anonId | string | Anonymized label (e.g., "Student A") |
| riskLevel | string | "high_risk" or "moderate_risk" |
| indicators | string[] | Risk indicators (e.g., "Declining score trend", "3 missing submissions") |
| recentScores | number[] | Recent score percentages |
| trendDirection | string | "declining", "stable", or "improving" |

**Output** (`StudentInterventionsResult`):
| Field | Type | Description |
|-------|------|-------------|
| students | object[] | Array of `{ studentLabel, recommendations }` |

Each student gets:
| Field | Type | Description |
|-------|------|-------------|
| studentLabel | string | Must match the anonymized label exactly |
| recommendations | string[] | 2-3 specific, actionable interventions |

### API Configuration

| Setting | Value |
|---------|-------|
| Method | `messages.create()` |
| max_tokens | 4096 |
| Tool name | `student_interventions` |
| tool_choice | forced |

### System Prompt (summarized)

Role: Expert K-12 education interventionist. Generates specific, actionable intervention recommendations for teachers based on student performance data. Students are identified by anonymized labels only; the AI must use these exact labels in responses.

### Route Handler Flow (Early Warning)

The early warning system is a data pipeline that feeds this AI service:

1. Determines which students the user has access to (teachers see their class students; admins see all).
2. Fetches 30 days of mastery records, submissions, and enrollment data.
3. Computes four risk indicators per student:
   - **Declining score trend**: recent half average > 5 points below older half average.
   - **Standards below proficient**: any mastery records with score < 70 or level "beginning"/"developing".
   - **Missing submissions**: assignments in enrolled classes with no submission.
   - **Low average score**: recent average below 70%.
4. Assigns risk level: 3+ indicators = high_risk, 2 = moderate_risk, 0-1 = on_track.
5. Anonymizes flagged students (Student A, B, C...) before sending to AI.
6. AI generates 2-3 recommendations per flagged student.
7. Recommendations are mapped back to real students using the anonymized labels.
8. If AI call fails, the response continues without recommendations (graceful degradation).

---

## 21. generateReteachActivities

**Purpose**: Suggest reteaching activities for standards where students are struggling.

### Function Signature

```
generateReteachActivities(gapData: GapData[]) -> ReteachActivitiesResult
```

**Input** (`GapData[]`):
| Field | Type | Description |
|-------|------|-------------|
| standardCode | string | Standard code |
| standardDescription | string | Human-readable standard description |
| classSize | number | Total students in class |
| belowProficientCount | number | Students below proficient |
| averageScore | number | Class average on this standard |
| studentsBelow | object[] | Array of `{ studentName, level, score }` |

**Output** (`ReteachActivitiesResult`):
| Field | Type | Description |
|-------|------|-------------|
| recommendations | object[] | Array of recommendations per standard |

Each recommendation:
| Field | Type | Description |
|-------|------|-------------|
| standardCode | string | The standard this addresses |
| activities | string[] | 2-3 classroom-ready activities (15-45 minutes each) |
| groupingStrategy | string | How to group students (small group, pairs, whole class, etc.) |

### API Configuration

| Setting | Value |
|---------|-------|
| Method | `messages.create()` |
| max_tokens | 2048 |
| Tool name | `suggest_reteach_activities` |
| tool_choice | forced |

### System Prompt (summarized)

Role: Experienced K-12 instructional coach. Generates specific, practical reteaching activities based on standards gap data. Each activity is classroom-ready and takes 15-45 minutes. Includes student grouping strategies.

### Route Handler Flow (Mastery Gaps)

1. Teacher requests gaps for a specific class (`GET /api/mastery/gaps?classId=X`).
2. System fetches the most recent mastery record per (student, standard) pair.
3. Groups records by standard and computes: below-proficient count, average score, percentage below proficient.
4. A standard is flagged as a "gap" if more than 50% of students are below proficient.
5. If `withRecommendations=true` query parameter is set, gap standards are sent to the AI service.
6. AI generates 2-3 activities per gap standard with grouping strategies.
7. If AI call fails, the response continues without recommendations (graceful degradation).

### Behavior

- Activities are practical and classroom-ready, not theoretical.
- Grouping strategies consider the number and distribution of struggling students.
- Each activity targets the specific standard, not general remediation.

---

## Shared Helper: buildRubricInput

The `grading-helpers.ts` module provides a utility that transforms database records into the shape expected by the grading AI service.

```
buildRubricInput(rubric, criteria, assignment) -> { rubric, assignment }
```

- Parses JSON strings (`rubric.levels`, `criteria[].descriptors`) into their typed forms.
- Maps `null` descriptions to empty strings.
- Maps `null` instructions to `undefined`.

This ensures the data flowing from the database into the AI service matches the expected schema.

## Shared Helper: persistGradingResult

After AI grading completes, this function persists results to the database:

1. Deletes any existing feedback and criterion scores for the submission (supports re-grading).
2. Inserts a `feedbackDrafts` record with:
   - `aiFeedback`: the overall feedback text
   - `strengths`, `improvements`, `nextSteps`: JSON-stringified arrays
   - `aiMetadata`: JSON with misconceptions, letter grade, and any extra metadata
   - `status: "draft"` (requires teacher review)
3. Inserts `criterionScores` rows for each criterion.
4. Updates the `submissions` row: `status: "graded"`, scores, letter grade, and graded timestamp.
