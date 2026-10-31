import 'fake-indexeddb/auto'
import { describe, expect, it } from 'vitest'
import { createDexieLogbookStore } from '../adapters/dexie/dexieLogbookStore'
import { exerciseLog } from './entries'

// A fresh database per test.
const freshStore = () => createDexieLogbookStore(`test-${crypto.randomUUID()}`)

describe('exerciseLog', () => {
  it("lists the exercise's entries newest first, each with its estimated 1RM", async () => {
    const store = freshStore()
    const [squat, bench] = await store.listExercises()
    // Added out of day order on purpose.
    await store.addEntry({ exerciseId: squat.id, day: '2026-10-08', weightKg: 100, reps: 5 })
    await store.addEntry({ exerciseId: squat.id, day: '2026-10-15', weightKg: 140, reps: 1 })
    await store.addEntry({ exerciseId: squat.id, day: '2026-10-01', weightKg: 60, reps: 10 })
    await store.addEntry({ exerciseId: bench.id, day: '2026-10-01', weightKg: 80, reps: 5 })

    const log = await exerciseLog(store, squat.id)
    if (log === 'not-found') throw new Error('expected the squat log')
    expect(log.exercise.name).toBe('Squat')
    expect(log.entries.map((e) => e.entry.day)).toEqual(['2026-10-15', '2026-10-08', '2026-10-01'])
    expect(log.entries.map((e) => e.estimated1RM)).toEqual([140, expect.closeTo(116.67, 2), 80])
  })

  it('has no entries for an exercise that has none', async () => {
    const store = freshStore()
    const [, bench] = await store.listExercises()
    const log = await exerciseLog(store, bench.id)
    expect(log).toEqual({ exercise: bench, entries: [] })
  })

  it('is not-found for an unknown id', async () => {
    expect(await exerciseLog(freshStore(), 999)).toBe('not-found')
  })
})
