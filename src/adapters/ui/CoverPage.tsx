import type { AnimationEvent, ReactNode } from 'react'

// A full-screen page over a screen (iOS "full-screen cover"), such as the entry page.
// Opaque and scrolls on its own, so nothing behind it can scroll. No drag to dismiss: the header's
// buttons are the only ways out. Slides up from the bottom and back down, or fades with reduced motion.
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
  const motion = closing
    ? 'motion-safe:animate-cover-out motion-reduce:animate-fade-out'
    : 'motion-safe:animate-cover-in motion-reduce:animate-fade-in'
  // Only the page's own exit counts, not an animation inside it.
  const onAnimationEnd = (e: AnimationEvent) => closing && e.target === e.currentTarget && onGone()

  return (
    <div
      role="dialog"
      aria-modal
      onAnimationEnd={onAnimationEnd}
      className={`fixed inset-0 z-30 overflow-y-auto overscroll-contain bg-bg pt-[env(safe-area-inset-top)] pr-[env(safe-area-inset-right)] pb-[env(safe-area-inset-bottom)] pl-[env(safe-area-inset-left)] ${motion}`}
    >
      <div className="sticky top-0 z-10 bg-bg px-5 pt-2">{header}</div>
      <div className="px-5 pb-12">{children}</div>
    </div>
  )
}
