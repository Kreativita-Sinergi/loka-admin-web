import {
  Children, isValidElement, useCallback, useEffect, useId, useLayoutEffect, useRef, useState,
  type CSSProperties, type KeyboardEvent, type ReactElement, type ReactNode,
} from 'react'
import { createPortal } from 'react-dom'
import { Check, ChevronDown } from 'lucide-react'

interface Option {
  value: string
  label: ReactNode
  text: string
  disabled: boolean
}

/** Bentuk event yang dipakai halaman (`e.target.value`), sama seperti <select>. */
export interface SelectChange {
  target: { value: string }
}

interface SelectProps {
  value?: string | number
  onChange?: (event: SelectChange) => void
  /** Pilihan ditulis sebagai <option>, persis seperti <select> bawaan. */
  children: ReactNode
  className?: string
  disabled?: boolean
  id?: string
  name?: string
  /** Validasi form bawaan: pilihan bernilai kosong dianggap belum diisi. */
  required?: boolean
  'aria-label'?: string
}

function textOf(node: ReactNode): string {
  if (node == null || typeof node === 'boolean') return ''
  if (typeof node === 'string' || typeof node === 'number') return String(node)
  if (Array.isArray(node)) return node.map(textOf).join('')
  if (isValidElement(node)) return textOf((node.props as { children?: ReactNode }).children)
  return ''
}

/** Kumpulkan <option> dari children, termasuk yang ada di dalam array/fragment. */
function collectOptions(children: ReactNode, out: Option[] = []): Option[] {
  Children.forEach(children, (child) => {
    if (!isValidElement(child)) return
    const el = child as ReactElement<{ value?: string | number; children?: ReactNode; disabled?: boolean }>
    if (el.type === 'option') {
      const text = textOf(el.props.children)
      out.push({
        value: el.props.value != null ? String(el.props.value) : text,
        label: el.props.children,
        text,
        disabled: !!el.props.disabled,
      })
    } else if (el.props.children != null) {
      collectOptions(el.props.children, out)
    }
  })
  return out
}

const LIST_MAX_HEIGHT = 288

/**
 * Pengganti <select> dengan daftar pilihan yang mengikuti tema panel.
 * API-nya sengaja sama dengan <select> (value, onChange(e.target.value),
 * <option>) agar halaman cukup mengganti nama tag.
 */
export default function Select({ value, onChange, children, className = '', disabled, id, name, required, 'aria-label': ariaLabel }: SelectProps) {
  const options = collectOptions(children)
  const current = value != null ? String(value) : options[0]?.value ?? ''
  const selectedIndex = Math.max(0, options.findIndex((o) => o.value === current))
  const selected = options[selectedIndex]

  const [open, setOpen] = useState(false)
  const [active, setActive] = useState(selectedIndex)
  const [style, setStyle] = useState<CSSProperties>({})
  const triggerRef = useRef<HTMLButtonElement>(null)
  const listRef = useRef<HTMLUListElement>(null)
  const typeahead = useRef({ text: '', at: 0 })
  const listId = useId()

  const place = useCallback(() => {
    const el = triggerRef.current
    if (!el) return
    const r = el.getBoundingClientRect()
    const below = window.innerHeight - r.bottom
    const openUp = below < Math.min(LIST_MAX_HEIGHT, options.length * 36 + 8) + 8 && r.top > below
    setStyle({
      position: 'fixed',
      left: r.left,
      minWidth: r.width,
      maxWidth: Math.max(r.width, 360),
      ...(openUp ? { bottom: window.innerHeight - r.top + 4 } : { top: r.bottom + 4 }),
    })
  }, [options.length])

  const openList = () => {
    if (disabled) return
    setActive(selectedIndex)
    place()
    setOpen(true)
  }
  const close = (refocus = true) => {
    setOpen(false)
    if (refocus) triggerRef.current?.focus()
  }
  const choose = (index: number) => {
    const option = options[index]
    if (!option || option.disabled) return
    if (option.value !== current) onChange?.({ target: { value: option.value } })
    close()
  }

  useLayoutEffect(() => {
    if (!open) return
    place()
    const onMove = () => place()
    window.addEventListener('resize', onMove)
    window.addEventListener('scroll', onMove, true)
    return () => {
      window.removeEventListener('resize', onMove)
      window.removeEventListener('scroll', onMove, true)
    }
  }, [open, place])

  useEffect(() => {
    if (!open) return
    const onDown = (e: MouseEvent) => {
      const t = e.target as Node
      if (!triggerRef.current?.contains(t) && !listRef.current?.contains(t)) close(false)
    }
    document.addEventListener('mousedown', onDown)
    return () => document.removeEventListener('mousedown', onDown)
  }, [open])

  useEffect(() => {
    if (open) listRef.current?.querySelector<HTMLElement>(`[data-index="${active}"]`)?.scrollIntoView({ block: 'nearest' })
  }, [open, active])

  const step = (from: number, dir: 1 | -1) => {
    for (let i = from + dir; i >= 0 && i < options.length; i += dir) if (!options[i].disabled) return i
    return from
  }

  const onKeyDown = (e: KeyboardEvent<HTMLButtonElement>) => {
    if (disabled) return
    if (!open) {
      if (['ArrowDown', 'ArrowUp', 'Enter', ' '].includes(e.key)) {
        e.preventDefault()
        openList()
      }
      return
    }
    // Hentikan di sini agar Esc tidak ikut menutup Modal di belakangnya.
    e.stopPropagation()
    switch (e.key) {
      case 'ArrowDown': e.preventDefault(); setActive((i) => step(i, 1)); break
      case 'ArrowUp': e.preventDefault(); setActive((i) => step(i, -1)); break
      case 'Home': e.preventDefault(); setActive(step(-1, 1)); break
      case 'End': e.preventDefault(); setActive(step(options.length, -1)); break
      case 'Enter': case ' ': e.preventDefault(); choose(active); break
      case 'Escape': e.preventDefault(); close(); break
      case 'Tab': close(false); break
      default:
        if (e.key.length === 1) {
          const now = Date.now()
          const t = typeahead.current
          t.text = now - t.at < 600 ? t.text + e.key.toLowerCase() : e.key.toLowerCase()
          t.at = now
          const hit = options.findIndex((o) => !o.disabled && o.text.toLowerCase().startsWith(t.text))
          if (hit >= 0) setActive(hit)
        }
    }
  }

  return (
    <>
      <button
        ref={triggerRef}
        type="button"
        id={id}
        name={name}
        disabled={disabled}
        aria-label={ariaLabel}
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-controls={open ? listId : undefined}
        aria-activedescendant={open ? `${listId}-${active}` : undefined}
        onClick={() => (open ? close() : openList())}
        onKeyDown={onKeyDown}
        className={`inline-flex items-center gap-2 text-left focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 disabled:opacity-50 ${/\bbg-/.test(className) ? '' : 'bg-white'} ${className}`}
      >
        {/* Semua label ditumpuk di satu sel grid: lebar tombol = opsi terpanjang, tidak melompat saat pilihan berganti. */}
        <span className="grid min-w-0 flex-1">
          {options.map((o, i) => (
            <span key={o.value} aria-hidden={i !== selectedIndex} className={`[grid-area:1/1] truncate ${i === selectedIndex ? '' : 'invisible'}`}>
              {o.label}
            </span>
          ))}
          {!selected && <span className="[grid-area:1/1] truncate text-slate-400">Pilih…</span>}
        </span>
        <ChevronDown size={16} aria-hidden className={`ml-1 shrink-0 text-slate-400 transition-transform ${open ? 'rotate-180' : ''}`} />
      </button>

      {required && (
        // Input tersembunyi agar validasi `required` pada <form> tetap bekerja.
        <input
          tabIndex={-1}
          aria-hidden
          required
          value={current}
          onChange={() => {}}
          onFocus={() => triggerRef.current?.focus()}
          className="sr-only"
        />
      )}

      {open && createPortal(
        <ul
          ref={listRef}
          id={listId}
          role="listbox"
          aria-label={ariaLabel}
          style={style}
          className="z-[60] max-h-72 overflow-auto rounded-xl border border-slate-200 bg-white p-1 text-sm shadow-lg shadow-slate-900/10"
        >
          {options.map((o, i) => {
            const isSelected = i === selectedIndex
            return (
              <li
                key={o.value}
                id={`${listId}-${i}`}
                data-index={i}
                role="option"
                aria-selected={isSelected}
                aria-disabled={o.disabled || undefined}
                onMouseEnter={() => !o.disabled && setActive(i)}
                onMouseDown={(e) => e.preventDefault()}
                onClick={() => choose(i)}
                className={`flex items-center justify-between gap-3 rounded-lg px-3 py-2 ${
                  o.disabled ? 'cursor-not-allowed text-slate-300'
                  : i === active ? 'cursor-pointer bg-slate-100 text-slate-900'
                  : 'cursor-pointer text-slate-700'
                } ${isSelected ? 'font-medium' : ''}`}
              >
                <span className="truncate">{o.label}</span>
                {isSelected && <Check size={15} className="shrink-0 text-indigo-600" aria-hidden />}
              </li>
            )
          })}
        </ul>,
        document.body,
      )}
    </>
  )
}
