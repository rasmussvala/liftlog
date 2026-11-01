import 'fake-indexeddb/auto'
import { describe, expect, it } from 'vitest'
import { createDexieLogbookStore } from '../adapters/dexie/dexieLogbookStore'
import { addExercise, deleteExercise, listExercises, moveExercise, renameExercise } from './exercises'

// A fresh database per test, seeded with the six starter exercises.
const freshStore = () => createDexieLogbookStore(`test-${crypto.randomUUID()}`)

describe('addExercise', () => {
  it('stores the trimmed name at the end and returns it', async () => {
    const store = freshStore()
    const added = await addExercise(store, '  Front squat ')
    expect(added.name).toBe('Front squat')

    const names = (await listExercises(store)).map((e) => e.name)
    expect(names).toEqual(['Squat', 'Bench press', 'Deadlift', 'Overhead press', 'Barbell row', 'Pull-up', 'Front squat'])
  })

  it('keeps adding at the end', async () => {
    const store = freshStore()
    await addExercise(store, 'Front squat')
    await addExercise(store, 'Dip')
    expect((await listExercises(store)).slice(-2).map((e) => e.name)).toEqual(['Front squat', 'Dip'])
  })

  it('refuses a blank, too-long or taken name, and stores nothing', async () => {
    const store = freshStore()
    await expect(addExercise(store, '   ')).rejects.toThrow(RangeError)
    await expect(addExercise(store, 'a'.repeat(41))).rejects.toThrow(RangeError)
    await expect(addExercise(store, 'bench PRESS')).rejects.toThrow(RangeError)
    expect(await listExercises(store)).toHaveLength(6)
  })
})

describe('renameExercise', () => {
  it('renames an exercise and keeps its entries', async () => {
    const store = freshStore()
    const [squat] = await listExercises(store)
    const entry = await store.addEntry({ exerciseId: squat.id, day: '2026-10-31', weightKg: 100, reps: 5 })

    await renameExercise(store, squat.id, ' Front squat ')

    expect((await store.getExercise(squat.id))?.name).toBe('Front squat')
    expect(await store.listEntries(squat.id)).toEqual([entry])
  })

  it('allows changing only the case of its own name', async () => {
    const store = freshStore()
    const [squat] = await listExercises(store)

    await renameExercise(store, squat.id, 'sQUAT')

    expect((await store.getExercise(squat.id))?.name).toBe('sQUAT')
  })

  it.each(['   ', 'a'.repeat(41), 'bench PRESS'])('refuses an invalid name %j', async (name) => {
    const store = freshStore()
    const [squat] = await listExercises(store)

    await expect(renameExercise(store, squat.id, name)).rejects.toThrow(RangeError)
    expect((await store.getExercise(squat.id))?.name).toBe('Squat')
  })
})

describe('deleteExercise', () => {
  it('removes the exercise and its entries while leaving other exercises intact', async () => {
    const store = freshStore()
    const [squat, bench] = await listExercises(store)
    await store.addEntry({ exerciseId: squat.id, day: '2026-10-31', weightKg: 100, reps: 5 })
    const benchEntry = await store.addEntry({ exerciseId: bench.id, day: '2026-10-31', weightKg: 80, reps: 5 })

    await deleteExercise(store, squat.id)

    expect(await store.getExercise(squat.id)).toBeUndefined()
    expect(await store.listEntries(squat.id)).toEqual([])
    expect(await store.listEntries(bench.id)).toEqual([benchEntry])
  })
})

describe('moveExercise', () => {
  it.each([
    ['up', 3, 1, ['Squat', 'Overhead press', 'Bench press', 'Deadlift', 'Barbell row', 'Pull-up']],
    ['down', 1, 3, ['Squat', 'Deadlift', 'Overhead press', 'Bench press', 'Barbell row', 'Pull-up']],
    ['to the beginning', 4, 0, ['Barbell row', 'Squat', 'Bench press', 'Deadlift', 'Overhead press', 'Pull-up']],
    ['to the end', 1, 5, ['Squat', 'Deadlift', 'Overhead press', 'Barbell row', 'Pull-up', 'Bench press']],
  ])('moves an exercise %s and stores the new order', async (_description, from, to, expected) => {
    const store = freshStore()
    const before = await listExercises(store)

    await moveExercise(store, before[from].id, to)

    expect((await listExercises(store)).map((exercise) => exercise.name)).toEqual(expected)
  })
})
