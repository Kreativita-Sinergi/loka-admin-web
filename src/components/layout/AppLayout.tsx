import { useEffect, useState } from 'react'
import { Outlet, Navigate } from 'react-router-dom'
import { Menu } from 'lucide-react'
import Sidebar, { BrandMark } from './Sidebar'
import { useAuthStore } from '../../store/authStore'

export default function AppLayout() {
  const token = useAuthStore((s) => s.activeToken())
  const [menuOpen, setMenuOpen] = useState(false)

  useEffect(() => {
    if (!menuOpen) return
    const previousOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => { document.body.style.overflow = previousOverflow }
  }, [menuOpen])

  if (!token) return <Navigate to="/login" replace />

  return (
    <div className="min-h-screen bg-slate-50">
      <header className="lg:hidden fixed inset-x-0 top-0 z-30 h-16 bg-white/90 backdrop-blur border-b border-slate-200 flex items-center justify-between px-4">
        <BrandMark />
        <button
          type="button"
          onClick={() => setMenuOpen(true)}
          className="w-10 h-10 rounded-lg flex items-center justify-center text-slate-600 hover:bg-slate-100 focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500"
          aria-label="Buka menu navigasi"
          aria-expanded={menuOpen}
        >
          <Menu size={22} aria-hidden />
        </button>
      </header>

      {menuOpen && (
        <button
          type="button"
          className="lg:hidden fixed inset-0 z-40 bg-slate-950/50 dark:bg-black/60 backdrop-blur-[1px]"
          onClick={() => setMenuOpen(false)}
          aria-label="Tutup menu navigasi"
        />
      )}

      <Sidebar open={menuOpen} onClose={() => setMenuOpen(false)} />
      <main className="min-w-0 min-h-screen pt-20 px-4 pb-6 sm:px-6 lg:ml-64 lg:p-8">
        <Outlet />
      </main>
    </div>
  )
}
