import { cn } from '@/lib/utils'

export function PeriodSelector({
  periods,
  value,
  onChange,
}: {
  periods: ReadonlyArray<{ label: string; hours: number }>
  value: number
  onChange: (hours: number) => void
}) {
  return (
    <div className="flex gap-0.5">
      {periods.map(p => (
        <button
          className={cn(
            'relative rounded px-2 py-1 text-xs font-medium tabular-nums transition-colors',
            'after:absolute after:inset-x-0 after:-inset-y-2',
            value === p.hours
              ? 'bg-muted text-foreground'
              : 'text-muted-foreground/50 hover:text-muted-foreground',
          )}
          key={p.hours}
          onClick={() => onChange(p.hours)}
          type="button"
        >
          {p.label}
        </button>
      ))}
    </div>
  )
}
