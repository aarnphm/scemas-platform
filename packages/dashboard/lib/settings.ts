import { create } from 'zustand'
import { persist } from 'zustand/middleware'

export const PAGE_SIZE_OPTIONS = [5, 10, 20] as const
export type PageSizeOption = (typeof PAGE_SIZE_OPTIONS)[number]

type SettingsState = { pageSize: PageSizeOption; setPageSize: (size: PageSizeOption) => void }

export const useSettings = create<SettingsState>()(
  persist(set => ({ pageSize: 5, setPageSize: size => set({ pageSize: size }) }), {
    name: 'scemas-settings',
  }),
)

export function usePageSize(): PageSizeOption {
  return useSettings(s => s.pageSize)
}

// public display settings (separate from operator/admin)
export const PUBLIC_PAGE_SIZE_OPTIONS = [4, 8, 12] as const
export type PublicPageSizeOption = (typeof PUBLIC_PAGE_SIZE_OPTIONS)[number]

export const REFRESH_INTERVAL_OPTIONS = [5, 10, 30] as const
export type RefreshIntervalOption = (typeof REFRESH_INTERVAL_OPTIONS)[number]

type PublicSettingsState = {
  pageSize: PublicPageSizeOption
  refreshInterval: RefreshIntervalOption
  setPageSize: (size: PublicPageSizeOption) => void
  setRefreshInterval: (interval: RefreshIntervalOption) => void
}

export const usePublicSettings = create<PublicSettingsState>()(
  persist(
    set => ({
      pageSize: 4,
      refreshInterval: 10,
      setPageSize: size => set({ pageSize: size }),
      setRefreshInterval: interval => set({ refreshInterval: interval }),
    }),
    { name: 'scemas-public-settings' },
  ),
)
