import { create } from 'zustand'
import { persist } from 'zustand/middleware'

export type ThemePreference = 'light' | 'dark' | 'system'

interface ThemeState {
  /** Pilihan pengguna. `system` mengikuti setelan OS. */
  preference: ThemePreference
  setPreference: (preference: ThemePreference) => void
}

const STORAGE_KEY = 'loka-admin-theme'
const darkQuery = () => window.matchMedia('(prefers-color-scheme: dark)')

/** Tema yang benar-benar dipakai setelah `system` diterjemahkan. */
export function resolveTheme(preference: ThemePreference): 'light' | 'dark' {
  if (preference === 'system') return darkQuery().matches ? 'dark' : 'light'
  return preference
}

function applyTheme(preference: ThemePreference) {
  const root = document.documentElement
  const theme = resolveTheme(preference)
  root.classList.toggle('dark', theme === 'dark')
  root.style.colorScheme = theme
}

export const useThemeStore = create<ThemeState>()(
  persist(
    (set) => ({
      preference: 'light',
      setPreference: (preference) => {
        applyTheme(preference)
        set({ preference })
      },
    }),
    {
      name: STORAGE_KEY,
      onRehydrateStorage: () => (state) => applyTheme(state?.preference ?? 'light'),
    }
  )
)

// Saat pilihan `system`, ikuti perubahan setelan OS tanpa perlu muat ulang.
darkQuery().addEventListener('change', () => {
  if (useThemeStore.getState().preference === 'system') applyTheme('system')
})
