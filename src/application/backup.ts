import { buildBackup, type BackupData } from '../domain/backup'
import type { LogbookStore } from './logbookStore'

// Every exercise in the user's order, each with its entries. The caller passes the export time.
export async function exportBackup(store: LogbookStore, exportedAt: Date): Promise<BackupData> {
  const exercises = await store.listExercises()
  const withEntries = await Promise.all(
    exercises.map(async (exercise) => ({ exercise, entries: await store.listEntries(exercise.id) })),
  )
  return buildBackup(withEntries, exportedAt)
}
