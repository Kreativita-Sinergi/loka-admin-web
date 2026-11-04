import { useCallback, useEffect, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { ArrowLeft, Calendar, CalendarClock, ExternalLink, FileText, RotateCcw, Trash2, XCircle } from 'lucide-react'
import type { AxiosError } from 'axios'
import ButtonIcon from '../components/ui/ButtonIcon'
import { InstagramIcon, ThreadsIcon } from '../components/ui/BrandIcons'
import Badge from '../components/ui/Badge'
import Modal from '../components/ui/Modal'
import { Card } from '../components/ui/Card'
import Switch from '../components/ui/Switch'
import TimePicker from '../components/ui/TimePicker'
import MediaPicker from '../components/social/MediaPicker'
import PostPreview from '../components/social/PostPreview'
import {
  createSocialPost, deleteSocialPost, getSocialPost, getSocialStatus, socialPostAction, updateSocialPost,
  type SocialMedia, type SocialPost, type SocialPostInput, type SocialStatus,
} from '../api/social'
import {
  POST_STATUS, SOCIAL_LIMITS, THREADS_STATUS, charCount, countHashtags, nextSlot, pollDelay,
  validateSocialDraft, wibParts, wibToISO,
} from '../lib/social'
import { formatDate } from '../lib/analytics'

function apiMessage(err: unknown, fallback: string) {
  const e = err as AxiosError<{ message?: string }>
  return e.response?.data?.message || fallback
}

function Counter({ value, max, label }: { value: number; max: number; label: string }) {
  return <span className={`tabular-nums ${value > max ? 'font-semibold text-red-600' : 'text-slate-400'}`}>{value}/{max} {label}</span>
}

function PlatformStatus({ name, icon, label, variant, at, link, error }: {
  name: string; icon: React.ReactNode; label: string; variant: 'success' | 'danger' | 'warning' | 'info' | 'neutral'; at?: string | null; link?: string | null; error?: string | null
}) {
  return (
    <div className="space-y-1">
      <div className="flex items-center justify-between gap-2 text-sm">
        <span className="inline-flex items-center gap-1.5 font-medium text-slate-700">{icon}{name}</span>
        <Badge variant={variant}>{label}</Badge>
      </div>
      {at && <p className="text-xs text-slate-500">Terbit {formatDate(at, true)} WIB</p>}
      {link && <a href={link} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 text-xs font-medium text-indigo-600 hover:underline">Buka posting<ExternalLink size={12} aria-hidden /></a>}
      {error && <p className="rounded-lg border border-red-200 bg-red-50 px-2.5 py-1.5 text-xs text-red-700">{error}</p>}
    </div>
  )
}

export default function SocialPostPage() {
  const { id } = useParams()
  const isNew = !id || id === 'new'
  const navigate = useNavigate()

  const [post, setPost] = useState<SocialPost | null>(null)
  const [account, setAccount] = useState<SocialStatus | null>(null)
  const [loading, setLoading] = useState(!isNew)
  const [media, setMedia] = useState<SocialMedia[]>([])
  const [caption, setCaption] = useState('')
  const [schedule, setSchedule] = useState(true)
  const [date, setDate] = useState(() => nextSlot().date)
  const [time, setTime] = useState(() => nextSlot().time)
  // Posting baru langsung ikut ke Threads; bisa dimatikan per posting.
  const [threadsEnabled, setThreadsEnabled] = useState(true)
  const [threadsText, setThreadsText] = useState('')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [confirm, setConfirm] = useState<'cancel' | 'delete' | null>(null)

  const fill = (p: SocialPost) => {
    setPost(p)
    setMedia(p.media)
    setCaption(p.caption)
    setThreadsEnabled(p.threads_enabled)
    setThreadsText(p.threads_text)
    setSchedule(p.status !== 'draft')
    if (p.scheduled_at) {
      const t = wibParts(p.scheduled_at)
      const pad = (n: number) => String(n).padStart(2, '0')
      setDate(`${t.y}-${pad(t.m)}-${pad(t.d)}`)
      setTime(`${pad(t.hh)}:${pad(t.mm)}`)
    }
  }

  const load = useCallback(async () => {
    if (isNew) return
    try {
      const r = await getSocialPost(id!)
      fill(r.data)
      setError('')
    } catch (err) {
      setError(apiMessage(err, 'Posting gagal dimuat.'))
    } finally {
      setLoading(false)
    }
  }, [id, isNew])

  // eslint-disable-next-line react-hooks/set-state-in-effect -- setState hanya setelah await
  useEffect(() => { void load() }, [load])
  useEffect(() => { getSocialStatus().then((r) => setAccount(r.data)).catch(() => {}) }, [])

  // Selama terjadwal/terbit, perbarui status otomatis.
  useEffect(() => {
    if (!post) return
    const delay = pollDelay(post)
    if (!delay) return
    const t = setTimeout(() => void load(), delay)
    return () => clearTimeout(t)
  }, [post, load])

  const editable = isNew || !!post?.allowed_actions.includes('edit')
  const draft = { caption, mediaCount: media.length, schedule, date, time, threadsEnabled, threadsText }
  const scheduleIssue = validateSocialDraft({ ...draft, schedule: true })

  const save = async (asSchedule: boolean) => {
    const problem = validateSocialDraft({ ...draft, schedule: asSchedule })
    if (problem) { setError(problem); return }
    const input: SocialPostInput = {
      caption,
      scheduled_at: asSchedule || (date && time) ? wibToISO(date, time) : null,
      media_ids: media.map((m) => m.id),
      schedule: asSchedule,
      threads_enabled: threadsEnabled,
      threads_text: threadsText,
    }
    setSaving(true)
    setError('')
    try {
      const r = isNew ? await createSocialPost(input) : await updateSocialPost(id!, input)
      fill(r.data)
      if (isNew) navigate(`/social/${r.data.id}`, { replace: true })
    } catch (err) {
      setError(apiMessage(err, 'Posting gagal disimpan.'))
    } finally {
      setSaving(false)
    }
  }

  const act = async (action: 'cancel' | 'retry' | 'retry-threads') => {
    setSaving(true)
    setError('')
    try {
      const r = await socialPostAction(id!, action)
      fill(r.data)
      setConfirm(null)
    } catch (err) {
      setError(apiMessage(err, 'Tindakan gagal.'))
    } finally {
      setSaving(false)
    }
  }

  const remove = async () => {
    setSaving(true)
    try {
      await deleteSocialPost(id!)
      navigate('/social', { replace: true })
    } catch (err) {
      setError(apiMessage(err, 'Draf gagal dihapus.'))
      setSaving(false)
    }
  }

  if (loading) return <div className="flex h-64 items-center justify-center text-sm text-slate-400">Memuat posting…</div>

  const st = post ? POST_STATUS[post.status] : null
  const actions = post?.allowed_actions ?? []
  const threadsChars = charCount(threadsText.trim() || caption)

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center gap-3">
        <Link to="/social" aria-label="Kembali" className="text-slate-400 hover:text-slate-600"><ArrowLeft size={20} aria-hidden /></Link>
        <h2 className="text-xl font-bold text-slate-900">{isNew ? 'Posting baru' : editable ? 'Ubah posting' : 'Detail posting'}</h2>
        {st && <Badge variant={st.variant}>{st.label}</Badge>}
      </div>

      {error && <div role="alert" className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>}

      <div className="grid grid-cols-1 lg:grid-cols-[minmax(0,1fr)_360px] gap-4 items-start">
        <div className="space-y-4 min-w-0">
          <Card title="Gambar" description="Gambar pertama jadi sampul. 2–10 gambar menjadi carousel.">
            <MediaPicker media={media} onChange={setMedia} disabled={!editable} />
            {post?.archived_at && (
              <p className="mt-2 text-xs text-slate-500">
                Sudah terposting: gambar asli diganti salinan arsip WebP (≤ 100 KB) untuk menghemat penyimpanan.
              </p>
            )}
          </Card>

          <Card
            title="Caption"
            action={<span className="flex gap-3 text-xs"><Counter value={charCount(caption)} max={SOCIAL_LIMITS.caption} label="karakter" /><Counter value={countHashtags(caption)} max={SOCIAL_LIMITS.hashtags} label="hashtag" /></span>}
          >
            <textarea
              aria-label="Caption Instagram"
              value={caption}
              onChange={(e) => setCaption(e.target.value)}
              readOnly={!editable}
              rows={8}
              placeholder="Tulis caption Instagram…"
              className="w-full resize-y rounded-lg border border-slate-200 px-3 py-2.5 text-sm leading-6 focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </Card>

          <Card
            title={<span className="inline-flex items-center gap-1.5"><ThreadsIcon size={16} aria-hidden="true" />Juga posting ke Threads</span>}
            description="Gambar yang sama, terbit setelah Instagram berhasil. Bila Instagram gagal, Threads ikut ditahan."
            action={<Switch checked={threadsEnabled} onChange={setThreadsEnabled} label="Posting ke Threads" disabled={!editable} />}
          >
            {threadsEnabled ? (
              <div className="space-y-2">
                <textarea
                  aria-label="Teks Threads"
                  value={threadsText}
                  onChange={(e) => setThreadsText(e.target.value)}
                  readOnly={!editable}
                  rows={4}
                  placeholder="Kosongkan untuk memakai caption Instagram"
                  className="w-full resize-y rounded-lg border border-slate-200 px-3 py-2.5 text-sm leading-6 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
                <p className="text-xs"><Counter value={threadsChars} max={SOCIAL_LIMITS.threadsText} label={threadsText.trim() ? 'karakter' : 'karakter (dari caption)'} /></p>
                {account && !account.threads.connected && <p className="text-xs text-amber-700">Akun Threads belum terhubung.</p>}
              </div>
            ) : (
              <p className="text-sm text-slate-400">Hanya Instagram.</p>
            )}
          </Card>

          {editable && (
            <Card title="Jadwal tayang" description="Waktu Indonesia Barat (WIB). Tayang paling lambat ±1 menit dari jam yang dipilih.">
              <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
                <div className="relative">
                  <Calendar size={16} aria-hidden className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input type="date" aria-label="Tanggal tayang" value={date} onChange={(e) => setDate(e.target.value)} className="h-10 rounded-lg border border-slate-200 pl-9 pr-3 text-sm text-slate-800 hover:border-slate-300" />
                </div>
                <TimePicker label="Jam tayang" value={time} onChange={setTime} />
              </div>
              {account && !account.instagram.connected && <p className="mt-2 text-xs text-amber-700">Hubungkan akun Instagram di halaman Posting Sosial sebelum menjadwalkan.</p>}
            </Card>
          )}
        </div>

        <div className="space-y-4 min-w-0 lg:sticky lg:top-6">
          {post && post.status !== 'draft' && (
            <Card title="Status">
              <div className="space-y-4">
                {post.scheduled_at && <p className="text-sm text-slate-600">Jadwal: <span className="font-medium text-slate-800">{formatDate(post.scheduled_at, true)} WIB</span></p>}
                <PlatformStatus name="Instagram" icon={<InstagramIcon size={16} aria-hidden="true" />} label={POST_STATUS[post.status].label} variant={POST_STATUS[post.status].variant} at={post.ig_published_at} link={post.ig_permalink} error={post.ig_error} />
                {post.threads_enabled && (
                  <PlatformStatus name="Threads" icon={<ThreadsIcon size={16} aria-hidden="true" />} label={THREADS_STATUS[post.threads_status].label} variant={THREADS_STATUS[post.threads_status].variant} at={post.threads_published_at} link={post.threads_permalink} error={post.threads_error} />
                )}
              </div>
            </Card>
          )}

          <PostPreview media={media} caption={caption} username={account?.instagram.username} />

          <div className="card p-4 space-y-2">
            {editable && (
              <>
                <button type="button" disabled={saving || !!scheduleIssue} onClick={() => void save(true)} className="h-10 w-full rounded-lg bg-indigo-600 text-sm font-semibold text-white hover:bg-indigo-700 disabled:opacity-50 inline-flex items-center justify-center">
                  <ButtonIcon icon={CalendarClock} />{post?.status === 'scheduled' ? 'Simpan jadwal' : 'Jadwalkan'}
                </button>
                {(isNew || post?.status === 'draft') && (
                  <button type="button" disabled={saving} onClick={() => void save(false)} className="h-10 w-full rounded-lg border border-slate-200 text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-50 inline-flex items-center justify-center">
                    <ButtonIcon icon={FileText} />Simpan sebagai draf
                  </button>
                )}
                {scheduleIssue && <p className="text-xs text-slate-500">{scheduleIssue}</p>}
              </>
            )}
            {actions.includes('retry') && (
              <button type="button" disabled={saving} onClick={() => void act('retry')} className="h-10 w-full rounded-lg border border-slate-200 text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-50 inline-flex items-center justify-center">
                <ButtonIcon icon={RotateCcw} />Coba posting lagi sekarang
              </button>
            )}
            {actions.includes('retry_threads') && (
              <button type="button" disabled={saving} onClick={() => void act('retry-threads')} className="h-10 w-full rounded-lg border border-slate-200 text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-50 inline-flex items-center justify-center">
                <ButtonIcon icon={RotateCcw} />Coba Threads lagi
              </button>
            )}
            {actions.includes('cancel') && (
              <button type="button" disabled={saving} onClick={() => setConfirm('cancel')} className="h-10 w-full rounded-lg text-sm font-medium text-red-600 hover:bg-red-50 disabled:opacity-50 inline-flex items-center justify-center">
                <ButtonIcon icon={XCircle} />Batalkan jadwal
              </button>
            )}
            {actions.includes('delete') && (
              <button type="button" disabled={saving} onClick={() => setConfirm('delete')} className="h-10 w-full rounded-lg text-sm font-medium text-red-600 hover:bg-red-50 disabled:opacity-50 inline-flex items-center justify-center">
                <ButtonIcon icon={Trash2} />Hapus draf
              </button>
            )}
            {!editable && actions.length === 0 && <p className="text-center text-xs text-slate-400">Tidak ada tindakan untuk status ini.</p>}
            {post?.status === 'failed' && post.ig_error?.includes('tidak pasti') && (
              <p className="text-xs text-amber-700">Cek akun Instagram dulu. Bila posting ternyata sudah tayang, batalkan alih-alih mencoba lagi agar tidak dobel.</p>
            )}
          </div>
        </div>
      </div>

      <Modal title={confirm === 'delete' ? 'Hapus draf?' : 'Batalkan jadwal?'} open={confirm != null} onClose={() => !saving && setConfirm(null)}>
        <p className="text-sm text-slate-600">{confirm === 'delete' ? 'Draf dan gambarnya dihapus dari panel.' : 'Posting tidak akan tayang. Status berubah jadi Dibatalkan dan tidak bisa dijadwalkan ulang.'}</p>
        <div className="mt-6 flex justify-end gap-2">
          <button type="button" onClick={() => setConfirm(null)} className="h-9 px-4 rounded-lg border border-slate-200 text-sm font-medium text-slate-700 hover:bg-slate-50">Kembali</button>
          <button type="button" disabled={saving} onClick={() => (confirm === 'delete' ? void remove() : void act('cancel'))} className="h-9 px-4 rounded-lg bg-red-600 text-sm font-semibold text-white hover:bg-red-700 disabled:opacity-50">
            {confirm === 'delete' ? 'Hapus' : 'Batalkan jadwal'}
          </button>
        </div>
      </Modal>
    </div>
  )
}
