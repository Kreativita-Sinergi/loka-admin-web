import { useEffect, useState } from 'react'
import { Outlet, Navigate } from 'react-router-dom'
import Sidebar from './Sidebar'
import { useAuthStore } from '../../store/authStore'

export default function AppLayout() {
  const apiKey = useAuthStore((s) => s.apiKey)
  const [menuOpen, setMenuOpen] = useState(false)

  useEffect(() => {
    if (!menuOpen) return
    const previousOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => { document.body.style.overflow = previousOverflow }
  }, [menuOpen])

  if (!apiKey) return <Navigate to="/login" replace />

  return (
    <div className="min-h-screen bg-slate-50">
      <header className="lg:hidden fixed inset-x-0 top-0 z-30 h-16 bg-slate-900 text-white border-b border-slate-700 flex items-center justify-between px-4 shadow-sm">
        <div>
          <p className="font-bold leading-tight">Loka Admin</p>
          <p className="text-[11px] text-slate-400">Super Admin Portal</p>
        </div>
        <button
          type="button"
          onClick={() => setMenuOpen(true)}
          className="w-11 h-11 rounded-xl flex items-center justify-center text-2xl hover:bg-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-400"
          aria-label="Buka menu navigasi"
          aria-expanded={menuOpen}
        >
          ☰
        </button>
      </header>

      {menuOpen && (
        <button
          type="button"
          className="lg:hidden fixed inset-0 z-40 bg-slate-950/60 backdrop-blur-[1px]"
          onClick={() => setMenuOpen(false)}
          aria-label="Tutup menu navigasi"
        />
      )}

      <Sidebar open={menuOpen} onClose={() => setMenuOpen(false)} />
      <main className="min-w-0 min-h-screen pt-20 px-4 pb-6 sm:px-6 lg:ml-60 lg:p-6">
        <Outlet />
      </main>
    </div>
  )
}
