import { useState, useEffect, useCallback } from 'react'
import { format } from 'date-fns'
import { id as localeId } from 'date-fns/locale'
import {
  getProspects,
  createProspect,
  updateProspect,
  deleteProspect,
  sendOutreach,
  getEmailTemplate,
  type Prospect,
  type ProspectStatus,
  type CreateProspectPayload,
} from '../api/prospects'

const STATUS_CONFIG: Record<ProspectStatus, { label: string; color: string; bg: string; border: string }> = {
  new: { label: 'Baru', color: 'text-amber-700', bg: 'bg-amber-50', border: 'border-amber-200' },
  contacted: { label: 'Dihubungi', color: 'text-blue-700', bg: 'bg-blue-50', border: 'border-blue-200' },
  converted: { label: 'Jadi Pelanggan', color: 'text-emerald-700', bg: 'bg-emerald-50', border: 'border-emerald-200' },
  rejected: { label: 'Tidak Tertarik', color: 'text-red-600', bg: 'bg-red-50', border: 'border-red-200' },
}

const FILTER_TABS = [
  { value: '', label: 'Semua' },
  { value: 'new', label: 'Baru' },
  { value: 'contacted', label: 'Dihubungi' },
  { value: 'converted', label: 'Jadi Pelanggan' },
  { value: 'rejected', label: 'Tidak Tertarik' },
]

const LIMIT = 20

type SendTarget = { mode: 'single'; prospect: Prospect } | { mode: 'selected'; ids: string[] } | { mode: 'all' }

export default function ProspectsPage() {
  const [rows, setRows] = useState<Prospect[]>([])
  const [total, setTotal] = useState(0)
  const [page, setPage] = useState(1)
  const [statusFilter, setStatusFilter] = useState('')
  const [search, setSearch] = useState('')
  const [searchInput, setSearchInput] = useState('')
  const [loading, setLoading] = useState(true)
  const [selected, setSelected] = useState<Set<string>>(new Set())
  const [formModal, setFormModal] = useState<'new' | Prospect | null>(null)
  const [sendTarget, setSendTarget] = useState<SendTarget | null>(null)

  const load = useCallback(() => {
    setLoading(true)
    getProspects({ page, limit: LIMIT, status: statusFilter, search })
      .then((r) => {
        setRows(r.data ?? [])
        setTotal(r.pagination.total)
      })
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [page, statusFilter, search])

  // eslint-disable-next-line react-hooks/set-state-in-effect
  useEffect(() => { load() }, [load])

  const toggleSelect = (id: string) =>
    setSelected((s) => {
      const next = new Set(s)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })

  const handleStatusChange = async (row: Prospect, status: ProspectStatus) => {
    await updateProspect(row.id, { status })
    load()
  }

  const handleDelete = async (id: string) => {
    if (!confirm('Hapus prospek ini?')) return
    await deleteProspect(id)
    load()
  }

  const totalPages = Math.ceil(total / LIMIT)
  const selectedIds = [...selected]

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h2 className="text-2xl font-bold text-slate-900">Prospek Pelanggan</h2>
          <p className="text-sm text-slate-500 mt-0.5">Calon pengguna Loka Kasir & pemasaran via email</p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setSendTarget({ mode: 'all' })}
            className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-semibold rounded-xl"
          >
            📣 Kirim ke Semua
          </button>
          <button
            onClick={() => setFormModal('new')}
            className="px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white text-sm font-semibold rounded-xl"
          >
            + Tambah Prospek
          </button>
        </div>
      </div>

      {/* Filter + search */}
      <div className="flex flex-wrap gap-2 items-center">
        <div className="flex gap-1.5 flex-wrap">
          {FILTER_TABS.map((opt) => (
            <button
              key={opt.value}
              onClick={() => { setStatusFilter(opt.value); setPage(1) }}
              className={`px-4 py-2 rounded-xl text-sm font-medium border transition-all ${
                statusFilter === opt.value
                  ? 'bg-indigo-600 text-white border-indigo-600'
                  : 'border-slate-200 text-slate-700 bg-white hover:bg-slate-50'
              }`}
            >
              {opt.label}
            </button>
          ))}
        </div>
        <form
          onSubmit={(e) => { e.preventDefault(); setSearch(searchInput); setPage(1) }}
          className="flex gap-2 ml-auto"
        >
          <input
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            placeholder="Cari nama / email / perusahaan..."
            className="px-3 py-2 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 w-60"
          />
          <button type="submit" className="px-3 py-2 bg-slate-100 hover:bg-slate-200 text-slate-600 text-sm font-medium rounded-xl">Cari</button>
        </form>
      </div>

      {/* Bulk action bar */}
      {selectedIds.length > 0 && (
        <div className="flex items-center justify-between bg-indigo-50 border border-indigo-200 rounded-xl px-4 py-2.5">
          <span className="text-sm font-medium text-indigo-700">{selectedIds.length} prospek dipilih</span>
          <div className="flex gap-2">
            <button
              onClick={() => setSendTarget({ mode: 'selected', ids: selectedIds })}
              className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold rounded-lg"
            >
              📧 Kirim ke Terpilih
            </button>
            <button onClick={() => setSelected(new Set())} className="px-3 py-1.5 text-xs text-slate-500 hover:text-slate-700">
              Batal pilih
            </button>
          </div>
        </div>
      )}

      {loading ? (
        <div className="bg-white rounded-2xl border border-slate-200 py-20 text-center text-slate-400 text-sm">Memuat data...</div>
      ) : rows.length === 0 ? (
        <div className="bg-white rounded-2xl border border-slate-200 py-24 text-center">
          <p className="text-sm text-slate-400">Belum ada prospek. Klik “Tambah Prospek”.</p>
        </div>
      ) : (
        <>
          <div className="space-y-3">
            {rows.map((row) => (
              <ProspectRow
                key={row.id}
                row={row}
                checked={selected.has(row.id)}
                onToggle={() => toggleSelect(row.id)}
                onStatusChange={(s) => handleStatusChange(row, s)}
                onEdit={() => setFormModal(row)}
                onDelete={() => handleDelete(row.id)}
                onSend={() => setSendTarget({ mode: 'single', prospect: row })}
              />
            ))}
          </div>

          {totalPages > 1 && (
            <div className="flex items-center justify-between pt-2">
              <p className="text-xs text-slate-500">
                {(page - 1) * LIMIT + 1}–{Math.min(page * LIMIT, total)} dari {total} prospek
              </p>
              <div className="flex gap-1.5">
                <button onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={page === 1}
                  className="px-3 py-1.5 text-xs border border-slate-200 rounded-xl disabled:opacity-40 hover:bg-slate-50">← Sebelumnya</button>
                <button onClick={() => setPage((p) => Math.min(totalPages, p + 1))} disabled={page === totalPages}
                  className="px-3 py-1.5 text-xs border border-slate-200 rounded-xl disabled:opacity-40 hover:bg-slate-50">Berikutnya →</button>
              </div>
            </div>
          )}
        </>
      )}

      {formModal && (
        <ProspectFormModal
          prospect={formModal === 'new' ? null : formModal}
          onClose={() => setFormModal(null)}
          onSaved={() => { setFormModal(null); load() }}
        />
      )}

      {sendTarget && (
        <SendEmailModal
          target={sendTarget}
          onClose={() => setSendTarget(null)}
          onSent={() => { setSendTarget(null); setSelected(new Set()); load() }}
        />
      )}
    </div>
  )
}

function ProspectRow({
  row, checked, onToggle, onStatusChange, onEdit, onDelete, onSend,
}: {
  row: Prospect
  checked: boolean
  onToggle: () => void
  onStatusChange: (s: ProspectStatus) => void
  onEdit: () => void
  onDelete: () => void
  onSend: () => void
}) {
  const cfg = STATUS_CONFIG[row.status] ?? STATUS_CONFIG.new
  return (
    <div className="bg-white rounded-2xl border border-slate-200 p-4">
      <div className="flex items-start gap-3">
        <input type="checkbox" checked={checked} onChange={onToggle} className="mt-1 w-4 h-4 accent-indigo-600" />
        <div className="flex-1 min-w-0 space-y-1">
          <div className="flex items-center gap-2 flex-wrap">
            <h4 className="text-sm font-semibold text-slate-800">{row.name}</h4>
            {row.company && <span className="text-xs bg-slate-100 text-slate-500 px-2 py-0.5 rounded-full">🏢 {row.company}</span>}
            {row.unsubscribed && <span className="text-xs bg-red-50 text-red-500 px-2 py-0.5 rounded-full border border-red-100">unsubscribed</span>}
          </div>
          <div className="flex items-center gap-3 flex-wrap text-xs text-slate-600">
            <span className="font-medium flex items-center gap-1">📧 {row.email}</span>
            {row.phone && <span className="flex items-center gap-1">📱 {row.phone}</span>}
            {row.source && <span className="flex items-center gap-1">🔖 {row.source}</span>}
          </div>
          {row.notes && (
            <p className="text-xs text-slate-500 italic bg-amber-50 border border-amber-100 rounded-lg px-2 py-1">📝 {row.notes}</p>
          )}
          <div className="flex items-center gap-2 pt-0.5 text-xs text-slate-400 flex-wrap">
            <span>Dibuat {format(new Date(row.created_at), 'dd MMM yyyy', { locale: localeId })}</span>
            {row.last_contacted_at && (
              <span className="text-blue-400">· Email terakhir {format(new Date(row.last_contacted_at), 'dd MMM yyyy', { locale: localeId })}</span>
            )}
          </div>
        </div>

        <div className="shrink-0 flex flex-col items-end gap-2">
          <select
            value={row.status}
            onChange={(e) => onStatusChange(e.target.value as ProspectStatus)}
            className={`text-xs font-medium px-2.5 py-1.5 rounded-xl border cursor-pointer focus:outline-none focus:ring-2 focus:ring-indigo-500 ${cfg.bg} ${cfg.color} ${cfg.border}`}
          >
            {Object.entries(STATUS_CONFIG).map(([v, c]) => (
              <option key={v} value={v}>{c.label}</option>
            ))}
          </select>
          <div className="flex gap-1.5">
            <button onClick={onSend} disabled={row.unsubscribed} title="Kirim email"
              className="p-2 bg-indigo-100 hover:bg-indigo-200 text-indigo-700 rounded-xl text-sm disabled:opacity-40">📧</button>
            <button onClick={onEdit} title="Edit" className="p-2 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-xl text-sm">✏️</button>
            <button onClick={onDelete} title="Hapus" className="p-2 bg-red-100 hover:bg-red-200 text-red-600 rounded-xl text-sm">🗑️</button>
          </div>
        </div>
      </div>
    </div>
  )
}

function ProspectFormModal({ prospect, onClose, onSaved }: { prospect: Prospect | null; onClose: () => void; onSaved: () => void }) {
  const [form, setForm] = useState<CreateProspectPayload>({
    name: prospect?.name ?? '',
    email: prospect?.email ?? '',
    company: prospect?.company ?? '',
    phone: prospect?.phone ?? '',
    source: prospect?.source ?? '',
    notes: prospect?.notes ?? '',
  })
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  const set = (k: keyof CreateProspectPayload) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
    setForm((f) => ({ ...f, [k]: e.target.value }))

  const handleSave = async () => {
    if (!form.name.trim() || !form.email.trim()) { setError('Nama & email wajib diisi'); return }
    setSaving(true)
    setError('')
    try {
      const payload = { ...form, company: form.company || null, phone: form.phone || null, source: form.source || null, notes: form.notes || null }
      if (prospect) await updateProspect(prospect.id, payload)
      else await createProspect(payload)
      onSaved()
    } catch (e) {
      const err = e as { response?: { data?: { message?: string } } }
      setError(err.response?.data?.message ?? 'Gagal menyimpan')
    } finally {
      setSaving(false)
    }
  }

  const input = 'w-full px-3 py-2.5 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500'

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div className="bg-white rounded-2xl w-full max-w-md shadow-xl p-5" onClick={(e) => e.stopPropagation()}>
        <h3 className="text-sm font-bold text-slate-800 mb-4">{prospect ? 'Edit Prospek' : 'Tambah Prospek'}</h3>
        <div className="space-y-3">
          <input className={input} placeholder="Nama *" value={form.name} onChange={set('name')} autoFocus />
          <input className={input} placeholder="Email *" type="email" value={form.email} onChange={set('email')} />
          <input className={input} placeholder="Perusahaan / nama toko" value={form.company ?? ''} onChange={set('company')} />
          <input className={input} placeholder="No. telepon" value={form.phone ?? ''} onChange={set('phone')} />
          <input className={input} placeholder="Sumber (mis. instagram, referral)" value={form.source ?? ''} onChange={set('source')} />
          <textarea className={`${input} resize-none`} rows={2} placeholder="Catatan" value={form.notes ?? ''} onChange={set('notes')} />
          {error && <p className="text-xs text-red-500">{error}</p>}
        </div>
        <div className="flex gap-2 mt-4">
          <button onClick={handleSave} disabled={saving} className="flex-1 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-semibold rounded-xl disabled:opacity-50">
            {saving ? 'Menyimpan…' : 'Simpan'}
          </button>
          <button onClick={onClose} className="flex-1 py-2.5 border border-slate-200 text-slate-600 hover:bg-slate-50 text-sm rounded-xl">Batal</button>
        </div>
      </div>
    </div>
  )
}

function SendEmailModal({ target, onClose, onSent }: { target: SendTarget; onClose: () => void; onSent: () => void }) {
  const [subject, setSubject] = useState('')
  const [body, setBody] = useState('')
  const [loadingTpl, setLoadingTpl] = useState(true)
  const [sending, setSending] = useState(false)
  const [result, setResult] = useState<string>('')

  useEffect(() => {
    getEmailTemplate()
      .then((r) => { setSubject(r.data.subject); setBody(r.data.body_html) })
      .catch(() => {})
      .finally(() => setLoadingTpl(false))
  }, [])

  const recipientLabel =
    target.mode === 'single' ? `1 prospek (${target.prospect.email})`
      : target.mode === 'selected' ? `${target.ids.length} prospek terpilih`
        : 'SEMUA prospek (yang belum unsubscribe)'

  const handleSend = async () => {
    if (!subject.trim() || !body.trim()) { setResult('Subjek & isi wajib diisi'); return }
    setSending(true)
    setResult('')
    try {
      const payload =
        target.mode === 'single' ? { prospect_ids: [target.prospect.id], subject, body_html: body }
          : target.mode === 'selected' ? { prospect_ids: target.ids, subject, body_html: body }
            : { all: true, subject, body_html: body }
      const r = await sendOutreach(payload)
      const s = r.data
      setResult(`✅ Terkirim ${s.sent}, gagal ${s.failed}, dilewati ${s.skipped} (total ${s.total}).`)
      setTimeout(onSent, 1200)
    } catch (e) {
      const err = e as { response?: { data?: { message?: string } } }
      setResult('❌ ' + (err.response?.data?.message ?? 'Gagal mengirim'))
    } finally {
      setSending(false)
    }
  }

  const input = 'w-full px-3 py-2.5 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500'

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div className="bg-white rounded-2xl w-full max-w-lg shadow-xl p-5" onClick={(e) => e.stopPropagation()}>
        <h3 className="text-sm font-bold text-slate-800 mb-1">Kirim Email Pemasaran</h3>
        <p className="text-xs text-slate-500 mb-4">Penerima: <span className="font-medium text-slate-700">{recipientLabel}</span></p>

        {loadingTpl ? (
          <p className="text-sm text-slate-400 py-8 text-center">Memuat template…</p>
        ) : (
          <div className="space-y-3">
            <div>
              <label className="text-xs font-medium text-slate-500 mb-1 block">Subjek</label>
              <input className={input} value={subject} onChange={(e) => setSubject(e.target.value)} />
            </div>
            <div>
              <label className="text-xs font-medium text-slate-500 mb-1 block">Isi (HTML — boleh edit)</label>
              <textarea className={`${input} font-mono text-xs resize-none`} rows={10} value={body} onChange={(e) => setBody(e.target.value)} />
            </div>
            <p className="text-xs text-slate-400">
              Footer “berhenti berlangganan” otomatis ditambahkan. Prospek yang sudah unsubscribe dilewati.
            </p>
            {result && <p className="text-xs font-medium text-slate-700 bg-slate-50 border border-slate-200 rounded-lg px-3 py-2">{result}</p>}
          </div>
        )}

        <div className="flex gap-2 mt-4">
          <button onClick={handleSend} disabled={sending || loadingTpl} className="flex-1 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-semibold rounded-xl disabled:opacity-50">
            {sending ? 'Mengirim…' : 'Kirim Email'}
          </button>
          <button onClick={onClose} className="flex-1 py-2.5 border border-slate-200 text-slate-600 hover:bg-slate-50 text-sm rounded-xl">Tutup</button>
        </div>
      </div>
    </div>
  )
}
