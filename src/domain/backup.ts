// The Backup file (ADR 0002): every exercise and entry, for the user to keep outside the app.
import type { Day, Entry } from './entry'
import type { Exercise } from './exercise'

// Bump it, and teach the import to upgrade the old shape, whenever stored data changes.
export const BACKUP_VERSION = 1

// The version-1 file. Exercises in the user's order on Home, entries oldest first.
// No database ids (they only mean something on one phone) and no Estimated 1RM (worked out from entries).
export interface BackupData {
  version: typeof BACKUP_VERSION
  // When the user exported it, as an ISO 8601 timestamp.
  exportedAt: string
  exercises: { name: string; entries: Pick<Entry, 'day' | 'weightKg' | 'reps'>[] }[]
}

// Turns the user's exercises, each with all its entries, into a Backup. Give the exercises in the
// user's order and the entries oldest first, as the store lists them: the Backup keeps both orders.
export function buildBackup(exercises: { exercise: Exercise; entries: Entry[] }[], exportedAt: Date): BackupData {
  return {
    version: BACKUP_VERSION,
    exportedAt: exportedAt.toISOString(),
    exercises: exercises.map(({ exercise, entries }) => ({
      name: exercise.name,
      entries: entries.map(({ day, weightKg, reps }) => ({ day, weightKg, reps })),
    })),
  }
}

// The file's text: indented, so a person can read it, ending with a newline.
export function serializeBackup(data: BackupData): string {
  return `${JSON.stringify(data, null, 2)}\n`
}

// "liftlog-backup-2026-11-07.json", for the user's local day, so backups can be told apart.
export function backupFileName(day: Day): string {
  return `liftlog-backup-${day}.json`
}
