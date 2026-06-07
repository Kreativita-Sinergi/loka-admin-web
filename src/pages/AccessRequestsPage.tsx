import { useState, useEffect, useCallback } from 'react'
import { format } from 'date-fns'
import { id as localeId } from 'date-fns/locale'
import { buildWhatsAppUrl } from '../api/googlePlaces'
import {
  getRegistrationRequests,
  updateRegistrationRequest,
  deleteRegistrationRequest,
  type RegistrationRequest,
  type RegistrationRequestStatus,
} from '../api/registrationRequests'

const STATUS_CONFIG: Record<
  RegistrationRequestStatus,
  { label: string; color: string; bg: string; border: string }
> = {
  pending: { label: 'Pending', color: 'text-amber-700', bg: 'bg-amber-50', border: 'border-amber-200' },
  contacted: { label: 'Dihubungi', color: 'text-blue-700', bg: 'bg-blue-50', border: 'border-blue-200' },
  approved: { label: 'Disetujui', color: 'text-indigo-700', bg: 'bg-indigo-50', border: 'border-indigo-200' },
  registered: { label: 'Sudah Daftar', color: 'text-emerald-700', bg: 'bg-emerald-50', border: 'border-emerald-200' },
  rejected: { label: 'Ditolak', color: 'text-red-600', bg: 'bg-red-50', border: 'border-red-200' },
}

const FILTER_TABS: { value: string; label: string }[] = [
  { value: '', label: 'Semua' },
  { value: 'pending', label: 'Pending' },
  { value: 'contacted', label: 'Dihubungi' },
  { value: 'approved', label: 'Disetujui' },
  { value: 'registered', label: 'Sudah Daftar' },
  { value: 'rejected', label: 'Ditolak' },
]

const APP_LINK = 'https://play.google.com/store/apps/details?id=com.loka.kasir'

const waTemplate = (name: string) =>
  `Halo ${name}! 👋\n\nTerima kasih telah meminta akses ke *Loka Kasir* — aplikasi POS untuk memudahkan pengelolaan bisnis Anda.\n\nSilakan unduh aplikasinya di sini dan mulai *GRATIS*:\n🔗 ${APP_LINK}\n\nTim kami siap membantu proses setup Anda 😊\n\n_Tim Loka Kasir_`

const LIMIT = 20

export default function AccessRequestsPage() {
  const [rows, setRows] = useState<RegistrationRequest[]>([])
  const [total, setTotal] = useState(0)
  const [page, setPage] = useState(1)
  const [statusFilter, setStatusFilter] = useState('')
  const [search, setSearch] = useState('')
  const [searchInput, setSearchInput] = useState('')
  const [loading, setLoading] = useState(true)
  const [notesModal, setNotesModal] = useState<RegistrationRequest | null>(null)

  const load = useCallback(() => {
    setLoading(true)
    getRegistrationRequests({ page, limit: LIMIT, status: statusFilter, search })
      .then((r) => {
        setRows(r.data ?? [])
        setTotal(r.pagination.total)
      })
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [page, statusFilter, search])

  // eslint-disable-next-line react-hooks/set-state-in-effect
  useEffect(() => { load() }, [load])

  const handleStatusChange = async (row: RegistrationRequest, status: string) => {
    await updateRegistrationRequest(row.id, { status, notes: row.notes })
    load()
  }

  const handleSaveNotes = async (id: number, notes: string) => {
    const row = rows.find((r) => r.id === id)
    await updateRegistrationRequest(id, { status: row?.status, notes })
    setNotesModal(null)
    load()
  }

  const handleSendWa = (row: RegistrationRequest) => {
    if (!row.phone) return
    window.open(buildWhatsAppUrl(row.phone, waTemplate(row.name)), '_blank')
    if (row.status === 'pending') handleStatusChange(row, 'contacted')
  }

  const handleDelete = async (id: number) => {
    if (!confirm('Hapus permintaan akses ini?')) return
    await deleteRegistrationRequest(id)
    load()
  }

  const totalPages = Math.ceil(total / LIMIT)

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-slate-900">Permintaan Akses</h2>
          <p className="text-sm text-slate-500 mt-0.5">
            Calon pengguna yang mengisi form permintaan akses aplikasi
          </p>
        </div>
        <div className="px-4 py-2 bg-indigo-50 border border-indigo-200 rounded-full">
          <span className="text-sm font-bold text-indigo-700">{total} permintaan</span>
        </div>
      </div>

      {/* Filter tabs */}
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
            placeholder="Cari nama / telepon / bisnis..."
            className="px-3 py-2 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 w-56"
          />
          <button type="submit" className="px-3 py-2 bg-slate-100 hover:bg-slate-200 text-slate-600 text-sm font-medium rounded-xl">
            Cari
          </button>
        </form>
      </div>

      {loading ? (
        <div className="bg-white rounded-2xl border border-slate-200 py-20 text-center text-slate-400 text-sm">
          Memuat data...
        </div>
      ) : rows.length === 0 ? (
        <div className="bg-white rounded-2xl border border-slate-200 py-24 text-center">
          <p className="text-sm text-slate-400">Belum ada permintaan akses</p>
        </div>
      ) : (
        <>
          <div className="space-y-3">
            {rows.map((row) => (
              <RequestRow
                key={row.id}
                row={row}
                onStatusChange={(s) => handleStatusChange(row, s)}
                onSendWa={() => handleSendWa(row)}
                onEditNotes={() => setNotesModal(row)}
                onDelete={() => handleDelete(row.id)}
              />
            ))}
          </div>

          {totalPages > 1 && (
            <div className="flex items-center justify-between pt-2">
              <p className="text-xs text-slate-500">
                {(page - 1) * LIMIT + 1}–{Math.min(page * LIMIT, total)} dari {total} permintaan
              </p>
              <div className="flex gap-1.5">
                <button
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  disabled={page === 1}
                  className="px-3 py-1.5 text-xs border border-slate-200 rounded-xl disabled:opacity-40 hover:bg-slate-50"
                >← Sebelumnya</button>
                <button
                  onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                  disabled={page === totalPages}
                  className="px-3 py-1.5 text-xs border border-slate-200 rounded-xl disabled:opacity-40 hover:bg-slate-50"
                >Berikutnya →</button>
              </div>
            </div>
          )}
        </>
      )}

      {notesModal && (
        <NotesModal
          notes={notesModal.notes}
          onSave={(n) => handleSaveNotes(notesModal.id, n)}
          onClose={() => setNotesModal(null)}
        />
      )}
    </div>
  )
}

function RequestRow({
  row, onStatusChange, onSendWa, onEditNotes, onDelete,
}: {
  row: RegistrationRequest
  onStatusChange: (s: string) => void
  onSendWa: () => void
  onEditNotes: () => void
  onDelete: () => void
}) {
  const cfg = STATUS_CONFIG[row.status] ?? STATUS_CONFIG.pending
  return (
    <div className="bg-white rounded-2xl border border-slate-200 p-4">
      <div className="flex items-start gap-4">
        <div className="flex-1 min-w-0 space-y-1">
          <div className="flex items-center gap-2 flex-wrap">
            <h4 className="text-sm font-semibold text-slate-800">{row.name}</h4>
            {row.business_name && (
              <span className="text-xs bg-slate-100 text-slate-500 px-2 py-0.5 rounded-full">🏪 {row.business_name}</span>
            )}
          </div>
          <div className="flex items-center gap-3 flex-wrap text-xs text-slate-600">
            <span className="font-medium flex items-center gap-1">📱 {row.phone}</span>
            {row.city && <span className="flex items-center gap-1">📍 {row.city}</span>}
            {row.email && <span className="flex items-center gap-1">📧 {row.email}</span>}
          </div>
          {row.notes && (
            <p className="text-xs text-slate-500 italic bg-amber-50 border border-amber-100 rounded-lg px-2 py-1">
              📝 {row.notes}
            </p>
          )}
          <div className="flex items-center gap-2 pt-0.5 text-xs text-slate-400 flex-wrap">
            <span>Masuk {format(new Date(row.created_at), 'dd MMM yyyy, HH:mm', { locale: localeId })}</span>
            {row.contacted_at && (
              <span className="text-blue-400">· Dihubungi {format(new Date(row.contacted_at), 'dd MMM yyyy', { locale: localeId })}</span>
            )}
          </div>
        </div>

        <div className="shrink-0 flex flex-col items-end gap-2">
          <select
            value={row.status}
            onChange={(e) => onStatusChange(e.target.value)}
            className={`text-xs font-medium px-2.5 py-1.5 rounded-xl border cursor-pointer focus:outline-none focus:ring-2 focus:ring-indigo-500 ${cfg.bg} ${cfg.color} ${cfg.border}`}
          >
            {Object.entries(STATUS_CONFIG).map(([v, c]) => (
              <option key={v} value={v}>{c.label}</option>
            ))}
          </select>
          <div className="flex gap-1.5">
            <button onClick={onSendWa} disabled={!row.phone} title="Kirim WhatsApp"
              className="p-2 bg-emerald-100 hover:bg-emerald-200 text-emerald-700 rounded-xl text-sm disabled:opacity-40">💬</button>
            <button onClick={onEditNotes} title="Catatan"
              className="p-2 bg-amber-100 hover:bg-amber-200 text-amber-700 rounded-xl text-sm">📝</button>
            <button onClick={onDelete} title="Hapus"
              className="p-2 bg-red-100 hover:bg-red-200 text-red-600 rounded-xl text-sm">🗑️</button>
          </div>
        </div>
      </div>
    </div>
  )
}

function NotesModal({ notes, onSave, onClose }: { notes: string; onSave: (n: string) => void; onClose: () => void }) {
  const [value, setValue] = useState(notes)
  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div className="bg-white rounded-2xl w-full max-w-sm shadow-xl p-5" onClick={(e) => e.stopPropagation()}>
        <h3 className="text-sm font-bold text-slate-800 mb-3">Catatan Permintaan</h3>
        <textarea rows={4} placeholder="Tambahkan catatan..." value={value}
          onChange={(e) => setValue(e.target.value)}
          className="w-full px-3 py-2.5 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 resize-none mb-3"
          autoFocus />
        <div className="flex gap-2">
          <button onClick={() => onSave(value)} className="flex-1 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-semibold rounded-xl">Simpan</button>
          <button onClick={onClose} className="flex-1 py-2.5 border border-slate-200 text-slate-600 hover:bg-slate-50 text-sm rounded-xl">Batal</button>
        </div>
      </div>
    </div>
  )
}
