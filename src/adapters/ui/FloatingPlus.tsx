import { Plus } from 'lucide-react'

// The round + fixed bottom-right, over the screen's content. Lists under it need bottom room (`pb-32` or `mb-20`).
export function FloatingPlus({ label, onClick }: { label: string; onClick: () => void }) {
  return (
    <button
      aria-label={label}
      onClick={onClick}
      className="fixed right-5 bottom-[calc(env(safe-area-inset-bottom)+20px)] z-10 grid size-14 place-items-center rounded-full bg-tint text-on-tint shadow-lg transition-transform duration-150 ease-out motion-safe:active:scale-[0.94]"
    >
      <Plus size={28} strokeWidth={2.25} aria-hidden />
    </button>
  )
}
