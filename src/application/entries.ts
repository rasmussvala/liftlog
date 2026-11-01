import { validateEntry, type Day, type Entry } from '../domain/entry'
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

export interface EntryInput {
  exerciseId: number
  day: Day
  weightKg: number
  reps: number
}

// Logs an entry, and returns it as stored. A day that already has an entry gets that entry updated,
// so there's still one per exercise per day (ADR 0001).
// Refuses values validateEntry wouldn't accept, and a day after today: the entry page never sends them.
export async function saveEntry(store: LogbookStore, input: EntryInput, today: Day): Promise<Entry> {
  const { exerciseId, day, weightKg, reps } = input
  if (day > today) throw new RangeError(`Can't log an entry for a day after today: ${day}`)
  // The same limits as the entry page: a number's shortest text form ("100.25") is what was typed.
  const check = validateEntry(String(weightKg), String(reps))
  if (check.weightKg === undefined || check.reps === undefined) {
    throw new RangeError(`Not a valid entry: ${weightKg} kg × ${reps}`)
  }
  const existing = (await store.listEntries(exerciseId)).find((entry) => entry.day === day)
  if (!existing) return store.addEntry(input)
  await store.updateEntry(existing.id, { weightKg, reps })
  return { ...existing, weightKg, reps }
}
