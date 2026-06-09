import { NavLink, useNavigate } from 'react-router-dom'
import { useAuthStore } from '../../store/authStore'

const navItems = [
  { to: '/', label: 'Dashboard', icon: '📊' },
  { to: '/businesses', label: 'Bisnis', icon: '🏪' },
  { to: '/access-requests', label: 'Permintaan Akses', icon: '📥' },
  { to: '/prospects', label: 'Prospek', icon: '🎯' },
  { to: '/notifications', label: 'Notifikasi', icon: '📤' },
  { to: '/security-logs', label: 'Security Log', icon: '🛡️' },
]

export default function Sidebar() {
  const logout = useAuthStore((s) => s.logout)
  const navigate = useNavigate()

  const handleLogout = () => {
    logout()
    navigate('/login')
  }

  return (
    <aside className="w-60 min-h-screen bg-slate-900 text-white flex flex-col fixed top-0 left-0">
      <div className="px-6 py-5 border-b border-slate-700">
        <h1 className="text-lg font-bold text-white">Loka Admin</h1>
        <p className="text-xs text-slate-400 mt-0.5">Super Admin Portal</p>
      </div>

      <nav className="flex-1 px-3 py-4 space-y-1">
        {navItems.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            end={item.to === '/'}
            className={({ isActive }) =>
              `flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-colors ${
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
