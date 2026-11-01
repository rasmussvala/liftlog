import type { Exercise } from '../domain/exercise'
import { currentEstimate, type CurrentEstimate } from '../domain/progress'
import type { LogbookStore } from './logbookStore'

export interface HomeItem {
  exercise: Exercise
  // Latest entry, its estimated 1RM and the change since the previous entry. Undefined with no entries.
  current: CurrentEstimate | undefined
  // How many entries the exercise has: the delete alert names them.
  entryCount: number
}

// One item per exercise, in the user's order. What Home shows.
export async function homeOverview(store: LogbookStore): Promise<HomeItem[]> {
  const exercises = await store.listExercises()
  return Promise.all(
    exercises.map(async (exercise) => {
      const entries = await store.listEntries(exercise.id)
      return { exercise, current: currentEstimate(entries), entryCount: entries.length }
    }),
  )
}
