import { useLiveQuery } from 'dexie-react-hooks'
import { useEffect } from 'react'
import { exerciseLog, type LogEntry } from '../../../application/entries'
import type { LogbookStore } from '../../../application/logbookStore'
import type { Day } from '../../../domain/entry'
import { dayLabel, formatEstimate, formatWeight, localToday } from '../format'
import { PushedScreen } from '../PushedScreen'
import { goHome } from '../router'

// One exercise's history, newest first. The chart and today's entry form come in later tickets.
export function ExerciseScreen({ store, id, slideIn }: { store: LogbookStore; id: number; slideIn: boolean }) {
  const log = useLiveQuery(() => exerciseLog(store, id), [store, id])
  const today = localToday()

  // A bad or deleted id shows Home.
  useEffect(() => {
    if (log === 'not-found') goHome()
  }, [log])

  const found = log && log !== 'not-found' ? log : undefined

  return (
    <PushedScreen title={found?.exercise.name ?? ''} slideIn={slideIn}>
      {found &&
        (found.entries.length === 0 ? (
          <p className="mt-4 px-5 text-body text-label-secondary">No entries</p>
        ) : (
          // One grid for every row, so the columns line up: weight, × reps, spacer, estimated 1RM, day.
          <ul className="mt-4 ml-5 grid grid-cols-[auto_auto_1fr_auto_auto] tabular-nums">
            {found.entries.map((item) => (
              <HistoryRow key={item.entry.id} item={item} today={today} />
            ))}
          </ul>
        ))}
    </PushedScreen>
  )
}

function HistoryRow({ item: { entry, estimated1RM }, today }: { item: LogEntry; today: Day }) {
  return (
    <li className="col-span-full grid min-h-11 grid-cols-subgrid items-baseline border-b border-separator py-3 last:border-b-0">
      <span className="text-right text-body">
        {formatWeight(entry.weightKg)}
        <span className="text-subhead text-label-secondary"> kg</span>
      </span>
      <span className="pl-2 text-body text-label-secondary">× {entry.reps}</span>
      <span aria-hidden />
      <span className="pl-4 text-right text-headline">
        {formatEstimate(estimated1RM)}
        <span className="text-subhead text-label-secondary"> kg</span>
      </span>
      <span className="pr-5 pl-4 text-right text-subhead text-label-secondary">{dayLabel(entry.day, today)}</span>
    </li>
  )
}
