export { generateRubric } from './generate-rubric'
export type { RubricInput, GeneratedRubric } from './generate-rubric'

export { generateLessonPlan } from './generate-lesson-plan'
export type { LessonPlanInput, GeneratedLessonPlan } from './generate-lesson-plan'

export { generateSmartAssignment } from './generate-assignment'
export type { SmartAssignmentInput, GeneratedSmartAssignment } from './generate-assignment'

export { generateQuiz } from './generate-quiz'
export type { QuizInput, GeneratedQuiz } from './generate-quiz'

export { differentiateContent } from './differentiate'
export type { DifferentiateInput, DifferentiatedContent } from './differentiate'

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
