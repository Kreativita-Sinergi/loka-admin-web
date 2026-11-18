import { useEffect, useState, useSyncExternalStore } from 'react'
import { NavLink, Outlet, Navigate } from 'react-router-dom'
import { LayoutDashboard, Menu, Store, Target, WifiOff } from 'lucide-react'
import Sidebar, { BrandMark } from './Sidebar'
import InstallAppButton from './InstallAppButton'
import { useAuthStore } from '../../store/authStore'

const mobileTabs = [
  { to: '/', label: 'Dasbor', icon: LayoutDashboard },
  { to: '/businesses', label: 'Bisnis', icon: Store },
  { to: '/prospects', label: 'Prospek', icon: Target },
]

function subscribeConnection(callback: () => void) {
  window.addEventListener('online', callback)
  window.addEventListener('offline', callback)
  return () => {
    window.removeEventListener('online', callback)
    window.removeEventListener('offline', callback)
  }
}

export default function AppLayout() {
  const token = useAuthStore((s) => s.activeToken())
  const online = useSyncExternalStore(subscribeConnection, () => navigator.onLine)
  const [menuOpen, setMenuOpen] = useState(false)

  useEffect(() => {
    if (!menuOpen) return
    const desktop = window.matchMedia('(min-width: 64rem)')
    if (desktop.matches) return
    const closeAtDesktop = (event: MediaQueryListEvent) => {
      if (event.matches) setMenuOpen(false)
    }
    const previousOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    desktop.addEventListener('change', closeAtDesktop)
    return () => {
      document.body.style.overflow = previousOverflow
      desktop.removeEventListener('change', closeAtDesktop)
    }
  }, [menuOpen])

  if (!token) return <Navigate to="/login" replace />

  return (
    <div className="min-h-dvh bg-slate-50">
      <header className="mobile-header sticky top-0 z-30 border-b border-slate-200 bg-white/95 backdrop-blur lg:hidden">
        <div className="flex min-h-15 items-center justify-between gap-2 px-4">
          <BrandMark />
          <InstallAppButton />
        </div>
      </header>

      <Sidebar open={menuOpen} onClose={() => setMenuOpen(false)} />
      <main className="admin-main min-w-0 px-4 pt-4 sm:px-6 lg:ml-64 lg:p-8">
        {!online && (
          <div role="status" className="mb-4 flex items-start gap-2 rounded-xl border border-amber-200 bg-amber-50 p-3 text-sm text-amber-800">
            <WifiOff size={18} className="mt-0.5 shrink-0" aria-hidden />
            Koneksi terputus. Sambungkan internet untuk memuat data terbaru.
          </div>
        )}
        <Outlet />
      </main>

      <nav aria-label="Navigasi cepat" className="mobile-tab-bar fixed inset-x-0 bottom-0 z-30 border-t border-slate-200 bg-white/95 backdrop-blur lg:hidden">
        <div className="grid grid-cols-4 gap-1 px-2 py-1.5">
          {mobileTabs.map(({ to, label, icon: Icon }) => (
            <NavLink key={to} to={to} end={to === '/'} className={({ isActive }) =>
              `flex min-h-12 min-w-0 flex-col items-center justify-center gap-0.5 rounded-xl px-1 text-[11px] font-semibold focus-visible:outline-2 focus-visible:outline-indigo-600 ${isActive ? 'bg-indigo-50 text-indigo-700' : 'text-slate-600 hover:bg-slate-100'}`
            }>
              <Icon size={20} aria-hidden />
              {label}
            </NavLink>
          ))}
          <button
            type="button"
            onClick={() => setMenuOpen(true)}
            aria-expanded={menuOpen}
            aria-controls="admin-mobile-menu"
            aria-haspopup="dialog"
            className="flex min-h-12 flex-col items-center justify-center gap-0.5 rounded-xl px-1 text-[11px] font-semibold text-slate-600 hover:bg-slate-100 focus-visible:outline-2 focus-visible:outline-indigo-600"
          >
            <Menu size={20} aria-hidden />
            Menu
          </button>
        </div>
      </nav>
    </div>
  )
}
