import { Link } from 'react-router-dom'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import type { SocialPost } from '../../api/social'
import { POST_STATUS, mediaPoster, monthGrid, wibDateKey, wibParts } from '../../lib/social'

const DOT: Record<string, string> = {
  success: 'bg-emerald-500', danger: 'bg-red-500', warning: 'bg-amber-500', info: 'bg-indigo-500', neutral: 'bg-slate-400',
}
const WEEKDAYS = ['Sen', 'Sel', 'Rab', 'Kam', 'Jum', 'Sab', 'Min']

/** Kalender bulan (WIB, Senin di kiri) berisi posting terjadwal/terbit. */
export default function SocialCalendar({ year, month, posts, onMonth, today }: {
  year: number
  month: number
  posts: SocialPost[]
  onMonth: (y: number, m: number) => void
  today: string
}) {
  const byDay = new Map<string, SocialPost[]>()
  for (const p of posts) {
    if (!p.scheduled_at) continue
    const k = wibDateKey(p.scheduled_at)
    byDay.set(k, [...(byDay.get(k) ?? []), p])
  }
  const title = new Intl.DateTimeFormat('id-ID', { month: 'long', year: 'numeric', timeZone: 'UTC' }).format(new Date(Date.UTC(year, month - 1, 1)))
  const shift = (d: number) => {
    const t = new Date(Date.UTC(year, month - 1 + d, 1))
    onMonth(t.getUTCFullYear(), t.getUTCMonth() + 1)
  }

  return (
    <section className="card p-4 sm:p-5">
      <div className="mb-4 flex items-center justify-between gap-3">
        <h3 className="text-sm font-semibold text-slate-800 capitalize">{title}</h3>
        <div className="flex items-center gap-1">
          <button type="button" onClick={() => shift(-1)} aria-label="Bulan sebelumnya" className="h-8 w-8 rounded-lg text-slate-500 hover:bg-slate-100 inline-flex items-center justify-center"><ChevronLeft size={16} aria-hidden /></button>
          <button type="button" onClick={() => { const p = wibParts(new Date()); onMonth(p.y, p.m) }} className="h-8 px-2.5 rounded-lg text-xs font-medium text-slate-600 hover:bg-slate-100">Hari ini</button>
          <button type="button" onClick={() => shift(1)} aria-label="Bulan berikutnya" className="h-8 w-8 rounded-lg text-slate-500 hover:bg-slate-100 inline-flex items-center justify-center"><ChevronRight size={16} aria-hidden /></button>
        </div>
      </div>
      <div className="grid grid-cols-7 gap-px overflow-hidden rounded-xl border border-slate-200 bg-slate-200 text-xs">
        {WEEKDAYS.map((d) => <div key={d} className="bg-slate-50 px-2 py-1.5 text-center font-medium text-slate-500">{d}</div>)}
        {monthGrid(year, month).map((cell) => {
          const items = byDay.get(cell.key) ?? []
          return (
            <div key={cell.key} className={`min-h-24 bg-white p-1.5 ${cell.inMonth ? '' : 'opacity-50'}`}>
              <div className={`mb-1 flex h-5 w-5 items-center justify-center rounded-full text-[11px] ${cell.key === today ? 'bg-indigo-600 font-semibold text-white' : 'text-slate-500'}`}>{cell.day}</div>
              <div className="space-y-1">
                {items.slice(0, 3).map((p) => {
                  const t = wibParts(p.scheduled_at!)
                  return (
                    <Link key={p.id} to={`/social/${p.id}`} title={`${POST_STATUS[p.status].label} · ${p.caption.slice(0, 80)}`} className="flex items-center gap-1.5 rounded-md px-1 py-0.5 hover:bg-slate-100">
                      {p.media[0] ? <img src={mediaPoster(p.media[0].url)} alt="" className="h-5 w-5 shrink-0 rounded object-cover" /> : <span className="h-5 w-5 shrink-0 rounded bg-slate-200" />}
                      <span className="tabular-nums text-slate-600">{String(t.hh).padStart(2, '0')}:{String(t.mm).padStart(2, '0')}</span>
                      <span className={`ml-auto h-1.5 w-1.5 shrink-0 rounded-full ${DOT[POST_STATUS[p.status].variant]}`} aria-label={POST_STATUS[p.status].label} />
                    </Link>
                  )
                })}
                {items.length > 3 && <p className="px-1 text-[11px] text-slate-400">+{items.length - 3} lagi</p>}
              </div>
            </div>
          )
        })}
      </div>
    </section>
  )
}
