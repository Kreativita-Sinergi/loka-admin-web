import { useState, useEffect, useRef } from 'react'
import { getBusinesses } from '../../api/admin'
import type { AdminBusiness } from '../../types'

interface RecipientPickerProps {
  phone: string
  businessName: string
  onChange: (phone: string, businessName: string) => void
}

export default function RecipientPicker({ phone, businessName, onChange }: RecipientPickerProps) {
  const [query, setQuery] = useState('')
  const [options, setOptions] = useState<AdminBusiness[]>([])
  const [open, setOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const [selected, setSelected] = useState<AdminBusiness | null>(null)
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const containerRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  const search = (q: string) => {
    if (debounceRef.current) clearTimeout(debounceRef.current)
    if (!q.trim()) {
      setOptions([])
      setOpen(false)
      return
    }
    debounceRef.current = setTimeout(async () => {
      setLoading(true)
      try {
        const res = await getBusinesses({ search: q, limit: 8, page: 1 })
        setOptions(res.data ?? [])
        setOpen(true)
      } catch {
        setOptions([])
      } finally {
        setLoading(false)
      }
    }, 300)
  }

  const handleInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value
    setQuery(val)
    setSelected(null)
    onChange('', val)
    search(val)
  }

  const handleSelect = (b: AdminBusiness) => {
    const ownerPhone = b.owner?.phone_number ?? ''
    setSelected(b)
    setQuery(b.business_name)
    onChange(ownerPhone, b.business_name)
    setOpen(false)
  }

  const handleClear = () => {
    setSelected(null)
    setQuery('')
    onChange('', '')
    setOptions([])
    setOpen(false)
  }

  return (
    <div ref={containerRef} className="space-y-3">
      {/* Search box */}
      <div>
        <label className="block text-xs font-medium text-slate-600 mb-1">
          Cari Bisnis / Pengguna
        </label>
        <div className="relative">
          <input
            type="text"
            value={query}
            onChange={handleInput}
            onFocus={() => options.length > 0 && setOpen(true)}
            placeholder="Ketik nama bisnis atau pemilik..."
            className="w-full pl-3 pr-8 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
          />
          {loading && (
            <span className="absolute right-3 top-2.5 text-slate-400 text-xs animate-pulse">⏳</span>
          )}
          {selected && !loading && (
            <button
              onClick={handleClear}
              className="absolute right-3 top-2 text-slate-400 hover:text-slate-600 text-sm leading-none"
            >
              ×
            </button>
          )}

          {/* Dropdown */}
          {open && options.length > 0 && (
            <div className="absolute z-20 top-full left-0 right-0 mt-1 bg-white border border-slate-200 rounded-xl shadow-lg overflow-hidden">
              {options.map((b) => (
                <button
                  key={b.id}
                  onMouseDown={() => handleSelect(b)}
                  className="w-full text-left px-4 py-3 hover:bg-indigo-50 flex items-center justify-between gap-3 border-b border-slate-100 last:border-0"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="w-8 h-8 shrink-0 rounded-lg bg-indigo-100 flex items-center justify-center text-indigo-600 font-semibold text-xs">
                      {b.business_name.charAt(0).toUpperCase()}
                    </div>
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-slate-800 truncate">{b.business_name}</p>
                      <p className="text-xs text-slate-400 truncate">{b.owner_name}</p>
                    </div>
                  </div>
                  <span className="text-xs text-slate-400 shrink-0">
                    {b.owner?.phone_number ?? '—'}
                  </span>
                </button>
              ))}
            </div>
          )}

          {open && !loading && options.length === 0 && query.length > 0 && (
            <div className="absolute z-20 top-full left-0 right-0 mt-1 bg-white border border-slate-200 rounded-xl shadow-lg px-4 py-3 text-sm text-slate-400">
              Tidak ada hasil untuk "{query}"
            </div>
          )}
        </div>
      </div>

      {/* Selected info */}
      {selected && (
        <div className="bg-indigo-50 border border-indigo-200 rounded-lg px-4 py-3 space-y-1">
          <p className="text-xs font-semibold text-indigo-700">Penerima dipilih:</p>
          <p className="text-sm text-slate-800 font-medium">{selected.business_name}</p>
          <p className="text-xs text-slate-500">{selected.owner_name}</p>
          <p className="text-xs font-mono text-indigo-600">
            📱 {selected.owner?.phone_number ?? '—'}
          </p>
        </div>
      )}

      {/* Manual phone override */}
      <div>
        <label className="block text-xs font-medium text-slate-600 mb-1">
          Nomor WhatsApp <span className="text-red-500">*</span>
        </label>
        <input
          type="text"
          placeholder="628123456789"
          value={phone}
          onChange={(e) => onChange(e.target.value, businessName)}
          className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
        />
        <p className="text-xs text-slate-400 mt-1">
          Otomatis terisi saat memilih bisnis. Bisa diubah manual.
        </p>
      </div>
    </div>
  )
}
