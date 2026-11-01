import { useLiveQuery } from 'dexie-react-hooks'
import { Plus, Settings } from 'lucide-react'
import { useEffect, useState } from 'react'
import { deleteExercise } from '../../../application/exercises'
import { homeOverview, type HomeItem } from '../../../application/homeOverview'
import type { LogbookStore } from '../../../application/logbookStore'
import type { Day } from '../../../domain/entry'
import { dayLabel, formatChange, formatEstimate, formatWeight, localToday } from '../format'
import { Kg } from '../Kg'
import { openScreen } from '../router'
import { SwipeRow } from '../SwipeRow'
import { ExercisePage } from './ExercisePage'

// The user's exercises, each with its latest entry, current estimated 1RM and change.
export function HomeScreen({ store }: { store: LogbookStore }) {
  const items = useLiveQuery(() => homeOverview(store), [store])
  const today = localToday()
  const [adding, setAdding] = useState(false)
  const [editing, setEditing] = useState<HomeItem>()
  const [retiring, setRetiring] = useState<HomeItem>()
  const [collapsingId, setCollapsingId] = useState<number>()
  // The exercise just added: its row scrolls into view and lights up briefly.
  const [flash, setFlash] = useState<number>()

  const visibleItems = items?.length
    ? [...items, ...(retiring && !items.some((item) => item.exercise.id === retiring.exercise.id) ? [retiring] : [])]
    : retiring
      ? [retiring]
      : items

  const deletePrompt = (item: HomeItem) => {
    const { name } = item.exercise
    const count = item.entryCount
    const detail = count === 0 ? '' : ` and its ${count} ${count === 1 ? 'entry' : 'entries'}`
    return window.confirm(`Delete ${name}${detail}? This can't be undone.`)
  }

  const deleteConfirmed = async (item: HomeItem) => {
    setRetiring(item)
    setCollapsingId(item.exercise.id)
    try {
      await deleteExercise(store, item.exercise.id)
    } catch (error) {
      console.error('Deleting the exercise failed', error)
      setRetiring(undefined)
      setCollapsingId(undefined)
    }
  }

  const deleteFromRow = (item: HomeItem) => {
    if (!deletePrompt(item)) return false
    void deleteConfirmed(item)
    return true
  }

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

      {visibleItems?.length === 0 ? (
        <div className="mt-24 px-10 text-center">
          <p className="text-title">No exercises</p>
          <p className="mt-2 text-subhead text-label-secondary">Tap + to add one.</p>
        </div>
      ) : (
        <ul className="mt-4">
          {visibleItems?.map((item) => (
            <ExerciseRow
              key={item.exercise.id}
              item={item}
              today={today}
              lit={item.exercise.id === flash}
              collapsing={item.exercise.id === collapsingId}
              onTap={() => openScreen({ name: 'exercise', id: item.exercise.id })}
              onEdit={() => setEditing(item)}
              onDelete={() => deleteFromRow(item)}
              onCollapsed={() => {
                setRetiring(undefined)
                setCollapsingId(undefined)
              }}
            />
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

      {(adding || editing) && (
        <ExercisePage
          store={store}
          exercise={editing?.exercise}
          names={(items ?? [])
            .filter((item) => item.exercise.id !== editing?.exercise.id)
            .map((item) => item.exercise.name)}
          confirmDelete={editing ? () => deletePrompt(editing) : undefined}
          onDeleted={(id) => {
            const deleted = items?.find((item) => item.exercise.id === id) ?? editing
            if (deleted) {
              setRetiring(deleted)
              setCollapsingId(id)
            }
          }}
          onClosed={(addedId) => {
            setAdding(false)
            setEditing(undefined)
            setFlash(addedId)
          }}
        />
      )}
    </main>
  )
}

function ExerciseRow({
  item,
  today,
  lit,
  collapsing,
  onTap,
  onEdit,
  onDelete,
  onCollapsed,
}: {
  item: HomeItem
  today: Day
  lit: boolean
  collapsing: boolean
  onTap: () => void
  onEdit: () => void
  onDelete: () => boolean
  onCollapsed: () => void
}) {
  const { exercise, current } = item
  const change = current?.change === undefined ? undefined : formatChange(current.change)

  return (
    <SwipeRow
      label={exercise.name}
      onTap={onTap}
      onEdit={onEdit}
      onDelete={onDelete}
      onCollapsed={onCollapsed}
      collapsing={collapsing}
      flash={lit}
    >
      <div className="flex w-full items-center gap-4">
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
      </div>
    </SwipeRow>
  )
}
