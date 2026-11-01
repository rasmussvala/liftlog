import type { Entry } from '../domain/entry'
import type { Exercise } from '../domain/exercise'

// The only port: how use cases reach storage. Dexie is its only adapter (ADR 0004).
export interface LogbookStore {
  // In the order they were added.
  listExercises(): Promise<Exercise[]>
  // Undefined when there's no exercise with this id.
  getExercise(id: number): Promise<Exercise | undefined>
  // One exercise's entries, oldest day first.
  listEntries(exerciseId: number): Promise<Entry[]>
  // Rejects a second entry for the same exercise and day (ADR 0001).
  addEntry(entry: Omit<Entry, 'id'>): Promise<Entry>
  // Changes what an entry records. Its exercise and day never change.
  updateEntry(id: number, values: Pick<Entry, 'weightKg' | 'reps'>): Promise<void>
  // Removes an entry. An unknown id does nothing.
  deleteEntry(id: number): Promise<void>
}
