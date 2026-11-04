import { Store, X } from 'lucide-react'
import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { getBusinesses, getBusinessById } from '../../api/admin'
import type { AdminBusiness } from '../../types'

export default function BusinessFilter({ value, onChange, className = 'max-w-md' }: { value: string; onChange: (id: string) => void; className?: string }) {
  const [query, setQuery] = useState('')
  const [results, setResults] = useState<AdminBusiness[]>([])
  const [selected, setSelected] = useState<AdminBusiness | null>(null)
  const [error, setError] = useState(false)
  const [loading, setLoading] = useState(false)
  useEffect(() => {
    if (!value) return
    let current = true
    getBusinessById(value).then(r => { if (current && r.status) setSelected(r.data) }).catch(() => {})
    return () => { current = false }
  }, [value])
  useEffect(() => {
    if (!query.trim()) return
    let current = true
    const timer = setTimeout(() => {
      getBusinesses({ search: query.trim(), page: 1, limit: 10, sort_by: 'created_at', order_by: 'desc' }).then(r => {
        if (!r.status) throw new Error(r.message)
        if (current) { setResults(r.data ?? []); setError(false); setLoading(false) }
      }).catch(() => { if (current) { setError(true); setLoading(false) } })
    }, 300)
    return () => { current = false; clearTimeout(timer) }
  }, [query])
  const clear = () => { onChange(''); setSelected(null); setQuery('') }
  return <div className={`relative min-w-0 ${className}`}>
    <Store size={16} aria-hidden className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
    {value ? (
      <div className="flex h-10 items-center gap-2 rounded-lg border border-slate-200 bg-white pl-9 pr-1.5 text-sm">
        <Link className="min-w-0 flex-1 truncate font-medium text-indigo-600 hover:underline" to={`/businesses/${value}`} title="Buka detail bisnis">
          {selected?.id === value ? selected.business_name : value}
        </Link>
        <button type="button" onClick={clear} aria-label="Hapus filter bisnis" title="Semua bisnis" className="shrink-0 rounded-md p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-700">
          <X size={14} aria-hidden />
        </button>
      </div>
    ) : (
      <input aria-label="Cari bisnis untuk filter" value={query} onChange={e => { setQuery(e.target.value); setResults([]); setError(false); setLoading(!!e.target.value.trim()) }} placeholder="Semua bisnis" className="h-10 w-full rounded-lg border border-slate-200 pl-9 pr-3 text-sm" />
    )}
    {!value && query.trim() && <div className="absolute top-full left-0 right-0 z-20 mt-1 max-h-64 overflow-y-auto rounded-xl border border-slate-200 bg-white p-1 shadow-lg shadow-slate-900/10">
      {loading ? <p className="p-3 text-sm text-slate-500">Mencari…</p> : error ? <p role="alert" className="p-3 text-sm text-red-600">Gagal mencari bisnis. Ketik ulang untuk mencoba lagi.</p> : results.length ? results.map(b => <button type="button" key={b.id} onClick={() => { setSelected(b); onChange(b.id); setQuery('') }} className="block w-full rounded-lg px-3 py-2 text-left text-sm hover:bg-slate-100"><span className="block font-medium text-slate-800">{b.business_name}</span><span className="text-xs text-slate-500">{b.owner_name}</span></button>) : <p className="p-3 text-sm text-slate-500">Bisnis tidak ditemukan.</p>}
    </div>}
  </div>
}
