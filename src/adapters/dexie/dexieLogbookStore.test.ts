import 'fake-indexeddb/auto'
import Dexie from 'dexie'
import { describe, expect, it } from 'vitest'
import { createDexieLogbookStore } from './dexieLogbookStore'

// Opens a database the way the first deployed build did (version 1), then closes it.
async function createVersion1Db(name: string, exercises: string[]) {
  const db = new Dexie(name)
  db.version(1).stores({ exercises: '++id, name', sets: '++id, exerciseId, date, [exerciseId+date]' })
  await db.table('exercises').bulkAdd(exercises.map((n) => ({ name: n })))
  db.close()
}

describe('upgrading from version 1', () => {
  it('seeds the starter exercises when the old database has none', async () => {
    const name = `test-${crypto.randomUUID()}`
    await createVersion1Db(name, [])
    const exercises = await createDexieLogbookStore(name).listExercises()
    expect(exercises.map((e) => e.name)).toEqual(['Squat', 'Bench press', 'Deadlift', 'Overhead press', 'Barbell row', 'Pull-up'])
  })

  it('leaves existing exercises alone', async () => {
    const name = `test-${crypto.randomUUID()}`
    await createVersion1Db(name, ['Front squat'])
    const exercises = await createDexieLogbookStore(name).listExercises()
    expect(exercises.map((e) => e.name)).toEqual(['Front squat'])
  })
})

describe('LogbookStore', () => {
  it('rejects a second entry for the same exercise and day', async () => {
    const store = createDexieLogbookStore(`test-${crypto.randomUUID()}`)
    const [squat, bench] = await store.listExercises()
    await store.addEntry({ exerciseId: squat.id, day: '2026-10-01', weightKg: 100, reps: 5 })

    await expect(store.addEntry({ exerciseId: squat.id, day: '2026-10-01', weightKg: 110, reps: 3 })).rejects.toThrow()
    // Same day on another exercise is fine.
    await expect(store.addEntry({ exerciseId: bench.id, day: '2026-10-01', weightKg: 80, reps: 5 })).resolves.toBeDefined()
  })
})
