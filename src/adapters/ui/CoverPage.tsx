import { useEffect, useEffectEvent, useRef, useState, type ReactNode, type TransitionEvent } from 'react'

const EXIT_MS = 260

// A full-screen page over a screen (iOS "full-screen cover"), such as the entry page.
// Opaque and scrolls on its own, so nothing behind it can scroll. No drag to dismiss: the header's
// buttons are the only ways out. Slides up from the bottom and back down a bit faster, or fades with
// reduced motion. Transitions, not keyframes, so closing mid-slide reverses from where the page is.
// `closing` starts the exit; onGone fires once the page has left, so the caller can unmount it.
export function CoverPage({
  header,
  closing,
  onGone,
  children,
}: {
  header: ReactNode
  closing: boolean
  onGone: () => void
  children: ReactNode
}) {
  const page = useRef<HTMLDivElement>(null)
  // Off-screen at first, then shown, so the transition runs. Reading the layout first makes sure the
  // browser has seen the off-screen position, or it would skip straight to shown.
  const [shown, setShown] = useState(false)
  useEffect(() => {
    const frame = requestAnimationFrame(() => {
      page.current?.getBoundingClientRect()
      setShown(true)
    })
    return () => cancelAnimationFrame(frame)
  }, [])

  // The exit normally ends on transitionend. A browser can skip the transition (the app is in the
  // background), so a timer finishes it too, or the page would stay mounted off-screen.
  const finishExit = useEffectEvent(onGone)
  useEffect(() => {
    if (!closing) return
    const timeout = setTimeout(finishExit, EXIT_MS + 100)
    return () => clearTimeout(timeout)
  }, [closing])

  const visible = shown && !closing
  const motion = [
    'motion-safe:transition-transform motion-safe:ease-drawer motion-reduce:transition-opacity motion-reduce:duration-200',
    closing ? 'motion-safe:duration-260' : 'motion-safe:duration-400', // 260 is EXIT_MS
    visible ? '' : 'motion-safe:translate-y-full motion-reduce:opacity-0',
  ].join(' ')
  // Only the page's own exit counts, not a transition inside it.
  const onTransitionEnd = (e: TransitionEvent) => closing && e.target === e.currentTarget && onGone()

  return (
    <div
      ref={page}
      role="dialog"
      aria-modal
      onTransitionEnd={onTransitionEnd}
      className={`fixed inset-0 z-30 overflow-y-auto overscroll-contain bg-bg pt-[env(safe-area-inset-top)] pr-[env(safe-area-inset-right)] pb-[env(safe-area-inset-bottom)] pl-[env(safe-area-inset-left)] ${motion}`}
    >
      <div className="sticky top-0 z-10 bg-bg px-5 pt-2">{header}</div>
      <div className="px-5 pb-12">{children}</div>
    </div>
  )
}
