# Mastery Tracking, Gap Analysis, and Early Warning System

Behavioral specification for standards-based mastery tracking, AI-powered gap analysis with reteach recommendations, early warning risk detection with AI-generated interventions, mastery heatmap reporting, and student self-service progress.

---

## Mastery Records — GET /api/mastery

### 1. Unauthenticated request to mastery list returns 401

**Given** no user is signed in

**When** a request is sent to GET /api/mastery

**Then** the response status is 401
**And** the response body contains `{ "error": "Unauthorized" }`

---

### 2. Request without classId or studentId returns 400

**Given** a teacher "Ms. Rivera" is signed in with role "teacher"

**When** she sends GET /api/mastery with no query parameters

**Then** the response status is 400
**And** the response body contains an error mentioning "classId or studentId"

---

### 3. Teacher who is not a member of the class gets 403

**Given** a teacher "Ms. Rivera" is signed in with role "teacher"
**And** a class "Period 2 Biology" exists that she does not teach

**When** she sends GET /api/mastery?classId=[that class ID]

**Then** the response status is 403
**And** the response body contains an error matching "Not a teacher"

---

### 4. Teacher retrieves mastery records for a class

**Given** a teacher "Ms. Rivera" is signed in with role "teacher"
**And** she teaches a class "Period 1 ELA" with students "Aisha Torres" and "DeShawn Williams"
**And** mastery records exist for both students on standard "ELA.W.8.1" (Write arguments)
  - Aisha: level "advanced", score 95
  - DeShawn: level "beginning", score 30

**When** she sends GET /api/mastery?classId=[the class ID]

**Then** the response status is 200
**And** the response body contains a `students` array with 2 entries
**And** each student entry has fields: `studentId` (string), `studentName` (string), `standards` (array)
**And** each standard entry has fields: `standardId` (string), `standardCode` (string), `standardDescription` (string), `level` (string), `score` (number), `status` (string: "red" | "yellow" | "green"), `assessedAt` (ISO 8601 timestamp)
**And** the response body contains a `standardsList` array with entries having: `id`, `code`, `description`, `subject`, `gradeLevel`, `domain`

---

### 5. Traffic-light status mapping is correct

**Given** mastery records exist with these levels:
  - "advanced" (score 95)
  - "proficient" (score 80)
  - "developing" (score 55)
  - "beginning" (score 30)

**When** the mastery list is retrieved

**Then** "advanced" maps to status "green"
**And** "proficient" maps to status "green"
**And** "developing" maps to status "yellow"
**And** "beginning" maps to status "red"

---

### 6. Filter mastery by studentId without needing classId

**Given** a teacher "Ms. Rivera" is signed in with role "teacher"
**And** student "Aisha Torres" has mastery records on standards "ELA.W.8.1" and "ELA.RI.8.2"

**When** she sends GET /api/mastery?studentId=[Aisha's ID]

**Then** the response status is 200
**And** the `students` array has exactly 1 entry for Aisha
**And** Aisha's `standards` array has 2 entries

---

### 7. Filter mastery by classId and standardId

**Given** a teacher "Ms. Rivera" teaches a class with 3 students
**And** all 3 students have mastery records on standard "ELA.W.8.1"
**And** 2 of them also have records on "ELA.RI.8.2"

**When** she sends GET /api/mastery?classId=[class ID]&standardId=[ELA.W.8.1 ID]

**Then** the response status is 200
**And** only records for standard "ELA.W.8.1" are returned
**And** no records for "ELA.RI.8.2" appear in the response

---

### 8. Empty class returns empty students array

**Given** a teacher "Ms. Rivera" teaches a class with no students enrolled

**When** she sends GET /api/mastery?classId=[that class ID]

**Then** the response status is 200
**And** the `students` array is empty
**And** the `standards` array is empty

---

### 9. Multiple mastery records per student-standard pair returns only the most recent

**Given** a student "Aisha Torres" has two mastery records for standard "ELA.W.8.1":
  - Record 1: level "developing", score 55, assessedAt "2025-09-01"
  - Record 2: level "proficient", score 82, assessedAt "2025-10-15"

**When** mastery data is retrieved for Aisha

**Then** only the most recent record appears (level "proficient", score 82, assessedAt "2025-10-15")
**And** the earlier "developing" record is not included in the response

---

## Mastery Update — POST /api/mastery/update

### 10. Unauthenticated request to mastery update returns 401

**Given** no user is signed in

**When** a request is sent to POST /api/mastery/update

**Then** the response status is 401

---

### 11. Missing required fields returns 400

**Given** a teacher "Ms. Rivera" is signed in with role "teacher"

**When** she sends POST /api/mastery/update with body `{}`

**Then** the response status is 400
**And** the response body contains an error mentioning "submissionId" and "criterionScores"

---

### 12. Mastery update creates records from graded submission criteria

**Given** a teacher "Ms. Rivera" is signed in with role "teacher"
**And** a student submission "sub-001" exists for student "Aisha Torres"
**And** the rubric has criterion "Thesis" mapped to standard "ELA.W.8.1" and criterion "Evidence" mapped to standard "ELA.RI.8.2"

**When** she sends POST /api/mastery/update with body:
  - submissionId: "sub-001"
  - criterionScores:
    - { criterionId: [Thesis criterion ID], score: 8, maxScore: 10 }
    - { criterionId: [Evidence criterion ID], score: 6, maxScore: 10 }

**Then** the response status is 201
**And** the response body contains `created: 2`
**And** the `records` array has 2 entries, one per standard

---

### 13. Score-to-level thresholds are applied correctly

**Given** mastery updates are processed with these score/maxScore pairs

**When** scores are converted to mastery levels

**Then** 90-100% maps to level "advanced"
**And** 70-89% maps to level "proficient"
**And** 50-69% maps to level "developing"
**And** 0-49% maps to level "beginning"
**And** a maxScore of 0 always maps to level "beginning"

---

### 14. Multiple criteria mapping to the same standard are aggregated

**Given** a rubric has two criteria ("Thesis" and "Organization") both mapped to standard "ELA.W.8.1"
**And** a submission is graded: Thesis 7/10, Organization 9/10

**When** POST /api/mastery/update is called for that submission

**Then** only one mastery record is created for "ELA.W.8.1"
**And** the score is calculated from the combined totals: (7+9)/(10+10) = 80%
**And** the level is "proficient"
**And** the notes field mentions both criterion names

---

### 15. Criteria without a standard mapping are skipped

**Given** a rubric has criterion "Thesis" mapped to standard "ELA.W.8.1" and criterion "Formatting" with no standard mapping (standardId is null)

**When** POST /api/mastery/update is called with scores for both criteria

**Then** only 1 mastery record is created (for "ELA.W.8.1")
**And** "Formatting" does not generate a mastery record

---

### 16. Submission not found returns 404

**Given** a teacher "Ms. Rivera" is signed in with role "teacher"

**When** she sends POST /api/mastery/update with submissionId "nonexistent-id" and valid criterionScores

**Then** the response status is 404
**And** the response body contains `{ "error": "Submission not found" }`

---

## Gap Analysis — GET /api/mastery/gaps

### 17. Unauthenticated request to gap analysis returns 401

**Given** no user is signed in

**When** a request is sent to GET /api/mastery/gaps

**Then** the response status is 401

---

### 18. Missing classId returns 400

**Given** a teacher "Ms. Rivera" is signed in with role "teacher"

**When** she sends GET /api/mastery/gaps with no query parameters

**Then** the response status is 400
**And** the response body contains an error mentioning "classId"

---

### 19. Teacher not in the class gets 403

**Given** a teacher "Ms. Rivera" is signed in with role "teacher"
**And** a class "Period 2 Biology" exists that she does not teach

**When** she sends GET /api/mastery/gaps?classId=[that class ID]

**Then** the response status is 403
**And** the response body contains an error matching "Not a teacher"

---

### 20. Gap analysis identifies standards where majority is below proficient

**Given** a teacher "Ms. Rivera" teaches a class of 4 students
**And** for standard "ELA.W.8.1": 3 of 4 students are "beginning" or "developing" (75% below proficient)
**And** for standard "ELA.RI.8.2": 1 of 4 students is "developing" (25% below proficient)

**When** she sends GET /api/mastery/gaps?classId=[class ID]

**Then** the response status is 200
**And** the response body contains:
  - `classSize`: 4
  - `gaps`: an array sorted by `belowProficientPercent` descending
**And** the entry for "ELA.W.8.1" has `isGap: true` and `belowProficientPercent: 75`
**And** the entry for "ELA.RI.8.2" has `isGap: false` and `belowProficientPercent: 25`
**And** the `recommendations` array is empty (since withRecommendations was not requested)

---

### 21. Gap threshold is >50% below proficient

**Given** a class of 10 students on a standard:
  - 5 students are "beginning" or "developing"
  - 5 students are "proficient" or "advanced"
  (exactly 50% below proficient)

**When** gap analysis runs for this class

**Then** the standard has `isGap: false` (threshold is strictly greater than 50%)

---

### 22. Each gap entry contains full detail

**Given** a gap exists for standard "ELA.W.8.1" in a class of 6 students

**When** gap analysis is retrieved

**Then** each gap entry contains:
  - `standardId` (string)
  - `standardCode` (string, e.g. "ELA.W.8.1")
  - `standardDescription` (string)
  - `subject` (string)
  - `domain` (string or null)
  - `classSize` (integer)
  - `assessedCount` (integer, students assessed on this standard)
  - `belowProficientCount` (integer)
  - `proficientOrAboveCount` (integer)
  - `belowProficientPercent` (integer, rounded)
  - `averageScore` (number, rounded to 1 decimal)
  - `studentsBelow` (array of { studentId, studentName, level, score })
  - `isGap` (boolean)

---

### 23. Gap analysis with AI recommendations returns reteach suggestions

**Given** a teacher "Ms. Rivera" teaches a class with gaps on standards "ELA.W.8.1" and "ELA.RI.8.2"

**When** she sends GET /api/mastery/gaps?classId=[class ID]&withRecommendations=true

**Then** the response status is 200
**And** the `recommendations` array contains entries for each gap standard
**And** each recommendation has:
  - `standardCode` (string matching the gap standard)
  - `activities` (array of 2-3 strings, each a classroom-ready activity)
  - `groupingStrategy` (string describing how to group students)

---

### 24. Empty class returns empty gaps

**Given** a teacher teaches a class with no students

**When** she sends GET /api/mastery/gaps?classId=[class ID]

**Then** the response status is 200
**And** `classSize` is 0
**And** `gaps` is an empty array

---

### 25. AI recommendation failure degrades gracefully

**Given** a class has gap standards
**And** the AI service fails when generating reteach recommendations

**When** gap analysis is requested with `withRecommendations=true`

**Then** the response status is 200
**And** the `gaps` array is still populated correctly
**And** the `recommendations` array is empty
**And** the request does not return a 500 error

---

## Early Warning — GET /api/early-warning

### 26. Unauthenticated request to early warning returns 401

**Given** no user is signed in

**When** a request is sent to GET /api/early-warning

**Then** the response status is 401
**And** the response body contains `{ "error": "Unauthorized" }`

---

### 27. Student role gets 403 forbidden

**Given** a student "Aisha Torres" is signed in with role "student"

**When** she sends GET /api/early-warning

**Then** the response status is 403
**And** the response body contains `{ "error": "Forbidden" }`

---

### 28. Parent role gets 403 forbidden

**Given** a parent "Sarah Chen" is signed in with role "parent"

**When** she sends GET /api/early-warning

**Then** the response status is 403
**And** the response body contains `{ "error": "Forbidden" }`

---

### 29. Teacher sees only their own students

**Given** a teacher "Ms. Rivera" is signed in with role "teacher"
**And** she teaches classes containing students "Aisha Torres" and "DeShawn Williams"
**And** a different teacher's class contains student "Carlos Mendez"

**When** she sends GET /api/early-warning

**Then** the response status is 200
**And** the `students` array contains entries for "Aisha Torres" and "DeShawn Williams"
**And** "Carlos Mendez" does not appear in the response

---

### 30. Admin sees all students

**Given** an admin "Mr. Williams" is signed in with role "admin"
**And** students exist across multiple teachers' classes

**When** he sends GET /api/early-warning

**Then** the response status is 200
**And** the `students` array contains all students in the system

---

### 31. Each student entry has the correct structure

**Given** a teacher retrieves early warning data

**When** the response is returned

**Then** each student entry contains:
  - `id` (string)
  - `name` (string)
  - `email` (string)
  - `riskLevel` (one of: "high_risk", "moderate_risk", "on_track")
  - `indicators` (array of strings)
  - `recentScores` (array of numbers, percentages)
  - `trendDirection` (one of: "declining", "stable", "improving")

---

### 32. Risk level is determined by indicator count

**Given** a student has the following indicators triggered:
  - "Declining score trend"
  - "3 standards below proficient"
  - "2 missing submissions"
  - "Average score below 70%"

**When** early warning analysis runs

**Then** 3 or more indicators results in `riskLevel: "high_risk"`
**And** exactly 2 indicators results in `riskLevel: "moderate_risk"`
**And** 0 or 1 indicators results in `riskLevel: "on_track"`

---

### 33. Indicator: declining score trend

**Given** a student has 6 recent graded submissions, sorted newest first: [55, 60, 58, 75, 80, 78]
**And** the recent half average (55, 60, 58 = ~57.7) is more than 5 points lower than the older half average (75, 80, 78 = ~77.7)

**When** early warning analysis runs

**Then** the student's indicators include "Declining score trend"
**And** `trendDirection` is "declining"

---

### 34. Indicator: standards below proficient

**Given** a student has mastery records from the last 30 days:
  - Standard A: score 40, level "beginning"
  - Standard B: score 60, level "developing"
  - Standard C: score 85, level "proficient"

**When** early warning analysis runs

**Then** the student's indicators include "2 standards below proficient"

---

### 35. Indicator: missing submissions

**Given** a student is enrolled in a class with 3 recent assignments
**And** the student has submitted only 1 of those assignments

**When** early warning analysis runs

**Then** the student's indicators include "2 missing submissions"

---

### 36. Indicator: low average score

**Given** a student's graded submissions have an average score below 70%

**When** early warning analysis runs

**Then** the student's indicators include "Average score below 70%"

---

### 37. Score trend: improving

**Given** a student has 6 recent graded submissions, sorted newest first: [85, 88, 82, 65, 60, 70]
**And** the recent half average (~85) is more than 5 points above the older half average (~65)

**When** early warning analysis runs

**Then** `trendDirection` is "improving"
**And** "Declining score trend" does not appear in indicators

---

### 38. Score trend requires at least 3 submissions

**Given** a student has only 2 graded submissions

**When** early warning analysis runs

**Then** `trendDirection` is "stable" (insufficient data for trend detection)
**And** "Declining score trend" does not appear in indicators

---

### 39. Students are sorted by risk level: high risk first

**Given** three students exist:
  - Student A: high_risk (3 indicators)
  - Student B: on_track (0 indicators)
  - Student C: moderate_risk (2 indicators)

**When** early warning data is returned

**Then** the `students` array is ordered: Student A, Student C, Student B

---

### 40. AI-generated interventions are attached to flagged students

**Given** a teacher retrieves early warning data
**And** students are flagged as "high_risk" or "moderate_risk"

**When** the AI intervention service succeeds

**Then** each flagged student has a `recommendations` array with 2-3 specific, actionable intervention strings
**And** students with `riskLevel: "on_track"` do not have recommendations

---

### 41. AI intervention uses anonymized student labels

**Given** flagged students are sent to the AI for intervention recommendations

**When** the AI service is called

**Then** students are identified as "Student A", "Student B", etc. (anonymized labels)
**And** no student names or emails are sent to the AI service
**And** the AI responses are mapped back to actual students using the anonymized labels

---

### 42. AI intervention failure degrades gracefully

**Given** students are flagged as at-risk
**And** the AI intervention service throws an error

**When** early warning data is returned

**Then** the response status is 200
**And** flagged students are returned without the `recommendations` field
**And** all other data (riskLevel, indicators, recentScores, trendDirection) is present

---

### 43. Teacher with no classes sees empty students array

**Given** a teacher "Ms. Rivera" is signed in with role "teacher"
**And** she has no class memberships

**When** she sends GET /api/early-warning

**Then** the response status is 200
**And** the `students` array is empty

---

### 44. SPED teacher role is allowed access

**Given** a SPED teacher "Ms. Rodriguez" is signed in with role "sped_teacher"

**When** she sends GET /api/early-warning

**Then** the response status is 200 (not 403)
**And** she sees students from her classes

---

## Student Self-Service Progress — GET /api/student/progress

### 45. Unauthenticated request returns 401

**Given** no user is signed in

**When** a request is sent to GET /api/student/progress

**Then** the response status is 401

---

### 46. Non-student role gets 403

**Given** a teacher "Ms. Rivera" is signed in with role "teacher"

**When** she sends GET /api/student/progress

**Then** the response status is 403
**And** the response body contains an error mentioning "student role required"

---

### 47. Student retrieves their own progress data

**Given** a student "Aisha Torres" is signed in with role "student"
**And** she has graded submissions and mastery records

**When** she sends GET /api/student/progress

**Then** the response status is 200
**And** the response body contains:
  - `overallAverage` (number or null, rounded integer)
  - `totalCompleted` (integer, count of graded submissions)
  - `masteryTrend` (one of: "improving", "stable", "declining")
  - `subjectMastery` (array of { subject, masteryLevel, score })
  - `recentSubmissions` (array, at most 20 entries)
  - `strengths` (array of strings, at most 5)
  - `areasForGrowth` (array of strings, at most 5)

---

### 48. Strengths include standards with score >= 80

**Given** a student has mastery records:
  - "Write arguments" with score 92 (strength)
  - "Analyze text structure" with score 85 (strength)
  - "Use correct grammar" with score 55 (not a strength)

**When** she retrieves her progress

**Then** the `strengths` array includes "Write arguments" and "Analyze text structure"
**And** "Use correct grammar" does not appear in strengths

---

### 49. Areas for growth include standards with score < 60

**Given** a student has mastery records:
  - "Write arguments" with score 92 (not an area for growth)
  - "Use correct grammar" with score 45 (area for growth)
  - "Cite evidence" with score 55 (area for growth)

**When** she retrieves her progress

**Then** the `areasForGrowth` array includes "Use correct grammar" and "Cite evidence"
**And** "Write arguments" does not appear in areasForGrowth

---

### 50. Mastery trend requires at least 4 records

**Given** a student has only 3 mastery records

**When** she retrieves her progress

**Then** `masteryTrend` is "stable" (insufficient data)

---

### 51. Mastery trend: improving when recent scores are 5+ points above older scores

**Given** a student has 8 mastery records, ordered newest first:
  - 4 recent records averaging score 88
  - 4 older records averaging score 72

**When** she retrieves her progress

**Then** `masteryTrend` is "improving"

---

### 52. Recent submissions are returned as score percentages

**Given** a student has a graded submission: totalScore 85, maxScore 100

**When** she retrieves her progress

**Then** the `recentSubmissions` entry has:
  - `assignmentTitle` (string)
  - `subject` (string)
  - `score`: 85 (rounded percentage)
  - `submittedAt` (ISO 8601 timestamp)

---

### 53. Subject mastery uses dominant level across standards

**Given** a student has mastery in "ELA":
  - Standard A: level "proficient"
  - Standard B: level "proficient"
  - Standard C: level "developing"

**When** she retrieves her progress

**Then** the ELA subjectMastery entry has `masteryLevel: "proficient"` (the most frequent level)

---

### 54. Student with no data gets empty progress

**Given** a student is signed in but has no graded submissions and no mastery records

**When** she sends GET /api/student/progress

**Then** the response status is 200
**And** `overallAverage` is null
**And** `totalCompleted` is 0
**And** `masteryTrend` is "stable"
**And** `subjectMastery` is an empty array
**And** `recentSubmissions` is an empty array
**And** `strengths` is an empty array
**And** `areasForGrowth` is an empty array

---

## Reports Page — /dashboard/reports

### 55. Reports page lists teacher's classes with mastery distribution bars

**Given** a teacher "Ms. Rivera" is signed in
**And** she teaches "Period 1 ELA" (15 students, mastery data exists) and "Period 3 ELA" (12 students)

**When** she navigates to /dashboard/reports

**Then** the page displays cards for each class she teaches
**And** each card shows the class name, subject, grade level, and student count
**And** classes with mastery data display a horizontal bar showing the proportion of Beginning (rose), Developing (amber), Proficient (emerald), and Advanced (blue) mastery levels
**And** each card shows average score percentage and total data point count

---

### 56. Class card with no mastery data shows placeholder text

**Given** a teacher teaches a class with students but no graded assignments

**When** she views the reports page

**Then** that class card displays "No mastery data yet" instead of a distribution bar

---

### 57. Reports page shows mastery level legend

**Given** a teacher navigates to /dashboard/reports

**Then** a legend is displayed with four levels:
  - Beginning (rose dot)
  - Developing (amber dot)
  - Proficient (emerald dot)
  - Advanced (blue dot)

---

## Mastery Heatmap — /dashboard/reports/[classId]

### 58. Heatmap page verifies teacher membership

**Given** a teacher "Ms. Rivera" is signed in
**And** she is not a member of class "c-999"

**When** she navigates to /dashboard/reports/c-999

**Then** a 404 Not Found page is displayed

---

### 59. Heatmap displays students on Y-axis and standards on X-axis

**Given** a teacher views the heatmap for "Period 1 ELA"
**And** the class has 3 students and 4 standards with mastery data

**When** the heatmap renders

**Then** each row represents a student (name displayed in left column)
**And** each column represents a standard (code displayed in header)
**And** the grid contains cells at each student-standard intersection

---

### 60. Heatmap cells are color-coded by mastery level

**Given** mastery data exists for a student-standard pair

**When** the heatmap renders

**Then** "beginning" cells are rose/pink colored
**And** "developing" cells are amber colored
**And** "proficient" cells are emerald/green colored
**And** "advanced" cells are blue colored
**And** cells with no assessment data are gray (stone-100 with a border)

---

### 61. Heatmap cells display the score number

**Given** a student has a mastery score of 82 on a standard

**When** the heatmap renders that cell

**Then** the cell displays "82" in white text over the color-coded background

---

### 62. Heatmap cell tooltip shows full detail

**Given** a student "Aisha Torres" has mastery on standard "ELA.W.8.1" with level "proficient", score 82, assessed on Oct 15 2025

**When** the user hovers over that cell

**Then** a tooltip appears showing:
  - "Aisha Torres - ELA.W.8.1"
  - "Level: Proficient"
  - "Score: 82%"
  - "Assessed: Oct 15, 2025"

---

### 63. Heatmap sort cycles through Name A-Z, Highest Avg, Lowest Avg

**Given** a teacher views the heatmap

**When** the sort button is clicked once

**Then** students are sorted by highest average score first (descending)
**And** the button label reads "Sort: Highest Avg"

**When** the sort button is clicked again

**Then** students are sorted by lowest average score first (ascending)
**And** the button label reads "Sort: Lowest Avg"

**When** the sort button is clicked a third time

**Then** students are sorted alphabetically by name A-Z
**And** the button label reads "Sort: Name A-Z"

---

### 64. Heatmap filters mastery to class subject only

**Given** a class "Period 1 ELA" has subject "ELA"
**And** student "Aisha Torres" has mastery records for both ELA and Math standards

**When** the heatmap for this class loads

**Then** only ELA standards appear in the heatmap columns
**And** Math standards are not displayed (no cross-subject leakage)

---

### 65. Heatmap student average column

**Given** a student has mastery scores of 80, 90, and 70 across 3 standards

**When** the heatmap renders

**Then** the rightmost "Avg" column displays "80%" for that student

---

### 66. Student with no mastery data shows N/A average

**Given** a student is enrolled in the class but has no mastery records

**When** the heatmap renders

**Then** all cells in that student's row are gray (no data)
**And** the "Avg" column displays "N/A"

---

## Gap Analysis Dialog — "Find Gaps" Button

### 67. "Find Gaps" button opens dialog with gap analysis data

**Given** a teacher is on /dashboard/reports/[classId]

**When** she clicks the "Find Gaps" button

**Then** a dialog opens with title "Standards Gap Analysis"
**And** the dialog description says "Standards where a majority of the class is below proficient."
**And** gap data is fetched from GET /api/mastery/gaps?classId=[classId]

---

### 68. Gap dialog shows each gap standard with detail

**Given** the gap analysis found 2 standards where >50% of the class is below proficient

**When** the dialog renders

**Then** it displays "Found 2 standards where more than half the class is below proficient."
**And** each gap shows: standard code, standard description, "X% below" badge, average score, and count "Y/Z below proficient"
**And** each gap lists the below-proficient students by name with their score percentage

---

### 69. Gap dialog "Get AI Reteach Recommendations" button

**Given** the gap dialog is open with gaps displayed
**And** no recommendations have been loaded yet

**When** the teacher clicks "Get AI Reteach Recommendations"

**Then** the system fetches GET /api/mastery/gaps?classId=[classId]&withRecommendations=true
**And** once loaded, each gap standard shows a "Reteach Suggestions" section
**And** each reteach suggestion lists 2-3 activities and a grouping strategy

---

### 70. Gap dialog when no gaps are found

**Given** all students in the class are at or above proficient on all standards

**When** the gap dialog opens

**Then** the dialog displays "No major gaps found. Most students are at or above proficient across assessed standards."

---

## Early Warning Dashboard — /dashboard/early-warning

### 71. Early warning page displays summary cards

**Given** a teacher navigates to /dashboard/early-warning
**And** her students include 2 high risk, 3 moderate risk, and 10 on track

**When** the page loads

**Then** four summary cards are displayed:
  - "Students Monitored": 15
  - "High Risk": 2 (red themed)
  - "Moderate Risk": 3 (amber themed)
  - "On Track": 10 (emerald/green themed)

---

### 72. Early warning table shows student rows with risk badges

**Given** the early warning data includes students at various risk levels

**When** the table renders

**Then** each row shows: student name, email, risk level badge, indicators as small badges, trend icon, and average score
**And** "High Risk" badges are red
**And** "Moderate" badges are amber
**And** "On Track" badges are emerald/green

---

### 73. Expanding a flagged student row shows AI intervention recommendations

**Given** a student "Aisha Torres" is flagged as "high_risk" with AI recommendations

**When** the teacher clicks on her row

**Then** the row expands to show an "AI Intervention Recommendations" section
**And** recommendations are displayed as a numbered list (1, 2, 3)
**And** each recommendation is a specific, actionable intervention step

---

### 74. On-track students without recommendations are not expandable

**Given** a student is "on_track" with no recommendations

**When** the table renders that student's row

**Then** the row does not show an expand/collapse chevron
**And** clicking the row does not expand it

---

### 75. Early warning page shows permission denied for students

**Given** a student "Aisha Torres" is signed in with role "student"

**When** she navigates to /dashboard/early-warning

**Then** the API returns 403
**And** the page displays the error message "You do not have permission to view this page."

---

### 76. Trend icons represent direction correctly

**Given** early warning data includes students with different trend directions

**When** the table renders

**Then** "declining" shows a downward trend icon in red
**And** "improving" shows an upward trend icon in emerald/green
**And** "stable" shows a flat line icon in gray

---

## Student Progress Dashboard — /dashboard/student-progress

### 77. Student progress page shows overall stats cards

**Given** a student "Aisha Torres" is signed in and has progress data
**And** her overall average is 78%, she has completed 12 assignments, and her trend is "improving"

**When** she navigates to /dashboard/student-progress

**Then** the page displays three stat cards:
  - "Average Score": "78%"
  - "Assignments Completed": "12"
  - "Mastery Trend": "Improving"

---

### 78. Student progress page shows "What I'm Good At" and "Areas to Improve"

**Given** a student has strengths ["Write arguments", "Analyze text structure"] and areas for growth ["Use correct grammar"]

**When** she views the student progress page

**Then** a "What I'm Good At" section lists "Write arguments" and "Analyze text structure" as badges in a green-themed card
**And** an "Areas to Improve" section lists "Use correct grammar" as a badge in an amber-themed card

---

### 79. Student progress page shows subject mastery with progress bars

**Given** a student has subject mastery:
  - ELA: 82% (proficient)
  - Math: 55% (developing)

**When** the page renders

**Then** ELA shows a card with "82%" and a green progress bar and the message "Great job -- keep it up!"
**And** Math shows a card with "55%" and a rose/red progress bar and the message "This is a growing area -- you can do it!"

---

### 80. Student progress page shows encouraging messaging based on trend

**Given** a student's mastery trend is "improving"

**When** the page loads

**Then** the subtitle reads "You're making great progress! Keep up the good work."

**Given** a student's mastery trend is "declining"

**Then** the subtitle reads "Every expert was once a beginner. Let's keep working at it!"

**Given** a student's mastery trend is "stable"

**Then** the subtitle reads "You're on a steady path. Consistency is the key to growth."

---

### 81. Student progress page with no data shows empty state

**Given** a student is signed in with no graded assignments or mastery records

**When** she navigates to /dashboard/student-progress

**Then** a message displays "No progress data yet"
**And** the subtitle says "Your progress will appear here as your work gets graded."

---

### 82. Recent work table shows last 20 graded submissions

**Given** a student has 25 graded submissions

**When** she views the progress page

**Then** the "Recent Work" table displays exactly 20 entries
**And** each entry shows: assignment title, subject, score percentage, and submission date
