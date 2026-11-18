import { useEffect, useRef, useState } from 'react'
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
import InstallAppButton from './InstallAppButton'
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
      { to: '/growth', label: 'Pertumbuhan & Aktivasi', icon: TrendingUp },
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
  const drawer = useRef<HTMLDialogElement>(null)

  useEffect(() => {
    const dialog = drawer.current
    if (open && !dialog?.open) dialog?.showModal()
    if (!open && dialog?.open) dialog.close()
  }, [open])

  const [confirmLogout, setConfirmLogout] = useState(false)

  const handleLogout = () => {
    setConfirmLogout(false)
    logout()
    navigate('/login')
  }

  const content = (mobile: boolean) => (
    <>
      <div className="sidebar-header flex min-h-16 shrink-0 items-center justify-between border-b border-slate-200 px-4">
        <BrandMark />
        {mobile && (
          <button
            type="button"
            onClick={onClose}
            className="flex size-11 items-center justify-center rounded-lg text-slate-600 hover:bg-slate-100 focus-visible:outline-2 focus-visible:outline-indigo-600"
            aria-label="Tutup menu navigasi"
          >
            <X size={20} aria-hidden />
          </button>
        )}
      </div>
      <nav className="min-h-0 flex-1 space-y-4 overflow-y-auto overscroll-contain px-3 py-4">
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
                    `group relative flex min-h-11 items-center gap-3 rounded-lg px-3 text-sm transition-colors focus-visible:outline-2 focus-visible:outline-indigo-600 lg:min-h-9 ${
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

      <div className="sidebar-footer shrink-0 border-t border-slate-200 px-3 pt-2">
        {!mobile && <div className="px-1"><InstallAppButton /></div>}
        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={() => { onClose(); setConfirmLogout(true) }}
            className="flex min-h-11 flex-1 items-center gap-3 rounded-lg px-3 text-sm text-slate-600 transition-colors hover:bg-red-50 hover:text-red-600"
          >
            <LogOut size={18} strokeWidth={1.8} aria-hidden />
            Keluar
          </button>
          <ThemeIconButton />
        </div>
      </div>
    </>
  )

  return (
    <>
      <aside aria-label="Navigasi utama" className="fixed top-0 left-0 z-40 hidden h-dvh w-64 flex-col border-r border-slate-200 bg-white lg:flex">
        {content(false)}
      </aside>
      <dialog
        id="admin-mobile-menu"
        ref={drawer}
        aria-label="Menu navigasi"
        onCancel={(event) => { event.preventDefault(); onClose() }}
        onClick={(event) => { if (event.target === event.currentTarget) onClose() }}
        className="mobile-menu fixed inset-y-0 inset-e-0 inset-s-auto m-0 h-dvh max-h-dvh w-[min(340px,calc(100vw-36px))] max-w-none rounded-s-2xl border-s border-slate-200 bg-white p-0 text-slate-800 shadow-xl open:flex open:flex-col backdrop:bg-black/55 lg:hidden"
      >
        {content(true)}
      </dialog>

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
