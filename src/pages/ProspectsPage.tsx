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
  importGoogle,
  markContacted,
  type Prospect,
  type ProspectStatus,
  type CreateProspectPayload,
} from '../api/prospects'
import { searchGooglePlaces, type GooglePlaceResult } from '../lib/googlePlaces'

// Pesan WhatsApp default — dikirim saat admin klik "Chat WA". {nama} otomatis diisi.
const waMessage = (name: string) =>
  `Halo ${name} 👋\n\nPerkenalkan, saya dari *Loka Kasir* — aplikasi kasir (POS) untuk UMKM: kelola produk, stok, dan laporan penjualan dengan mudah.\n\nBolehkah saya bagikan info & demo gratisnya? Terima kasih 🙏`

function openWhatsApp(prospect: Prospect) {
  const phone = (prospect.phone ?? '').replace(/\D/g, '')
  if (!phone) return
  const text = encodeURIComponent(waMessage(prospect.company || prospect.name))
  window.open(`https://wa.me/${phone}?text=${text}`, '_blank', 'noopener')
}

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

// Kategori usaha umum (kata kunci ramah Google Places) — untuk pilih cepat saat impor.
const BUSINESS_CATEGORIES: { emoji: string; label: string; q: string }[] = [
  { emoji: '☕', label: 'Kafe', q: 'kafe' },
  { emoji: '🍜', label: 'Rumah Makan', q: 'rumah makan' },
  { emoji: '🍱', label: 'Restoran', q: 'restoran' },
  { emoji: '🛒', label: 'Toko Kelontong', q: 'toko kelontong' },
  { emoji: '🏪', label: 'Minimarket', q: 'minimarket' },
  { emoji: '🥖', label: 'Toko Roti', q: 'toko roti' },
  { emoji: '🍰', label: 'Toko Kue', q: 'toko kue' },
  { emoji: '👕', label: 'Toko Baju', q: 'toko pakaian' },
  { emoji: '💈', label: 'Barbershop', q: 'barbershop' },
  { emoji: '💇', label: 'Salon', q: 'salon kecantikan' },
  { emoji: '🧺', label: 'Laundry', q: 'laundry' },
  { emoji: '💊', label: 'Apotek', q: 'apotek' },
  { emoji: '🔧', label: 'Bengkel', q: 'bengkel motor' },
  { emoji: '📱', label: 'Konter HP', q: 'konter hp' },
  { emoji: '🐠', label: 'Pet Shop', q: 'pet shop' },
  { emoji: '🌸', label: 'Toko Bunga', q: 'toko bunga' },
  { emoji: '🧊', label: 'Frozen Food', q: 'frozen food' },
  { emoji: '🏬', label: 'Toko Bangunan', q: 'toko bangunan' },
]

const COMMON_CITIES = [
  'Jakarta', 'Surabaya', 'Bandung', 'Medan', 'Semarang', 'Makassar',
  'Yogyakarta', 'Bekasi', 'Depok', 'Tangerang', 'Malang', 'Denpasar',
]

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
  const [importOpen, setImportOpen] = useState(false)

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

  const handleWhatsApp = async (row: Prospect) => {
    openWhatsApp(row)
    try {
      await markContacted(row.id)
    } catch { /* tetap lanjut walau gagal menandai */ }
    load()
  }

  const totalPages = Math.ceil(total / LIMIT)
  const selectedIds = [...selected]

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h2 className="text-2xl font-bold text-slate-900">Prospek Pelanggan</h2>
          <p className="text-sm text-slate-500 mt-0.5">Calon pengguna Loka Kasir — impor dari Google, hubungi via WhatsApp</p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setImportOpen(true)}
            className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-semibold rounded-xl"
          >
            🗺️ Impor dari Google
          </button>
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
        <div className="bg-white rounded-2xl border border-slate-200 py-20 px-6 text-center">
          <div className="text-4xl mb-3">🗺️</div>
          <h3 className="text-base font-semibold text-slate-800">Mulai cari calon pelanggan</h3>
          <p className="text-sm text-slate-500 mt-1 max-w-md mx-auto">
            Pilih jenis usaha (kafe, toko, laundry…) &amp; kota, lalu impor bisnis dari Google Maps. Tinggal klik <b>Chat WA</b> untuk promosikan aplikasi kasirmu.
          </p>
          <div className="flex items-center justify-center gap-2 mt-5">
            <button
              onClick={() => setImportOpen(true)}
              className="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-semibold rounded-xl"
            >
              🗺️ Impor dari Google
            </button>
            <button
              onClick={() => setFormModal('new')}
              className="px-5 py-2.5 border border-slate-200 text-slate-600 hover:bg-slate-50 text-sm font-medium rounded-xl"
            >
              + Tambah manual
            </button>
          </div>
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
                onWhatsApp={() => handleWhatsApp(row)}
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

      {importOpen && (
        <ImportGoogleModal
          onClose={() => setImportOpen(false)}
          onImported={() => { setImportOpen(false); setPage(1); load() }}
        />
      )}
    </div>
  )
}

function ProspectRow({
  row, checked, onToggle, onStatusChange, onEdit, onDelete, onSend, onWhatsApp,
}: {
  row: Prospect
  checked: boolean
  onToggle: () => void
  onStatusChange: (s: ProspectStatus) => void
  onEdit: () => void
  onDelete: () => void
  onSend: () => void
  onWhatsApp: () => void
}) {
  const cfg = STATUS_CONFIG[row.status] ?? STATUS_CONFIG.new
  return (
    <div className="bg-white rounded-2xl border border-slate-200 p-4">
      <div className="flex items-start gap-3">
        <input type="checkbox" checked={checked} onChange={onToggle} className="mt-1 w-4 h-4 accent-indigo-600" />
        <div className="flex-1 min-w-0 space-y-1">
          <div className="flex items-center gap-2 flex-wrap">
            <h4 className="text-sm font-semibold text-slate-800">{row.name}</h4>
            {row.business_type && <span className="text-xs bg-emerald-50 text-emerald-600 px-2 py-0.5 rounded-full border border-emerald-100">{row.business_type}</span>}
            {row.company && <span className="text-xs bg-slate-100 text-slate-500 px-2 py-0.5 rounded-full">🏢 {row.company}</span>}
            {typeof row.rating === 'number' && <span className="text-xs bg-amber-50 text-amber-600 px-2 py-0.5 rounded-full">⭐ {row.rating}</span>}
            {row.unsubscribed && <span className="text-xs bg-red-50 text-red-500 px-2 py-0.5 rounded-full border border-red-100">unsubscribed</span>}
          </div>
          <div className="flex items-center gap-3 flex-wrap text-xs text-slate-600">
            {row.phone && <span className="font-medium flex items-center gap-1 text-emerald-700">📱 {row.phone}</span>}
            {row.email && <span className="flex items-center gap-1">📧 {row.email}</span>}
            {row.website && <a href={row.website} target="_blank" rel="noopener" className="flex items-center gap-1 text-blue-500 hover:underline truncate max-w-[200px]">🌐 {row.website}</a>}
            {row.source && <span className="flex items-center gap-1">🔖 {row.source}</span>}
          </div>
          {row.address && <p className="text-xs text-slate-400 flex items-start gap-1">📍 {row.address}</p>}
          {row.notes && (
            <p className="text-xs text-slate-500 italic bg-amber-50 border border-amber-100 rounded-lg px-2 py-1">📝 {row.notes}</p>
          )}
          <div className="flex items-center gap-2 pt-0.5 text-xs text-slate-400 flex-wrap">
            <span>Dibuat {format(new Date(row.created_at), 'dd MMM yyyy', { locale: localeId })}</span>
            {row.last_contacted_at && (
              <span className="text-blue-400">· Dihubungi {format(new Date(row.last_contacted_at), 'dd MMM yyyy', { locale: localeId })}</span>
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
            <button onClick={onWhatsApp} disabled={!row.phone} title="Chat WhatsApp"
              className="p-2 bg-emerald-100 hover:bg-emerald-200 text-emerald-700 rounded-xl text-sm disabled:opacity-40">💬</button>
            <button onClick={onSend} disabled={row.unsubscribed || !row.email} title="Kirim email"
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

function ImportGoogleModal({ onClose, onImported }: { onClose: () => void; onImported: () => void }) {
  const [businessType, setBusinessType] = useState('')
  const [location, setLocation] = useState('')
  const [maxResults, setMaxResults] = useState(20)
  const [results, setResults] = useState<GooglePlaceResult[]>([])
  const [picked, setPicked] = useState<Set<string>>(new Set())
  const [searching, setSearching] = useState(false)
  const [importing, setImporting] = useState(false)
  const [error, setError] = useState('')
  const [info, setInfo] = useState('')

  const handleSearch = async () => {
    if (!businessType.trim() || !location.trim()) { setError('Jenis usaha & lokasi wajib diisi'); return }
    setSearching(true); setError(''); setInfo(''); setResults([]); setPicked(new Set())
    try {
      const data = await searchGooglePlaces(`${businessType.trim()} di ${location.trim()}`, maxResults)
      setResults(data)
      // Auto-pilih semua yang punya nomor (bisa di-WA).
      setPicked(new Set(data.filter((d) => d.phone).map((d) => d.place_id)))
      if (data.length === 0) setInfo('Tidak ada hasil. Coba kata kunci atau lokasi lain.')
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Gagal mencari di Google')
    } finally {
      setSearching(false)
    }
  }

  const toggle = (id: string) => setPicked((s) => {
    const next = new Set(s)
    if (next.has(id)) next.delete(id); else next.add(id)
    return next
  })

  const handleImport = async () => {
    const items = results.filter((r) => picked.has(r.place_id))
    if (items.length === 0) { setError('Pilih minimal satu bisnis'); return }
    setImporting(true); setError('')
    try {
      const r = await importGoogle({
        business_type: businessType,
        location,
        items: items.map((it) => ({
          place_id: it.place_id, name: it.name, address: it.address,
          phone: it.phone, website: it.website, rating: it.rating,
        })),
      })
      setInfo(`✅ Diimpor ${r.data.imported}, dilewati ${r.data.skipped} (sudah ada).`)
      setTimeout(onImported, 1000)
    } catch (e) {
      const err = e as { response?: { data?: { message?: string } } }
      setError(err.response?.data?.message ?? 'Gagal mengimpor')
    } finally {
      setImporting(false)
    }
  }

  const input = 'px-3 py-2.5 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500'
  const pickedCount = results.filter((r) => picked.has(r.place_id)).length

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div className="bg-white rounded-2xl w-full max-w-2xl shadow-xl flex flex-col max-h-[88vh]" onClick={(e) => e.stopPropagation()}>
        <div className="p-5 border-b border-slate-100">
          <h3 className="text-sm font-bold text-slate-800 mb-0.5">Cari Bisnis untuk Diprospek</h3>
          <p className="text-xs text-slate-500 mb-3">Pilih jenis usaha &amp; kota, klik Cari — daftar bisnis dari Google Maps langsung muncul, tinggal impor &amp; hubungi via WhatsApp.</p>

          {/* Langkah 1: jenis usaha (chip) */}
          <p className="text-[11px] font-semibold text-slate-500 uppercase tracking-wide mb-1.5">1. Jenis usaha</p>
          <div className="flex flex-wrap gap-1.5">
            {BUSINESS_CATEGORIES.map((c) => {
              const active = businessType.trim().toLowerCase() === c.q
              return (
                <button
                  key={c.q}
                  onClick={() => setBusinessType(c.q)}
                  className={`px-2.5 py-1.5 rounded-lg text-xs font-medium border transition ${
                    active ? 'bg-emerald-600 text-white border-emerald-600' : 'bg-white text-slate-700 border-slate-200 hover:border-emerald-300 hover:bg-emerald-50'
                  }`}
                >
                  {c.emoji} {c.label}
                </button>
              )
            })}
          </div>
          <input className={`${input} mt-2 w-full`} placeholder="…atau ketik jenis usaha sendiri" value={businessType} onChange={(e) => setBusinessType(e.target.value)} />

          {/* Langkah 2: kota (chip) */}
          <p className="text-[11px] font-semibold text-slate-500 uppercase tracking-wide mt-4 mb-1.5">2. Lokasi (kota)</p>
          <div className="flex flex-wrap gap-1.5">
            {COMMON_CITIES.map((city) => {
              const active = location.trim().toLowerCase() === city.toLowerCase()
              return (
                <button
                  key={city}
                  onClick={() => setLocation(city)}
                  className={`px-2.5 py-1.5 rounded-lg text-xs font-medium border transition ${
                    active ? 'bg-slate-800 text-white border-slate-800' : 'bg-white text-slate-700 border-slate-200 hover:border-slate-400 hover:bg-slate-50'
                  }`}
                >
                  {city}
                </button>
              )
            })}
          </div>
          <input className={`${input} mt-2 w-full`} placeholder="…atau ketik kota / area lain" value={location} onChange={(e) => setLocation(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && handleSearch()} />

          {/* Langkah 3: jumlah + cari */}
          <div className="flex gap-2 mt-4">
            <select className={input} value={maxResults} onChange={(e) => setMaxResults(Number(e.target.value))}>
              <option value={20}>20 hasil</option>
              <option value={40}>40 hasil</option>
              <option value={60}>60 hasil</option>
            </select>
            <button onClick={handleSearch} disabled={searching} className="flex-1 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-semibold rounded-xl disabled:opacity-50">
              {searching ? 'Mencari di Google…' : '🔍 Cari Bisnis'}
            </button>
          </div>
          {error && <p className="text-xs text-red-500 mt-2">{error}</p>}
          {info && <p className="text-xs text-slate-600 mt-2">{info}</p>}
        </div>

        <div className="flex-1 overflow-y-auto p-5 space-y-2">
          {results.length === 0 ? (
            <p className="text-sm text-slate-400 text-center py-10">{searching ? 'Memuat…' : 'Belum ada hasil pencarian.'}</p>
          ) : (
            results.map((r) => {
              const isChecked = picked.has(r.place_id)
              return (
                <label key={r.place_id} className="flex items-start gap-3 p-3 rounded-xl border border-slate-200 hover:bg-slate-50 cursor-pointer">
                  <input type="checkbox" checked={isChecked} onChange={() => toggle(r.place_id)} className="mt-1 w-4 h-4 accent-emerald-600" />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-sm font-semibold text-slate-800">{r.name}</span>
                      {typeof r.rating === 'number' && <span className="text-xs text-amber-600">⭐ {r.rating}</span>}
                      {!r.phone && <span className="text-xs text-red-400">tanpa nomor</span>}
                    </div>
                    {r.address && <p className="text-xs text-slate-500 mt-0.5">📍 {r.address}</p>}
                    <div className="flex gap-3 flex-wrap text-xs text-slate-500 mt-0.5">
                      {r.phone && <span className="text-emerald-700">📱 {r.phone}</span>}
                      {r.website && <span className="truncate max-w-[220px]">🌐 {r.website}</span>}
                    </div>
                  </div>
                </label>
              )
            })
          )}
        </div>

        <div className="p-5 border-t border-slate-100 flex gap-2 items-center">
          <span className="text-xs text-slate-500 mr-auto">{pickedCount} dipilih untuk diimpor</span>
          <button onClick={onClose} className="px-4 py-2.5 border border-slate-200 text-slate-600 hover:bg-slate-50 text-sm rounded-xl">Tutup</button>
          <button onClick={handleImport} disabled={importing || pickedCount === 0} className="px-4 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-semibold rounded-xl disabled:opacity-50">
            {importing ? 'Mengimpor…' : `Impor ${pickedCount} prospek`}
          </button>
        </div>
      </div>
    </div>
  )
}
