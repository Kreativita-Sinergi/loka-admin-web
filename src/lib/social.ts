import type { SocialPost, SocialPostStatus, ThreadsStatus } from '../api/social.ts'

// Batas sama dengan service (service/social_service.go). Panel memeriksa lebih
// dulu agar admin tidak menunggu server untuk galat yang jelas.
export const SOCIAL_LIMITS = {
  images: 10,
  caption: 2200,
  hashtags: 5,
  threadsText: 500,
  threadsLinks: 5,
  imageBytes: 8 * 1024 * 1024,
  minWidth: 320,
  minAspect: 0.8,
  maxAspect: 1.91,
  minLeadMinutes: 5,
} as const

const WIB_OFFSET_MS = 7 * 60 * 60 * 1000

/** Bagian tanggal/jam WIB dari sebuah instan. */
export function wibParts(iso: string | Date) {
  const d = new Date(new Date(iso).getTime() + WIB_OFFSET_MS)
  return { y: d.getUTCFullYear(), m: d.getUTCMonth() + 1, d: d.getUTCDate(), hh: d.getUTCHours(), mm: d.getUTCMinutes() }
}

const pad = (n: number) => String(n).padStart(2, '0')

/** "YYYY-MM-DD" (WIB) dari instan. */
export function wibDateKey(iso: string | Date) {
  const p = wibParts(iso)
  return `${p.y}-${pad(p.m)}-${pad(p.d)}`
}

/** Instan RFC3339 dari tanggal "YYYY-MM-DD" + jam "HH:MM" WIB. */
export function wibToISO(date: string, time: string) {
  return `${date}T${time}:00+07:00`
}

/** Menit pertama yang masih ≥ 5 menit dari sekarang (untuk isian bawaan). */
export function nextSlot(now = new Date()) {
  const step = 60_000
  const earliest = now.getTime() + SOCIAL_LIMITS.minLeadMinutes * 60_000
  const t = new Date(Math.ceil(earliest / step) * step)
  const p = wibParts(t)
  return { date: `${p.y}-${pad(p.m)}-${pad(p.d)}`, time: `${pad(p.hh)}:${pad(p.mm)}` }
}

export const countHashtags = (text: string) => (text.match(/#[\p{L}\p{N}_]+/gu) ?? []).length
export const countLinks = (text: string) => (text.match(/\bhttps?:\/\//gi) ?? []).length
export const charCount = (text: string) => Array.from(text).length

export interface SocialDraft {
  caption: string
  mediaCount: number
  schedule: boolean
  date: string
  time: string
  threadsEnabled: boolean
  threadsText: string
}

/** Galat pertama yang menghalangi penyimpanan, atau null. Cermin ValidateSocialPost. */
export function validateSocialDraft(d: SocialDraft, now = new Date()): string | null {
  if (charCount(d.caption) > SOCIAL_LIMITS.caption) return `Caption maksimal ${SOCIAL_LIMITS.caption} karakter.`
  if (countHashtags(d.caption) > SOCIAL_LIMITS.hashtags) return `Instagram membatasi ${SOCIAL_LIMITS.hashtags} hashtag per posting.`
  if (d.mediaCount > SOCIAL_LIMITS.images) return `Maksimal ${SOCIAL_LIMITS.images} gambar.`
  if (d.threadsEnabled) {
    const own = d.threadsText.trim()
    const text = own || d.caption
    if (charCount(text) > SOCIAL_LIMITS.threadsText) {
      return own ? `Teks Threads maksimal ${SOCIAL_LIMITS.threadsText} karakter.` : `Caption lebih dari ${SOCIAL_LIMITS.threadsText} karakter; isi teks Threads yang lebih pendek.`
    }
    if (countLinks(text) > SOCIAL_LIMITS.threadsLinks) return `Threads membatasi ${SOCIAL_LIMITS.threadsLinks} tautan.`
  }
  if (!d.schedule) return null
  if (d.mediaCount === 0) return 'Tambahkan minimal 1 gambar sebelum menjadwalkan.'
  if (!d.caption.trim()) return 'Caption wajib diisi sebelum dijadwalkan.'
  if (!d.date || !d.time) return 'Pilih tanggal dan jam tayang.'
  if (new Date(wibToISO(d.date, d.time)).getTime() < now.getTime() + SOCIAL_LIMITS.minLeadMinutes * 60_000) {
    return `Jadwal minimal ${SOCIAL_LIMITS.minLeadMinutes} menit dari sekarang.`
  }
  return null
}

/** Periksa berkas di browser sebelum diunggah (server memeriksa ulang). */
export function checkImageDims(width: number, height: number): string | null {
  if (width < SOCIAL_LIMITS.minWidth) return `Lebar minimal ${SOCIAL_LIMITS.minWidth} px.`
  const r = width / height
  if (r < SOCIAL_LIMITS.minAspect - 0.005 || r > SOCIAL_LIMITS.maxAspect + 0.005) return 'Rasio harus antara 4:5 dan 1.91:1.'
  return null
}

type Variant = 'success' | 'danger' | 'warning' | 'info' | 'neutral'

export const POST_STATUS: Record<SocialPostStatus, { label: string; variant: Variant }> = {
  draft: { label: 'Draf', variant: 'neutral' },
  scheduled: { label: 'Terjadwal', variant: 'info' },
  publishing: { label: 'Memposting…', variant: 'warning' },
  published: { label: 'Terposting', variant: 'success' },
  failed: { label: 'Gagal', variant: 'danger' },
  canceled: { label: 'Dibatalkan', variant: 'neutral' },
}

export const THREADS_STATUS: Record<ThreadsStatus, { label: string; variant: Variant }> = {
  none: { label: 'Tidak', variant: 'neutral' },
  waiting: { label: 'Menunggu Instagram', variant: 'neutral' },
  publishing: { label: 'Memposting…', variant: 'warning' },
  published: { label: 'Terposting', variant: 'success' },
  failed: { label: 'Gagal', variant: 'danger' },
}

/** Jeda polling halaman detail: cepat saat sedang terbit. */
export function pollDelay(p: Pick<SocialPost, 'status' | 'threads_status'>): number | null {
  if (p.status === 'publishing' || p.threads_status === 'publishing') return 5000
  if (p.status === 'scheduled' || (p.status === 'published' && p.threads_status === 'waiting')) return 30000
  return null
}

/** 6 minggu kalender (Senin di kiri) yang memuat bulan `y-m`. */
export function monthGrid(y: number, m: number) {
  const first = new Date(Date.UTC(y, m - 1, 1))
  const offset = (first.getUTCDay() + 6) % 7
  return Array.from({ length: 42 }, (_, i) => {
    const d = new Date(Date.UTC(y, m - 1, 1 - offset + i))
    return { key: d.toISOString().slice(0, 10), day: d.getUTCDate(), inMonth: d.getUTCMonth() === m - 1 }
  })
}

/** Rentang instan untuk mengambil posting satu tampilan bulan (WIB). */
export function monthRange(y: number, m: number) {
  const grid = monthGrid(y, m)
  const from = new Date(`${grid[0].key}T00:00:00+07:00`)
  // Akhir = awal hari setelah sel terakhir (WIB tidak punya DST, jadi +24 jam tepat).
  const to = new Date(new Date(`${grid[41].key}T00:00:00+07:00`).getTime() + 86_400_000)
  return { from: from.toISOString(), to: to.toISOString() }
}
