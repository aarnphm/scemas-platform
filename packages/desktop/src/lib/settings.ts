import { create } from 'zustand'
import { persist } from 'zustand/middleware'

export const PAGE_SIZE_OPTIONS = [5, 10, 20] as const
export type PageSizeOption = (typeof PAGE_SIZE_OPTIONS)[number]

type SettingsState = {
  pageSize: PageSizeOption
  notifications: boolean
  minimizeToTray: boolean
  setPageSize: (size: PageSizeOption) => void
  setNotifications: (enabled: boolean) => void
  setMinimizeToTray: (enabled: boolean) => void
}

export const useSettings = create<SettingsState>()(
  persist(
    set => ({
      pageSize: 10,
      notifications: true,
      minimizeToTray: true,
      setPageSize: size => set({ pageSize: size }),
      setNotifications: enabled => set({ notifications: enabled }),
      setMinimizeToTray: enabled => set({ minimizeToTray: enabled }),
    }),
    { name: 'scemas-settings' },
  ),
)
