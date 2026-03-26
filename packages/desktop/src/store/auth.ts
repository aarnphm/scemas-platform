import { invoke } from '@tauri-apps/api/core'
import { create } from 'zustand'

interface User {
  id: string
  email: string
  username: string
  role: 'admin' | 'operator' | 'viewer'
}

interface AuthState {
  token: string | null
  user: User | null
  setSession: (token: string, user: User) => void
  clearSession: () => void
}

export const useAuthStore = create<AuthState>(set => ({
  token: null,
  user: null,
  setSession: (token, user) => {
    set({ token, user })
    invoke('tray_set_auth', { loggedIn: true, email: user.email }).catch(() => {})
  },
  clearSession: () => {
    set({ token: null, user: null })
    invoke('tray_set_auth', { loggedIn: false }).catch(() => {})
  },
}))
