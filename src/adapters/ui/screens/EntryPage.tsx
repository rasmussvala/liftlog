import { ChevronRight, Minus, Plus } from 'lucide-react'
import { useState } from 'react'
import { deleteEntry, saveEntry } from '../../../application/entries'
import type { LogbookStore } from '../../../application/logbookStore'
import type { Day, Entry } from '../../../domain/entry'
import { CoverPage } from '../CoverPage'
import { dayLabel, formatEstimate } from '../format'
import { Kg } from '../Kg'
import { press } from '../press'
import { useEntryDraft, type EntryDraft } from './useEntryDraft'

interface EntryPageProps {
  store: LogbookStore
  exerciseId: number
  // The exercise's entries, newest first.
  entries: readonly Entry[]
  // The day the page opens on. Log entry opens it on today, a history row on that entry's day.
  startDay: Day
  // Opened from a history row: no day row, so editing never moves an entry to another day.
  dayLocked: boolean
  today: Day
  // The page has left the screen, after a save (with the saved day), a delete or a cancel.
  onClosed: (savedDay: Day | undefined) => void
}

// Log an entry for any past day, edit the one a picked day already has, or delete it.
export function EntryPage({ store, exerciseId, entries, startDay, dayLocked, today, onClosed }: EntryPageProps) {
  // Set once Save, Delete or Cancel starts the exit. Undefined while the page is open. Holds the entries
  // as they were, so the page doesn't change (title, values, Delete) as the store updates while it slides away.
  const [exit, setExit] = useState<{ savedDay?: Day; entries: readonly Entry[] }>()
  const form = useEntryDraft(exit?.entries ?? entries, startDay)
  const title = form.editing ? `Edit ${dayLabel(form.day, today)}` : 'New entry'
  // A save or delete is running.
  const [busy, setBusy] = useState(false)

  // Runs a store change, then closes the page. On failure the page stays open, so nothing typed is lost.
  const change = async (what: string, run: () => Promise<unknown>, savedDay?: Day) => {
    setBusy(true)
    try {
      await run()
    } catch (error) {
      console.error(`${what} the entry failed`, error)
      return false
    } finally {
      setBusy(false)
    }
    setExit({ savedDay, entries })
    return true
  }

  const save = async () => {
    if (busy || exit) return
    // Tapping a dimmed Save shows what's wrong.
    if (!form.values) return form.leaveBoth()
    const values = form.values
    if (await change('Saving', () => saveEntry(store, { exerciseId, day: form.day, ...values }, today), form.day)) {
      navigator.vibrate?.(10)
    }
  }
  // The browser's own confirm(): on iPhone it's a real iOS alert. OK deletes and closes, Cancel does nothing.
  const remove = () => {
    const entry = form.editing
    if (busy || exit || !entry) return
    if (!window.confirm(`Delete the entry for ${dayLabel(entry.day, today)}?`)) return
    void change('Deleting', () => deleteEntry(store, entry.id))
  }
  // While a save or delete runs, Cancel waits: the change is happening either way.
  const cancel = () => !busy && setExit((e) => e ?? { entries })

  const header = (
    <div className="grid grid-cols-[1fr_auto_1fr] items-center pt-1">
      <button onClick={cancel} className={`min-h-11 justify-self-start text-body text-tint ${press}`}>
        Cancel
      </button>
      <h2 className="text-headline">{title}</h2>
      {/* Dimmed while invalid, but still tappable: it shows the warnings. */}
      <button
        onClick={save}
        aria-disabled={!form.values}
        className={`min-h-11 justify-self-end text-headline text-tint ${press} ${form.values ? '' : 'opacity-30'}`}
      >
        Save
      </button>
    </div>
  )

  return (
    <CoverPage header={header} closing={exit !== undefined} onGone={() => onClosed(exit?.savedDay)}>
      {/* Locked, the title already names the day, so there's no day row and no note about it. */}
      {!dayLocked && <DayRow day={form.day} today={today} onPick={form.pickDay} />}
      <EntryFields form={form} />
      {form.editing && (
        <button
          onClick={remove}
          className={`mt-6 min-h-11 w-full rounded-control bg-surface py-3 text-body text-destructive ${press}`}
        >
          Delete entry
        </button>
      )}
    </CoverPage>
  )
}

function EntryFields({ form }: { form: EntryDraft }) {
  return (
    <>
      <div className="mt-5 grid gap-3">
        <NumberField
          name="Weight"
          unit="kg"
          inputMode="decimal"
          value={form.weight}
          placeholder={form.placeholder?.weight}
          flagged={form.weightWarning !== undefined}
          onChange={form.setWeight}
          onBlur={() => form.leave('weight')}
          onStep={form.stepWeight}
          canLess={form.canLessWeight}
          canMore={form.canMoreWeight}
        />
        <NumberField
          name="Reps"
          unit="reps"
          inputMode="numeric"
          value={form.reps}
          placeholder={form.placeholder?.reps}
          flagged={form.repsWarning !== undefined}
          onChange={form.setReps}
          onBlur={() => form.leave('reps')}
          onStep={form.stepReps}
          canLess={form.canLessReps}
          canMore={form.canMoreReps}
        />
      </div>

      {/* Always one line: a warning (weight first), else the estimate. So the page never jumps. */}
      <p aria-live="polite" className="mt-4 min-h-6 text-center text-subhead text-label-secondary tabular-nums">
        {(form.weightWarning ?? form.repsWarning) || (
          <>
            Estimated 1RM{' '}
            <span className="text-headline text-label">
              {form.estimated1RM !== undefined ? formatEstimate(form.estimated1RM) : '–'}
            </span>
            <Kg />
          </>
        )}
      </p>
    </>
  )
}

interface NumberFieldProps {
  name: string
  unit: string
  inputMode: 'decimal' | 'numeric'
  value: string
  placeholder?: string
  // Invalid and already left: a grey outline. Never destructive, which means "this deletes something".
  flagged: boolean
  onChange: (text: string) => void
  onBlur: () => void
  onStep: (sign: 1 | -1) => void
  canLess: boolean
  canMore: boolean
}

// − on the left, the value and unit in the middle at the same large size ("117.5 kg"), + on the right.
function NumberField({ name, unit, inputMode, value, placeholder, flagged, onChange, onBlur, onStep, canLess, canMore }: NumberFieldProps) {
  const stepper = `flex size-12 shrink-0 items-center justify-center rounded-full bg-surface-raised text-tint disabled:opacity-30 ${press}`
  return (
    <div className={`flex items-center gap-2 rounded-card bg-surface p-3 ${flagged ? 'ring-2 ring-label-secondary' : ''}`}>
      <button onClick={() => onStep(-1)} disabled={!canLess} aria-label={`Less ${name.toLowerCase()}`} className={stepper}>
        <Minus size={24} strokeWidth={2.25} aria-hidden />
      </button>
      {/* The number sits right of centre and the unit left of it, so they read as one value. */}
      <label className="flex min-w-0 flex-1 items-baseline gap-1.5 text-large-title">
        <input
          aria-label={name}
          inputMode={inputMode}
          autoComplete="off"
          value={value}
          placeholder={placeholder}
          aria-invalid={flagged}
          onChange={(e) => onChange(e.target.value)}
          onBlur={onBlur}
          // Inline, because the base CSS forces inputs to 16px (the iOS zoom guard) over any class.
          style={{ fontSize: 'inherit', lineHeight: 'inherit' }}
          className="w-0 flex-1 bg-transparent text-right tabular-nums outline-none placeholder:text-label-secondary/40"
        />
        <span className="flex-1 text-label-secondary">{unit}</span>
      </label>
      <button onClick={() => onStep(1)} disabled={!canMore} aria-label={`More ${name.toLowerCase()}`} className={stepper}>
        <Plus size={24} strokeWidth={2.25} aria-hidden />
      </button>
    </div>
  )
}

// A slim card (44px against the number fields' ~70px): part of the form, but less important.
// A transparent native date input covers it, so a tap opens the phone's date picker. No future days.
function DayRow({ day, today, onPick }: { day: Day; today: Day; onPick: (day: Day) => void }) {
  return (
    <label className={`relative mt-4 flex min-h-11 items-center justify-between rounded-card bg-surface px-4 text-body ${press}`}>
      <span>Day</span>
      <span className="flex items-center gap-1 text-tint">
        {dayLabel(day, today)}
        <ChevronRight size={18} strokeWidth={2} className="text-label-secondary" aria-hidden />
      </span>
      <input
        type="date"
        value={day}
        max={today}
        // Cleared or a future day: keep the current day.
        onChange={(e) => e.target.value && e.target.value <= today && onPick(e.target.value)}
        className="absolute inset-0 opacity-0"
        aria-label="Day"
      />
    </label>
  )
}
