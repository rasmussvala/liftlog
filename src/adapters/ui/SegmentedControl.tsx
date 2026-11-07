// A pill track of equal segments, accessible as tabs. The selected segment slides under the labels.
// The selected segment is always the lighter colour: surface on surface-raised in light mode, swapped in dark.
export function SegmentedControl<Id extends string>({
  segments,
  selected,
  onSelect,
  label,
  className = '',
}: {
  segments: readonly { id: Id; label: string }[]
  selected: Id
  onSelect: (id: Id) => void
  // What the tabs choose, for VoiceOver ("Range").
  label?: string
  className?: string
}) {
  const index = segments.findIndex((s) => s.id === selected)
  return (
    <div
      role="tablist"
      aria-label={label}
      className={`relative grid auto-cols-fr grid-flow-col rounded-full bg-surface-raised p-1 dark:bg-surface ${className}`}
    >
      <span
        aria-hidden
        className="absolute inset-y-1 left-1 rounded-full bg-surface shadow-sm shadow-shadow/20 dark:bg-surface-raised motion-safe:transition-transform motion-safe:duration-200 motion-safe:ease-out"
        style={{ width: `calc((100% - 0.5rem) / ${segments.length})`, transform: `translateX(${index * 100}%)` }}
      />
      {segments.map((s) => (
        <button
          key={s.id}
          role="tab"
          aria-selected={s.id === selected}
          onClick={() => onSelect(s.id)}
          className={`relative min-h-11 rounded-full text-headline transition-opacity duration-150 ease-out active:opacity-60 active:duration-0 ${s.id === selected ? 'text-label' : 'text-label-secondary'}`}
        >
          {s.label}
        </button>
      ))}
    </div>
  )
}
