import { useLiveQuery } from 'dexie-react-hooks'
import { Plus, Settings } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
import { homeOverview, type HomeItem } from '../../../application/homeOverview'
import type { LogbookStore } from '../../../application/logbookStore'
import type { Day } from '../../../domain/entry'
import { dayLabel, formatChange, formatEstimate, formatWeight, localToday } from '../format'
import { Kg } from '../Kg'
import { openScreen } from '../router'
import { ExercisePage } from './ExercisePage'

// The user's exercises, each with its latest entry, current estimated 1RM and change.
export function HomeScreen({ store }: { store: LogbookStore }) {
  const items = useLiveQuery(() => homeOverview(store), [store])
  const today = localToday()
  const [adding, setAdding] = useState(false)
  // The exercise just added: its row scrolls into view and lights up briefly.
  const [flash, setFlash] = useState<number>()

  useEffect(() => {
    if (flash === undefined) return
    const timeout = setTimeout(() => setFlash(undefined), 1200)
    return () => clearTimeout(timeout)
  }, [flash])

  return (
    <main className="pt-12 pb-32">
      <div className="flex items-center justify-between pr-3 pl-5">
        <h1 className="text-large-title">Lifts</h1>
        <button
          aria-label="Settings"
          onClick={() => openScreen({ name: 'settings' })}
          className="grid size-11 place-items-center rounded-full text-tint transition-opacity duration-150 ease-out active:opacity-50 active:duration-0"
        >
          <Settings size={26} strokeWidth={1.75} aria-hidden />
        </button>
      </div>
      <p className="mt-1 px-5 text-subhead text-label-secondary">Estimated 1RM</p>

      {items?.length === 0 ? (
        <div className="mt-24 px-10 text-center">
          <p className="text-title">No exercises</p>
          <p className="mt-2 text-subhead text-label-secondary">Tap + to add one.</p>
        </div>
      ) : (
        <ul className="mt-4">
          {items?.map((item) => (
            <ExerciseRow key={item.exercise.id} item={item} today={today} lit={item.exercise.id === flash} />
          ))}
        </ul>
      )}

      <button
        aria-label="Add exercise"
        onClick={() => setAdding(true)}
        className="fixed right-5 bottom-[calc(env(safe-area-inset-bottom)+20px)] z-10 grid size-14 place-items-center rounded-full bg-tint text-on-tint shadow-lg transition-transform duration-150 ease-out motion-safe:active:scale-[0.94]"
      >
        <Plus size={28} strokeWidth={2.25} aria-hidden />
      </button>

      {adding && (
        <ExercisePage
          store={store}
          names={items?.map((item) => item.exercise.name) ?? []}
          onClosed={(addedId) => {
            setAdding(false)
            setFlash(addedId)
          }}
        />
      )}
    </main>
  )
}

function ExerciseRow({ item, today, lit }: { item: HomeItem; today: Day; lit: boolean }) {
  const { exercise, current } = item
  const change = current?.change === undefined ? undefined : formatChange(current.change)

  // Just added: bring the row into view. Also runs if the row mounts already lit.
  const row = useRef<HTMLLIElement>(null)
  useEffect(() => {
    if (!lit) return
    const smooth = !window.matchMedia('(prefers-reduced-motion: reduce)').matches
    row.current?.scrollIntoView({ behavior: smooth ? 'smooth' : 'auto', block: 'nearest' })
  }, [lit])

  return (
    // Lit up: tint at once, then fades back once it's no longer lit. The scroll margin keeps a
    // scrolled-to row clear of the + button.
    <li
      ref={row}
      className={`scroll-mb-[calc(env(safe-area-inset-bottom)+96px)] transition-colors ease-out ${lit ? 'bg-tint/15 duration-0' : 'duration-700'}`}
    >
      <button
        onClick={() => openScreen({ name: 'exercise', id: exercise.id })}
        className="flex min-h-11 w-full items-center gap-4 px-5 py-3 text-left transition-colors duration-200 ease-out active:bg-surface-raised active:duration-0">
        <div className="min-w-0 flex-1">
          <div className="truncate text-headline">{exercise.name}</div>
          <div className="truncate text-footnote text-label-secondary tabular-nums">
            {current ? (
              <>
                {formatWeight(current.latest.weightKg)} kg × {current.latest.reps},{' '}
                <span className={current.latest.day === today ? 'text-tint' : undefined}>
                  {dayLabel(current.latest.day, today)}
                </span>
              </>
            ) : (
              'No entries'
            )}
          </div>
        </div>
        {current && (
          <div className="text-right tabular-nums">
            <div className="text-title">
              {formatEstimate(current.estimated1RM)}
              <Kg />
            </div>
            {change && (
              <div className={`text-footnote ${change.rising ? 'text-tint' : 'text-label-secondary'}`}>{change.text}</div>
            )}
          </div>
        )}
      </button>
      <div aria-hidden className="mx-5 h-px bg-separator" />
    </li>
  )
}
