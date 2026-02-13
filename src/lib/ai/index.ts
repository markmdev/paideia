export { generateRubric } from './generate-rubric'
export type { RubricInput, GeneratedRubric } from './generate-rubric'

export { generateLessonPlan } from './generate-lesson-plan'
export type { LessonPlanInput, GeneratedLessonPlan } from './generate-lesson-plan'

export { generateSmartAssignment } from './generate-assignment'
export type { SmartAssignmentInput, GeneratedSmartAssignment } from './generate-assignment'

export { generateQuiz } from './generate-quiz'
export type { QuizInput, GeneratedQuiz } from './generate-quiz'

export { differentiateContent, assessmentDrivenDifferentiation } from './differentiate'
export type {
  DifferentiateInput,
  DifferentiatedContent,
  AssessmentDifferentiationInput,
  TierActivity,
  AssessmentDifferentiationResult,
} from './differentiate'

export { gradeSubmission, batchGradeSubmissions } from './grade-submission'
export type {
  GradeSubmissionInput,
  GradingResult,
  BatchSubmission,
  BatchGradingResult,
} from './grade-submission'

export {
  generatePresentLevels,
  generateIEPGoals,
  generateAccommodations,
  generateProgressNarrative,
} from './iep-service'
export type {
  PresentLevelsInput,
  GeneratedPresentLevels,
  IEPGoalInput,
  GeneratedIEPGoal,
  AccommodationsInput,
  GeneratedAccommodations,
  ProgressNarrativeInput,
  GeneratedProgressNarrative,
} from './iep-service'

export {
  generateParentProgressNarrative,
  generateWeeklyDigest,
  translateCommunication,
} from './parent-communication'
export type {
  ProgressNarrativeInput as ParentProgressNarrativeInput,
  GeneratedParentProgressNarrative,
  WeeklyDigestInput,
  GeneratedWeeklyDigest,
  TranslationInput,
  TranslatedContent,
} from './parent-communication'

export { streamTutorResponse } from './tutor'
export type { TutorInput } from './tutor'

export { generateReportCardNarrative } from './report-card'
export type {
  ReportCardInput,
  GeneratedReportCard,
} from './report-card'

export { generateDistrictInsights } from './district-insights'
export type {
  DistrictSnapshot,
  DistrictInsights,
} from './district-insights'

export { generateExitTicket } from './generate-exit-ticket'
export type {
  ExitTicketInput,
  GeneratedExitTicket,
} from './generate-exit-ticket'

export { generateStudentInterventions } from './early-warning'
export type {
  FlaggedStudent,
  StudentIntervention,
  StudentInterventionsResult,
} from './early-warning'

export { generateReteachActivities } from './mastery-gaps'
export type {
  GapData,
  ReteachRecommendation,
  ReteachActivitiesResult,
} from './mastery-gaps'
