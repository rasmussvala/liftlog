import 'fake-indexeddb/auto'
import { describe, expect, it } from 'vitest'
import { createDexieLogbookStore } from '../adapters/dexie/dexieLogbookStore'
import { addExercise } from './exercises'
import { homeOverview } from './homeOverview'

// A fresh database per test.
const freshStore = () => createDexieLogbookStore(`test-${crypto.randomUUID()}`)

describe('homeOverview', () => {
  it('lists the starter exercises, in order, with no entries, on a fresh database', async () => {
    const overview = await homeOverview(freshStore())
    expect(overview.map((item) => item.exercise.name)).toEqual([
      'Squat',
      'Bench press',
      'Deadlift',
      'Overhead press',
      'Barbell row',
      'Pull-up',
    ])
    expect(overview.every((item) => item.current === undefined)).toBe(true)
  })

  it('shows a single entry with its estimated 1RM and no change', async () => {
    const store = freshStore()
    const [squat] = await store.listExercises()
    await store.addEntry({ exerciseId: squat.id, day: '2026-10-01', weightKg: 100, reps: 5 })

    const [item] = await homeOverview(store)
    expect(item.current?.latest).toMatchObject({ day: '2026-10-01', weightKg: 100, reps: 5 })
    expect(item.current?.estimated1RM).toBeCloseTo(116.67, 2)
    expect(item.current?.change).toBeUndefined()
  })

  it('takes the latest entry and the change since the previous one', async () => {
    const store = freshStore()
    const [squat, bench] = await store.listExercises()
    // Added out of day order on purpose.
    await store.addEntry({ exerciseId: squat.id, day: '2026-10-08', weightKg: 100, reps: 5 })
    await store.addEntry({ exerciseId: squat.id, day: '2026-10-01', weightKg: 60, reps: 10 })
    await store.addEntry({ exerciseId: bench.id, day: '2026-10-01', weightKg: 140, reps: 1 })
    await store.addEntry({ exerciseId: bench.id, day: '2026-10-08', weightKg: 60, reps: 10 })

    const [squatItem, benchItem] = await homeOverview(store)
    expect(squatItem.current?.latest.day).toBe('2026-10-08')
    expect(squatItem.current?.estimated1RM).toBeCloseTo(116.67, 2)
    expect(squatItem.current?.change).toBeCloseTo(36.67, 2)
    expect(benchItem.current?.estimated1RM).toBeCloseTo(80, 5)
    expect(benchItem.current?.change).toBeCloseTo(-60, 5)
  })

  it("doesn't mix one exercise's entries into another's", async () => {
    const store = freshStore()
    const [squat] = await store.listExercises()
    await store.addEntry({ exerciseId: squat.id, day: '2026-10-01', weightKg: 100, reps: 5 })

    const [squatItem, ...others] = await homeOverview(store)
    expect(squatItem.current).toBeDefined()
    expect(others.every((item) => item.current === undefined)).toBe(true)
  })

  it("gives each item its exercise's entry count", async () => {
    const store = freshStore()
    const [squat, bench] = await store.listExercises()
    await store.addEntry({ exerciseId: squat.id, day: '2026-10-01', weightKg: 100, reps: 5 })
    await store.addEntry({ exerciseId: squat.id, day: '2026-10-08', weightKg: 105, reps: 5 })
    await store.addEntry({ exerciseId: bench.id, day: '2026-10-01', weightKg: 80, reps: 5 })

    const counts = (await homeOverview(store)).map((item) => item.entryCount)
    expect(counts).toEqual([2, 1, 0, 0, 0, 0])
  })

  it('lists an added exercise last, with no entries', async () => {
    const store = freshStore()
    await addExercise(store, 'Front squat')
    const last = (await homeOverview(store)).at(-1)
    expect(last?.exercise.name).toBe('Front squat')
    expect(last?.entryCount).toBe(0)
    expect(last?.current).toBeUndefined()
  })

  it("doesn't add the starter exercises again when the database is opened later", async () => {
    const name = `test-${crypto.randomUUID()}`
    await homeOverview(createDexieLogbookStore(name))
    const overview = await homeOverview(createDexieLogbookStore(name))
    expect(overview).toHaveLength(6)
  })
})
