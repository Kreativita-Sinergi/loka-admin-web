import { AlertTriangle, Check, ExternalLink, RefreshCw, RotateCcw, Trash2 } from 'lucide-react'
import ButtonIcon from '../components/ui/ButtonIcon'
import { useState, useEffect, useCallback } from 'react'
import { format } from 'date-fns'
import { id as localeId } from 'date-fns/locale'
import {
  getDrafts,
  approveDraft,
  rejectDraft,
  regenerateDraft,
  getThreadsSettings,
  updateThreadsSettings,
  generatePost,
  pollNow,
  getThreadsBotStatus,
  type ThreadsDraft,
  type ThreadsDraftStatus,
  type ThreadsSettings,
  type ThreadsBotStatus,
} from '../api/threads'

const STATUS_CFG: Record<ThreadsDraftStatus, { label: string; cls: string }> = {
  pending: { label: 'Menunggu ACC', cls: 'bg-amber-50 text-amber-700 border-amber-200' },
  publishing: { label: 'Sedang dikirim', cls: 'bg-blue-50 text-blue-700 border-blue-200' },
  posted: { label: 'Tayang', cls: 'bg-emerald-50 text-emerald-700 border-emerald-200' },
  rejected: { label: 'Ditolak', cls: 'bg-slate-100 text-slate-500 border-slate-200' },
  failed: { label: 'Gagal', cls: 'bg-red-50 text-red-600 border-red-200' },
}

const SOURCE_LABEL: Record<string, string> = {
  own_reply: 'Komentar di postingan bot',
  mention: 'Mention',
  keyword: 'Kata kunci',
  scheduled: 'Postingan terjadwal',
}

// Sama dengan helper.ThreadsIntent* di loka-kasir-service.
const INTENT_CFG: Record<string, { label: string; cls: string }> = {
  tanya_aplikasi: { label: 'Tanya aplikasi kasir', cls: 'bg-indigo-50 text-indigo-700 border-indigo-200' },
  tanya_harga: { label: 'Tanya harga', cls: 'bg-indigo-50 text-indigo-700 border-indigo-200' },
  tanya_fitur: { label: 'Tanya fitur', cls: 'bg-indigo-50 text-indigo-700 border-indigo-200' },
  keluhan_kasir: { label: 'Keluhan soal kasir', cls: 'bg-amber-50 text-amber-700 border-amber-200' },
  obrolan_usaha: { label: 'Obrolan usaha', cls: 'bg-slate-50 text-slate-600 border-slate-200' },
  tidak_relevan: { label: 'Tidak relevan', cls: 'bg-slate-50 text-slate-500 border-slate-200' },
}

type Tab = 'queue' | 'replies' | 'history' | 'settings'

function SettingsToggle({ label, desc, val, onChange }: { label: string; desc: string; val: boolean; onChange: (v: boolean) => void }) {
  return (
    <label className="flex items-start gap-3 cursor-pointer">
      <input type="checkbox" checked={val} onChange={(e) => onChange(e.target.checked)} className="mt-1 w-4 h-4 accent-indigo-600" />
      <div>
        <p className="text-sm font-medium text-slate-800">{label}</p>
        <p className="text-xs text-slate-500">{desc}</p>
      </div>
    </label>
  )
}

export default function ThreadsBotPage() {
  const [tab, setTab] = useState<Tab>('queue')
  const [busy, setBusy] = useState(false)
  const [toast, setToast] = useState('')
  const [refreshKey, setRefreshKey] = useState(0)

  const flash = (m: string) => { setToast(m); setTimeout(() => setToast(''), 2500) }

  const handleGenerate = async () => {
    setBusy(true)
    try { await generatePost(); flash('Draf postingan dibuat.') }
    catch (e) { flash(errMsg(e)) }
    finally { setBusy(false) }
  }
  const handlePoll = async () => {
    setBusy(true)
    try { await pollNow(); setRefreshKey((v) => v + 1); flash('Pemeriksaan dimulai. Hasilnya akan muncul di antrean dan riwayat.') }
    catch (e) { flash(errMsg(e)) }
    finally { setBusy(false) }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h2 className="text-2xl font-bold text-slate-900">Bot Threads</h2>
          <p className="text-sm text-slate-500 mt-0.5">Temukan percakapan tentang aplikasi kasir, siapkan balasan yang relevan, dan atur pertanyaan mana yang boleh langsung dibalas.</p>
        </div>
        <div className="grid grid-cols-1 min-[430px]:grid-cols-2 sm:flex items-center gap-2 w-full sm:w-auto">
          <button onClick={handlePoll} disabled={busy} className="px-4 py-2 bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 text-sm font-semibold rounded-xl disabled:opacity-50"><ButtonIcon icon={RefreshCw} />Cek Sekarang</button>
          <button onClick={handleGenerate} disabled={busy} className="px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white text-sm font-semibold rounded-xl disabled:opacity-50">+ Buat Draf Postingan</button>
        </div>
      </div>

      {toast && <div className="text-sm bg-indigo-50 border border-indigo-200 text-indigo-700 rounded-xl px-4 py-2.5">{toast}</div>}
      <BotConnection refreshKey={refreshKey} />

      <div className="flex gap-1.5 flex-wrap">
        {([['queue', 'Antrian ACC'], ['replies', 'Riwayat Balasan'], ['history', 'Riwayat'], ['settings', 'Pengaturan']] as [Tab, string][]).map(([v, label]) => (
          <button key={v} onClick={() => setTab(v)}
            className={`px-4 py-2 rounded-xl text-sm font-medium border transition-all ${tab === v ? 'bg-indigo-600 text-white border-indigo-600' : 'border-slate-200 text-slate-700 bg-white hover:bg-slate-50'}`}>
            {label}
          </button>
        ))}
      </div>

      {tab === 'queue' && <DraftList key="queue" status="pending" refreshKey={refreshKey} editable onAction={flash} />}
      {tab === 'replies' && <ReplyHistory />}
      {tab === 'history' && <DraftList key="history" status="history" refreshKey={refreshKey} historyView onAction={flash} />}
      {tab === 'settings' && <SettingsPanel onSaved={() => flash('Pengaturan disimpan.')} />}
    </div>
  )
}

function BotConnection({ refreshKey }: { refreshKey: number }) {
  const [status, setStatus] = useState<ThreadsBotStatus | null>(null)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(true)
  const load = useCallback(async () => {
    try { const r = await getThreadsBotStatus(); setStatus(r.data); setError('') }
    catch (e) { setError(errMsg(e)) }
    finally { setLoading(false) }
  }, [])
  // eslint-disable-next-line react-hooks/set-state-in-effect -- State updates only after the status request settles.
  useEffect(() => { void load() }, [load, refreshKey])
  return <div className="card p-4 space-y-3">
    <div className="flex items-center justify-between gap-3">
      <div><p className="text-sm font-semibold text-slate-800">Koneksi bot</p>
        <p className="text-xs text-slate-500 mt-1">{status?.connected ? `Memakai @${status.username}${status.account_source === 'social' ? ' dari Posting Sosial' : ''}` : loading ? 'Memeriksa akun Threads…' : 'Hubungkan akun Threads di Posting Sosial.'}</p></div>
      <button type="button" onClick={() => { setLoading(true); void load() }} disabled={loading} className="text-xs font-medium text-indigo-600 disabled:opacity-50">{loading ? 'Memeriksa…' : 'Perbarui status'}</button>
    </div>
    {error && <p role="alert" className="text-sm text-red-600">{error}</p>}
    {status && !status.keyword_ready && <div role="alert" className="rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-800">
      <p className="font-semibold">{status.connected ? 'Pencarian postingan publik belum tersedia' : 'Akun Threads belum siap'}</p>
      <p className="mt-1 text-xs">{status.connected ? 'Periksa izin threads_keyword_search dan Advanced Access aplikasi Meta, lalu hubungkan ulang akun jika izinnya berubah. Bot belum bisa menemukan postingan orang lain sampai pencarian berhasil.' : 'Gunakan akun Threads yang sudah dihubungkan melalui menu Posting Sosial.'}</p>
      {status.keyword_error && <details className="mt-2 text-xs"><summary className="cursor-pointer">Detail koneksi</summary><p className="mt-1 break-words">{status.keyword_error}</p></details>}
    </div>}
    {status?.keyword_ready && <div className="rounded-xl border border-blue-200 bg-blue-50 px-3 py-2 text-xs text-blue-800">
      <p className="font-semibold">API pencarian kata kunci terhubung</p>
      <p className="mt-1">Pencarian postingan akun lain memerlukan persetujuan Advanced Access untuk threads_keyword_search dari Meta. Tanpa persetujuan itu, hasil pencarian hanya mencakup postingan akun sendiri. Bot memeriksa postingan terbaru setiap 15 menit.</p>
    </div>}
    {status && <p className="text-xs text-slate-500">{status.generator === 'ai' ? 'Balasan dibuat dengan AI sesuai konteks dan fakta produk.' : 'Mode balasan terarah: pertanyaan yang jelas dijawab dari fakta produk. Pertanyaan yang belum dikenali dilewati.'}</p>}
    {status?.last_poll_at && <p className="text-xs text-slate-500">Pemeriksaan terakhir {format(new Date(status.last_poll_at), 'dd MMM HH:mm', { locale: localeId })} · {status.last_drafts} draf baru · {status.last_sent} balasan otomatis</p>}
    {status?.last_poll_error && <p className="text-xs text-amber-700 break-words">Pemeriksaan terakhir: {status.last_poll_error}</p>}
  </div>
}

function DraftList({ status, editable, historyView, onAction, refreshKey }: {
  status: string; editable?: boolean; historyView?: boolean; onAction: (m: string) => void; refreshKey: number
}) {
  const [rows, setRows] = useState<ThreadsDraft[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  const load = useCallback(() => {
    getDrafts({ status, limit: 50 })
      .then((r) => { setRows((r.data ?? []).filter((d) => historyView ? d.status !== 'pending' : true)); setError('') })
      .catch((e) => setError(errMsg(e)))
      .finally(() => setLoading(false))
  }, [status, historyView])

  useEffect(() => { load(); const timer = setInterval(load, 15_000); return () => clearInterval(timer) }, [load, refreshKey])

  if (error) return <div role="alert" className="card p-4 text-sm text-red-600">{error}</div>
  if (loading) return <div className="card py-16 text-center text-slate-400 text-sm">Memuat…</div>
  if (rows.length === 0) return (
    <div className="card py-16 text-center">
      <p className="text-sm text-slate-400">{editable ? 'Belum ada draf menunggu ACC. Bot membuat draf otomatis tiap beberapa menit, atau klik "Cek Sekarang".' : 'Belum ada riwayat.'}</p>
    </div>
  )

  return (
    <div className="space-y-3">
      {rows.map((d) => (
        <DraftCard key={`${d.id}:${d.updated_at}`} draft={d} editable={editable} onChanged={load} onAction={onAction} />
      ))}
    </div>
  )
}

function DraftCard({ draft, editable, onChanged, onAction }: {
  draft: ThreadsDraft; editable?: boolean; onChanged: () => void; onAction: (m: string) => void
}) {
  const [text, setText] = useState(draft.generated_text)
  const [busy, setBusy] = useState(false)
  const cfg = STATUS_CFG[draft.status] ?? STATUS_CFG.failed

  const run = async (fn: () => Promise<unknown>, msg: string) => {
    setBusy(true)
    try { await fn(); onAction(msg); onChanged() }
    catch (e) { onAction(errMsg(e)) }
    finally { setBusy(false) }
  }

  return (
    <div className="card p-4 space-y-3">
      <div className="flex items-center gap-2 flex-wrap">
        <span className="text-xs font-medium px-2 py-0.5 rounded-full bg-slate-100 text-slate-600">{draft.kind === 'post' ? 'Postingan' : 'Balasan'}</span>
        <span className="text-xs text-slate-500">{SOURCE_LABEL[draft.source] ?? draft.source}</span>
        {draft.keyword && <span className="text-xs text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-100">“{draft.keyword}”</span>}
        {draft.intent && INTENT_CFG[draft.intent] && <span className={`text-xs font-medium px-2 py-0.5 rounded-full border ${INTENT_CFG[draft.intent].cls}`}>{INTENT_CFG[draft.intent].label}</span>}
        <span className={`ml-auto text-xs font-medium px-2 py-0.5 rounded-full border ${cfg.cls}`}>{cfg.label}</span>
      </div>

      {draft.kind === 'reply' && (draft.target_text || draft.target_author) && (
        <div className="bg-slate-50 border border-slate-100 rounded-xl px-3 py-2">
          <p className="text-xs text-slate-500">Membalas {draft.target_author ? <b>@{draft.target_author}</b> : 'komentar'}:</p>
          {draft.target_text && <p className="text-xs text-slate-600 mt-0.5 italic">“{draft.target_text}”</p>}
          {draft.target_permalink && <a href={draft.target_permalink} target="_blank" rel="noopener" className="text-xs text-blue-500 hover:underline">Lihat di Threads<ButtonIcon icon={ExternalLink} side="end" size={12} /></a>}
        </div>
      )}

      {editable ? (
        <textarea value={text} onChange={(e) => setText(e.target.value)} rows={3}
          className="w-full px-3 py-2.5 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 resize-none" />
      ) : (
        <p className="text-sm text-slate-700 whitespace-pre-wrap">{draft.generated_text}</p>
      )}
      <div className="flex flex-col min-[400px]:flex-row min-[400px]:items-center justify-between gap-1 text-xs text-slate-400">
        <span className={Array.from(text).length > 500 ? 'text-red-600 font-semibold' : ''}>{Array.from(text).length}/500 karakter</span>
        {draft.error && <span className="text-red-500"><ButtonIcon icon={AlertTriangle} size={13} />{draft.error}</span>}
      </div>

      {editable && (
        <div className="flex gap-2 flex-wrap">
          <button onClick={() => run(() => approveDraft(draft.id, text), 'Tayang ke Threads')} disabled={busy || !text.trim() || Array.from(text).length > 500}
            className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-semibold rounded-xl disabled:opacity-50"><ButtonIcon icon={Check} />Tayangkan</button>
          <button onClick={() => run(() => regenerateDraft(draft.id), 'Balasan dibuat ulang.')} disabled={busy}
            className="px-4 py-2 bg-white border border-slate-200 hover:bg-slate-50 text-slate-600 text-sm font-medium rounded-xl disabled:opacity-50"><ButtonIcon icon={RotateCcw} />Buat Ulang</button>
          <button onClick={() => run(() => rejectDraft(draft.id), 'Draf ditolak')} disabled={busy}
            className="px-4 py-2 bg-white border border-slate-200 hover:bg-red-50 text-red-600 text-sm font-medium rounded-xl disabled:opacity-50"><ButtonIcon icon={Trash2} />Tolak</button>
        </div>
      )}

      <p className="text-xs text-slate-400">
        Dibuat {format(new Date(draft.created_at), 'dd MMM yyyy HH:mm', { locale: localeId })}
        {draft.posted_at && ` · Tayang ${format(new Date(draft.posted_at), 'dd MMM HH:mm', { locale: localeId })}`}
      </p>
    </div>
  )
}

// ── Riwayat balasan ──────────────────────────────────────────────────────────

type SourceFilter = 'all' | 'keyword' | 'own_reply' | 'mention'

const REPLY_SOURCE_LABEL: Record<string, string> = {
  keyword: 'Postingan orang lain',
  own_reply: 'Komentar di postingan kita',
  mention: 'Mention',
}

const PAGE_SIZE = 100

function ReplyHistory() {
  const [rows, setRows] = useState<ThreadsDraft[]>([])
  const [page, setPage] = useState(1)
  const [total, setTotal] = useState(0)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [source, setSource] = useState<SourceFilter>('all')
  const [onlyPosted, setOnlyPosted] = useState(true)

  const load = useCallback((p: number) => {
    setLoading(true)
    setError('')
    getDrafts({ kind: 'reply', status: onlyPosted ? 'posted' : '', page: p, limit: PAGE_SIZE })
      .then((r) => {
        const data = (r.data ?? []).filter((d) => d.status !== 'pending')
        setRows((prev) => (p === 1 ? data : [...prev, ...data]))
        setTotal(r.pagination?.total ?? 0)
        setPage(p)
      })
      .catch((e) => setError(errMsg(e)))
      .finally(() => setLoading(false))
  }, [onlyPosted])

  // eslint-disable-next-line react-hooks/set-state-in-effect
  useEffect(() => { load(1) }, [load])

  const shown = rows.filter((d) => source === 'all' || d.source === source)
  const posted = rows.filter((d) => d.status === 'posted')
  const count = (src: string) => posted.filter((d) => d.source === src).length
  const appQuestions = posted.filter((d) => ['tanya_aplikasi', 'tanya_harga', 'tanya_fitur'].includes(d.intent)).length
  const loadedAll = rows.length >= total || total === 0

  const stats: [string, number, string][] = [
    ['Balasan tayang', posted.length, 'text-slate-900'],
    ['Ke postingan orang lain', count('keyword'), 'text-indigo-700'],
    ['Ke komentar di postingan kita', count('own_reply'), 'text-slate-900'],
    ['Ke mention', count('mention'), 'text-slate-900'],
    ['Pertanyaan aplikasi kasir', appQuestions, 'text-emerald-700'],
  ]

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
        {stats.map(([label, n, cls]) => (
          <div key={label} className="card p-4">
            <p className="text-xs text-slate-500">{label}</p>
            <p className={`text-2xl font-bold tabular-nums mt-1 ${cls}`}>{n}</p>
          </div>
        ))}
      </div>
      {!loadedAll && <p className="text-xs text-slate-400">Angka di atas dihitung dari {rows.length} balasan terbaru yang sudah dimuat (dari {total}).</p>}

      <div className="flex flex-wrap items-center gap-2">
        {(['all', 'keyword', 'own_reply', 'mention'] as SourceFilter[]).map((v) => (
          <button key={v} onClick={() => setSource(v)}
            className={`px-3 py-1.5 rounded-full text-xs font-medium border ${source === v ? 'bg-slate-900 text-white border-slate-900' : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'}`}>
            {v === 'all' ? 'Semua' : REPLY_SOURCE_LABEL[v]}
          </button>
        ))}
        <label className="ml-auto flex items-center gap-2 text-xs text-slate-600 cursor-pointer">
          <input type="checkbox" checked={onlyPosted} onChange={(e) => setOnlyPosted(e.target.checked)} className="w-4 h-4 accent-indigo-600" />
          Hanya yang sudah tayang
        </label>
      </div>

      {error && <div className="card p-4 text-sm text-red-600">{error}</div>}

      {loading && rows.length === 0 ? (
        <div className="card py-16 text-center text-slate-400 text-sm">Memuat…</div>
      ) : shown.length === 0 ? (
        <div className="card py-16 text-center text-sm text-slate-400">
          {source === 'keyword'
            ? 'Belum ada balasan ke postingan orang lain. Nyalakan "Pantau kata kunci" di Pengaturan supaya bot mencari postingan yang relevan.'
            : 'Belum ada balasan yang tayang.'}
        </div>
      ) : (
        <div className="card divide-y divide-slate-100">
          {shown.map((d) => <ReplyRow key={d.id} d={d} />)}
        </div>
      )}

      {!loadedAll && !loading && (
        <button onClick={() => load(page + 1)} className="w-full py-2.5 bg-white border border-slate-200 hover:bg-slate-50 text-slate-600 text-sm font-medium rounded-xl">
          Muat lebih banyak
        </button>
      )}
    </div>
  )
}

function ReplyRow({ d }: { d: ThreadsDraft }) {
  const cfg = STATUS_CFG[d.status]
  const intent = d.intent ? INTENT_CFG[d.intent] : undefined
  const when = d.posted_at ?? d.updated_at
  return (
    <div className="p-4 space-y-2.5">
      <div className="flex items-center gap-2 flex-wrap">
        <span className="text-xs font-medium px-2 py-0.5 rounded-full bg-slate-100 text-slate-600">{REPLY_SOURCE_LABEL[d.source] ?? d.source}</span>
        {intent && <span className={`text-xs font-medium px-2 py-0.5 rounded-full border ${intent.cls}`}>{intent.label}</span>}
        {d.keyword && <span className="text-xs text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-100">“{d.keyword}”</span>}
        <span className="ml-auto text-xs text-slate-400">{format(new Date(when), 'dd MMM yyyy HH:mm', { locale: localeId })}</span>
        <span className={`text-xs font-medium px-2 py-0.5 rounded-full border ${cfg.cls}`}>{cfg.label}</span>
      </div>
      <div className="grid md:grid-cols-2 gap-2.5">
        <div className="bg-slate-50 border border-slate-100 rounded-xl px-3 py-2">
          <p className="text-xs text-slate-500">{d.target_author ? <b>@{d.target_author}</b> : 'Seseorang'} menulis:</p>
          <p className="text-sm text-slate-700 mt-0.5 whitespace-pre-wrap">{d.target_text || '—'}</p>
          {d.target_permalink && <a href={d.target_permalink} target="_blank" rel="noopener" className="text-xs text-blue-500 hover:underline">Lihat di Threads<ButtonIcon icon={ExternalLink} side="end" size={12} /></a>}
        </div>
        <div className="bg-indigo-50/60 border border-indigo-100 rounded-xl px-3 py-2">
          <p className="text-xs text-indigo-600 font-medium">Balasan kita:</p>
          <p className="text-sm text-slate-800 mt-0.5 whitespace-pre-wrap">{d.generated_text}</p>
        </div>
      </div>
      {d.error && <p className="text-xs text-red-500"><ButtonIcon icon={AlertTriangle} size={13} />{d.error}</p>}
    </div>
  )
}

function SettingsPanel({ onSaved }: { onSaved: () => void }) {
  const [s, setS] = useState<ThreadsSettings | null>(null)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    getThreadsSettings().then((r) => setS({ ...r.data, auto_send_keyword_questions: r.data.auto_send_keyword_questions ?? false, max_auto_replies_per_day: r.data.max_auto_replies_per_day ?? 5 })).catch((e) => setError(errMsg(e)))
  }, [])

  if (!s) return <div className="card py-16 text-center text-slate-400 text-sm">{error || 'Memuat pengaturan…'}</div>

  const set = <K extends keyof ThreadsSettings>(k: K, v: ThreadsSettings[K]) => setS({ ...s, [k]: v })

  const save = async () => {
    setSaving(true)
    try {
      await updateThreadsSettings({
        enabled: s.enabled, auto_reply_own: s.auto_reply_own, reply_mentions: s.reply_mentions,
        keyword_enabled: s.keyword_enabled, keywords: s.keywords, persona: s.persona, posts_per_day: s.posts_per_day,
        auto_send_app_questions: s.auto_send_app_questions,
        auto_send_keyword_questions: s.auto_send_keyword_questions,
        max_auto_replies_per_day: s.max_auto_replies_per_day,
      })
      setError('')
      onSaved()
    } catch (e) { setError(errMsg(e)) } finally { setSaving(false) }
  }

  return (
    <div className="card p-5 space-y-5 max-w-2xl">
      {error && <p role="alert" className="text-sm text-red-600">{error}</p>}
      <SettingsToggle label="Aktifkan bot" desc="Bot memeriksa percakapan setiap 15 menit. Pengiriman mengikuti pilihan balasan otomatis di bawah. Matikan untuk menjeda pemeriksaan berikutnya." val={s.enabled} onChange={(v) => set('enabled', v)} />
      <div className="h-px bg-slate-100" />
      <SettingsToggle label="Balas komentar di postingan bot" desc="Buat draf balasan untuk orang yang berkomentar di thread buatan bot." val={s.auto_reply_own} onChange={(v) => set('auto_reply_own', v)} />
      <SettingsToggle label="Balas mention" desc="Balas orang yang men-tag akun Threads-mu. (Butuh izin threads_manage_mentions.)" val={s.reply_mentions} onChange={(v) => set('reply_mentions', v)} />
      <SettingsToggle label="Langsung balas pertanyaan di akun sendiri" desc="Pertanyaan aplikasi kasir, harga, atau fitur di komentar dan mention boleh langsung dibalas. Balasan lain tetap berupa draf." val={s.auto_send_app_questions} onChange={(v) => set('auto_send_app_questions', v)} />
      <SettingsToggle label="Pantau kata kunci" desc="Cari postingan publik berisi kata kunci lalu buat draf balasan. (Butuh izin threads_keyword_search.)" val={s.keyword_enabled} onChange={(v) => set('keyword_enabled', v)} />
      <SettingsToggle label="Langsung balas pertanyaan dari pencarian" desc="Balas pertanyaan yang jelas tentang rekomendasi aplikasi kasir, harga, atau fitur. Keluhan dan obrolan umum tetap menunggu ACC. Lowongan kasir, iklan, dan hasil yang tidak relevan dilewati." val={s.auto_send_keyword_questions} onChange={(v) => set('auto_send_keyword_questions', v)} />

      <div>
        <label htmlFor="auto-reply-limit" className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Batas balasan otomatis per 24 jam</label>
        <input id="auto-reply-limit" type="number" min={0} max={20} value={s.max_auto_replies_per_day} onChange={(e) => set('max_auto_replies_per_day', Number(e.target.value))} className="mt-1.5 block w-28 px-3 py-2.5 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500" />
        <p className="mt-1.5 text-xs text-slate-500">Jeda minimal 30 menit antarbalasan otomatis, maksimal satu balasan ke akun yang sama per 24 jam. Isi 0 untuk menghentikan pengiriman otomatis. Percobaan gagal juga memakai kuota.</p>
      </div>

      <div>
        <label className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Kata kunci (pisahkan dengan koma)</label>
        <input value={s.keywords} onChange={(e) => set('keywords', e.target.value)} placeholder="aplikasi kasir, software kasir, Qasir, Pawoon, Olsera, Majoo"
          className="mt-1.5 w-full px-3 py-2.5 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500" />
        <p className="mt-1.5 text-xs text-slate-500">Maksimal 12 kata kunci. Nama aplikasi sejenis dipakai untuk menemukan percakapan yang bisa dibantu; bot mewakili Loka dan tidak mengarang klaim tentang pesaing.</p>
      </div>

      <div>
        <label className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Persona / gaya AI</label>
        <textarea value={s.persona} onChange={(e) => set('persona', e.target.value)} rows={3} placeholder="Mis. Ramah, santai, seperti sesama pelaku UMKM yang berbagi tips. Hindari hard-selling."
          className="mt-1.5 w-full px-3 py-2.5 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 resize-none" />
      </div>

      <div>
        <label className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Draf postingan per hari</label>
        <input type="number" min={0} max={20} value={s.posts_per_day} onChange={(e) => set('posts_per_day', Number(e.target.value))}
          className="mt-1.5 w-28 px-3 py-2.5 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500" />
      </div>

      <button onClick={save} disabled={saving} className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-semibold rounded-xl disabled:opacity-50">
        {saving ? 'Menyimpan…' : 'Simpan Pengaturan'}
      </button>
    </div>
  )
}

function errMsg(e: unknown): string {
  const err = e as { response?: { data?: { error?: { details?: string }; message?: string } } }
  return err.response?.data?.error?.details ?? err.response?.data?.message ?? 'Terjadi kesalahan'
}
