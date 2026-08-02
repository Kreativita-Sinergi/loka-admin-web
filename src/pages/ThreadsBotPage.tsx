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
  type ThreadsDraft,
  type ThreadsDraftStatus,
  type ThreadsSettings,
} from '../api/threads'

const STATUS_CFG: Record<ThreadsDraftStatus, { label: string; cls: string }> = {
  pending: { label: 'Menunggu ACC', cls: 'bg-amber-50 text-amber-700 border-amber-200' },
  posted: { label: 'Tayang', cls: 'bg-emerald-50 text-emerald-700 border-emerald-200' },
  rejected: { label: 'Ditolak', cls: 'bg-slate-100 text-slate-500 border-slate-200' },
  failed: { label: 'Gagal', cls: 'bg-red-50 text-red-600 border-red-200' },
}

const SOURCE_LABEL: Record<string, string> = {
  own_reply: '💬 Komentar di postingan bot',
  mention: '🔔 Mention',
  keyword: '🔎 Kata kunci',
  scheduled: '🗓️ Postingan terjadwal',
}

type Tab = 'queue' | 'history' | 'settings'

export default function ThreadsBotPage() {
  const [tab, setTab] = useState<Tab>('queue')
  const [busy, setBusy] = useState(false)
  const [toast, setToast] = useState('')

  const flash = (m: string) => { setToast(m); setTimeout(() => setToast(''), 2500) }

  const handleGenerate = async () => {
    setBusy(true)
    try { await generatePost(); flash('Draf postingan dibuat.') }
    catch (e) { flash(errMsg(e)) }
    finally { setBusy(false) }
  }
  const handlePoll = async () => {
    setBusy(true)
    try { await pollNow(); flash('Bot mengecek komentar/mention/keyword di latar belakang…') }
    catch (e) { flash(errMsg(e)) }
    finally { setBusy(false) }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h2 className="text-2xl font-bold text-slate-900">Bot Threads</h2>
          <p className="text-sm text-slate-500 mt-0.5">Bot membuat draf balasan &amp; postingan otomatis — kamu tinggal ACC. Tidak ada yang tayang tanpa persetujuanmu.</p>
        </div>
        <div className="grid grid-cols-1 min-[430px]:grid-cols-2 sm:flex items-center gap-2 w-full sm:w-auto">
          <button onClick={handlePoll} disabled={busy} className="px-4 py-2 bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 text-sm font-semibold rounded-xl disabled:opacity-50">🔄 Cek Sekarang</button>
          <button onClick={handleGenerate} disabled={busy} className="px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white text-sm font-semibold rounded-xl disabled:opacity-50">+ Buat Draf Postingan</button>
        </div>
      </div>

      {toast && <div className="text-sm bg-indigo-50 border border-indigo-200 text-indigo-700 rounded-xl px-4 py-2.5">{toast}</div>}

      <div className="flex gap-1.5 flex-wrap">
        {([['queue', 'Antrian ACC'], ['history', 'Riwayat'], ['settings', 'Pengaturan']] as [Tab, string][]).map(([v, label]) => (
          <button key={v} onClick={() => setTab(v)}
            className={`px-4 py-2 rounded-xl text-sm font-medium border transition-all ${tab === v ? 'bg-indigo-600 text-white border-indigo-600' : 'border-slate-200 text-slate-700 bg-white hover:bg-slate-50'}`}>
            {label}
          </button>
        ))}
      </div>

      {tab === 'queue' && <DraftList key="queue" status="pending" editable onAction={flash} />}
      {tab === 'history' && <DraftList key="history" status="" historyView onAction={flash} />}
      {tab === 'settings' && <SettingsPanel onSaved={() => flash('Pengaturan disimpan.')} />}
    </div>
  )
}

function DraftList({ status, editable, historyView, onAction }: {
  status: string; editable?: boolean; historyView?: boolean; onAction: (m: string) => void
}) {
  const [rows, setRows] = useState<ThreadsDraft[]>([])
  const [loading, setLoading] = useState(true)

  const load = useCallback(() => {
    setLoading(true)
    getDrafts({ status, limit: 50 })
      .then((r) => setRows((r.data ?? []).filter((d) => historyView ? d.status !== 'pending' : true)))
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [status, historyView])

  // eslint-disable-next-line react-hooks/set-state-in-effect
  useEffect(() => { load() }, [load])

  if (loading) return <div className="bg-white rounded-2xl border border-slate-200 py-16 text-center text-slate-400 text-sm">Memuat…</div>
  if (rows.length === 0) return (
    <div className="bg-white rounded-2xl border border-slate-200 py-16 text-center">
      <p className="text-sm text-slate-400">{editable ? 'Belum ada draf menunggu ACC. Bot membuat draf otomatis tiap beberapa menit, atau klik "Cek Sekarang".' : 'Belum ada riwayat.'}</p>
    </div>
  )

  return (
    <div className="space-y-3">
      {rows.map((d) => (
        <DraftCard key={d.id} draft={d} editable={editable} onChanged={load} onAction={onAction} />
      ))}
    </div>
  )
}

function DraftCard({ draft, editable, onChanged, onAction }: {
  draft: ThreadsDraft; editable?: boolean; onChanged: () => void; onAction: (m: string) => void
}) {
  const [text, setText] = useState(draft.generated_text)
  const [busy, setBusy] = useState(false)
  const cfg = STATUS_CFG[draft.status]

  const run = async (fn: () => Promise<unknown>, msg: string) => {
    setBusy(true)
    try { await fn(); onAction(msg); onChanged() }
    catch (e) { onAction(errMsg(e)) }
    finally { setBusy(false) }
  }

  return (
    <div className="bg-white rounded-2xl border border-slate-200 p-4 space-y-3">
      <div className="flex items-center gap-2 flex-wrap">
        <span className="text-xs font-medium px-2 py-0.5 rounded-full bg-slate-100 text-slate-600">{draft.kind === 'post' ? '📣 Postingan' : '↩️ Balasan'}</span>
        <span className="text-xs text-slate-500">{SOURCE_LABEL[draft.source] ?? draft.source}</span>
        {draft.keyword && <span className="text-xs text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-100">“{draft.keyword}”</span>}
        <span className={`ml-auto text-xs font-medium px-2 py-0.5 rounded-full border ${cfg.cls}`}>{cfg.label}</span>
      </div>

      {draft.kind === 'reply' && (draft.target_text || draft.target_author) && (
        <div className="bg-slate-50 border border-slate-100 rounded-xl px-3 py-2">
          <p className="text-xs text-slate-500">Membalas {draft.target_author ? <b>@{draft.target_author}</b> : 'komentar'}:</p>
          {draft.target_text && <p className="text-xs text-slate-600 mt-0.5 italic">“{draft.target_text}”</p>}
          {draft.target_permalink && <a href={draft.target_permalink} target="_blank" rel="noopener" className="text-xs text-blue-500 hover:underline">Lihat di Threads ↗</a>}
        </div>
      )}

      {editable ? (
        <textarea value={text} onChange={(e) => setText(e.target.value)} rows={3}
          className="w-full px-3 py-2.5 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 resize-none" />
      ) : (
        <p className="text-sm text-slate-700 whitespace-pre-wrap">{draft.generated_text}</p>
      )}
      <div className="flex flex-col min-[400px]:flex-row min-[400px]:items-center justify-between gap-1 text-xs text-slate-400">
        <span>{text.length} karakter</span>
        {draft.error && <span className="text-red-500">⚠ {draft.error}</span>}
      </div>

      {editable && (
        <div className="flex gap-2 flex-wrap">
          <button onClick={() => run(() => approveDraft(draft.id, text), 'Tayang ke Threads ✅')} disabled={busy}
            className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-semibold rounded-xl disabled:opacity-50">✅ Tayangkan</button>
          <button onClick={() => run(() => regenerateDraft(draft.id), 'Teks dibuat ulang oleh AI')} disabled={busy}
            className="px-4 py-2 bg-white border border-slate-200 hover:bg-slate-50 text-slate-600 text-sm font-medium rounded-xl disabled:opacity-50">🔁 Buat Ulang</button>
          <button onClick={() => run(() => rejectDraft(draft.id), 'Draf ditolak')} disabled={busy}
            className="px-4 py-2 bg-white border border-slate-200 hover:bg-red-50 text-red-600 text-sm font-medium rounded-xl disabled:opacity-50">🗑️ Tolak</button>
        </div>
      )}

      <p className="text-xs text-slate-400">
        Dibuat {format(new Date(draft.created_at), 'dd MMM yyyy HH:mm', { locale: localeId })}
        {draft.posted_at && ` · Tayang ${format(new Date(draft.posted_at), 'dd MMM HH:mm', { locale: localeId })}`}
      </p>
    </div>
  )
}

function SettingsPanel({ onSaved }: { onSaved: () => void }) {
  const [s, setS] = useState<ThreadsSettings | null>(null)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    getThreadsSettings().then((r) => setS(r.data)).catch(() => {})
  }, [])

  if (!s) return <div className="bg-white rounded-2xl border border-slate-200 py-16 text-center text-slate-400 text-sm">Memuat pengaturan…</div>

  const set = <K extends keyof ThreadsSettings>(k: K, v: ThreadsSettings[K]) => setS({ ...s, [k]: v })

  const save = async () => {
    setSaving(true)
    try {
      await updateThreadsSettings({
        enabled: s.enabled, auto_reply_own: s.auto_reply_own, reply_mentions: s.reply_mentions,
        keyword_enabled: s.keyword_enabled, keywords: s.keywords, persona: s.persona, posts_per_day: s.posts_per_day,
      })
      onSaved()
    } finally { setSaving(false) }
  }

  const Toggle = ({ label, desc, val, onChange }: { label: string; desc: string; val: boolean; onChange: (v: boolean) => void }) => (
    <label className="flex items-start gap-3 cursor-pointer">
      <input type="checkbox" checked={val} onChange={(e) => onChange(e.target.checked)} className="mt-1 w-4 h-4 accent-indigo-600" />
      <div>
        <p className="text-sm font-medium text-slate-800">{label}</p>
        <p className="text-xs text-slate-500">{desc}</p>
      </div>
    </label>
  )

  return (
    <div className="bg-white rounded-2xl border border-slate-200 p-5 space-y-5 max-w-2xl">
      <Toggle label="Aktifkan bot" desc="Saat aktif, bot otomatis membuat draf (tetap menunggu ACC). Matikan untuk menjeda total." val={s.enabled} onChange={(v) => set('enabled', v)} />
      <div className="h-px bg-slate-100" />
      <Toggle label="Balas komentar di postingan bot" desc="Buat draf balasan untuk orang yang berkomentar di thread buatan bot." val={s.auto_reply_own} onChange={(v) => set('auto_reply_own', v)} />
      <Toggle label="Balas mention" desc="Balas orang yang men-tag akun Threads-mu. (Butuh izin threads_manage_mentions.)" val={s.reply_mentions} onChange={(v) => set('reply_mentions', v)} />
      <Toggle label="Pantau kata kunci" desc="Cari postingan publik berisi kata kunci lalu buat draf balasan. (Butuh izin threads_keyword_search.)" val={s.keyword_enabled} onChange={(v) => set('keyword_enabled', v)} />

      <div>
        <label className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Kata kunci (pisahkan dengan koma)</label>
        <input value={s.keywords} onChange={(e) => set('keywords', e.target.value)} placeholder="kasir, POS, UMKM, jualan online"
          className="mt-1.5 w-full px-3 py-2.5 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500" />
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
