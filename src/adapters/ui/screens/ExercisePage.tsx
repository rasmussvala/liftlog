import { useState } from 'react'
import { addExercise, deleteExercise, renameExercise } from '../../../application/exercises'
import type { LogbookStore } from '../../../application/logbookStore'
import type { Exercise } from '../../../domain/exercise'
import { MAX_EXERCISE_NAME, validateExerciseName } from '../../../domain/exercise'
import { CoverPage } from '../CoverPage'
import { press } from '../press'

interface ExercisePageProps {
  store: LogbookStore
  exercise?: Exercise
  // Other exercises' names, for the "Name taken" check as the user types.
  names: readonly string[]
  confirmDelete?: () => boolean
  onDeleted?: (id: number) => void
  onClosed: (addedId: number | undefined) => void
}

// Add or rename one exercise on a CoverPage.
export function ExercisePage({ store, exercise, names, confirmDelete, onDeleted, onClosed }: ExercisePageProps) {
  const [name, setName] = useState(exercise?.name ?? '')
  // The names as they were when an add started: set while it runs, then kept by the exit. So the
  // new name doesn't show as taken while the store updates under the page.
  const [frozenNames, setFrozenNames] = useState<readonly string[]>()
  // Set once Add or Cancel starts the exit. Undefined while the page is open.
  const [exit, setExit] = useState<{ addedId?: number }>()
  const busy = frozenNames !== undefined && !exit

  const check = validateExerciseName(name, frozenNames ?? names)
  // Blank shows no hint: the empty field already says what to do.
  const hint =
    check.problem === 'taken'
      ? 'Name taken'
      : name.length >= MAX_EXERCISE_NAME
        ? `Max ${MAX_EXERCISE_NAME} characters`
        : undefined

  // On failure the page stays open, so nothing typed is lost.
  const save = async () => {
    if (busy || exit || check.problem) return
    setFrozenNames(names)
    try {
      if (exercise) {
        await renameExercise(store, exercise.id, name)
        setExit({})
      } else {
        const added = await addExercise(store, name)
        setExit({ addedId: added.id })
      }
    } catch (error) {
      console.error('Saving the exercise failed', error)
      setFrozenNames(undefined)
    }
  }
  // While a save runs, Cancel waits: the change is happening either way.
  const cancel = () => !busy && setExit((e) => e ?? {})
  const remove = async () => {
    if (!exercise || busy || exit || !confirmDelete?.()) return
    setFrozenNames(names)
    try {
      await deleteExercise(store, exercise.id)
      onDeleted?.(exercise.id)
      setExit({})
    } catch (error) {
      console.error('Deleting the exercise failed', error)
      setFrozenNames(undefined)
    }
  }

  const header = (
    <div className="grid grid-cols-[1fr_auto_1fr] items-center pt-1">
      <button onClick={cancel} className={`min-h-11 justify-self-start text-body text-tint ${press}`}>
        Cancel
      </button>
      <h2 className="text-headline">{exercise ? 'Edit exercise' : 'New exercise'}</h2>
      <button
        onClick={save}
        aria-disabled={check.problem !== undefined}
        className={`min-h-11 justify-self-end text-headline text-tint ${press} ${check.problem ? 'opacity-30' : ''}`}
      >
        {exercise ? 'Save' : 'Add'}
      </button>
    </div>
  )

  return (
    <CoverPage header={header} closing={exit !== undefined} onGone={() => onClosed(exit?.addedId)}>
      {/* Submitting is the keyboard's Done key. */}
      <form
        onSubmit={(e) => {
          e.preventDefault()
          void save()
        }}
      >
        {/* Taken: a grey outline. Never destructive, which means "this deletes something". */}
        <label
          className={`mt-4 flex min-h-14 items-center rounded-card bg-surface px-4 ${check.problem === 'taken' ? 'ring-2 ring-label-secondary' : ''}`}
        >
          {/* No "Name" in the label or placeholder: Safari would offer contact AutoFill. */}
          <input
            aria-label="Exercise"
            aria-invalid={check.problem === 'taken'}
            autoComplete="off"
            autoCapitalize="sentences"
            enterKeyHint="done"
            maxLength={MAX_EXERCISE_NAME}
            placeholder="Exercise, e.g. Front squat"
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="w-full bg-transparent text-body outline-none placeholder:text-label-secondary/60"
          />
        </label>
      </form>
      {/* Always one line, so nothing jumps when a hint appears. */}
      <p aria-live="polite" className="mt-2 min-h-5 px-4 text-footnote text-label-secondary">
        {hint}
      </p>
      {exercise && (
        <button
          onClick={() => void remove()}
          className={`mt-8 min-h-14 w-full rounded-card bg-surface text-body text-destructive ${press}`}
        >
          Delete exercise
        </button>
      )}
    </CoverPage>
  )
}
