import type { Entry } from '../domain/entry'
import type { Exercise } from '../domain/exercise'

// The only port: how use cases reach storage. Dexie is its only adapter (ADR 0004).
export interface LogbookStore {
  // In the order they were added.
  listExercises(): Promise<Exercise[]>
  // One exercise's entries, oldest day first.
  listEntries(exerciseId: number): Promise<Entry[]>
  // Rejects a second entry for the same exercise and day (ADR 0001).
  addEntry(entry: Omit<Entry, 'id'>): Promise<Entry>
}
