import type { Exercise } from '../domain/exercise'
import { currentEstimate, type CurrentEstimate } from '../domain/progress'
import type { LogbookStore } from './logbookStore'

export interface HomeItem {
  exercise: Exercise
  // Latest entry, its estimated 1RM and the change since the previous entry. Undefined with no entries.
  current: CurrentEstimate | undefined
}

// One item per exercise, in the order they were added. What Home shows.
export async function homeOverview(store: LogbookStore): Promise<HomeItem[]> {
  const exercises = await store.listExercises()
  return Promise.all(
    exercises.map(async (exercise) => ({
      exercise,
      current: currentEstimate(await store.listEntries(exercise.id)),
    })),
  )
}
