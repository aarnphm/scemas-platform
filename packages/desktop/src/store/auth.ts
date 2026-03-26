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
  setSession: (token, user) => set({ token, user }),
  clearSession: () => set({ token: null, user: null }),
}))
