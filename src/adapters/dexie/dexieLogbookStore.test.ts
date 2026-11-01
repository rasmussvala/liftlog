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

// Opens a database at version 2 (exercises without a position), adds the given rows, then closes it.
async function createVersion2Db(name: string, exercises: { id: number; name: string }[], entries: object[]) {
  const db = new Dexie(name)
  db.version(1).stores({ exercises: '++id, name', sets: '++id, exerciseId, date, [exerciseId+date]' })
  db.version(2).stores({ sets: null, entries: '++id, exerciseId, &[exerciseId+day]' })
  await db.table('exercises').bulkAdd(exercises)
  await db.table('entries').bulkAdd(entries)
  db.close()
}

describe('upgrading from version 2', () => {
  it('numbers the exercises 0, 1, 2… in id order and leaves entries alone', async () => {
    const name = `test-${crypto.randomUUID()}`
    // Added out of id order on purpose.
    const entry = { id: 1, exerciseId: 7, day: '2026-10-01', weightKg: 100, reps: 5 }
    await createVersion2Db(name, [{ id: 7, name: 'Squat' }, { id: 2, name: 'Front squat' }, { id: 4, name: 'Dip' }], [entry])

    const store = createDexieLogbookStore(name)
    expect(await store.listExercises()).toEqual([
      { id: 2, name: 'Front squat', position: 0 },
      { id: 4, name: 'Dip', position: 1 },
      { id: 7, name: 'Squat', position: 2 },
    ])
    expect(await store.listEntries(7)).toEqual([entry])
  })
})

describe('a brand-new database', () => {
  it('seeds the starter exercises at positions 0–5', async () => {
    const exercises = await createDexieLogbookStore(`test-${crypto.randomUUID()}`).listExercises()
    expect(exercises.map((e) => [e.name, e.position])).toEqual([
      ['Squat', 0],
      ['Bench press', 1],
      ['Deadlift', 2],
      ['Overhead press', 3],
      ['Barbell row', 4],
      ['Pull-up', 5],
    ])
  })
})

describe('LogbookStore', () => {
  it('adds an exercise after the last position', async () => {
    const store = createDexieLogbookStore(`test-${crypto.randomUUID()}`)
    const added = await store.addExercise('Front squat')
    expect(added.position).toBe(6)
    const names = (await store.listExercises()).map((e) => e.name)
    expect(names.at(-1)).toBe('Front squat')
  })

  it('rejects a second entry for the same exercise and day', async () => {
    const store = createDexieLogbookStore(`test-${crypto.randomUUID()}`)
    const [squat, bench] = await store.listExercises()
    await store.addEntry({ exerciseId: squat.id, day: '2026-10-01', weightKg: 100, reps: 5 })

    await expect(store.addEntry({ exerciseId: squat.id, day: '2026-10-01', weightKg: 110, reps: 3 })).rejects.toThrow()
    // Same day on another exercise is fine.
    await expect(store.addEntry({ exerciseId: bench.id, day: '2026-10-01', weightKg: 80, reps: 5 })).resolves.toBeDefined()
  })
})
