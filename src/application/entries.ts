import type { Entry } from '../domain/entry'
import type { Exercise } from '../domain/exercise'
import { estimate1RM } from '../domain/progress'
import type { LogbookStore } from './logbookStore'

export interface LogEntry {
  entry: Entry
  estimated1RM: number
}

export interface ExerciseLog {
  exercise: Exercise
  // Newest day first.
  entries: LogEntry[]
}

// One exercise and its history, for the exercise screen. 'not-found' when there's no exercise with this id.
export async function exerciseLog(store: LogbookStore, exerciseId: number): Promise<ExerciseLog | 'not-found'> {
  const exercise = await store.getExercise(exerciseId)
  if (!exercise) return 'not-found'
  const entries = await store.listEntries(exerciseId)
  return {
    exercise,
    entries: entries
      .toReversed()
      .map((entry) => ({ entry, estimated1RM: estimate1RM(entry.weightKg, entry.reps) })),
  }
}
