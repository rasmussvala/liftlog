// PROTOTYPE ONLY. A floating bar that flips between UI variants via ?variant=.
// Not part of the design being judged. Shown only in dev, or in a build made with VITE_PROTOTYPE=1.
import { ChevronLeft, ChevronRight } from 'lucide-react'
import { useEffect, useState } from 'react'

export const prototypeEnabled = import.meta.env.DEV || import.meta.env.VITE_PROTOTYPE === '1'

function readVariant(keys: string[]): string {
  const value = new URLSearchParams(window.location.search).get('variant')?.toUpperCase()
  return value && keys.includes(value) ? value : keys[0]
}

// The current variant, kept in ?variant= so a reload keeps it. The hash route and history state stay as they are.
export function useVariant(keys: string[]): [string, (key: string) => void] {
  const [variant, setVariant] = useState(() => readVariant(keys))
  const choose = (key: string) => {
    const url = new URL(window.location.href)
    url.searchParams.set('variant', key)
    window.history.replaceState(window.history.state, '', url)
    setVariant(key)
  }
  return [variant, choose]
}

type Option = { key: string; label: string }

export function PrototypeSwitcher({
  variants,
  current,
  onChange,
  states,
  currentState,
  onStateChange,
}: {
  variants: Option[]
  current: string
  onChange: (key: string) => void
  states?: Option[]
  currentState?: string
  onStateChange?: (key: string) => void
}) {
  const index = variants.findIndex((v) => v.key === current)
  const step = (by: number) => onChange(variants[(index + by + variants.length) % variants.length].key)

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      const target = event.target as HTMLElement
      if (target.closest('input, textarea, [contenteditable]')) return
      if (event.key === 'ArrowLeft') step(-1)
      if (event.key === 'ArrowRight') step(1)
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  })

  return (
    <div
      className="fixed inset-x-0 z-50 flex flex-col items-center gap-2 px-4"
      style={{ bottom: 'calc(env(safe-area-inset-bottom) + 12px)' }}
    >
      {states && (
        <div className="flex max-w-full gap-1 overflow-x-auto rounded-full bg-label p-1 shadow-lg shadow-shadow/30">
          {states.map((s) => (
            <button
              key={s.key}
              onClick={() => onStateChange?.(s.key)}
              className={`min-h-9 shrink-0 rounded-full px-3 text-footnote ${s.key === currentState ? 'bg-bg text-label' : 'text-bg'}`}
            >
              {s.label}
            </button>
          ))}
        </div>
      )}
      <div className="flex items-center rounded-full bg-label text-bg shadow-lg shadow-shadow/30">
        <button aria-label="Previous variant" onClick={() => step(-1)} className="flex size-11 items-center justify-center">
          <ChevronLeft size={24} strokeWidth={2.25} aria-hidden />
        </button>
        <span className="min-w-44 text-center text-subhead">
          {current} ({variants[index].label})
        </span>
        <button aria-label="Next variant" onClick={() => step(1)} className="flex size-11 items-center justify-center">
          <ChevronRight size={24} strokeWidth={2.25} aria-hidden />
        </button>
      </div>
    </div>
  )
}
