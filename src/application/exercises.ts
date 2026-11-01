import { validateExerciseName, type Exercise } from '../domain/exercise'
import type { LogbookStore } from './logbookStore'

// The user's exercises, in their order on Home.
export function listExercises(store: LogbookStore): Promise<Exercise[]> {
  return store.listExercises()
}

// Adds an exercise at the bottom of Home, with the name trimmed, and returns it as stored.
// Refuses a name validateExerciseName wouldn't accept: the New exercise page never sends one.
export async function addExercise(store: LogbookStore, name: string): Promise<Exercise> {
  const others = (await store.listExercises()).map((exercise) => exercise.name)
  const check = validateExerciseName(name, others)
  if (check.problem) throw new RangeError(`Can't add an exercise named "${name}": ${check.problem}`)
  return store.addExercise(check.name)
}
