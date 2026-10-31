// Local IndexedDB database, set up as in Dexie's React guide:
// https://dexie.org/docs/Tutorial/React
import Dexie, { type EntityTable } from 'dexie'

interface Exercise {
  id: number
  name: string
}

interface LoggedSet {
  id: number
  exerciseId: number
  date: number // when the set was done, as a Unix timestamp in ms
  weight: number // kg
  reps: number
}

const db = new Dexie('liftlog') as Dexie & {
  exercises: EntityTable<Exercise, 'id'>
  sets: EntityTable<LoggedSet, 'id'>
}

// Schema: primary key first, then indexed fields.
// [exerciseId+date] gives one exercise's sets in date order (chart, history).
db.version(1).stores({
  exercises: '++id, name',
  sets: '++id, exerciseId, date, [exerciseId+date]',
})

export type { Exercise, LoggedSet }
export { db }
