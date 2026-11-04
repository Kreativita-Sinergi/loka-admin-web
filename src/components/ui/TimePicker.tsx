import { useCallback, useEffect, useLayoutEffect, useRef, useState, type CSSProperties, type KeyboardEvent } from 'react'
import { createPortal } from 'react-dom'
import { Clock } from 'lucide-react'

const pad = (n: number) => String(n).padStart(2, '0')
const HOURS = Array.from({ length: 24 }, (_, i) => pad(i))
const MINUTES = Array.from({ length: 60 }, (_, i) => pad(i))

function Column({ name, items, current, onPick }: { name: string; items: string[]; current: string; onPick: (v: string) => void }) {
  return (
    <div role="listbox" aria-label={name} className="h-60 w-16 overflow-y-auto overscroll-contain py-1 [scrollbar-width:none]">
      {items.map((v) => {
        const active = v === current
        return (
          <button
            key={v}
            type="button"
            role="option"
            aria-selected={active}
            onClick={() => onPick(v)}
            className={`mx-1 flex h-8 w-14 items-center justify-center rounded-md text-sm tabular-nums ${
              active ? 'bg-indigo-600 font-semibold text-white' : 'text-slate-700 hover:bg-slate-100'
            }`}
          >
            {v}
          </button>
        )
      })}
    </div>
  )
}

/**
 * Pemilih jam satu field ("HH:MM"). Klik membuka dua kolom — jam dan menit —
 * yang bisa digulir; memilih menit menutup panel. Panel dirender ke body agar
 * tidak terpotong kartu/modal.
 */
export default function TimePicker({ value, onChange, label, suffix = 'WIB', disabled }: {
  value: string
  onChange: (next: string) => void
  label: string
  suffix?: string
  disabled?: boolean
}) {
  const [open, setOpen] = useState(false)
  const [style, setStyle] = useState<CSSProperties>({})
  const triggerRef = useRef<HTMLButtonElement>(null)
  const panelRef = useRef<HTMLDivElement>(null)
  const hh = value.slice(0, 2) || '00'
  const mm = value.slice(3, 5) || '00'

  const place = useCallback(() => {
    const r = triggerRef.current?.getBoundingClientRect()
    if (!r) return
    const height = 264
    const up = window.innerHeight - r.bottom < height + 8 && r.top > window.innerHeight - r.bottom
    setStyle({ position: 'fixed', left: r.left, ...(up ? { bottom: window.innerHeight - r.top + 4 } : { top: r.bottom + 4 }) })
  }, [])

  const close = (refocus = true) => {
    setOpen(false)
    if (refocus) triggerRef.current?.focus()
  }

  useLayoutEffect(() => {
    if (!open) return
    place()
    // Gulir pilihan aktif ke tengah kolom saat dibuka.
    panelRef.current?.querySelectorAll<HTMLElement>('[aria-selected="true"]').forEach((el) => el.scrollIntoView({ block: 'center' }))
    window.addEventListener('resize', place)
    window.addEventListener('scroll', place, true)
    return () => {
      window.removeEventListener('resize', place)
      window.removeEventListener('scroll', place, true)
    }
  }, [open, place])

  useEffect(() => {
    if (!open) return
    const onDown = (e: MouseEvent) => {
      const t = e.target as Node
      if (!triggerRef.current?.contains(t) && !panelRef.current?.contains(t)) close(false)
    }
    document.addEventListener('mousedown', onDown)
    return () => document.removeEventListener('mousedown', onDown)
  }, [open])

  const onKeyDown = (e: KeyboardEvent) => {
    if (e.key === 'Escape' && open) {
      e.preventDefault()
      e.stopPropagation() // jangan ikut menutup Modal di belakangnya
      close()
    }
  }

  return (
    <>
      <button
        ref={triggerRef}
        type="button"
        aria-label={`${label}: ${hh}:${mm} ${suffix}`}
        aria-haspopup="dialog"
        aria-expanded={open}
        disabled={disabled}
        onClick={() => (open ? close() : setOpen(true))}
        onKeyDown={onKeyDown}
        className="inline-flex h-10 items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 text-sm text-slate-800 hover:border-slate-300 focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 disabled:opacity-50"
      >
        <Clock size={16} className="text-slate-400" aria-hidden />
        <span className="font-medium tabular-nums">{hh}:{mm}</span>
        {suffix && <span className="text-slate-400">{suffix}</span>}
      </button>

      {open && createPortal(
        <div
          ref={panelRef}
          role="dialog"
          aria-label={label}
          onKeyDown={onKeyDown}
          style={style}
          className="z-[60] flex rounded-xl border border-slate-200 bg-white p-1 shadow-lg shadow-slate-900/10"
        >
          <Column name="Jam" items={HOURS} current={hh} onPick={(h) => onChange(`${h}:${mm}`)} />
          <div className="my-2 w-px bg-slate-100" aria-hidden />
          <Column name="Menit" items={MINUTES} current={mm} onPick={(m) => { onChange(`${hh}:${m}`); close() }} />
        </div>,
        document.body,
      )}
    </>
  )
}
