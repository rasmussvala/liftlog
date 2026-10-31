import { ChevronLeft } from 'lucide-react'
import type { ReactNode } from 'react'
import { goHome } from './router'

// A screen on top of Home: "‹ Lifts" back button, a large title, then the content.
// Covers Home and scrolls on its own, so Home keeps its scroll position underneath.
export function PushedScreen({ title, slideIn, children }: { title: string; slideIn: boolean; children: ReactNode }) {
  return (
    <div
      className={`fixed inset-0 z-20 overflow-y-auto overscroll-contain bg-bg pt-[env(safe-area-inset-top)] pr-[env(safe-area-inset-right)] pb-[env(safe-area-inset-bottom)] pl-[env(safe-area-inset-left)] ${slideIn ? 'motion-safe:animate-screen-in motion-reduce:animate-fade-in' : ''}`}
    >
      <main className="pt-2 pb-12">
        <button
          onClick={goHome}
          className="flex min-h-11 items-center pr-4 pl-2 text-body text-tint transition-opacity duration-150 ease-out active:opacity-50 active:duration-0"
        >
          <ChevronLeft size={28} strokeWidth={1.75} aria-hidden />
          Lifts
        </button>
        {/* A non-breaking space keeps the title's height while it loads. */}
        <h1 className="mt-1 truncate px-5 text-large-title">{title || ' '}</h1>
        {children}
      </main>
    </div>
  )
}
