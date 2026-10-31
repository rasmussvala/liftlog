// The user's local calendar date, as "YYYY-MM-DD" (e.g. "2026-10-31").
export type Day = string

// The best set the user did for one exercise on one day. At most one per exercise per day (ADR 0001).
// Stores what was lifted, never the estimated 1RM.
export interface Entry {
  id: number
  exerciseId: number
  day: Day
  weightKg: number
  reps: number
}
