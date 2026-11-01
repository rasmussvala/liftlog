import { useLiveQuery } from 'dexie-react-hooks'
import { Plus, Settings } from 'lucide-react'
import { homeOverview, type HomeItem } from '../../../application/homeOverview'
import type { LogbookStore } from '../../../application/logbookStore'
import type { Day } from '../../../domain/entry'
import { dayLabel, formatChange, formatEstimate, formatWeight, localToday } from '../format'
import { Kg } from '../Kg'
import { openScreen } from '../router'

// The user's exercises, each with its latest entry, current estimated 1RM and change.
export function HomeScreen({ store }: { store: LogbookStore }) {
  const items = useLiveQuery(() => homeOverview(store), [store])
  const today = localToday()

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

      <ul className="mt-4">
        {items?.map((item) => (
          <ExerciseRow key={item.exercise.id} item={item} today={today} />
        ))}
      </ul>

      {/* WIP: the add-exercise flow isn't designed yet, so this does nothing. */}
      <button
        aria-label="Add exercise (not built yet)"
        className="fixed right-5 bottom-[calc(env(safe-area-inset-bottom)+20px)] z-10 grid size-14 place-items-center rounded-full bg-tint text-on-tint shadow-lg transition-transform duration-150 ease-out motion-safe:active:scale-[0.94]"
      >
        <Plus size={28} strokeWidth={2.25} aria-hidden />
      </button>
    </main>
  )
}

function ExerciseRow({ item, today }: { item: HomeItem; today: Day }) {
  const { exercise, current } = item
  const change = current?.change === undefined ? undefined : formatChange(current.change)

  return (
    <li>
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
