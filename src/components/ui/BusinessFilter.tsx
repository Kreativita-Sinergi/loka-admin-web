import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { getBusinesses, getBusinessById } from '../../api/admin'
import type { AdminBusiness } from '../../types'

export default function BusinessFilter({ value, onChange }: { value: string; onChange: (id: string) => void }) {
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
  return <div className="space-y-2">
    {value ? <div className="flex flex-wrap items-center gap-2 text-sm"><span className="text-slate-500">Bisnis:</span><Link className="font-medium text-indigo-600 hover:underline" to={`/businesses/${value}`}>{selected?.id === value ? selected.business_name : value}</Link><button type="button" onClick={() => { onChange(''); setSelected(null); setQuery('') }} className="rounded-lg border border-slate-200 px-2 py-1 text-slate-500">Semua bisnis ×</button></div> : <div className="relative max-w-md">
      <input aria-label="Cari bisnis untuk filter" value={query} onChange={e => { setQuery(e.target.value); setResults([]); setError(false); setLoading(!!e.target.value.trim()) }} placeholder="Semua bisnis · ketik nama untuk memilih…" className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm" />
      {query.trim() && <div className="absolute top-full left-0 right-0 z-20 mt-1 max-h-64 overflow-y-auto rounded-lg border border-slate-200 bg-white shadow-lg">
        {loading ? <p className="p-3 text-sm text-slate-500">Mencari…</p> : error ? <p role="alert" className="p-3 text-sm text-red-600">Gagal mencari bisnis. Ketik ulang untuk mencoba lagi.</p> : results.length ? results.map(b => <button type="button" key={b.id} onClick={() => { setSelected(b); onChange(b.id); setQuery('') }} className="block w-full px-3 py-2 text-left text-sm hover:bg-indigo-50"><span className="block font-medium">{b.business_name}</span><span className="text-xs text-slate-500">{b.owner_name}</span></button>) : <p className="p-3 text-sm text-slate-500">Bisnis tidak ditemukan.</p>}
      </div>}
    </div>}
  </div>
}
