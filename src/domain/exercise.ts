// A lift the user tracks, identified by a name they choose.
export interface Exercise {
  id: number
  name: string
  // Its place on Home, lowest first.
  position: number
}

// Added once, with no entries, on a brand-new install, so a new Home isn't empty.
export const STARTER_EXERCISES: readonly string[] = [
  'Squat',
  'Bench press',
  'Deadlift',
  'Overhead press',
  'Barbell row',
  'Pull-up',
]

// The longest name, after trimming, so names fit on a row.
export const MAX_EXERCISE_NAME = 40

export type ExerciseNameProblem = 'blank' | 'too-long' | 'taken'

// The name as checked by validateExerciseName: trimmed, or a problem code (the wording belongs to the UI).
export type ExerciseNameCheck = { name: string; problem?: never } | { name?: never; problem: ExerciseNameProblem }

// Checks a name as typed against the other exercises' names. Surrounding spaces are ignored, and a
// name that only differs in case from another is taken. For a rename, leave the exercise's own name
// out of otherNames, so changing only its case is fine. Checked in this order.
export function validateExerciseName(name: string, otherNames: readonly string[]): ExerciseNameCheck {
  const trimmed = name.trim()
  if (trimmed === '') return { problem: 'blank' }
  if (trimmed.length > MAX_EXERCISE_NAME) return { problem: 'too-long' }
  const lower = trimmed.toLowerCase()
  if (otherNames.some((other) => other.trim().toLowerCase() === lower)) return { problem: 'taken' }
  return { name: trimmed }
}
