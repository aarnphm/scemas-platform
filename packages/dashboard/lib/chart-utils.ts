export const CHART_PERIODS = [
  { label: '3h', hours: 3 },
  { label: '6h', hours: 6 },
  { label: '12h', hours: 12 },
  { label: '24h', hours: 24 },
  { label: '7d', hours: 168 },
  { label: '30d', hours: 720 },
] as const

const periodMap: Record<number, string> = {
  3: 'last 3 hours',
  6: 'last 6 hours',
  12: 'last 12 hours',
  24: 'last 24 hours',
  168: 'last 7 days',
  720: 'last 30 days',
}

export function periodLabel(hours: number): string {
  return periodMap[hours] ?? `last ${hours}h`
}

const dateOpts: Intl.DateTimeFormatOptions = { month: 'short', day: 'numeric' }
const weekdayOpts: Intl.DateTimeFormatOptions = { weekday: 'short' }

export function makeChartTimeFormatter(hours: number): (isoString: string) => string {
  return (isoString: string) => {
    const date = new Date(isoString)
    if (hours > 168) {
      return date.toLocaleDateString(undefined, dateOpts)
    }
    const hh = String(date.getHours()).padStart(2, '0')
    const mm = String(date.getMinutes()).padStart(2, '0')
    if (hours > 24) {
      const day = date.toLocaleDateString(undefined, weekdayOpts)
      return `${day} ${hh}:${mm}`
    }
    return `${hh}:${mm}`
  }
}
