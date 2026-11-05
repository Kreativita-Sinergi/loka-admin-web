import { useState } from 'react'
import { NavLink, useNavigate } from 'react-router-dom'
import {
  Activity,
  CalendarClock,
  Bot,
  Boxes,
  Eraser,
  Handshake,
  HeartPulse,
  Landmark,
  LayoutDashboard,
  LogOut,
  Package,
  ReceiptText,
  Send,
  ShieldCheck,
  Store,
  Target,
  TrendingUp,
  Users,
  X,
  type LucideIcon,
} from 'lucide-react'
import { useAuthStore } from '../../store/authStore'
import { ThemeIconButton } from './ThemeToggle'
import LokaLogo from '../ui/LokaLogo'
import Modal from '../ui/Modal'

interface NavItem {
  to: string
  label: string
  icon: LucideIcon
}

const navGroups: { title: string; items: NavItem[] }[] = [
  {
    title: 'Ringkasan',
    items: [
      { to: '/', label: 'Dashboard', icon: LayoutDashboard },
      { to: '/usage', label: 'Aktivitas & Pemakaian', icon: Activity },
      { to: '/merchant-health', label: 'Kesehatan Merchant', icon: HeartPulse },
    ],
  },
  {
    title: 'Merchant',
    items: [
      { to: '/businesses', label: 'Bisnis', icon: Store },
      { to: '/users', label: 'Pengguna', icon: Users },
      { to: '/sales', label: 'Penjualan', icon: TrendingUp },
      { to: '/products', label: 'Produk Toko', icon: Boxes },
      { to: '/master-products', label: 'Katalog Produk', icon: Package },
    ],
  },
  {
    title: 'Sales & Referral',
    items: [
      { to: '/prospects', label: 'Prospek', icon: Target },
      { to: '/sales-agents', label: 'Referral Sales', icon: Handshake },
      { to: '/sales-payouts', label: 'Pencairan Sales', icon: Landmark },
    ],
  },
  {
    title: 'Komunikasi',
    items: [
      { to: '/social', label: 'Posting Sosial', icon: CalendarClock },
      { to: '/notifications', label: 'Notifikasi', icon: Send },
      { to: '/threads-bot', label: 'Bot Threads', icon: Bot },
    ],
  },
  {
    title: 'Sistem',
    items: [
      { to: '/payment-fees', label: 'Tarif Pembayaran', icon: ReceiptText },
      { to: '/reset-transactions', label: 'Reset Transaksi', icon: Eraser },
      { to: '/security-logs', label: 'Security Log', icon: ShieldCheck },
    ],
  },
]

interface SidebarProps {
  open: boolean
  onClose: () => void
}

export function BrandMark() {
  return (
    <div className="flex items-center gap-2.5 min-w-0">
      <LokaLogo className="h-6 w-auto text-slate-900" />
      <span className="px-1.5 py-0.5 rounded-md bg-slate-100 text-[10px] font-semibold uppercase tracking-wide text-slate-500">
        Admin
      </span>
    </div>
  )
}

export default function Sidebar({ open, onClose }: SidebarProps) {
  const logout = useAuthStore((s) => s.logout)
  const navigate = useNavigate()

  const [confirmLogout, setConfirmLogout] = useState(false)

  const handleLogout = () => {
    setConfirmLogout(false)
    logout()
    navigate('/login')
  }

  return (
    <>
    <aside
      className={`w-72 lg:w-64 h-dvh bg-white border-r border-slate-200 flex flex-col fixed top-0 left-0 z-50 transition-transform duration-200 ease-out lg:translate-x-0 ${open ? 'translate-x-0' : '-translate-x-full'}`}
      aria-label="Navigasi utama"
    >
      <div className="h-16 px-4 flex items-center justify-between border-b border-slate-200">
        <BrandMark />
        <button
          type="button"
          onClick={onClose}
          className="lg:hidden w-9 h-9 rounded-lg flex items-center justify-center text-slate-500 hover:bg-slate-100 hover:text-slate-900"
          aria-label="Tutup menu navigasi"
        >
          <X size={20} aria-hidden />
        </button>
      </div>

      <nav className="flex-1 overflow-y-auto px-3 py-4 space-y-5">
        {navGroups.map((group) => (
          <div key={group.title}>
            <p className="px-3 mb-1.5 text-[11px] font-semibold uppercase tracking-wider text-slate-400">
              {group.title}
            </p>
            <div className="space-y-0.5">
              {group.items.map(({ to, label, icon: Icon }) => (
                <NavLink
                  key={to}
                  to={to}
                  end={to === '/'}
                  onClick={onClose}
                  className={({ isActive }) =>
                    `group relative flex items-center gap-3 h-9 px-3 rounded-lg text-sm transition-colors ${
                      isActive
                        ? 'bg-indigo-50 text-indigo-700 font-semibold'
                        : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
                    }`
                  }
                >
                  {({ isActive }) => (
                    <>
                      {isActive && (
                        <span className="absolute left-0 top-1.5 bottom-1.5 w-1 rounded-r-full bg-indigo-600" aria-hidden />
                      )}
                      <Icon
                        size={18}
                        strokeWidth={isActive ? 2.2 : 1.8}
                        className={isActive ? 'text-indigo-600' : 'text-slate-400 group-hover:text-slate-600'}
                        aria-hidden
                      />
                      <span className="truncate">{label}</span>
                    </>
                  )}
                </NavLink>
              ))}
            </div>
          </div>
        ))}
      </nav>

      <div className="px-3 py-3 border-t border-slate-200 flex items-center gap-1">
        <button
          type="button"
          onClick={() => setConfirmLogout(true)}
          className="flex-1 flex items-center gap-3 h-9 px-3 rounded-lg text-sm text-slate-600 hover:bg-red-50 hover:text-red-600 transition-colors"
        >
          <LogOut size={18} strokeWidth={1.8} aria-hidden />
          Keluar
        </button>
        <ThemeIconButton />
      </div>
    </aside>

    {/* Di luar <aside>: aside memakai transform, sehingga elemen fixed di dalamnya ikut terpotong. */}
    <Modal title="Keluar dari Loka Admin?" open={confirmLogout} onClose={() => setConfirmLogout(false)}>
      <p className="text-sm text-slate-600">Sesi di perangkat ini akan diakhiri. Kamu perlu masuk lagi untuk membuka panel.</p>
      <div className="mt-6 flex justify-end gap-2">
        <button
          type="button"
          onClick={() => setConfirmLogout(false)}
          className="h-9 px-4 rounded-lg border border-slate-200 text-sm font-medium text-slate-700 hover:bg-slate-50"
        >
          Batal
        </button>
        <button
          type="button"
          onClick={handleLogout}
          autoFocus
          className="h-9 px-4 rounded-lg bg-red-600 text-sm font-semibold text-white hover:bg-red-700 focus:outline-none focus-visible:ring-4 focus-visible:ring-red-500/30"
        >
          Keluar
        </button>
      </div>
    </Modal>
    </>
  )
}
