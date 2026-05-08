import { create } from 'zustand'
import { persist } from 'zustand/middleware'

interface AuthState {
  apiKey: string | null
  login: (key: string) => void
  logout: () => void
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      apiKey: null,
      login: (key) => set({ apiKey: key }),
      logout: () => set({ apiKey: null }),
    }),
    { name: 'loka-admin-auth' }
  )
)
