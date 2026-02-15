# Data Model

This document defines every table, column, constraint, and relationship in the Paideia database. An implementation in any language or ORM must reproduce this schema exactly to support the application's behavioral specifications.

## 1. Overview

**Total tables:** 31

**ID strategy:** All primary keys are `text` columns populated with CUID2 values (compact, collision-resistant, URL-safe identifiers). No integer sequences or UUIDs.

**Timestamp pattern:** Most tables include `created_at` (not null, defaults to `now()`). Many also include `updated_at` (not null, defaults to `now()`). All timestamp columns use `timestamp` type with date mode.

**JSON-in-text pattern:** Several columns store structured data as JSON-serialized text strings (not native JSON/JSONB columns). These are noted with "(JSON)" in column descriptions.

### Domain Groupings

| Domain | Tables |
|--------|--------|
| Authentication & Users | `users`, `accounts`, `sessions`, `verification_tokens` |
| Organization | `districts`, `schools`, `classes`, `class_members`, `parent_children` |
| Standards | `standards`, `class_standards` |
| Assignments & Rubrics | `assignments`, `rubrics`, `rubric_criteria`, `differentiated_versions` |
| Submissions & Grading | `submissions`, `feedback_drafts`, `criterion_scores` |
| Mastery Tracking | `mastery_records` |
| Lesson Planning | `lesson_plans` |
| Quizzes | `quizzes`, `quiz_questions`, `question_standards` |
| Special Education | `ieps`, `iep_goals`, `progress_data_points`, `compliance_deadlines` |
| Communication | `messages`, `notifications` |
| Tutoring | `tutor_sessions` |
| Report Cards | `report_cards` |
| Audit | `audit_logs` |

---

## 2. Table Definitions

### 2.1 Authentication & Users

#### `users`

| Column | Type | Nullable | Default | Notes |
|--------|------|----------|---------|-------|
| `id` | text | no | cuid2 | Primary key |
| `name` | text | yes | | |
| `email` | text | no | | Unique |
| `email_verified` | timestamp | yes | | |
| `image` | text | yes | | |
| `password_hash` | text | yes | | bcrypt hash |
| `role` | text | no | `'teacher'` | Constrained values (see Enums) |
| `created_at` | timestamp | no | `now()` | |
| `updated_at` | timestamp | no | `now()` | |

**Unique constraints:** `email`

---

#### `accounts`

NextAuth.js / Auth.js OAuth account records.

| Column | Type | Nullable | Default | Notes |
|--------|------|----------|---------|-------|
| `id` | text | no | cuid2 | Primary key |
| `user_id` | text | no | | FK &rarr; `users.id` (cascade delete) |
| `type` | text | no | | |
| `provider` | text | no | | |
| `provider_account_id` | text | no | | |
| `refresh_token` | text | yes | | |
| `access_token` | text | yes | | |
| `expires_at` | integer | yes | | |
| `token_type` | text | yes | | |
| `scope` | text | yes | | |
| `id_token` | text | yes | | |
| `session_state` | text | yes | | |

**Indexes:** `provider_account_idx` unique on (`provider`, `provider_account_id`)

---

#### `sessions`

| Column | Type | Nullable | Default | Notes |
|--------|------|----------|---------|-------|
| `id` | text | no | cuid2 | Primary key |
| `session_token` | text | no | | Unique |
| `user_id` | text | no | | FK &rarr; `users.id` (cascade delete) |
| `expires` | timestamp | no | | |

**Unique constraints:** `session_token`

---

#### `verification_tokens`

This table has no auto-generated primary key. Identity is the composite of `identifier` + `token`.

| Column | Type | Nullable | Default | Notes |
|--------|------|----------|---------|-------|
| `identifier` | text | no | | |
| `token` | text | no | | Unique |
| `expires` | timestamp | no | | |

**Indexes:** `verification_token_idx` unique on (`identifier`, `token`)

**Unique constraints:** `token`

---

### 2.2 Organization

#### `districts`

| Column | Type | Nullable | Default | Notes |
|--------|------|----------|---------|-------|
| `id` | text | no | cuid2 | Primary key |
| `name` | text | no | | |
| `state` | text | no | | |
| `created_at` | timestamp | no | `now()` | |

---

#### `schools`

| Column | Type | Nullable | Default | Notes |
|--------|------|----------|---------|-------|
| `id` | text | no | cuid2 | Primary key |
| `name` | text | no | | |
| `district_id` | text | yes | | FK &rarr; `districts.id` |
| `address` | text | yes | | |
| `created_at` | timestamp | no | `now()` | |

---

#### `classes`

| Column | Type | Nullable | Default | Notes |
|--------|------|----------|---------|-------|
| `id` | text | no | cuid2 | Primary key |
| `name` | text | no | | |
| `subject` | text | no | | |
| `grade_level` | text | no | | |
| `period` | text | yes | | |
| `school_year` | text | no | `'2025-2026'` | |
| `school_id` | text | yes | | FK &rarr; `schools.id` |
| `created_at` | timestamp | no | `now()` | |
| `updated_at` | timestamp | no | `now()` | |

---

#### `class_members`

Join table linking users (teachers and students) to classes.

| Column | Type | Nullable | Default | Notes |
|--------|------|----------|---------|-------|
| `id` | text | no | cuid2 | Primary key |
| `class_id` | text | no | | FK &rarr; `classes.id` (cascade delete) |
| `user_id` | text | no | | FK &rarr; `users.id` (cascade delete) |
| `role` | text | no | | Constrained values (see Enums) |
| `joined_at` | timestamp | no | `now()` | |

**Indexes:** `class_member_idx` unique on (`class_id`, `user_id`)

---

#### `parent_children`

Links parent users to student users.

| Column | Type | Nullable | Default | Notes |
|--------|------|----------|---------|-------|
| `id` | text | no | cuid2 | Primary key |
| `parent_id` | text | no | | FK &rarr; `users.id` |
| `child_id` | text | no | | FK &rarr; `users.id` |

**Indexes:** `parent_child_idx` unique on (`parent_id`, `child_id`)

---

### 2.3 Standards

#### `standards`

Curriculum standards (Common Core, NGSS, etc.).

| Column | Type | Nullable | Default | Notes |
|--------|------|----------|---------|-------|
| `id` | text | no | cuid2 | Primary key |
| `code` | text | no | | Unique (e.g., `RL.8.1`, `HS-LS1-1`) |
| `description` | text | no | | |
| `subject` | text | no | | |
| `grade_level` | text | no | | |
| `domain` | text | yes | | |
| `state` | text | no | `'CCSS'` | Standards framework name |

**Unique constraints:** `code`

---

#### `class_standards`

Join table linking classes to the standards they cover.

| Column | Type | Nullable | Default | Notes |
|--------|------|----------|---------|-------|
| `id` | text | no | cuid2 | Primary key |
| `class_id` | text | no | | FK &rarr; `classes.id` (cascade delete) |
| `standard_id` | text | no | | FK &rarr; `standards.id` |

**Indexes:** `class_standard_idx` unique on (`class_id`, `standard_id`)

---

### 2.4 Assignments & Rubrics

#### `rubrics`

| Column | Type | Nullable | Default | Notes |
|--------|------|----------|---------|-------|
| `id` | text | no | cuid2 | Primary key |
| `title` | text | no | | |
| `description` | text | yes | | |
| `type` | text | no | `'analytical'` | Constrained values (see Enums) |
| `levels` | text | no | | JSON array of level names (e.g., `["Beginning","Developing","Proficient","Advanced"]`) |
| `teacher_id` | text | no | | FK &rarr; `users.id` |
| `is_template` | boolean | no | `false` | |
| `created_at` | timestamp | no | `now()` | |
| `updated_at` | timestamp | no | `now()` | |

---

#### `rubric_criteria`

Individual criteria within a rubric.

| Column | Type | Nullable | Default | Notes |
|--------|------|----------|---------|-------|
| `id` | text | no | cuid2 | Primary key |
| `rubric_id` | text | no | | FK &rarr; `rubrics.id` (cascade delete) |
| `name` | text | no | | |
| `description` | text | yes | | |
| `weight` | real | no | `1.0` | |
| `standard_id` | text | yes | | FK &rarr; `standards.id` |
| `descriptors` | text | no | | JSON object mapping level name to descriptor text |

---

#### `assignments`

| Column | Type | Nullable | Default | Notes |
|--------|------|----------|---------|-------|
| `id` | text | no | cuid2 | Primary key |
| `title` | text | no | | |
| `description` | text | no | | |
| `instructions` | text | yes | | |
| `type` | text | no | `'essay'` | Constrained values (see Enums) |
| `grade_level` | text | no | | |
| `subject` | text | no | | |
| `due_date` | timestamp | yes | | |
| `status` | text | no | `'draft'` | Constrained values (see Enums) |
| `class_id` | text | no | | FK &rarr; `classes.id` |
| `teacher_id` | text | no | | FK &rarr; `users.id` |
| `rubric_id` | text | yes | | FK &rarr; `rubrics.id` |
| `success_criteria` | text | yes | | JSON array of strings |
| `ai_metadata` | text | yes | | JSON |
| `created_at` | timestamp | no | `now()` | |
| `updated_at` | timestamp | no | `now()` | |

---

#### `differentiated_versions`

Tiered versions of an assignment for different student levels.

| Column | Type | Nullable | Default | Notes |
|--------|------|----------|---------|-------|
| `id` | text | no | cuid2 | Primary key |
| `assignment_id` | text | no | | FK &rarr; `assignments.id` (cascade delete) |
| `tier` | text | no | | Constrained values (see Enums) |
| `title` | text | no | | |
| `content` | text | no | | |
| `scaffolds` | text | yes | | JSON |
| `created_at` | timestamp | no | `now()` | |

---

### 2.5 Submissions & Grading

#### `submissions`

| Column | Type | Nullable | Default | Notes |
|--------|------|----------|---------|-------|
| `id` | text | no | cuid2 | Primary key |
| `assignment_id` | text | no | | FK &rarr; `assignments.id` |
| `student_id` | text | no | | FK &rarr; `users.id` |
| `content` | text | no | | |
| `attachments` | text | yes | | JSON |
| `status` | text | no | `'submitted'` | Constrained values (see Enums) |
| `submitted_at` | timestamp | no | `now()` | |
| `graded_at` | timestamp | yes | | |
| `total_score` | real | yes | | |
| `max_score` | real | yes | | |
| `letter_grade` | text | yes | | |

---

#### `feedback_drafts`

AI-generated feedback with teacher review workflow.

| Column | Type | Nullable | Default | Notes |
|--------|------|----------|---------|-------|
| `id` | text | no | cuid2 | Primary key |
| `submission_id` | text | no | | FK &rarr; `submissions.id`, unique |
| `teacher_id` | text | no | | FK &rarr; `users.id` |
| `ai_feedback` | text | no | | |
| `teacher_edits` | text | yes | | |
| `final_feedback` | text | yes | | |
| `status` | text | no | `'draft'` | Constrained values (see Enums) |
| `strengths` | text | yes | | JSON array |
| `improvements` | text | yes | | JSON array |
| `next_steps` | text | yes | | JSON array |
| `ai_metadata` | text | yes | | JSON |
| `created_at` | timestamp | no | `now()` | |
| `updated_at` | timestamp | no | `now()` | |

**Unique constraints:** `submission_id` (one feedback draft per submission)

---

#### `criterion_scores`

Per-criterion rubric scores for a submission.

| Column | Type | Nullable | Default | Notes |
|--------|------|----------|---------|-------|
| `id` | text | no | cuid2 | Primary key |
| `submission_id` | text | no | | FK &rarr; `submissions.id` (cascade delete) |
| `criterion_id` | text | no | | FK &rarr; `rubric_criteria.id` |
| `level` | text | no | | Level name (e.g., "Proficient") |
| `score` | real | no | | |
| `max_score` | real | no | | |
| `justification` | text | yes | | |

**Indexes:** `criterion_score_idx` unique on (`submission_id`, `criterion_id`)

---

### 2.6 Mastery Tracking

#### `mastery_records`

Tracks student proficiency on individual standards over time.

| Column | Type | Nullable | Default | Notes |
|--------|------|----------|---------|-------|
| `id` | text | no | cuid2 | Primary key |
| `student_id` | text | no | | FK &rarr; `users.id` |
| `standard_id` | text | no | | FK &rarr; `standards.id` |
| `level` | text | no | | Constrained values (see Enums) |
| `score` | real | no | | 0-100 |
| `assessed_at` | timestamp | no | `now()` | |
| `source` | text | no | | Reference to the assignment ID that produced this record |
| `notes` | text | yes | | |

---

### 2.7 Lesson Planning

#### `lesson_plans`

| Column | Type | Nullable | Default | Notes |
|--------|------|----------|---------|-------|
| `id` | text | no | cuid2 | Primary key |
| `title` | text | no | | |
| `subject` | text | no | | |
| `grade_level` | text | no | | |
| `duration` | text | yes | | |
| `standards` | text | yes | | JSON array of standard codes |
| `objectives` | text | no | | JSON array of strings |
| `warm_up` | text | yes | | |
| `direct_instruction` | text | yes | | |
| `guided_practice` | text | yes | | |
| `independent_practice` | text | yes | | |
| `closure` | text | yes | | |
| `materials` | text | yes | | JSON array of strings |
| `differentiation` | text | yes | | JSON object with tier keys |
| `assessment_plan` | text | yes | | |
| `teacher_id` | text | no | | FK &rarr; `users.id` |
| `ai_metadata` | text | yes | | JSON |
| `created_at` | timestamp | no | `now()` | |
| `updated_at` | timestamp | no | `now()` | |

---

### 2.8 Quizzes

#### `quizzes`

| Column | Type | Nullable | Default | Notes |
|--------|------|----------|---------|-------|
| `id` | text | no | cuid2 | Primary key |
| `title` | text | no | | |
| `subject` | text | no | | |
| `grade_level` | text | no | | |
| `standards_json` | text | yes | | JSON array of standard codes |
| `difficulty_level` | text | yes | | |
| `time_limit` | integer | yes | | In minutes |
| `created_by` | text | yes | | FK &rarr; `users.id` |
| `created_at` | timestamp | no | `now()` | |

---

#### `quiz_questions`

| Column | Type | Nullable | Default | Notes |
|--------|------|----------|---------|-------|
| `id` | text | no | cuid2 | Primary key |
| `quiz_id` | text | no | | FK &rarr; `quizzes.id` (cascade delete) |
| `type` | text | no | | Constrained values (see Enums) |
| `question_text` | text | no | | |
| `options` | text | yes | | JSON array (for multiple choice) |
| `correct_answer` | text | yes | | |
| `explanation` | text | yes | | |
| `blooms_level` | text | yes | | Bloom's taxonomy level |
| `points` | real | no | `1.0` | |
| `order_index` | integer | no | | Display order within the quiz |

---

#### `question_standards`

Join table linking quiz questions to the standards they assess.

| Column | Type | Nullable | Default | Notes |
|--------|------|----------|---------|-------|
| `id` | text | no | cuid2 | Primary key |
| `question_id` | text | no | | FK &rarr; `quiz_questions.id` (cascade delete) |
| `standard_id` | text | no | | FK &rarr; `standards.id` |

**Indexes:** `question_standard_idx` unique on (`question_id`, `standard_id`)

---

### 2.9 Special Education

#### `ieps`

Individualized Education Programs.

| Column | Type | Nullable | Default | Notes |
|--------|------|----------|---------|-------|
| `id` | text | no | cuid2 | Primary key |
| `student_id` | text | no | | FK &rarr; `users.id` |
| `author_id` | text | no | | FK &rarr; `users.id` |
| `status` | text | no | `'draft'` | Constrained values (see Enums) |
| `start_date` | timestamp | yes | | |
| `end_date` | timestamp | yes | | |
| `present_levels` | text | yes | | Narrative description of current performance |
| `disability_category` | text | yes | | |
| `accommodations` | text | yes | | JSON array of accommodation objects |
| `modifications` | text | yes | | JSON array of modification objects |
| `related_services` | text | yes | | JSON array of service objects |
| `transition_plan` | text | yes | | JSON |
| `meeting_date` | timestamp | yes | | |
| `meeting_notes` | text | yes | | |
| `parent_input` | text | yes | | |
| `ai_metadata` | text | yes | | JSON |
| `created_at` | timestamp | no | `now()` | |
| `updated_at` | timestamp | no | `now()` | |

---

#### `iep_goals`

| Column | Type | Nullable | Default | Notes |
|--------|------|----------|---------|-------|
| `id` | text | no | cuid2 | Primary key |
| `iep_id` | text | no | | FK &rarr; `ieps.id` (cascade delete) |
| `area` | text | no | | Goal area (e.g., "Reading Fluency") |
| `goal_text` | text | no | | Full measurable goal statement |
| `baseline` | text | yes | | |
| `target` | text | yes | | |
| `measure_method` | text | yes | | |
| `frequency` | text | yes | | |
| `timeline` | text | yes | | |
| `status` | text | no | `'active'` | Constrained values (see Enums) |
| `similarity_score` | real | yes | | AI-computed similarity metric |
| `ai_generated` | boolean | no | `false` | |
| `created_at` | timestamp | no | `now()` | |

---

#### `progress_data_points`

Quantitative progress measurements toward IEP goals.

| Column | Type | Nullable | Default | Notes |
|--------|------|----------|---------|-------|
| `id` | text | no | cuid2 | Primary key |
| `goal_id` | text | no | | FK &rarr; `iep_goals.id` (cascade delete) |
| `student_id` | text | no | | FK &rarr; `users.id` |
| `value` | real | no | | Numeric measurement |
| `unit` | text | no | | Unit of measurement (e.g., "wpm", "% assignments completed") |
| `date` | timestamp | no | `now()` | |
| `notes` | text | yes | | |
| `recorded_by` | text | yes | | User ID of the person who recorded this data point |

---

#### `compliance_deadlines`

IDEA compliance tracking for IEP-related deadlines.

| Column | Type | Nullable | Default | Notes |
|--------|------|----------|---------|-------|
| `id` | text | no | cuid2 | Primary key |
| `type` | text | no | | Constrained values (see Enums) |
| `student_id` | text | no | | Student user ID (not a foreign key in schema) |
| `due_date` | timestamp | no | | |
| `status` | text | no | `'upcoming'` | |
| `completed_at` | timestamp | yes | | |
| `notes` | text | yes | | |

---

### 2.10 Communication

#### `messages`

Parent-teacher and staff-to-staff messages.

| Column | Type | Nullable | Default | Notes |
|--------|------|----------|---------|-------|
| `id` | text | no | cuid2 | Primary key |
| `sender_id` | text | no | | FK &rarr; `users.id` |
| `receiver_id` | text | no | | FK &rarr; `users.id` |
| `subject` | text | yes | | |
| `content` | text | no | | |
| `type` | text | no | `'general'` | Constrained values (see Enums) |
| `language` | text | no | `'en'` | ISO language code |
| `is_ai_generated` | boolean | no | `false` | |
| `status` | text | no | `'sent'` | Constrained values (see Enums) |
| `metadata` | text | yes | | JSON |
| `created_at` | timestamp | no | `now()` | |

---

#### `notifications`

In-app notifications for any user.

| Column | Type | Nullable | Default | Notes |
|--------|------|----------|---------|-------|
| `id` | text | no | cuid2 | Primary key |
| `user_id` | text | no | | FK &rarr; `users.id` |
| `type` | text | no | | |
| `title` | text | no | | |
| `body` | text | no | | |
| `is_read` | boolean | no | `false` | |
| `link` | text | yes | | |
| `created_at` | timestamp | no | `now()` | |

---

### 2.11 Tutoring

#### `tutor_sessions`

AI Socratic tutor conversation sessions.

| Column | Type | Nullable | Default | Notes |
|--------|------|----------|---------|-------|
| `id` | text | no | cuid2 | Primary key |
| `student_id` | text | no | | FK &rarr; `users.id` |
| `subject` | text | no | | |
| `topic` | text | yes | | |
| `messages` | text | no | | JSON array of `{role, content}` objects |
| `started_at` | timestamp | no | `now()` | |
| `ended_at` | timestamp | yes | | |
| `metadata` | text | yes | | JSON (e.g., `{duration, messagesCount}`) |

---

### 2.12 Report Cards

#### `report_cards`

| Column | Type | Nullable | Default | Notes |
|--------|------|----------|---------|-------|
| `id` | text | no | cuid2 | Primary key |
| `student_id` | text | no | | FK &rarr; `users.id` |
| `class_id` | text | no | | FK &rarr; `classes.id` |
| `grading_period` | text | no | | (e.g., "Fall 2025") |
| `narrative` | text | no | | |
| `strengths` | text | yes | | JSON array of strings |
| `areas_for_growth` | text | yes | | JSON array of strings |
| `recommendations` | text | yes | | JSON array of strings |
| `grade_recommendation` | text | yes | | Letter grade (e.g., "A-", "B+") |
| `status` | text | no | `'draft'` | Constrained values (see Enums) |
| `generated_at` | timestamp | no | `now()` | |
| `approved_at` | timestamp | yes | | |
| `approved_by` | text | yes | | FK &rarr; `users.id` |

---

### 2.13 Audit

#### `audit_logs`

System-wide audit trail for data changes and AI interactions.

| Column | Type | Nullable | Default | Notes |
|--------|------|----------|---------|-------|
| `id` | text | no | cuid2 | Primary key |
| `entity_type` | text | no | | Table or domain name being audited |
| `entity_id` | text | no | | Primary key of the audited record |
| `action` | text | no | | (e.g., "create", "update", "delete") |
| `user_id` | text | yes | | User who performed the action |
| `before` | text | yes | | JSON snapshot of state before change |
| `after` | text | yes | | JSON snapshot of state after change |
| `ai_model` | text | yes | | AI model identifier if AI was involved |
| `ai_prompt` | text | yes | | Prompt sent to AI if applicable |
| `timestamp` | timestamp | no | `now()` | |

---

## 3. Relationships

### One-to-Many

| Parent Table | Child Table | Foreign Key | On Delete |
|-------------|-------------|-------------|-----------|
| `users` | `accounts` | `accounts.user_id` &rarr; `users.id` | cascade |
| `users` | `sessions` | `sessions.user_id` &rarr; `users.id` | cascade |
| `districts` | `schools` | `schools.district_id` &rarr; `districts.id` | (default) |
| `schools` | `classes` | `classes.school_id` &rarr; `schools.id` | (default) |
| `classes` | `class_members` | `class_members.class_id` &rarr; `classes.id` | cascade |
| `users` | `class_members` | `class_members.user_id` &rarr; `users.id` | cascade |
| `users` | `parent_children` (as parent) | `parent_children.parent_id` &rarr; `users.id` | (default) |
| `users` | `parent_children` (as child) | `parent_children.child_id` &rarr; `users.id` | (default) |
| `classes` | `class_standards` | `class_standards.class_id` &rarr; `classes.id` | cascade |
| `standards` | `class_standards` | `class_standards.standard_id` &rarr; `standards.id` | (default) |
| `users` | `rubrics` | `rubrics.teacher_id` &rarr; `users.id` | (default) |
| `rubrics` | `rubric_criteria` | `rubric_criteria.rubric_id` &rarr; `rubrics.id` | cascade |
| `standards` | `rubric_criteria` | `rubric_criteria.standard_id` &rarr; `standards.id` | (default) |
| `classes` | `assignments` | `assignments.class_id` &rarr; `classes.id` | (default) |
| `users` | `assignments` | `assignments.teacher_id` &rarr; `users.id` | (default) |
| `rubrics` | `assignments` | `assignments.rubric_id` &rarr; `rubrics.id` | (default) |
| `assignments` | `differentiated_versions` | `differentiated_versions.assignment_id` &rarr; `assignments.id` | cascade |
| `assignments` | `submissions` | `submissions.assignment_id` &rarr; `assignments.id` | (default) |
| `users` | `submissions` | `submissions.student_id` &rarr; `users.id` | (default) |
| `submissions` | `feedback_drafts` | `feedback_drafts.submission_id` &rarr; `submissions.id` | (default) |
| `users` | `feedback_drafts` | `feedback_drafts.teacher_id` &rarr; `users.id` | (default) |
| `submissions` | `criterion_scores` | `criterion_scores.submission_id` &rarr; `submissions.id` | cascade |
| `rubric_criteria` | `criterion_scores` | `criterion_scores.criterion_id` &rarr; `rubric_criteria.id` | (default) |
| `users` | `mastery_records` | `mastery_records.student_id` &rarr; `users.id` | (default) |
| `standards` | `mastery_records` | `mastery_records.standard_id` &rarr; `standards.id` | (default) |
| `users` | `lesson_plans` | `lesson_plans.teacher_id` &rarr; `users.id` | (default) |
| `users` | `quizzes` | `quizzes.created_by` &rarr; `users.id` | (default) |
| `quizzes` | `quiz_questions` | `quiz_questions.quiz_id` &rarr; `quizzes.id` | cascade |
| `quiz_questions` | `question_standards` | `question_standards.question_id` &rarr; `quiz_questions.id` | cascade |
| `standards` | `question_standards` | `question_standards.standard_id` &rarr; `standards.id` | (default) |
| `users` | `ieps` (as student) | `ieps.student_id` &rarr; `users.id` | (default) |
| `users` | `ieps` (as author) | `ieps.author_id` &rarr; `users.id` | (default) |
| `ieps` | `iep_goals` | `iep_goals.iep_id` &rarr; `ieps.id` | cascade |
| `iep_goals` | `progress_data_points` | `progress_data_points.goal_id` &rarr; `iep_goals.id` | cascade |
| `users` | `progress_data_points` | `progress_data_points.student_id` &rarr; `users.id` | (default) |
| `users` | `messages` (as sender) | `messages.sender_id` &rarr; `users.id` | (default) |
| `users` | `messages` (as receiver) | `messages.receiver_id` &rarr; `users.id` | (default) |
| `users` | `notifications` | `notifications.user_id` &rarr; `users.id` | (default) |
| `users` | `tutor_sessions` | `tutor_sessions.student_id` &rarr; `users.id` | (default) |
| `users` | `report_cards` (as student) | `report_cards.student_id` &rarr; `users.id` | (default) |
| `classes` | `report_cards` | `report_cards.class_id` &rarr; `classes.id` | (default) |
| `users` | `report_cards` (as approver) | `report_cards.approved_by` &rarr; `users.id` | (default) |

### Many-to-Many (via Join Tables)

| Relationship | Join Table | Left FK | Right FK |
|-------------|------------|---------|----------|
| `users` &harr; `classes` | `class_members` | `user_id` | `class_id` |
| `users` (parent) &harr; `users` (child) | `parent_children` | `parent_id` | `child_id` |
| `classes` &harr; `standards` | `class_standards` | `class_id` | `standard_id` |
| `quiz_questions` &harr; `standards` | `question_standards` | `question_id` | `standard_id` |

### Self-Referential

The `users` table participates in a self-referential many-to-many via `parent_children`, where both `parent_id` and `child_id` reference `users.id`.

---

## 4. Enums / Constrained Values

### `users.role`

| Value | Description |
|-------|-------------|
| `teacher` | General education teacher (default) |
| `sped_teacher` | Special education teacher |
| `admin` | District or school administrator |
| `parent` | Parent or guardian |
| `student` | Student |

### `class_members.role`

| Value | Description |
|-------|-------------|
| `teacher` | Teacher of the class |
| `student` | Student enrolled in the class |

### `rubrics.type`

| Value | Description |
|-------|-------------|
| `analytical` | Multi-criterion rubric (default) |
| `holistic` | Single-score rubric |

### `assignments.type`

| Value | Description |
|-------|-------------|
| `essay` | Essay assignment (default) |
| `quiz` | Quiz |
| `short_answer` | Short answer |
| `project` | Project-based |
| `lab_report` | Science lab report |

### `assignments.status`

| Value | Description |
|-------|-------------|
| `draft` | Not yet visible to students (default) |
| `published` | Visible and accepting submissions |
| `grading` | Submissions closed, grading in progress |
| `completed` | Fully graded and returned |

### `differentiated_versions.tier`

| Value | Description |
|-------|-------------|
| `below_grade` | Scaffolded version for below-grade-level students |
| `on_grade` | Standard grade-level version |
| `above_grade` | Extended version for above-grade-level students |

### `submissions.status`

| Value | Description |
|-------|-------------|
| `draft` | Student has started but not submitted |
| `submitted` | Student has submitted (default) |
| `grading` | Teacher/AI is grading |
| `graded` | Grading complete |
| `returned` | Feedback returned to student |

### `feedback_drafts.status`

| Value | Description |
|-------|-------------|
| `draft` | AI-generated, awaiting teacher review (default) |
| `edited` | Teacher has made edits |
| `approved` | Teacher has approved |
| `sent` | Feedback sent to student |

### `mastery_records.level`

| Value | Score Range | Description |
|-------|------------|-------------|
| `beginning` | 20-49 | Minimal understanding |
| `developing` | 50-69 | Partial understanding |
| `proficient` | 70-84 | Meets grade-level expectations |
| `advanced` | 85-100 | Exceeds grade-level expectations |

### `ieps.status`

| Value | Description |
|-------|-------------|
| `draft` | In development (default) |
| `review` | Under review |
| `active` | Current, active IEP |
| `archived` | No longer active |

### `iep_goals.status`

| Value | Description |
|-------|-------------|
| `active` | Currently being tracked (default) |
| `met` | Goal achieved |
| `not_met` | Goal not achieved by end of period |
| `discontinued` | Goal removed from IEP |

### `compliance_deadlines.type`

| Value | Description |
|-------|-------------|
| `initial_eval` | Initial evaluation deadline |
| `annual_review` | Annual IEP review |
| `triennial` | Three-year re-evaluation |

### `messages.type`

| Value | Description |
|-------|-------------|
| `general` | Free-form message (default) |
| `progress_update` | Student progress report |
| `assignment_insight` | AI-generated assignment analysis |
| `weekly_digest` | Weekly summary of student activity |
| `alert` | Urgent or action-required notification |

### `messages.status`

| Value | Description |
|-------|-------------|
| `draft` | Not yet sent |
| `sent` | Sent to recipient (default) |
| `read` | Recipient has read the message |

### `report_cards.status`

| Value | Description |
|-------|-------------|
| `draft` | In progress (default) |
| `approved` | Reviewed and approved by teacher |

### `quiz_questions.type`

| Value | Description |
|-------|-------------|
| `multiple_choice` | Multiple choice with options |
| `short_answer` | Open short-form response |
| `essay` | Extended written response |
| `matching` | Matching pairs |
| `fill_blank` | Fill in the blank |

### `quiz_questions.blooms_level`

Bloom's Taxonomy levels used in seed data:

| Value |
|-------|
| `Remember` |
| `Understand` |
| `Apply` |
| `Analyze` |

(Higher levels `Evaluate` and `Create` are valid but not present in seed data.)

---

## 5. Seed Data Summary

The seed script (`src/lib/db/seed.ts`) populates the database with a realistic school scenario. All user passwords are `password123` (bcrypt-hashed).

### Users: 29 total

| Role | Count | Notable Users |
|------|-------|---------------|
| `teacher` | 3 | Ms. Rivera (8th ELA), Mr. Okafor (10th Bio), Mrs. Chen (3rd grade) |
| `sped_teacher` | 1 | Ms. Rodriguez (SPED case manager) |
| `admin` | 1 | Dr. Williams (district admin) |
| `parent` | 2 | Sarah Chen (parent of Aisha), Marcus Williams (parent of DeShawn) |
| `student` | 22 | Aisha Torres, DeShawn Williams, plus 20 additional students with diverse names |

### Organization

- **1 district:** Lincoln Unified School District (California)
- **2 schools:** Washington Middle School, Jefferson Elementary School
- **10 classes:** Rivera has 5 periods of 8th Grade ELA, Okafor has 3 periods of 10th Grade Biology, Chen has 1 3rd Grade All Subjects class, Rodriguez has 1 SPED Resource Room
- **~50 class memberships:** Teachers assigned to their classes, students distributed across periods. Aisha and DeShawn are in Rivera Period 1. DeShawn and Ethan (student) are also in Rodriguez's Resource Room.
- **2 parent-child links:** Sarah Chen &rarr; Aisha Torres, Marcus Williams &rarr; DeShawn Williams

### Standards: 16 total

- 8 ELA standards (8th grade, Common Core: RL.8.1-3, W.8.1-3, L.8.1-2)
- 5 Math standards (3rd grade: 3.OA.1-2, 3.NBT.1-2, 3.NF.1)
- 3 Science standards (10th grade: HS-LS1-1, HS-LS1-2, HS-LS1-3)

Standards are linked to classes via `class_standards`.

### Rubrics: 2

- Essay Writing Rubric (Rivera, 4 criteria: Thesis, Evidence Use, Organization, Language)
- Lab Report Rubric (Okafor, 4 criteria: Hypothesis, Methods, Data Analysis, Conclusion)

Each criterion has weight 0.25 and descriptors for all four levels (Beginning, Developing, Proficient, Advanced).

### Assignments: 9

| Teacher | Assignment | Type | Status |
|---------|-----------|------|--------|
| Rivera | The American Dream Essay | essay | grading |
| Rivera | Poetry Analysis: The Road Not Taken | essay | completed |
| Rivera | Narrative Writing: A Turning Point | essay | grading |
| Okafor | Cell Structure Lab Report | lab_report | published |
| Okafor | Genetics and Heredity Lab | lab_report | completed |
| Okafor | Ecosystem Research Poster | essay | published |
| Chen | Fractions Word Problems | short_answer | published |
| Chen | Multiplication Stories | short_answer | completed |
| Chen | Reading Response: Charlotte's Web | essay | grading |

### Submissions: ~34

- 7 American Dream essay submissions (1 excellent, 2 proficient, 2 developing, 1 beginning, 1 proficient) -- all status "submitted"
- 5 Poetry Analysis submissions -- graded with scores, criterion scores, and approved feedback
- 6 Narrative Writing submissions -- status "submitted" with draft feedback for first 3
- 6 Genetics Lab submissions -- graded with scores and approved feedback
- 5 Multiplication Stories submissions -- graded with scores
- 5 Reading Response submissions -- status "submitted" with draft feedback for first 2

### Feedback Drafts: ~22

Mix of draft and approved statuses. Each includes AI-generated feedback text, strengths (JSON array), improvements (JSON array), and next steps (JSON array).

### Criterion Scores: 20

Per-criterion rubric scores for the 5 Poetry Analysis submissions (4 criteria each).

### IEPs: 2

- **DeShawn Williams:** SLD in reading. Active IEP with present levels, 8 accommodations, 1 modification, 2 related services. 2 goals (Reading Fluency, Written Expression).
- **Ethan Nakamura:** ADHD (inattentive). Active IEP with present levels, 8 accommodations, no modifications, 1 related service. 1 goal (Organization and Task Completion).

### Progress Data Points: 26

- DeShawn Reading Fluency: 12 bi-weekly data points (85 to 99 wpm over 6 months)
- DeShawn Written Expression: 6 monthly data points (2.0 to 2.5-3.0 rubric scores)
- Ethan Organization: 8 weekly data points (45% to 65% completion rate)

### Compliance Deadlines: 3

- DeShawn: annual review, triennial re-evaluation
- Ethan: annual review

### Mastery Records: ~150+

Records across all students for ELA, Math, and Science standards. Levels span beginning through advanced with scores computed per level range.

### Lesson Plans: 6

- Rivera: Analyzing Persuasive Techniques in Media, Introduction to Poetry: Figurative Language, Argumentative Writing Workshop
- Okafor: Cell Division: Mitosis and Meiosis, Introduction to Genetics and Heredity
- Chen: Multiplying by Multiples of 10

Each plan includes warm-up, direct instruction, guided practice, independent practice, closure, materials, differentiation (3 tiers), and assessment plan.

### Tutor Sessions: 5

Socratic-style AI tutoring conversations:
- Aisha: Math (Linear Equations)
- DeShawn: ELA (Main Idea and Supporting Details)
- Jayden: Science (Cell Structure)
- Sofia: ELA (Thesis Statement Writing)
- Priya: Math (Fractions)

Each session stores the full message history as a JSON array in the `messages` column.

### Messages: 10

Parent-teacher and staff communications including progress updates, weekly digests, assignment insights, alerts, and general replies. Mix of AI-generated and human-written messages across Rivera, Rodriguez, Sarah Chen, and Marcus Williams.

### Report Cards: 5

Report cards for Fall 2025, all for Rivera Period 1 students (Aisha, DeShawn, Jayden, Sofia, Ethan). Four approved, one draft. Each includes a narrative, strengths, areas for growth, recommendations, and a grade recommendation.

### Quizzes: 2

- ELA Vocabulary: Unit 3 (10 questions, 20-minute time limit)
- Cell Biology Review (8 questions, 25-minute time limit)

Questions are a mix of multiple choice and short answer, with Bloom's taxonomy levels, point values, and explanations.
