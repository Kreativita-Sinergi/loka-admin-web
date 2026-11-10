import type { ReactNode } from 'react'
import { Link } from 'react-router-dom'
import { ArrowDownRight, ArrowUpRight, ChevronRight, Minus } from 'lucide-react'

/** Kartu dasar panel: satu tempat untuk sudut, border, dan jarak. */
export function Card({ title, description, action, children, className = '' }: {
  title?: ReactNode
  description?: ReactNode
  action?: ReactNode
  children: ReactNode
  className?: string
}) {
  return (
    <section className={`min-w-0 card p-4 sm:p-5 ${className}`}>
      {(title || action) && (
        <div className="mb-4 flex items-start justify-between gap-3">
          <div className="min-w-0">
            {title && <h3 className="text-sm font-semibold text-slate-800">{title}</h3>}
            {description && <p className="mt-1 text-xs text-slate-500">{description}</p>}
          </div>
          {action}
        </div>
      )}
      {children}
    </section>
  )
}

/**
 * Perubahan terhadap periode lalu. `goodWhenUp=false` untuk angka yang lebih
 * baik bila turun (mis. Pro tidak diperpanjang).
 */
export function DeltaBadge({ value, goodWhenUp = true, suffix = 'vs 30 hari sebelumnya' }: {
  value: number | null
  goodWhenUp?: boolean
  suffix?: string
}) {
  if (value == null) return null
  const up = value > 0
  const flat = value === 0
  const good = flat ? null : up === goodWhenUp
  const Icon = flat ? Minus : up ? ArrowUpRight : ArrowDownRight
  const tone = good == null ? 'text-slate-500' : good ? 'text-emerald-700' : 'text-red-700'
  return (
    <span className="inline-flex items-center gap-1 text-xs">
      <span className={`inline-flex items-center gap-0.5 font-semibold tabular-nums ${tone}`}>
        <Icon size={14} strokeWidth={2.4} aria-hidden />
        {flat ? '0%' : `${up ? '+' : ''}${value}%`}
      </span>
      <span className="text-slate-400">{suffix}</span>
    </span>
  )
}

/** Kartu angka. Dengan `to`, seluruh kartu menjadi tautan ke halaman rinciannya. */
export function StatCard({ label, value, detail, footer, to, onClick, tone = 'default' }: {
  label: string
  value: ReactNode
  detail?: ReactNode
  footer?: ReactNode
  to?: string
  onClick?: () => void
  tone?: 'default' | 'danger' | 'warning' | 'success'
}) {
  const valueTone = {
    default: 'text-slate-900',
    danger: 'text-red-700',
    warning: 'text-amber-700',
    success: 'text-emerald-700',
  }[tone]
  const body = (
    <>
      <div className="flex items-start justify-between gap-2">
        <p className="text-xs font-medium text-slate-500">{label}</p>
        {(to || onClick) && <ChevronRight size={16} className="shrink-0 text-slate-300 transition-colors group-hover:text-slate-500" aria-hidden />}
      </div>
      <p className={`mt-1.5 text-2xl font-semibold tabular-nums tracking-tight break-words ${valueTone}`}>{value}</p>
      {detail && <p className="mt-1 text-xs leading-5 text-slate-500">{detail}</p>}
      {footer && <div className="mt-2">{footer}</div>}
    </>
  )
  const base = 'group block min-w-0 card p-4'
  return to ? (
    <Link to={to} className={`${base} transition-colors hover:border-slate-300 hover:bg-slate-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500`}>
      {body}
    </Link>
  ) : onClick ? (
    <button type="button" onClick={onClick} className={`${base} w-full text-left transition-colors hover:border-slate-300 hover:bg-slate-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500`}>
      {body}
    </button>
  ) : (
    <div className={base}>{body}</div>
  )
}

/** Judul kecil pemisah antarbagian dasbor. */
export function SectionLabel({ children, hint }: { children: ReactNode; hint?: ReactNode }) {
  return (
    <div className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1">
      <h3 className="text-sm font-semibold text-slate-800">{children}</h3>
      {hint && <p className="text-xs text-slate-400">{hint}</p>}
    </div>
  )
}
