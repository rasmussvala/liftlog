import 'fake-indexeddb/auto'
import { describe, expect, it } from 'vitest'
import { createDexieLogbookStore } from '../adapters/dexie/dexieLogbookStore'
import { parseBackup, serializeBackup } from '../domain/backup'
import { exportBackup, importBackup } from './backup'
import { addExercise, deleteExercise, listExercises, moveExercise } from './exercises'

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

// Every exercise in order, each with its entries, without database ids: what a user sees.
async function contents(store: ReturnType<typeof freshStore>) {
  const exercises = await listExercises(store)
  return Promise.all(
    exercises.map(async ({ name, id }) => ({
      name,
      entries: (await store.listEntries(id)).map(({ day, weightKg, reps }) => ({ day, weightKg, reps })),
    })),
  )
}

// Reads a Backup the way the Settings screen does, from the file's text.
function read(json: string) {
  const { backup, problem } = parseBackup(json)
  if (problem) throw new Error(`Not a valid Backup: ${problem}`)
  return backup
}

describe('importBackup', () => {
  it('restores an exported store into another store, with the same exercises in order and their entries', async () => {
    const original = freshStore()
    const [squat, bench] = await listExercises(original)
    await original.addEntry({ exerciseId: squat.id, day: '2026-10-31', weightKg: 100, reps: 5 })
    await original.addEntry({ exerciseId: squat.id, day: '2026-11-03', weightKg: 102.5, reps: 5 })
    await original.addEntry({ exerciseId: bench.id, day: '2026-11-01', weightKg: 80, reps: 8 })
    await moveExercise(original, bench.id, 3)
    const file = serializeBackup(await exportBackup(original, new Date('2026-11-07T20:15:00.000Z')))

    const restored = freshStore()
    await importBackup(restored, read(file))

    expect(await contents(restored)).toEqual(await contents(original))
    expect((await contents(restored)).map((exercise) => exercise.name)).toEqual([
      'Squat',
      'Deadlift',
      'Overhead press',
      'Bench press',
      'Barbell row',
      'Pull-up',
    ])
  })

  it('replaces everything that was there, including exercises and entries not in the Backup', async () => {
    const store = freshStore()
    const [squat] = await listExercises(store)
    await store.addEntry({ exerciseId: squat.id, day: '2026-10-01', weightKg: 60, reps: 10 })
    await addExercise(store, 'Hip thrust')

    await importBackup(
      store,
      read(
        JSON.stringify({
          version: 1,
          exportedAt: '2026-11-03T18:30:00.000Z',
          exercises: [
            { name: 'Front squat', entries: [{ day: '2026-11-02', weightKg: 70, reps: 6 }] },
            { name: 'Squat', entries: [] },
          ],
        }),
      ),
    )

    expect(await contents(store)).toEqual([
      { name: 'Front squat', entries: [{ day: '2026-11-02', weightKg: 70, reps: 6 }] },
      { name: 'Squat', entries: [] },
    ])
  })

  it('leaves no exercises after importing an empty Backup, and adds no starter exercises back', async () => {
    const store = freshStore()

    await importBackup(store, read(JSON.stringify({ version: 1, exportedAt: '2026-11-03T18:30:00.000Z', exercises: [] })))

    expect(await contents(store)).toEqual([])
  })

  it('leaves the previous data untouched when the import fails partway', async () => {
    const store = freshStore()
    const [squat] = await listExercises(store)
    await store.addEntry({ exerciseId: squat.id, day: '2026-10-01', weightKg: 60, reps: 10 })
    const before = await contents(store)
    // Unchecked, so the database itself refuses the second entry on one day, after the rest is written.
    const broken = {
      version: 1 as const,
      exportedAt: '2026-11-03T18:30:00.000Z',
      exercises: [
        {
          name: 'Front squat',
          entries: [
            { day: '2026-11-02', weightKg: 70, reps: 6 },
            { day: '2026-11-02', weightKg: 72.5, reps: 5 },
          ],
        },
      ],
    }

    await expect(importBackup(store, broken)).rejects.toThrow()

    expect(await contents(store)).toEqual(before)
  })
})
