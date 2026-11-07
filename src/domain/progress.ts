import { MAX_REPS, MIN_REPS, type Day, type Entry } from './entry'

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

// Targets are rounded to this step, so they can be loaded with standard plates.
export const TARGET_STEP_KG = 2.5

// The lightest weight, in TARGET_STEP_KG steps, that at these reps gives an estimated 1RM above the current one.
export interface Target {
  reps: number
  weightKg: number
}

export interface Targets {
  // The current estimated 1RM, from the latest entry: every Target strictly beats it.
  beat: number
  // One per rep count from MIN_REPS to MAX_REPS, ascending.
  targets: Target[]
}

// What to lift next, from the latest entry. Undefined with no entries. Entries may come in any order.
export function targets(entries: readonly Entry[]): Targets | undefined {
  const current = currentEstimate(entries)
  if (!current) return undefined
  const beat = current.estimated1RM
  const rows: Target[] = []
  for (let reps = MIN_REPS; reps <= MAX_REPS; reps++) {
    // Epley backwards (estimate1RM of 1 kg is the multiplier), rounded up to the step.
    let weightKg = Math.ceil(beat / estimate1RM(1, reps) / TARGET_STEP_KG) * TARGET_STEP_KG
    // An exact landing (or floating-point error) only matches beat: go one step up.
    if (!(estimate1RM(weightKg, reps) > beat)) weightKg += TARGET_STEP_KG
    rows.push({ reps, weightKg })
  }
  return { beat, targets: rows }
}
