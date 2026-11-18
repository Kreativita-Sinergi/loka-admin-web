import { X } from 'lucide-react'
import { useEffect, useId } from 'react'
import { createPortal } from 'react-dom'

interface ModalProps {
  title: string
  open: boolean
  onClose: () => void
  children: React.ReactNode
}

export default function Modal({ title, open, onClose, children }: ModalProps) {
  const titleId = useId()
  useEffect(() => {
    if (!open) return
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }
    document.addEventListener('keydown', handler)
    return () => document.removeEventListener('keydown', handler)
  }, [open, onClose])

  if (!open) return null

  return createPortal(
    <div className="fixed inset-0 z-50 flex items-end justify-center sm:items-center">
      <div className="absolute inset-0 bg-black/40" onClick={onClose} />
      <div role="dialog" aria-modal="true" aria-labelledby={titleId} className="admin-modal relative max-h-[90dvh] w-full max-w-lg overflow-y-auto overscroll-contain rounded-t-2xl bg-white p-4 shadow-xl sm:mx-4 sm:rounded-xl sm:p-6">
        <div className="mb-4 flex items-center justify-between gap-2">
          <h2 id={titleId} className="text-base font-semibold text-slate-800">{title}</h2>
          <button type="button" onClick={onClose} aria-label="Tutup" className="-m-1.5 grid size-11 shrink-0 place-items-center rounded-lg text-slate-500 hover:bg-slate-100 hover:text-slate-800"><X size={18} aria-hidden /></button>
        </div>
        {children}
      </div>
    </div>,
    document.body,
  )
}
