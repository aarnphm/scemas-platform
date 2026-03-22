'use client'

import { NativeSelect, NativeSelectOption } from '@/components/ui/native-select'
import {
  PUBLIC_PAGE_SIZE_OPTIONS,
  REFRESH_INTERVAL_OPTIONS,
  usePublicSettings,
  type PublicPageSizeOption,
  type RefreshIntervalOption,
} from '@/lib/settings'

export function PublicDisplaySettings() {
  const pageSize = usePublicSettings(s => s.pageSize)
  const refreshInterval = usePublicSettings(s => s.refreshInterval)
  const setPageSize = usePublicSettings(s => s.setPageSize)
  const setRefreshInterval = usePublicSettings(s => s.setRefreshInterval)

  return (
    <div className="flex items-center gap-4 text-xs text-muted-foreground">
      <label className="flex items-center gap-2">
        <span>regions per page</span>
        <NativeSelect
          size="sm"
          value={String(pageSize)}
          onChange={e => setPageSize(Number(e.target.value) as PublicPageSizeOption)}
        >
          {PUBLIC_PAGE_SIZE_OPTIONS.map(size => (
            <NativeSelectOption key={size} value={String(size)}>
              {size}
            </NativeSelectOption>
          ))}
        </NativeSelect>
      </label>
      <label className="flex items-center gap-2">
        <span>refresh</span>
        <NativeSelect
          size="sm"
          value={String(refreshInterval)}
          onChange={e => setRefreshInterval(Number(e.target.value) as RefreshIntervalOption)}
        >
          {REFRESH_INTERVAL_OPTIONS.map(interval => (
            <NativeSelectOption key={interval} value={String(interval)}>
              {interval}s
            </NativeSelectOption>
          ))}
        </NativeSelect>
      </label>
    </div>
  )
}
