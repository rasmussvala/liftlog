// The Backup file (ADR 0002): every exercise and entry, for the user to keep outside the app.
import { validateEntry, type Day, type Entry } from './entry'
import { validateExerciseName, type Exercise, type ExerciseNameProblem } from './exercise'

// Bump it, and teach the import to upgrade the old shape, whenever stored data changes.
export const BACKUP_VERSION = 1

// The version-1 file. Exercises in the user's order on Home, entries oldest first.
// No database ids (they only mean something on one phone) and no Estimated 1RM (worked out from entries).
export interface BackupData {
  version: typeof BACKUP_VERSION
  // When the user exported it, as an ISO 8601 timestamp.
  exportedAt: string
  exercises: BackupExercise[]
}

// An exercise in a Backup: its name and what each of its entries records, oldest first.
export interface BackupExercise {
  name: string
  entries: BackupEntry[]
}

export type BackupEntry = Pick<Entry, 'day' | 'weightKg' | 'reps'>

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

// A file as read by parseBackup: the Backup with what the confirmation shows, or one problem code
// (the wording belongs to the UI).
export type BackupRead =
  | { backup: BackupData; exerciseCount: number; entryCount: number; exportedAt: Date; problem?: never }
  | { problem: BackupProblem; backup?: never }

// not-a-backup: not JSON, or not shaped like any Backup version.
// newer-version: made by a newer liftlog than this one, so the user should update the app.
// The rest are rules the app itself enforces
// (validateExerciseName, validateEntry, a valid Day, one entry per exercise per day), so a Backup
// can't hold anything the app wouldn't accept.
export type BackupProblem =
  | 'not-a-backup'
  | 'newer-version'
  | 'blank-name'
  | 'name-too-long'
  | 'duplicate-name'
  | 'bad-weight'
  | 'bad-reps'
  | 'bad-day'
  | 'duplicate-day'

const NAME_PROBLEMS: Record<ExerciseNameProblem, BackupProblem> = {
  blank: 'blank-name',
  'too-long': 'name-too-long',
  taken: 'duplicate-name',
}

// How to turn a file of each older version into the next version's shape, keyed by the old version.
// Version 1 is the only one so far. When version 2 comes, add 1: (file) => …the version-2 shape.
const UPGRADES: Record<number, (file: Record<string, unknown>) => Record<string, unknown>> = {}

// Reads a Backup file's text: checks the version, upgrades an older file, then checks the shape
// and the app's rules. Any problem rejects the whole file.
export function parseBackup(json: string): BackupRead {
  const file = parseJson(json)
  if (!isObject(file)) return { problem: 'not-a-backup' }
  const { version } = file
  if (typeof version !== 'number' || !Number.isInteger(version) || version < 1) return { problem: 'not-a-backup' }
  if (version > BACKUP_VERSION) return { problem: 'newer-version' }
  const upgraded = upgrade(file, version)
  if (!isBackupShape(upgraded)) return { problem: 'not-a-backup' }
  const checked = checkRules(upgraded)
  if (checked.problem) return { problem: checked.problem }
  const { backup } = checked
  return {
    backup,
    exerciseCount: backup.exercises.length,
    entryCount: backup.exercises.reduce((count, exercise) => count + exercise.entries.length, 0),
    exportedAt: new Date(backup.exportedAt),
  }
}

// The file with names trimmed, or the first rule it breaks.
function checkRules(file: BackupData): { backup: BackupData; problem?: never } | { problem: BackupProblem } {
  const names: string[] = []
  const exercises: BackupExercise[] = []
  for (const exercise of file.exercises) {
    const name = validateExerciseName(exercise.name, names)
    if (name.problem) return { problem: NAME_PROBLEMS[name.problem] }
    names.push(name.name)
    const entries = checkEntries(exercise.entries)
    if (entries.problem) return { problem: entries.problem }
    exercises.push({ name: name.name, entries: entries.entries })
  }
  return { backup: { version: BACKUP_VERSION, exportedAt: file.exportedAt, exercises } }
}

// One exercise's entries with only what an entry records, or the first rule they break.
function checkEntries(
  entries: BackupEntry[],
): { entries: BackupEntry[]; problem?: never } | { problem: BackupProblem } {
  const days = new Set<Day>()
  const checked: BackupEntry[] = []
  for (const { day, weightKg, reps } of entries) {
    const values = validateEntry(String(weightKg), String(reps))
    if (values.weightProblem) return { problem: 'bad-weight' }
    if (values.repsProblem) return { problem: 'bad-reps' }
    if (!isCalendarDay(day)) return { problem: 'bad-day' }
    if (days.has(day)) return { problem: 'duplicate-day' }
    days.add(day)
    checked.push({ day, weightKg, reps })
  }
  return { entries: checked }
}

// "YYYY-MM-DD" naming a day that exists, so "2026-02-30" isn't one.
function isCalendarDay(day: string): boolean {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(day)
  if (!match) return false
  const [year, month, date] = match.slice(1).map(Number)
  const parsed = new Date(Date.UTC(year, month - 1, date))
  return parsed.getUTCFullYear() === year && parsed.getUTCMonth() === month - 1 && parsed.getUTCDate() === date
}

function upgrade(file: Record<string, unknown>, version: number): Record<string, unknown> {
  let upgraded = file
  for (let from = version; from < BACKUP_VERSION; from++) upgraded = UPGRADES[from](upgraded)
  return upgraded
}

function parseJson(json: string): unknown {
  try {
    return JSON.parse(json)
  } catch {
    return undefined
  }
}

const isObject = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value)

// Shaped like the current version's file. Values are checked against the app's rules separately.
function isBackupShape(file: Record<string, unknown>): file is Record<string, unknown> & BackupData {
  const { exportedAt, exercises } = file
  if (typeof exportedAt !== 'string' || Number.isNaN(Date.parse(exportedAt))) return false
  return Array.isArray(exercises) && exercises.every(isExerciseShape)
}

function isExerciseShape(exercise: unknown): boolean {
  return (
    isObject(exercise) &&
    typeof exercise.name === 'string' &&
    Array.isArray(exercise.entries) &&
    exercise.entries.every(
      (entry) =>
        isObject(entry) &&
        typeof entry.day === 'string' &&
        typeof entry.weightKg === 'number' &&
        typeof entry.reps === 'number',
    )
  )
}
