import { useLiveQuery } from 'dexie-react-hooks'
import { Plus } from 'lucide-react'
import { useEffect, useState } from 'react'
import { exerciseLog, type LogEntry } from '../../../application/entries'
import type { LogbookStore } from '../../../application/logbookStore'
import type { Day } from '../../../domain/entry'
import { dayLabel, formatEstimate, formatWeight, localToday } from '../format'
import { Kg } from '../Kg'
import { press } from '../press'
import { ProgressChart } from '../ProgressChart'
import { PushedScreen } from '../PushedScreen'
import { goHome } from '../router'
import { EntryPage } from './EntryPage'

// One exercise: its progress chart, the Log entry button, then the history, newest first.
export function ExerciseScreen({ store, id, slideIn }: { store: LogbookStore; id: number; slideIn: boolean }) {
  const log = useLiveQuery(() => exerciseLog(store, id), [store, id])
  const today = localToday()
  // The day the entry page opens on, while it's open.
  const [entryDay, setEntryDay] = useState<Day>()
  // The day just saved: its row lights up briefly.
  const [flash, setFlash] = useState<Day>()

  useEffect(() => {
    if (!flash) return
    const timeout = setTimeout(() => setFlash(undefined), 1200)
    return () => clearTimeout(timeout)
  }, [flash])

  // A bad or deleted id shows Home.
  useEffect(() => {
    if (log === 'not-found') goHome()
  }, [log])

  const found = log && log !== 'not-found' ? log : undefined

  return (
    <>
      <PushedScreen title={found?.exercise.name ?? ''} slideIn={slideIn}>
        {found && (
          <>
            <ProgressChart entries={found.entries.map((item) => item.entry)} today={today} />
            {/* Always the same text, whether or not today has an entry. */}
            <button
              onClick={() => setEntryDay(today)}
              className={`mx-5 mt-6 flex min-h-11 w-[calc(100%-2.5rem)] items-center justify-center gap-2 rounded-card bg-tint p-4 text-headline text-on-tint ${press}`}
            >
              <Plus size={24} strokeWidth={2.25} aria-hidden />
              Log entry
            </button>
            {found.entries.length === 0 ? (
              <p className="mt-6 px-5 text-body text-label-secondary">No entries</p>
            ) : (
              // One grid for every row, so the columns line up: weight, × reps, spacer, estimated 1RM, day.
              <ul className="mt-6 ml-5 grid grid-cols-[auto_auto_1fr_auto_auto] tabular-nums">
                {found.entries.map((item) => (
                  <HistoryRow key={item.entry.id} item={item} today={today} lit={item.entry.day === flash} />
                ))}
              </ul>
            )}
          </>
        )}
      </PushedScreen>
      {found && entryDay && (
        <EntryPage
          store={store}
          exerciseId={found.exercise.id}
          entries={found.entries.map((item) => item.entry)}
          startDay={entryDay}
          today={today}
          onClosed={(savedDay) => {
            setEntryDay(undefined)
            setFlash(savedDay)
          }}
        />
      )}
    </>
  )
}

function HistoryRow({ item: { entry, estimated1RM }, today, lit }: { item: LogEntry; today: Day; lit: boolean }) {
  return (
    // Lit up (just saved): tint at once, then fades back once it's no longer lit.
    <li
      className={`col-span-full grid min-h-11 grid-cols-subgrid items-baseline border-b border-separator py-3 transition-colors ease-out last:border-b-0 ${lit ? 'bg-tint/15 duration-0' : 'duration-700'}`}
    >
      <span className="text-right text-body">
        {formatWeight(entry.weightKg)}
        <Kg />
      </span>
      <span className="pl-2 text-body text-label-secondary">× {entry.reps}</span>
      <span aria-hidden />
      <span className="pl-4 text-right text-headline">
        {formatEstimate(estimated1RM)}
        <Kg />
      </span>
      <span className="pr-5 pl-4 text-right text-subhead text-label-secondary">{dayLabel(entry.day, today)}</span>
    </li>
  )
}
