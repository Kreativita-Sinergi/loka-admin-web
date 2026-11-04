import { useState } from 'react'
import { ChevronLeft, ChevronRight, ImageOff } from 'lucide-react'
import type { SocialMedia } from '../../api/social'

/** Pratinjau kasar tampilan di feed Instagram: gambar, titik carousel, caption 2 baris. */
export default function PostPreview({ media, caption, username }: { media: SocialMedia[]; caption: string; username?: string }) {
  const [index, setIndex] = useState(0)
  const [expanded, setExpanded] = useState(false)
  const i = Math.min(index, Math.max(0, media.length - 1))
  const current = media[i]
  // Feed memakai rasio gambar pertama untuk seluruh carousel.
  const ratio = media[0] ? `${media[0].width} / ${media[0].height}` : '1 / 1'
  const name = username || 'akun_loka'

  return (
    <div className="card overflow-hidden">
      <div className="flex items-center gap-2 px-3 py-2.5">
        <div className="w-7 h-7 rounded-full bg-indigo-600 text-white text-xs font-bold flex items-center justify-center">{name[0]?.toUpperCase()}</div>
        <span className="text-sm font-semibold text-slate-800 truncate">{name}</span>
      </div>
      <div className="relative bg-slate-100" style={{ aspectRatio: ratio }}>
        {current ? (
          <img src={current.url} alt="" className="absolute inset-0 h-full w-full object-cover" />
        ) : (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-1 text-xs text-slate-400">
            <ImageOff size={22} aria-hidden />Belum ada gambar
          </div>
        )}
        {media.length > 1 && (
          <>
            <button type="button" onClick={() => setIndex(Math.max(0, i - 1))} disabled={i === 0} aria-label="Gambar sebelumnya" className="absolute left-2 top-1/2 -translate-y-1/2 rounded-full bg-white/90 p-1 text-slate-700 shadow disabled:hidden"><ChevronLeft size={16} aria-hidden /></button>
            <button type="button" onClick={() => setIndex(Math.min(media.length - 1, i + 1))} disabled={i === media.length - 1} aria-label="Gambar berikutnya" className="absolute right-2 top-1/2 -translate-y-1/2 rounded-full bg-white/90 p-1 text-slate-700 shadow disabled:hidden"><ChevronRight size={16} aria-hidden /></button>
            <span className="absolute right-2 top-2 rounded-full bg-black/60 px-2 py-0.5 text-[11px] text-white">{i + 1}/{media.length}</span>
          </>
        )}
      </div>
      {media.length > 1 && (
        <div className="flex justify-center gap-1 pt-2.5" aria-hidden>
          {media.map((m, k) => <span key={m.id} className={`h-1.5 w-1.5 rounded-full ${k === i ? 'bg-indigo-600' : 'bg-slate-300'}`} />)}
        </div>
      )}
      <div className="px-3 py-3 text-sm text-slate-800">
        {caption.trim() ? (
          <p className={`whitespace-pre-wrap break-words ${expanded ? '' : 'line-clamp-2'}`}>
            <span className="font-semibold">{name}</span> {caption}
          </p>
        ) : (
          <p className="text-slate-400 italic">Caption akan tampil di sini…</p>
        )}
        {!expanded && caption.length > 120 && (
          <button type="button" onClick={() => setExpanded(true)} className="mt-0.5 text-xs text-slate-500 hover:text-slate-700">selengkapnya</button>
        )}
      </div>
    </div>
  )
}
