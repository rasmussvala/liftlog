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

const seedStarterExercises = (tx: Transaction) =>
  tx.table('exercises').bulkAdd(STARTER_EXERCISES.map((name) => ({ name })))

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

  // A brand-new database: seed once. Never on later launches, so deleted exercises stay deleted.
  db.on('populate', seedStarterExercises)

  return db
}

export function createDexieLogbookStore(name = 'liftlog'): LogbookStore {
  const db = openDb(name)
  return {
    listExercises: () => db.exercises.orderBy('id').toArray(),
    listEntries: (exerciseId) =>
      db.entries.where('[exerciseId+day]').between([exerciseId, Dexie.minKey], [exerciseId, Dexie.maxKey]).toArray(),
    addEntry: async (entry) => {
      const id = await db.entries.add(entry as Entry)
      return { ...entry, id }
    },
  }
}
