// The Dexie database and the LogbookStore adapter. The only file that imports Dexie.
// Set up as in Dexie's React guide: https://dexie.org/docs/Tutorial/React
import Dexie, { type EntityTable, type Transaction } from 'dexie'
import type { LogbookStore } from '../../application/logbookStore'
import type { Entry } from '../../domain/entry'
import { STARTER_EXERCISES, type Exercise } from '../../domain/exercise'

type LogbookDb = Dexie & {
  exercises: EntityTable<Exercise, 'id'>
  entries: EntityTable<Entry, 'id'>
}

// Positions 0–5. The version 2 upgrade's seed stores them too: version 3's upgrade, which numbers
// every exercise, runs after it.
const seedStarterExercises = (tx: Transaction) =>
  tx.table('exercises').bulkAdd(STARTER_EXERCISES.map((name, position) => ({ name, position })))

function openDb(name: string): LogbookDb {
  const db = new Dexie(name) as LogbookDb

  // Schema: primary key first, then indexed fields.
  // Version 1 shipped with a `sets` table that never held real data.
  db.version(1).stores({
    exercises: '++id, name',
    sets: '++id, exerciseId, date, [exerciseId+date]',
  })
  // Version 2: drop `sets`, add `entries`. The unique [exerciseId+day] index makes the database
  // itself refuse a second entry for the same exercise and day (ADR 0001).
  db.version(2)
    .stores({
      sets: null,
      entries: '++id, exerciseId, &[exerciseId+day]',
    })
    .upgrade(async (tx) => {
      // A phone that opened version 1 has an empty database: seed it once here.
      if ((await tx.table('exercises').count()) === 0) await seedStarterExercises(tx)
    })
  // Version 3: exercises get a position, the user's order on Home. Existing ones are numbered
  // 0, 1, 2… in id order, so Home looks the same after the update.
  db.version(3)
    .stores({ exercises: '++id, name, position' })
    .upgrade(async (tx) => {
      let position = 0
      await tx
        .table('exercises')
        .toCollection()
        .modify((exercise: Exercise) => {
          exercise.position = position++
        })
    })

  // A brand-new database: seed once. Never on later launches, so deleted exercises stay deleted.
  db.on('populate', seedStarterExercises)

  return db
}

export function createDexieLogbookStore(name = 'liftlog'): LogbookStore {
  const db = openDb(name)
  return {
    listExercises: () => db.exercises.orderBy('position').toArray(),
    getExercise: (id) => db.exercises.get(id),
    addExercise: (name) =>
      db.transaction('rw', db.exercises, async () => {
        const last = await db.exercises.orderBy('position').last()
        const exercise = { name, position: last ? last.position + 1 : 0 }
        const id = await db.exercises.add(exercise as Exercise)
        return { ...exercise, id }
      }),
    listEntries: (exerciseId) =>
      db.entries.where('[exerciseId+day]').between([exerciseId, Dexie.minKey], [exerciseId, Dexie.maxKey]).toArray(),
    addEntry: async (entry) => {
      const id = await db.entries.add(entry as Entry)
      return { ...entry, id }
    },
    updateEntry: async (id, { weightKg, reps }) => {
      await db.entries.update(id, { weightKg, reps })
    },
    deleteEntry: (id) => db.entries.delete(id),
  }
}
