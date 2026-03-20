'use client'

import { Bar, BarChart, CartesianGrid, XAxis, YAxis } from 'recharts'
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  ChartLegend,
  ChartLegendContent,
  type ChartConfig,
} from '@/components/ui/chart'

type AuditFrequencyPoint = { hour: string; success: number; errors: number; total: number }

const chartConfig = {
  success: { label: 'success', color: '#60a5fa' },
  errors: { label: 'errors', color: 'var(--color-severity-critical)' },
} satisfies ChartConfig

function formatHour(isoString: string) {
  const date = new Date(isoString)
  const h = String(date.getHours()).padStart(2, '0')
  const m = String(date.getMinutes()).padStart(2, '0')
  return `${h}:${m}`
}

export function AuditEventChart({ data }: { data: AuditFrequencyPoint[] }) {
  if (data.length === 0) {
    return (
      <div className="flex h-40 items-center justify-center">
        <p className="text-sm text-muted-foreground">no audit events in this period</p>
      </div>
    )
  }

  return (
    <ChartContainer className="h-40 w-full" config={chartConfig}>
      <BarChart data={data} margin={{ left: 0, right: 8, top: 8, bottom: 0 }}>
        <CartesianGrid strokeDasharray="3 3" vertical={false} />
        <XAxis dataKey="hour" tickFormatter={formatHour} tick={{ fontSize: 11 }} />
        <YAxis tick={{ fontSize: 11 }} width={30} allowDecimals={false} />
        <ChartTooltip content={<ChartTooltipContent labelFormatter={formatHour} />} />
        <ChartLegend content={<ChartLegendContent />} />
        <Bar dataKey="success" fill="var(--color-success)" stackId="events" radius={[2, 2, 0, 0]} />
        <Bar dataKey="errors" fill="var(--color-errors)" stackId="events" radius={[2, 2, 0, 0]} />
      </BarChart>
    </ChartContainer>
  )
}
