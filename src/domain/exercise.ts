// A lift the user tracks, identified by a name they choose.
export interface Exercise {
  id: number
  name: string
}

// Added once, with no entries, when the app first runs, so Home isn't empty while adding exercises is WIP.
export const STARTER_EXERCISES: readonly string[] = [
  'Squat',
  'Bench press',
  'Deadlift',
  'Overhead press',
  'Barbell row',
  'Pull-up',
]
