'use client'

import { useMemo } from 'react'
import { Area, CartesianGrid, ComposedChart, Line, XAxis, YAxis } from 'recharts'
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from '@/components/ui/chart'
import { makeChartTimeFormatter } from '@/lib/chart-utils'

type HealthPoint = { time: string; latencyMs: number; errorRate: number }

const chartConfig = {
  latencyMs: { label: 'latency (ms)', color: '#ea9a97' },
  errorRate: { label: 'error rate (%)', color: '#a692c3' },
} satisfies ChartConfig

export function PlatformHealthChart({ data, hours }: { data: HealthPoint[]; hours?: number }) {
  const fmt = useMemo(() => makeChartTimeFormatter(hours ?? 24), [hours])
  if (data.length === 0) {
    return (
      <p className="text-sm text-muted-foreground text-pretty">
        no platform status has been recorded yet
      </p>
    )
  }

  return (
    <ChartContainer className="h-56 w-full" config={chartConfig}>
      <ComposedChart data={data} margin={{ left: 0, right: 8, top: 8, bottom: 0 }}>
        <CartesianGrid strokeDasharray="3 3" />
        <XAxis dataKey="time" tickFormatter={fmt} tick={{ fontSize: 11 }} />
        <YAxis yAxisId="left" tick={{ fontSize: 11 }} width={40} />
        <YAxis
          yAxisId="right"
          orientation="right"
          tick={{ fontSize: 11 }}
          tickFormatter={(v: number) => `${(v * 100).toFixed(0)}%`}
          width={40}
        />
        <ChartTooltip content={<ChartTooltipContent labelFormatter={fmt} />} />
        <Line
          dataKey="latencyMs"
          dot={false}
          stroke="var(--color-latencyMs)"
          strokeWidth={1.5}
          type="monotone"
          yAxisId="left"
        />
        <Area
          dataKey="errorRate"
          fill="var(--color-errorRate)"
          fillOpacity={0.15}
          stroke="var(--color-errorRate)"
          strokeWidth={1.5}
          type="monotone"
          yAxisId="right"
        />
      </ComposedChart>
    </ChartContainer>
  )
}
