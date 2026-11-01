import { useLayoutEffect, useRef, useState } from 'react'
import { addExercise } from '../../../application/exercises'
import type { LogbookStore } from '../../../application/logbookStore'
import { MAX_EXERCISE_NAME, validateExerciseName } from '../../../domain/exercise'
import { CoverPage } from '../CoverPage'
import { press } from '../press'

interface ExercisePageProps {
  store: LogbookStore
  // Every exercise's name, for the "Name taken" check as the user types.
  names: readonly string[]
  // The page has left the screen, with the new exercise's id after an add, or undefined after a cancel.
  onClosed: (addedId: number | undefined) => void
}

// New exercise: one name field on a CoverPage. Add stores it at the bottom of Home.
export function ExercisePage({ store, names, onClosed }: ExercisePageProps) {
  const [name, setName] = useState('')
  // The names as they were when an add started: set while it runs, then kept by the exit. So the
  // new name doesn't show as taken while the store updates under the page.
  const [frozenNames, setFrozenNames] = useState<readonly string[]>()
  // Set once Add or Cancel starts the exit. Undefined while the page is open.
  const [exit, setExit] = useState<{ addedId?: number }>()
  const busy = frozenNames !== undefined && !exit

  // Open the keyboard at once. This runs inside the tap on +, which iOS needs to show the keyboard.
  // preventScroll, because the page still sits below the screen before it slides up, and iOS would
  // otherwise scroll everything up to reach the field.
  const field = useRef<HTMLInputElement>(null)
  useLayoutEffect(() => {
    field.current?.focus({ preventScroll: true })
  }, [])

  const check = validateExerciseName(name, frozenNames ?? names)
  // Blank shows no hint: the empty field already says what to do.
  const hint =
    check.problem === 'taken'
      ? 'Name taken'
      : name.length >= MAX_EXERCISE_NAME
        ? `Max ${MAX_EXERCISE_NAME} characters`
        : undefined

  // On failure the page stays open, so nothing typed is lost.
  const add = async () => {
    if (busy || exit || check.problem) return
    setFrozenNames(names)
    try {
      const added = await addExercise(store, name)
      setExit({ addedId: added.id })
    } catch (error) {
      console.error('Adding the exercise failed', error)
      setFrozenNames(undefined)
    }
  }
  // While an add runs, Cancel waits: the change is happening either way.
  const cancel = () => !busy && setExit((e) => e ?? {})

  const header = (
    <div className="grid grid-cols-[1fr_auto_1fr] items-center pt-1">
      <button onClick={cancel} className={`min-h-11 justify-self-start text-body text-tint ${press}`}>
        Cancel
      </button>
      <h2 className="text-headline">New exercise</h2>
      <button
        onClick={add}
        aria-disabled={check.problem !== undefined}
        className={`min-h-11 justify-self-end text-headline text-tint ${press} ${check.problem ? 'opacity-30' : ''}`}
      >
        Add
      </button>
    </div>
  )

  return (
    <CoverPage header={header} closing={exit !== undefined} onGone={() => onClosed(exit?.addedId)}>
      {/* Submitting is the keyboard's Done key. */}
      <form
        onSubmit={(e) => {
          e.preventDefault()
          void add()
        }}
      >
        {/* Taken: a grey outline. Never destructive, which means "this deletes something". */}
        <label
          className={`mt-4 flex min-h-14 items-center rounded-card bg-surface px-4 ${check.problem === 'taken' ? 'ring-2 ring-label-secondary' : ''}`}
        >
          {/* No "Name" in the label or placeholder: Safari would offer contact AutoFill. */}
          <input
            ref={field}
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
    </CoverPage>
  )
}
