import type { ReactNode } from 'react'
import { formatDate } from '../../lib/analytics'

export function MetricCard({ label, value, detail, accent = false }: { label: string; value: ReactNode; detail: string; accent?: boolean }) {
  return <div className={`rounded-2xl border p-5 ${accent ? 'border-indigo-200 bg-indigo-50/60' : 'border-slate-200 bg-white'}`}>
    <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">{label}</p>
    <p className={`mt-2 text-3xl font-semibold tabular-nums tracking-tight break-words ${accent ? 'text-indigo-700' : 'text-slate-900'}`}>{value}</p>
    <p className="mt-2 text-xs leading-5 text-slate-500">{detail}</p>
  </div>
}
export function AnalyticsHeader({ title, description, loading, updatedAt, refresh }: { title: string; description: string; loading: boolean; updatedAt: string | null; refresh: () => void }) {
  return <div className="flex flex-wrap items-start justify-between gap-4">
    <div><h2 className="text-2xl font-bold tracking-tight text-slate-900">{title}</h2><p className="mt-1 text-sm text-slate-500">{description}</p></div>
    <div className="flex items-center gap-3"><span className="text-xs text-slate-400">{updatedAt ? `Dimuat ${formatDate(updatedAt, true)} WIB` : ''}</span><button type="button" disabled={loading} onClick={refresh} className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-600 hover:bg-slate-100 disabled:opacity-50">{loading ? 'Memuat…' : '↻ Perbarui'}</button></div>
  </div>
}
export function AnalyticsState({ loading, error, hasData }: { loading: boolean; error: string | null; hasData: boolean }) {
  if (error) return <div role="alert" className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}{hasData && ' Data sebelumnya tetap ditampilkan.'}</div>
  if (loading && !hasData) return <div role="status" className="grid grid-cols-2 gap-4 py-3 lg:grid-cols-4">{[0, 1, 2, 3].map(i => <div key={i} className="h-32 animate-pulse rounded-2xl bg-slate-200" />)}<span className="sr-only">Memuat statistik</span></div>
  return null
}
