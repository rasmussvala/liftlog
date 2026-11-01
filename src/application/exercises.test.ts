import 'fake-indexeddb/auto'
import { describe, expect, it } from 'vitest'
import { createDexieLogbookStore } from '../adapters/dexie/dexieLogbookStore'
import { addExercise, listExercises } from './exercises'

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
