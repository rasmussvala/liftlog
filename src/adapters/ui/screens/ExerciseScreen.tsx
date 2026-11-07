import { useLiveQuery } from 'dexie-react-hooks'
import { useEffect, useState } from 'react'
import { exerciseLog, type LogEntry } from '../../../application/entries'
import type { LogbookStore } from '../../../application/logbookStore'
import type { Day, Entry } from '../../../domain/entry'
import { targets } from '../../../domain/progress'
import { FloatingPlus } from '../FloatingPlus'
import { dayLabel, formatEstimate, formatWeight, localToday } from '../format'
import { Kg } from '../Kg'
import { ProgressChart } from '../ProgressChart'
import { PushedScreen } from '../PushedScreen'
import { goHome } from '../router'
import { SegmentedControl } from '../SegmentedControl'
import { EntryPage } from './EntryPage'

type Tab = (typeof TABS)[number]['id']
const TABS = [
  { id: 'history', label: 'History' },
  { id: 'targets', label: 'Targets' },
] as const

// One exercise: its progress chart, then History (newest first) or Targets, and a floating + for Log entry.
export function ExerciseScreen({ store, id, slideIn }: { store: LogbookStore; id: number; slideIn: boolean }) {
  const log = useLiveQuery(() => exerciseLog(store, id), [store, id])
  const today = localToday()
  // How the entry page opened, while it's open: Log entry starts on today, a history row locks its day.
  const [entryPage, setEntryPage] = useState<{ day: Day; dayLocked: boolean }>()
  // Always opens on History.
  const [tab, setTab] = useState<Tab>('history')
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
  const entries = found?.entries.map((item) => item.entry) ?? []

  return (
    <>
      <PushedScreen title={found?.exercise.name ?? ''} slideIn={slideIn}>
        {found && (
          <>
            <ProgressChart entries={entries} today={today} />
            {found.entries.length === 0 ? (
              <div className="mt-8 px-5">
                <p className="text-headline">No entries yet</p>
                <p className="mt-1 text-subhead text-label-secondary">Tap + to log your first set.</p>
              </div>
            ) : (
              <>
                <SegmentedControl segments={TABS} selected={tab} onSelect={setTab} className="mx-5 mt-8" />
                {tab === 'history' ? (
                  // One grid for every row, so the columns line up: weight, × reps, spacer, estimated 1RM, day.
                  // Room at the end so the floating + never covers the last row.
                  <ul role="tabpanel" className="mt-6 mb-20 ml-5 grid grid-cols-[auto_auto_1fr_auto_auto] tabular-nums">
                    {found.entries.map((item) => (
                      <HistoryRow
                        key={item.entry.id}
                        item={item}
                        today={today}
                        lit={item.entry.day === flash}
                        onOpen={() => setEntryPage({ day: item.entry.day, dayLocked: true })}
                      />
                    ))}
                  </ul>
                ) : (
                  <TargetsList entries={entries} />
                )}
              </>
            )}
            {/* Log entry always starts on today, whether or not today has an entry. */}
            <FloatingPlus label="Log entry" onClick={() => setEntryPage({ day: today, dayLocked: false })} />
          </>
        )}
      </PushedScreen>
      {found && entryPage && (
        <EntryPage
          store={store}
          exerciseId={found.exercise.id}
          entries={entries}
          startDay={entryPage.day}
          dayLocked={entryPage.dayLocked}
          today={today}
          onClosed={(savedDay) => {
            setEntryPage(undefined)
            setFlash(savedDay)
            // Show the saved row lighting up, even if Targets was open.
            if (savedDay) setTab('history')
          }}
        />
      )}
    </>
  )
}

interface HistoryRowProps {
  item: LogEntry
  today: Day
  lit: boolean
  // Tapped: opens the entry page to edit this entry.
  onOpen: () => void
}

function HistoryRow({ item: { entry, estimated1RM }, today, lit, onOpen }: HistoryRowProps) {
  return (
    // Lit up (just saved): tint at once, then fades back once it's no longer lit.
    <li
      className={`col-span-full grid grid-cols-subgrid border-b border-separator transition-colors ease-out last:border-b-0 ${lit ? 'bg-tint/15 duration-0' : 'duration-700'}`}
    >
      <button
        onClick={onOpen}
        className="col-span-full grid min-h-11 grid-cols-subgrid items-baseline py-3 text-left transition-opacity duration-150 ease-out active:opacity-70 active:duration-0"
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
      </button>
    </li>
  )
}

// What to lift next: the number to beat, then one row per rep count, styled like the history rows.
function TargetsList({ entries }: { entries: readonly Entry[] }) {
  const table = targets(entries)
  if (!table) return null
  return (
    <div role="tabpanel">
      <p className="mt-4 px-5 text-subhead text-label-secondary">
        Beat {formatEstimate(table.beat)} kg. Lift any of these for a new best.
      </p>
      {/* Room at the end so the floating + never covers the last row. */}
      <ul className="mt-2 mb-20 ml-5 tabular-nums">
        {table.targets.map((t) => (
          <li
            key={t.reps}
            className="flex min-h-11 items-baseline justify-between border-b border-separator py-3 pr-5 last:border-b-0"
          >
            <span className="text-body text-label-secondary">
              {t.reps} {t.reps === 1 ? 'rep' : 'reps'}
            </span>
            <span className="text-headline">
              {formatWeight(t.weightKg)}
              <Kg />
            </span>
          </li>
        ))}
      </ul>
    </div>
  )
}
