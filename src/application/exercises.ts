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

// Renames an exercise without changing its entries. Its current name is excluded from validation,
// so the user can adjust capitalization without colliding with itself.
export async function renameExercise(store: LogbookStore, id: number, name: string): Promise<void> {
  const exercise = await store.getExercise(id)
  if (!exercise) return

  const others = (await store.listExercises()).filter((other) => other.id !== id).map((other) => other.name)
  const check = validateExerciseName(name, others)
  if (check.problem) throw new RangeError(`Can't rename an exercise to "${name}": ${check.problem}`)
  await store.renameExercise(id, check.name)
}

// Removes an exercise and all its entries. The store performs both deletions in one transaction.
export function deleteExercise(store: LogbookStore, id: number): Promise<void> {
  return store.deleteExercise(id)
}
