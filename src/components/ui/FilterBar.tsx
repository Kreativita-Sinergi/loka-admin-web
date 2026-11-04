import { useEffect, useRef, useState, type ReactNode } from 'react'
import { Search } from 'lucide-react'

/** Kelas kontrol filter: tinggi 40px, sama untuk input dan Select. */
export const filterControl = 'h-10 rounded-lg border border-slate-200 px-3 text-sm'

/**
 * Baris filter standar di atas tabel. Di layar lebar satu baris rapat kiri
 * dengan ringkasan di kanan; di layar sempit bertumpuk, dan `controls`
 * (dropdown) berdampingan dua kolom.
 */
export function FilterBar({ search, children, controls, summary }: {
  /** Biasanya <SearchField/>; lebar maks 384px di layar lebar. */
  search?: ReactNode
  /** Filter tambahan dengan lebar sendiri (mis. BusinessFilter). */
  children?: ReactNode
  /** Dropdown pendek (status, jenis). */
  controls?: ReactNode
  /** Ringkasan di ujung kanan, mis. "857 bisnis". */
  summary?: ReactNode
}) {
  return (
    <div className="card p-3 sm:p-4 flex flex-col gap-2 lg:flex-row lg:items-center">
      {/* Cari dibatasi 384px: kontrol tetap berdekatan di layar lebar. */}
      {search && <div className="min-w-0 lg:w-96 lg:flex-none">{search}</div>}
      {children}
      {controls && <div className="grid grid-cols-2 gap-2 lg:flex [&>*]:w-full lg:[&>*]:w-auto">{controls}</div>}
      {summary != null && <p className="text-sm text-slate-500 tabular-nums lg:ml-auto lg:pl-3 lg:whitespace-nowrap">{summary}</p>}
    </div>
  )
}

/**
 * Kolom cari dengan ikon. Mencari otomatis `delay` ms setelah berhenti
 * mengetik (Enter langsung mencari), jadi tidak perlu tombol "Cari".
 */
export function SearchField({ value, onSearch, placeholder, label, delay = 300 }: {
  /** Kata kunci yang sedang berlaku. */
  value: string
  onSearch: (next: string) => void
  placeholder: string
  label: string
  delay?: number
}) {
  const [input, setInput] = useState(value)
  const latest = useRef(onSearch)
  useEffect(() => { latest.current = onSearch })

  useEffect(() => {
    const next = input.trim()
    if (next === value) return
    const timer = setTimeout(() => latest.current(next), delay)
    return () => clearTimeout(timer)
  }, [input, value, delay])

  return (
    <form
      role="search"
      className="relative"
      onSubmit={(e) => {
        e.preventDefault()
        if (input.trim() !== value) onSearch(input.trim())
      }}
    >
      <Search size={16} aria-hidden className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
      <input
        type="search"
        aria-label={label}
        value={input}
        onChange={(e) => setInput(e.target.value)}
        placeholder={placeholder}
        className={`${filterControl} w-full pl-9`}
      />
    </form>
  )
}
