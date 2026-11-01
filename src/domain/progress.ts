import type { Day, Entry } from './entry'

// Estimated one-rep max (kg) with the Epley formula: w × (1 + reps / 30).
// A single rep is already a 1RM, so it is returned as is.
export function estimate1RM(weightKg: number, reps: number): number {
  if (reps <= 1) return weightKg
  return weightKg * (1 + reps / 30)
}

export interface CurrentEstimate {
  latest: Entry
  estimated1RM: number
  // Latest estimated 1RM minus the previous entry's. Undefined with only one entry.
  change: number | undefined
}

// Where an exercise stands now: its latest entry's estimated 1RM, and the change since the entry before.
// Undefined when there are no entries. Entries may come in any order.
export function currentEstimate(entries: readonly Entry[]): CurrentEstimate | undefined {
  const [latest, previous] = [...entries].sort((a, b) => b.day.localeCompare(a.day))
  if (!latest) return undefined
  const estimated1RM = estimate1RM(latest.weightKg, latest.reps)
  const change = previous ? estimated1RM - estimate1RM(previous.weightKg, previous.reps) : undefined
  return { latest, estimated1RM, change }
}

// One point on the progress chart.
export interface ProgressPoint {
  day: Day
  estimated1RM: number
}

// The chart's points: one per entry, oldest day first. Entries may come in any order.
export function progress(entries: readonly Entry[]): ProgressPoint[] {
  return entries
    .toSorted((a, b) => a.day.localeCompare(b.day))
    .map((entry) => ({ day: entry.day, estimated1RM: estimate1RM(entry.weightKg, entry.reps) }))
}
