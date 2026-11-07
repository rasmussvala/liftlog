// PROTOTYPE ONLY (issue #40). Three directions for the Targets table, behind the picker.
// Nothing in the app imports this. Delete once a variant is chosen.
import { Plus } from 'lucide-react'
import { StrictMode, useLayoutEffect, useRef, useState, type ReactNode } from 'react'
import { createRoot } from 'react-dom/client'
import '../index.css'
import { dayLabel, formatEstimate, formatWeight } from '../adapters/ui/format'
import { Kg } from '../adapters/ui/Kg'
import { press } from '../adapters/ui/press'
import { ProgressChart } from '../adapters/ui/ProgressChart'
import { PushedScreen } from '../adapters/ui/PushedScreen'
import type { Entry } from '../domain/entry'
import { currentEstimate, estimate1RM } from '../domain/progress'

const today = '2026-11-07'
const sets: [string, number, number][] = [
  ['2026-11-05', 85, 6],
  ['2026-10-31', 90, 3],
  ['2026-10-27', 80, 8],
  ['2026-10-22', 82.5, 5],
  ['2026-10-16', 77.5, 8],
  ['2026-10-10', 80, 5],
  ['2026-10-03', 75, 7],
  ['2026-09-26', 72.5, 8],
]
// ?entries=N shows only the N newest entries (0 for an empty exercise).
const shown = parseInt(new URLSearchParams(location.search).get('entries') ?? '', 10)
const entries: Entry[] = sets
  .slice(0, Number.isNaN(shown) ? undefined : shown)
  .map(([day, weightKg, reps], i) => ({ id: i + 1, exerciseId: 1, day, weightKg, reps }))
const beat = currentEstimate(entries)?.estimated1RM ?? 0

// The spec's rule: lightest 2.5 kg multiple whose estimated 1RM is strictly above beat.
const STEP = 2.5
const targets = Array.from({ length: 12 }, (_, i) => {
  const reps = i + 1
  let weightKg = Math.ceil(beat / (reps <= 1 ? 1 : 1 + reps / 30) / STEP) * STEP
  if (!(estimate1RM(weightKg, reps) > beat)) weightKg += STEP
  return { reps, weightKg }
})

function Header() {
  return (
    <div className="mt-8 px-5">
      <h2 className="text-title">Targets</h2>
      <p className="mt-1 text-subhead text-label-secondary">
        Beat {formatEstimate(beat)} kg. Lift any of these for a new best.
      </p>
    </div>
  )
}

// 1 — List: an inset grouped list, every rep count on its own row.
function ListVariant() {
  return (
    <>
      <Header />
      <ul className="mx-5 mt-3 rounded-card bg-surface px-5 tabular-nums">
        {targets.map((t) => (
          <li
            key={t.reps}
            className="flex min-h-11 items-baseline justify-between border-b border-separator py-3 last:border-b-0"
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
    </>
  )
}

// 2 — Grid: twelve tiles, three across. The whole table fits in one glance.
function GridVariant() {
  return (
    <>
      <Header />
      <ul className="mx-5 mt-3 grid grid-cols-3 gap-2 tabular-nums">
        {targets.map((t) => (
          <li key={t.reps} className="rounded-control bg-surface px-4 py-3">
            <div className="text-footnote text-label-secondary">× {t.reps}</div>
            <div className="mt-0.5 text-headline">
              {formatWeight(t.weightKg)}
              <Kg />
            </div>
          </li>
        ))}
      </ul>
    </>
  )
}

// 3 — Picker: one answer at a time. Tap a rep count, read one big weight.
function PickerVariant() {
  const [reps, setReps] = useState(entries[0].reps)
  const target = targets[reps - 1]
  return (
    <>
      <Header />
      <div className="mx-5 mt-3 rounded-card bg-surface py-5 tabular-nums">
        <div className="px-5 text-center">
          <div className="text-large-title">
            {formatWeight(target.weightKg)}
            <span className="text-title text-label-secondary"> kg</span>
          </div>
          <div className="text-subhead text-label-secondary">
            for {reps} {reps === 1 ? 'rep' : 'reps'}
          </div>
        </div>
        <div className="mt-4 flex snap-x scroll-px-5 gap-2 overflow-x-auto px-5 [scrollbar-width:none]">
          {targets.map((t) => (
            <button
              key={t.reps}
              onPointerDown={() => setReps(t.reps)}
              onClick={() => setReps(t.reps)}
              aria-pressed={t.reps === reps}
              className={`flex size-11 shrink-0 snap-start items-center justify-center rounded-full text-headline ${press} ${t.reps === reps ? 'bg-tint text-on-tint' : 'bg-surface-raised text-label'}`}
            >
              {t.reps}
            </button>
          ))}
        </div>
      </div>
    </>
  )
}

// 4 — Tabs: a segmented control under the chart switches between History and Targets.
// Targets rows match the history rows, so both tabs read as the same kind of list.
function TabsVariant() {
  const [tab, setTab] = useState<'history' | 'targets'>('history')
  const tabs = [
    { id: 'history', label: 'History' },
    { id: 'targets', label: 'Targets' },
  ] as const
  // No entries: no tabs, nothing to beat. Point at the + instead.
  if (entries.length === 0) return <EmptyState />
  return (
    <>
      <div role="tablist" className="relative mx-5 mt-8 grid grid-cols-2 rounded-full bg-surface-raised p-1 dark:bg-surface">
        {/* The selected segment slides under the labels. */}
        <span
          aria-hidden
          className="absolute inset-y-1 left-1 w-[calc(50%-0.25rem)] rounded-full bg-surface shadow-sm shadow-shadow/20 dark:bg-surface-raised motion-safe:transition-transform motion-safe:duration-200 motion-safe:ease-out"
          style={{ transform: tab === 'targets' ? 'translateX(100%)' : undefined }}
        />
        {tabs.map((t) => (
          <button
            key={t.id}
            role="tab"
            aria-selected={tab === t.id}
            onClick={() => setTab(t.id)}
            className={`relative min-h-11 rounded-full text-headline transition-opacity duration-150 ease-out active:opacity-60 active:duration-0 ${tab === t.id ? 'text-label' : 'text-label-secondary'}`}
          >
            {t.label}
          </button>
        ))}
      </div>
      {tab === 'history' ? (
        <History />
      ) : (
        <>
          <p className="mt-4 px-5 text-subhead text-label-secondary">
            Beat {formatEstimate(beat)} kg. Lift any of these for a new best.
          </p>
          <ul className="mt-2 mb-20 ml-5 tabular-nums">
            {targets.map((t) => (
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
        </>
      )}
    </>
  )
}

function EmptyState() {
  return (
    <div className="mt-8 px-5">
      <p className="text-headline">No entries yet</p>
      <p className="mt-1 text-subhead text-label-secondary">
        Tap + to log your first set. Targets show up once you have one.
      </p>
    </div>
  )
}

const variants: { name: string; ownsHistory?: boolean; render: () => ReactNode }[] = [
  { name: 'List', render: () => entries.length > 0 && <ListVariant /> },
  { name: 'Grid', render: () => entries.length > 0 && <GridVariant /> },
  { name: 'Picker', render: () => entries.length > 0 && <PickerVariant /> },
  { name: 'Tabs', ownsHistory: true, render: () => <TabsVariant /> },
]

// The real exercise screen around the variant: chart, Targets, history, and the floating + for Log entry.
function Screen({ children, history = true }: { children: ReactNode; history?: boolean }) {
  return (
    <>
      <PushedScreen title="Bench press" slideIn={false}>
        <ProgressChart entries={entries} today={today} />
        {children}
        {history && (entries.length > 0 ? <History /> : <EmptyState />)}
      </PushedScreen>
      {/* Log entry: the same floating + as Home, so it's always on screen. */}
      <button
        aria-label="Log entry"
        className="fixed right-5 bottom-[calc(env(safe-area-inset-bottom)+20px)] z-30 grid size-14 place-items-center rounded-full bg-tint text-on-tint shadow-lg transition-transform duration-150 ease-out motion-safe:active:scale-[0.94]"
      >
        <Plus size={28} strokeWidth={2.25} aria-hidden />
      </button>
    </>
  )
}

function History() {
  return (
      // Room at the end so the floating + never covers the last row.
      <ul className="mt-6 mb-20 ml-5 grid grid-cols-[auto_auto_1fr_auto_auto] tabular-nums">
        {entries.map((e) => (
          <li key={e.id} className="col-span-full grid grid-cols-subgrid items-baseline border-b border-separator py-3 last:border-b-0">
            <span className="text-right text-body">
              {formatWeight(e.weightKg)}
              <Kg />
            </span>
            <span className="pl-2 text-body text-label-secondary">× {e.reps}</span>
            <span aria-hidden />
            <span className="pl-4 text-right text-headline">
              {formatEstimate(estimate1RM(e.weightKg, e.reps))}
              <Kg />
            </span>
            <span className="pr-5 pl-4 text-right text-subhead text-label-secondary">{dayLabel(e.day, today)}</span>
          </li>
        ))}
      </ul>
  )
}

// Picker chrome: verbatim from the prototype skill's PICKER.md.
const pickerCss = `
.proto-picker{position:fixed;bottom:24px;left:50%;transform:translateX(-50%);z-index:2147483647;display:flex;align-items:center;gap:2px;padding:4px;border-radius:999px;background:rgba(10,10,10,.82);-webkit-backdrop-filter:blur(12px) saturate(1.4);backdrop-filter:blur(12px) saturate(1.4);box-shadow:0 0 0 1px rgba(255,255,255,.08) inset,0 8px 24px rgba(0,0,0,.24),0 2px 6px rgba(0,0,0,.12);font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif;font-size:13px;line-height:1;-webkit-font-smoothing:antialiased;user-select:none;-webkit-user-select:none}
.proto-picker-highlight{position:absolute;top:4px;left:0;height:28px;border-radius:999px;background:rgba(255,255,255,.12);will-change:transform}
.proto-picker[data-ready] .proto-picker-highlight{transition:transform 250ms cubic-bezier(.23,1,.32,1),width 250ms cubic-bezier(.23,1,.32,1)}
@media (prefers-reduced-motion:reduce){.proto-picker[data-ready] .proto-picker-highlight{transition:none}}
.proto-picker-item{position:relative;display:flex;align-items:center;height:28px;padding:0 12px;border:0;border-radius:999px;background:transparent;color:rgba(255,255,255,.55);font:inherit;cursor:pointer;transition:color 150ms ease-out}
.proto-picker-item:hover{color:rgba(255,255,255,.85)}
.proto-picker-item:active{transform:scale(.97)}
.proto-picker-item:focus-visible{outline:2px solid rgba(255,255,255,.4);outline-offset:2px}
.proto-picker-item[data-active]{color:#fff}
.proto-picker[data-position="top"]{bottom:auto;top:24px}
`

function Harness() {
  const [current, setCurrent] = useState(() => {
    const v = parseInt(new URLSearchParams(location.search).get('v') ?? '', 10)
    return v >= 1 && v <= variants.length ? v - 1 : 0
  })
  const [ready, setReady] = useState(false)
  const items = useRef<(HTMLButtonElement | null)[]>([])
  const highlight = useRef<HTMLSpanElement>(null)

  const select = (i: number) => {
    if (i < 0 || i >= variants.length) return
    setCurrent(i)
    const url = new URL(location.href)
    url.searchParams.set('v', String(i + 1))
    history.replaceState(null, '', url)
  }

  useLayoutEffect(() => {
    const move = () => {
      const el = items.current[current]
      if (!el || !highlight.current) return
      highlight.current.style.width = el.offsetWidth + 'px'
      highlight.current.style.transform = `translateX(${el.offsetLeft}px)`
    }
    move()
    window.addEventListener('resize', move)
    return () => window.removeEventListener('resize', move)
  }, [current])

  useLayoutEffect(() => {
    requestAnimationFrame(() => requestAnimationFrame(() => setReady(true)))
    const onKey = (e: KeyboardEvent) => {
      const t = e.target as HTMLElement
      if (/^(INPUT|TEXTAREA|SELECT)$/.test(t.tagName) || t.isContentEditable) return
      if (e.metaKey || e.ctrlKey || e.altKey) return
      const n = parseInt(e.key, 10)
      if (n >= 1 && n <= variants.length) select(n - 1)
      else if (e.key === 'ArrowRight') setCurrent((c) => (c + 1) % variants.length)
      else if (e.key === 'ArrowLeft') setCurrent((c) => (c - 1 + variants.length) % variants.length)
    }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [])

  return (
    <>
      <style>{pickerCss}</style>
      <Screen key={current} history={!variants[current].ownsHistory}>
        {variants[current].render()}
      </Screen>
      <nav className="proto-picker" aria-label="Prototype variants" data-position="top" data-ready={ready ? '' : undefined}>
        <span ref={highlight} className="proto-picker-highlight" aria-hidden="true" />
        {variants.map((v, i) => (
          <button
            key={v.name}
            ref={(el) => {
              items.current[i] = el
            }}
            className="proto-picker-item"
            data-active={i === current ? '' : undefined}
            aria-current={i === current ? 'true' : undefined}
            onClick={() => select(i)}
          >
            {v.name}
          </button>
        ))}
      </nav>
    </>
  )
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <Harness />
  </StrictMode>,
)
