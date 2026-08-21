import { NavLink, useNavigate } from 'react-router-dom'
import { useAuthStore } from '../../store/authStore'

const navItems = [
  { to: '/', label: 'Dashboard', icon: '📊' },
  { to: '/usage', label: 'User Aktif', icon: '🟢' },
  { to: '/businesses', label: 'Bisnis', icon: '🏪' },
  { to: '/reset-transactions', label: 'Reset Transaksi', icon: '🧹' },
  { to: '/prospects', label: 'Prospek', icon: '🎯' },
  { to: '/threads-bot', label: 'Bot Threads', icon: '🤖' },
  { to: '/notifications', label: 'Notifikasi', icon: '📤' },
  { to: '/security-logs', label: 'Security Log', icon: '🛡️' },
]

interface SidebarProps {
  open: boolean
  onClose: () => void
}

export default function Sidebar({ open, onClose }: SidebarProps) {
  const logout = useAuthStore((s) => s.logout)
  const navigate = useNavigate()

  const handleLogout = () => {
    logout()
    navigate('/login')
  }

  return (
    <aside
      className={`w-72 sm:w-80 lg:w-60 h-dvh bg-slate-900 text-white flex flex-col fixed top-0 left-0 z-50 transition-transform duration-200 ease-out lg:translate-x-0 ${open ? 'translate-x-0' : '-translate-x-full'}`}
      aria-label="Navigasi utama"
    >
      <div className="px-5 lg:px-6 py-4 lg:py-5 border-b border-slate-700 flex items-center justify-between">
        <div>
          <h1 className="text-lg font-bold text-white">Loka Admin</h1>
          <p className="text-xs text-slate-400 mt-0.5">Super Admin Portal</p>
        </div>
        <button
          type="button"
          onClick={onClose}
          className="lg:hidden w-10 h-10 rounded-lg text-2xl text-slate-300 hover:bg-slate-800 hover:text-white"
          aria-label="Tutup menu navigasi"
        >
          ×
        </button>
      </div>

      <nav className="flex-1 px-3 py-4 space-y-1">
        {navItems.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            end={item.to === '/'}
            onClick={onClose}
            className={({ isActive }) =>
              `flex items-center gap-3 px-3 py-2.5 lg:py-2 rounded-lg text-sm transition-colors ${
                isActive
                  ? 'bg-indigo-600 text-white'
                  : 'text-slate-300 hover:bg-slate-800 hover:text-white'
              }`
            }
          >
            <span>{item.icon}</span>
            {item.label}
          </NavLink>
        ))}
      </nav>

      <div className="px-3 py-4 border-t border-slate-700">
        <button
          onClick={handleLogout}
          className="w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm text-slate-300 hover:bg-slate-800 hover:text-white transition-colors"
        >
          <span>🚪</span>
          Keluar
        </button>
      </div>
    </aside>
  )
}
