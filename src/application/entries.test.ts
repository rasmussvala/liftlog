import 'fake-indexeddb/auto'
import { describe, expect, it } from 'vitest'
import { createDexieLogbookStore } from '../adapters/dexie/dexieLogbookStore'
import { deleteEntry, exerciseLog, saveEntry } from './entries'

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

describe('saveEntry', () => {
  const today = '2026-11-01'

  it('adds an entry for a day that has none, and returns it', async () => {
    const store = freshStore()
    const [squat] = await store.listExercises()

    const saved = await saveEntry(store, { exerciseId: squat.id, day: '2026-10-30', weightKg: 117.5, reps: 5 }, today)

    expect(saved).toEqual({ id: expect.any(Number), exerciseId: squat.id, day: '2026-10-30', weightKg: 117.5, reps: 5 })
    expect(await store.listEntries(squat.id)).toEqual([saved])
  })

  it("updates the day's entry when it has one, leaving one entry for that day", async () => {
    const store = freshStore()
    const [squat, bench] = await store.listExercises()
    const first = await store.addEntry({ exerciseId: squat.id, day: '2026-10-30', weightKg: 100, reps: 5 })
    const otherDay = await store.addEntry({ exerciseId: squat.id, day: '2026-10-28', weightKg: 95, reps: 5 })
    const otherExercise = await store.addEntry({ exerciseId: bench.id, day: '2026-10-30', weightKg: 80, reps: 5 })

    const saved = await saveEntry(store, { exerciseId: squat.id, day: '2026-10-30', weightKg: 102.5, reps: 3 }, today)

    expect(saved).toEqual({ ...first, weightKg: 102.5, reps: 3 })
    expect(await store.listEntries(squat.id)).toEqual([otherDay, saved])
    expect(await store.listEntries(bench.id)).toEqual([otherExercise])
  })

  it('refuses a day after today, and stores nothing', async () => {
    const store = freshStore()
    const [squat] = await store.listExercises()

    await expect(saveEntry(store, { exerciseId: squat.id, day: '2026-11-02', weightKg: 100, reps: 5 }, today)).rejects.toThrow()
    await expect(saveEntry(store, { exerciseId: squat.id, day: today, weightKg: 100, reps: 5 }, today)).resolves.toBeDefined()
    expect((await store.listEntries(squat.id)).map((e) => e.day)).toEqual([today])
  })

  it.each([
    { weightKg: 0, reps: 5 },
    { weightKg: 1000, reps: 5 },
    { weightKg: 100.255, reps: 5 },
    { weightKg: Number.NaN, reps: 5 },
    { weightKg: 100, reps: 0 },
    { weightKg: 100, reps: 13 },
    { weightKg: 100, reps: 5.5 },
  ])('refuses invalid values ($weightKg kg × $reps), and stores nothing', async (values) => {
    const store = freshStore()
    const [squat] = await store.listExercises()

    await expect(saveEntry(store, { exerciseId: squat.id, day: today, ...values }, today)).rejects.toThrow()
    expect(await store.listEntries(squat.id)).toEqual([])
  })

  it('shows in the exercise log afterwards', async () => {
    const store = freshStore()
    const [squat] = await store.listExercises()
    await saveEntry(store, { exerciseId: squat.id, day: '2026-10-30', weightKg: 100, reps: 5 }, today)
    await saveEntry(store, { exerciseId: squat.id, day: '2026-10-30', weightKg: 140, reps: 1 }, today)

    const log = await exerciseLog(store, squat.id)
    if (log === 'not-found') throw new Error('expected the squat log')
    expect(log.entries.map((e) => [e.entry.weightKg, e.entry.reps, e.estimated1RM])).toEqual([[140, 1, 140]])
  })
})

describe('deleteEntry', () => {
  it('removes the entry and leaves the others', async () => {
    const store = freshStore()
    const [squat, bench] = await store.listExercises()
    const gone = await store.addEntry({ exerciseId: squat.id, day: '2026-10-30', weightKg: 100, reps: 5 })
    const otherDay = await store.addEntry({ exerciseId: squat.id, day: '2026-10-28', weightKg: 95, reps: 5 })
    const otherExercise = await store.addEntry({ exerciseId: bench.id, day: '2026-10-30', weightKg: 80, reps: 5 })

    await deleteEntry(store, gone.id)

    expect(await store.listEntries(squat.id)).toEqual([otherDay])
    expect(await store.listEntries(bench.id)).toEqual([otherExercise])
  })
})

describe('deleteEntry, then exerciseLog', () => {
  it('no longer lists the deleted entry', async () => {
    const store = freshStore()
    const [squat] = await store.listExercises()
    const today = '2026-11-01'
    const kept = await saveEntry(store, { exerciseId: squat.id, day: '2026-10-28', weightKg: 95, reps: 5 }, today)
    const gone = await saveEntry(store, { exerciseId: squat.id, day: '2026-10-30', weightKg: 140, reps: 1 }, today)

    await deleteEntry(store, gone.id)

    const log = await exerciseLog(store, squat.id)
    if (log === 'not-found') throw new Error('expected the squat log')
    expect(log.entries.map((e) => e.entry)).toEqual([kept])
  })

  it('lets the day be logged again', async () => {
    const store = freshStore()
    const [squat] = await store.listExercises()
    const today = '2026-11-01'
    const gone = await saveEntry(store, { exerciseId: squat.id, day: '2026-10-30', weightKg: 140, reps: 1 }, today)

    await deleteEntry(store, gone.id)
    const again = await saveEntry(store, { exerciseId: squat.id, day: '2026-10-30', weightKg: 100, reps: 5 }, today)

    expect(again.id).not.toBe(gone.id)
    expect(await store.listEntries(squat.id)).toEqual([again])
  })
})
