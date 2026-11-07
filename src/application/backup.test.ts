import 'fake-indexeddb/auto'
import { describe, expect, it } from 'vitest'
import { createDexieLogbookStore } from '../adapters/dexie/dexieLogbookStore'
import { exportBackup } from './backup'
import { deleteExercise, listExercises, moveExercise } from './exercises'

// A fresh database per test, seeded with the six starter exercises.
const freshStore = () => createDexieLogbookStore(`test-${crypto.randomUUID()}`)

describe('exportBackup', () => {
  it('holds every exercise in the user order, each with its entries oldest first', async () => {
    const store = freshStore()
    const [squat, bench] = await listExercises(store)
    await store.addEntry({ exerciseId: squat.id, day: '2026-11-03', weightKg: 102.5, reps: 5 })
    await store.addEntry({ exerciseId: squat.id, day: '2026-10-31', weightKg: 100, reps: 5 })
    await store.addEntry({ exerciseId: bench.id, day: '2026-11-01', weightKg: 80, reps: 8 })
    await moveExercise(store, bench.id, 0)

    const backup = await exportBackup(store, new Date('2026-11-07T20:15:00.000Z'))

    expect(backup).toEqual({
      version: 1,
      exportedAt: '2026-11-07T20:15:00.000Z',
      exercises: [
        { name: 'Bench press', entries: [{ day: '2026-11-01', weightKg: 80, reps: 8 }] },
        {
          name: 'Squat',
          entries: [
            { day: '2026-10-31', weightKg: 100, reps: 5 },
            { day: '2026-11-03', weightKg: 102.5, reps: 5 },
          ],
        },
        { name: 'Deadlift', entries: [] },
        { name: 'Overhead press', entries: [] },
        { name: 'Barbell row', entries: [] },
        { name: 'Pull-up', entries: [] },
      ],
    })
  })

  it('works with no exercises and gives an empty list', async () => {
    const store = freshStore()
    for (const exercise of await listExercises(store)) await deleteExercise(store, exercise.id)

    const backup = await exportBackup(store, new Date('2026-11-07T20:15:00.000Z'))

    expect(backup).toEqual({ version: 1, exportedAt: '2026-11-07T20:15:00.000Z', exercises: [] })
  })
})
