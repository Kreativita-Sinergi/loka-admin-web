import { Moon, Sun } from 'lucide-react'
import { resolveTheme, useThemeStore } from '../../store/themeStore'

/** Satu tombol ikon untuk tempat sempit (mis. halaman login): bergantian terang ↔ gelap. */
export function ThemeIconButton() {
  const preference = useThemeStore((s) => s.preference)
  const setPreference = useThemeStore((s) => s.setPreference)
  const isDark = resolveTheme(preference) === 'dark'
  const label = isDark ? 'Ganti ke mode terang' : 'Ganti ke mode gelap'

  return (
    <button
      type="button"
      onClick={() => setPreference(isDark ? 'light' : 'dark')}
      aria-label={label}
      title={label}
      className="w-9 h-9 rounded-lg flex items-center justify-center text-slate-500 hover:text-slate-900 hover:bg-slate-200/60 transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500"
    >
      {isDark ? <Sun size={18} aria-hidden /> : <Moon size={18} aria-hidden />}
    </button>
  )
}
