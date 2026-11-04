import { useRef, useState } from 'react'
import { ChevronLeft, ChevronRight, ImagePlus, Loader2, Play, X } from 'lucide-react'
import type { AxiosError } from 'axios'
import { uploadSocialMedia, type SocialMedia } from '../../api/social'
import { IMAGE_TYPES, SOCIAL_ACCEPT, SOCIAL_LIMITS, VIDEO_TYPES, checkImageDims, checkVideoMeta, isVideo, mediaPoster } from '../../lib/social'

function readDims(file: File): Promise<{ width: number; height: number }> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file)
    const img = new Image()
    img.onload = () => { resolve({ width: img.naturalWidth, height: img.naturalHeight }); URL.revokeObjectURL(url) }
    img.onerror = () => { reject(new Error('Gambar tidak terbaca.')); URL.revokeObjectURL(url) }
    img.src = url
  })
}

/** Metadata video dari browser; null bila browser tidak bisa membacanya (mis. HEVC di Chrome). */
function readVideoMeta(file: File): Promise<{ width: number; height: number; duration: number } | null> {
  return new Promise((resolve) => {
    const url = URL.createObjectURL(file)
    const v = document.createElement('video')
    v.preload = 'metadata'
    v.muted = true
    const done = (r: { width: number; height: number; duration: number } | null) => { resolve(r); URL.revokeObjectURL(url) }
    v.onloadedmetadata = () => done({ width: v.videoWidth, height: v.videoHeight, duration: v.duration })
    v.onerror = () => done(null)
    v.src = url
  })
}

async function precheck(file: File): Promise<string | null> {
  if (VIDEO_TYPES.includes(file.type)) {
    if (file.size > SOCIAL_LIMITS.videoBytes) return 'Video maksimal 100 MB.'
    const meta = await readVideoMeta(file)
    // Tidak terbaca di browser ini: biarkan server yang memeriksa.
    return meta ? checkVideoMeta(meta.width, meta.height, meta.duration) : null
  }
  if (!IMAGE_TYPES.includes(file.type)) return 'Hanya JPG, PNG, MP4, atau MOV.'
  if (file.size > SOCIAL_LIMITS.imageBytes) return 'Gambar maksimal 8 MB.'
  const { width, height } = await readDims(file)
  return checkImageDims(width, height)
}

/** Media posting (gambar/video): unggah, urutkan, hapus. Urutan pertama = sampul carousel. */
export default function MediaPicker({ media, onChange, disabled }: {
  media: SocialMedia[]
  onChange: (next: SocialMedia[]) => void
  disabled?: boolean
}) {
  const fileRef = useRef<HTMLInputElement>(null)
  const [uploading, setUploading] = useState(0)
  const [errors, setErrors] = useState<string[]>([])
  const left = SOCIAL_LIMITS.images - media.length

  const pick = async (files: FileList | null) => {
    if (!files?.length) return
    const list = Array.from(files).slice(0, left)
    const problems: string[] = []
    if (files.length > left) problems.push(`Hanya ${left} gambar/video lagi yang bisa ditambahkan (maks. ${SOCIAL_LIMITS.images}).`)
    setUploading(list.length)
    let current = media
    for (const file of list) {
      try {
        const issue = await precheck(file)
        if (issue) { problems.push(`${file.name}: ${issue}`); continue }
        const r = await uploadSocialMedia(file)
        current = [...current, r.data]
        onChange(current)
      } catch (err) {
        const e = err as AxiosError<{ message?: string }>
        problems.push(`${file.name}: ${e.response?.data?.message || (err as Error).message || 'gagal diunggah'}`)
      } finally {
        setUploading((n) => n - 1)
      }
    }
    setErrors(problems)
  }

  const move = (i: number, dir: -1 | 1) => {
    const next = [...media]
    const j = i + dir
    if (j < 0 || j >= next.length) return
    ;[next[i], next[j]] = [next[j], next[i]]
    onChange(next)
  }

  return (
    <div>
      <div className="grid grid-cols-3 sm:grid-cols-5 gap-2">
        {media.map((m, i) => (
          <div key={m.id} className="group relative aspect-square overflow-hidden rounded-lg border border-slate-200 bg-slate-100">
            <img src={mediaPoster(m.url)} alt={`${isVideo(m) ? 'Video' : 'Gambar'} ${i + 1}`} className="h-full w-full object-cover" loading="lazy" />
            {i === 0 && <span className="absolute left-1 top-1 rounded bg-black/60 px-1.5 py-0.5 text-[10px] font-medium text-white">Sampul</span>}
            {isVideo(m) && (
              <span className="absolute right-1 top-1 inline-flex items-center gap-0.5 rounded bg-black/60 px-1.5 py-0.5 text-[10px] font-medium text-white">
                <Play size={10} className="fill-current" aria-hidden />
                {m.duration_seconds ? `${Math.round(m.duration_seconds)} dtk` : 'Video'}
              </span>
            )}
            {!disabled && (
              <div className="absolute inset-x-0 bottom-0 flex justify-between bg-gradient-to-t from-black/60 to-transparent p-1 opacity-100 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity">
                <div className="flex gap-1">
                  <button type="button" onClick={() => move(i, -1)} disabled={i === 0} aria-label="Geser ke kiri" className="rounded bg-white/90 p-1 text-slate-700 disabled:opacity-30"><ChevronLeft size={14} aria-hidden /></button>
                  <button type="button" onClick={() => move(i, 1)} disabled={i === media.length - 1} aria-label="Geser ke kanan" className="rounded bg-white/90 p-1 text-slate-700 disabled:opacity-30"><ChevronRight size={14} aria-hidden /></button>
                </div>
                <button type="button" onClick={() => onChange(media.filter((x) => x.id !== m.id))} aria-label={isVideo(m) ? 'Hapus video' : 'Hapus gambar'} className="rounded bg-white/90 p-1 text-red-600"><X size={14} aria-hidden /></button>
              </div>
            )}
          </div>
        ))}
        {Array.from({ length: uploading }, (_, i) => (
          <div key={`up-${i}`} className="aspect-square rounded-lg border border-dashed border-slate-300 flex items-center justify-center text-slate-400">
            <Loader2 size={18} className="animate-spin" aria-hidden />
          </div>
        ))}
        {!disabled && left > 0 && uploading === 0 && (
          <button
            type="button"
            onClick={() => fileRef.current?.click()}
            className="aspect-square rounded-lg border border-dashed border-slate-300 flex flex-col items-center justify-center gap-1 text-xs text-slate-500 hover:border-indigo-400 hover:text-indigo-600"
          >
            <ImagePlus size={20} aria-hidden />
            Tambah
          </button>
        )}
      </div>
      <input ref={fileRef} type="file" accept={SOCIAL_ACCEPT} multiple className="hidden" onChange={(e) => { void pick(e.target.files); e.target.value = '' }} />
      <p className="mt-2 text-xs text-slate-500">
        {media.length}/{SOCIAL_LIMITS.images} media · JPG/PNG maks. 8 MB · MP4/MOV maks. 100 MB, {SOCIAL_LIMITS.minVideoSeconds}–{SOCIAL_LIMITS.maxVideoSeconds} detik · rasio 4:5 sampai 1.91:1 (video tunggal boleh 9:16)
      </p>
      {errors.length > 0 && (
        <ul role="alert" className="mt-2 space-y-1 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-700">
          {errors.map((e) => <li key={e}>{e}</li>)}
        </ul>
      )}
    </div>
  )
}
