import { useState, useEffect, useCallback } from 'react'
import type { AxiosError } from 'axios'
import { searchPlaces, buildWhatsAppUrl, cleanPhoneNumber, type PlaceResult } from '../api/googlePlaces'
import {
  bulkSaveProspects, getProspects, updateProspect, deleteProspect, sendProspectMessage, directSend,
  startBulkSend, getBulkSendProgress,
  type ProspectLead, type BulkSendJob,
} from '../api/prospects'
import { format } from 'date-fns'
import { id as localeId } from 'date-fns/locale'

type ApiError = AxiosError<{ errors?: { message: string }[]; message?: string }>
const apiErrMsg = (err: unknown, fallback: string) => {
  const e = err as ApiError
  return e?.response?.data?.errors?.[0]?.message ?? e?.response?.data?.message ?? fallback
}

const BUSINESS_CATEGORIES = [
  'Restoran & Rumah Makan',
  'Warung Makan & Kedai',
  'Kafe & Coffee Shop',
  'Toko Sembako & Kelontong',
  'Minimarket & Swalayan',
  'Toko Pakaian & Fashion',
  'Toko Elektronik',
  'Apotek & Toko Kesehatan',
  'Salon & Barbershop',
  'Laundry',
  'Toko Bangunan & Material',
  'Bengkel & Otomotif',
]

const APP_LINK = 'https://play.google.com/store/apps/details?id=com.loka.kasir'

const WA_TEMPLATES = [
  {
    id: 'intro',
    label: 'Perkenalan Loka',
    icon: '👋',
    activeColor: 'bg-indigo-600 text-white border-indigo-600',
    message: (name: string) =>
      `Halo ${name}! 👋\n\nPerkenalkan, kami dari tim *Loka Kasir* — aplikasi POS (Point of Sale) untuk memudahkan pengelolaan bisnis Anda.\n\nDengan Loka Kasir, Anda bisa:\n✅ Kelola transaksi lebih cepat & mudah\n✅ Pantau stok produk secara real-time\n✅ Laporan penjualan otomatis\n✅ Kelola karyawan & shift\n✅ Tersedia di Android & iOS\n\nCocok untuk bisnis seperti milik Anda yang ingin lebih terorganisir dan efisien!\n\nTertarik untuk coba *GRATIS*? Balas pesan ini dan kami siap membantu 😊\n\n🔗 ${APP_LINK}\n\n_Tim Loka Kasir_`,
  },
  {
    id: 'promo',
    label: 'Promo Trial',
    icon: '🎉',
    activeColor: 'bg-orange-500 text-white border-orange-500',
    message: (name: string) =>
      `Halo ${name}! 🎉\n\nAda penawaran spesial dari *Loka Kasir* untuk bisnis Anda!\n\nDapatkan akses *TRIAL GRATIS 30 HARI* untuk semua fitur premium:\n⭐ Manajemen produk & stok unlimited\n⭐ Laporan keuangan & penjualan detail\n⭐ Multi-kasir tanpa batas\n⭐ Backup data otomatis ke cloud\n⭐ Support teknis prioritas\n\nTidak perlu kartu kredit. Tidak ada biaya tersembunyi!\n\n*Penawaran terbatas!* Hubungi kami sekarang untuk aktivasi.\n\n🔗 ${APP_LINK}\n\n_Tim Loka Kasir_`,
  },
  {
    id: 'followup',
    label: 'Follow Up',
    icon: '🔔',
    activeColor: 'bg-emerald-600 text-white border-emerald-600',
    message: (name: string) =>
      `Halo ${name}! 🔔\n\nKami dari *Loka Kasir* ingin menindaklanjuti obrolan kita sebelumnya.\n\nApakah Anda sudah sempat mencoba aplikasi kami? Kami siap membantu proses setup dan onboarding bisnis Anda.\n\nJangan ragu untuk menghubungi kami jika ada pertanyaan 😊\n\n🔗 ${APP_LINK}\n\n_Tim Loka Kasir_`,
  },
  {
    id: 'custom',
    label: 'Pesan Kustom',
    icon: '✏️',
    activeColor: 'bg-slate-700 text-white border-slate-700',
    message: () => '',
  },
]

type PageTab = 'search' | 'leads'

const STATUS_CONFIG = {
  new: { label: 'Baru', color: 'text-slate-600', bg: 'bg-slate-100', border: 'border-slate-200' },
  contacted: { label: 'Sudah Dihubungi', color: 'text-blue-700', bg: 'bg-blue-50', border: 'border-blue-200' },
  interested: { label: 'Tertarik', color: 'text-emerald-700', bg: 'bg-emerald-50', border: 'border-emerald-200' },
  not_interested: { label: 'Tidak Tertarik', color: 'text-red-600', bg: 'bg-red-50', border: 'border-red-200' },
} as const

export default function LeadsPage() {
  const [tab, setTab] = useState<PageTab>('search')
  const [stats, setStats] = useState({ total: 0, interested: 0 })

  const refreshStats = useCallback(() => {
    getProspects({ limit: 1 }).then((r) => {
      setStats((s) => ({ ...s, total: r.pagination.total }))
    }).catch(() => {})
    getProspects({ limit: 1, status: 'interested' }).then((r) => {
      setStats((s) => ({ ...s, interested: r.pagination.total }))
    }).catch(() => {})
  }, [])

  useEffect(() => { refreshStats() }, [refreshStats])

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-slate-800">Prospek Pelanggan</h2>
          <p className="text-sm text-slate-500 mt-0.5">
            Temukan calon pengguna Loka Kasir via Google &amp; kirim pesan WhatsApp
          </p>
        </div>
        <div className="flex gap-3">
          <div className="text-center px-4 py-2 bg-indigo-50 border border-indigo-200 rounded-xl">
            <p className="text-lg font-bold text-indigo-700">{stats.total}</p>
            <p className="text-xs text-indigo-600">Total Prospek</p>
          </div>
          <div className="text-center px-4 py-2 bg-emerald-50 border border-emerald-200 rounded-xl">
            <p className="text-lg font-bold text-emerald-700">{stats.interested}</p>
            <p className="text-xs text-emerald-600">Tertarik</p>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-2xl border border-slate-200 p-1.5 flex gap-1.5 max-w-sm">
        <TabBtn active={tab === 'search'} onClick={() => setTab('search')}>🔍 Cari Prospek</TabBtn>
        <TabBtn active={tab === 'leads'} onClick={() => setTab('leads')}>📋 Daftar Prospek</TabBtn>
      </div>

      {tab === 'search'
        ? <SearchTab onSaved={refreshStats} />
        : <LeadsTab onChanged={refreshStats} />}
    </div>
  )
}

function TabBtn({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      onClick={onClick}
      className={`flex-1 py-2.5 rounded-xl text-sm font-medium transition-all flex items-center justify-center gap-1 ${
        active ? 'bg-indigo-600 text-white shadow-sm' : 'text-slate-500 hover:text-slate-700 hover:bg-slate-50'
      }`}
    >
      {children}
    </button>
  )
}

function SearchTab({ onSaved }: { onSaved: () => void }) {
  const [keyword, setKeyword] = useState('')
  const [location, setLocation] = useState('')
  const [selectedCategory, setSelectedCategory] = useState('')
  const [results, setResults] = useState<PlaceResult[]>([])
  const [searching, setSearching] = useState(false)
  const [saving, setSaving] = useState(false)
  const [savedCount, setSavedCount] = useState<number | null>(null)
  const [searched, setSearched] = useState(false)
  const [error, setError] = useState('')
  const [waModal, setWaModal] = useState<PlaceResult | null>(null)
  const [emailModal, setEmailModal] = useState<PlaceResult | null>(null)
  const [blastModal, setBlastModal] = useState(false)
  const [blastJob, setBlastJob] = useState<{ jobId: string; total: number } | null>(null)

  const handleSearch = async () => {
    const query = selectedCategory || keyword.trim()
    if (!query) { setError('Masukkan kata kunci atau pilih kategori bisnis'); return }
    setError('')
    setSearching(true)
    setSearched(false)
    setSavedCount(null)
    try {
      const places = await searchPlaces(query, location)
      setResults(places)
      setSearched(true)

      if (places.length > 0) {
        setSaving(true)
        const leads = places.map((p) => ({
          name: p.displayName.text,
          address: p.formattedAddress,
          phone: p.internationalPhoneNumber || p.nationalPhoneNumber || '',
          phone_clean: p.internationalPhoneNumber
            ? cleanPhoneNumber(p.internationalPhoneNumber)
            : p.nationalPhoneNumber ? cleanPhoneNumber(p.nationalPhoneNumber) : '',
          category: p.primaryTypeDisplayName?.text || '',
          rating: p.rating,
          rating_count: p.userRatingCount,
          website: p.websiteUri || '',
          google_place_id: p.id,
        }))
        try {
          const res = await bulkSaveProspects(leads)
          setSavedCount(res.data.saved)
          onSaved()
        } catch {
          // non-fatal: data tetap tampil di UI
        } finally {
          setSaving(false)
        }
      }
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Gagal mengambil data dari Google')
    } finally {
      setSearching(false)
    }
  }

  return (
    <div className="space-y-4">
      <div className="bg-white rounded-2xl border border-slate-200 p-5 space-y-4">
        <div className="flex items-center gap-2">
          <span className="w-6 h-6 bg-indigo-100 text-indigo-600 rounded-full flex items-center justify-center text-xs font-bold">1</span>
          <h3 className="text-sm font-semibold text-slate-700">Cari Calon Customer via Google</h3>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <div>
            <label className="text-xs text-slate-500 font-medium mb-1 block">Kategori Bisnis</label>
            <select
              value={selectedCategory}
              onChange={(e) => { setSelectedCategory(e.target.value); if (e.target.value) setKeyword('') }}
              className="w-full px-3 py-2.5 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white"
            >
              <option value="">— Pilih kategori —</option>
              {BUSINESS_CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
            </select>
          </div>
          <div>
            <label className="text-xs text-slate-500 font-medium mb-1 block">Kata Kunci</label>
            <input
              value={keyword}
              onChange={(e) => { setKeyword(e.target.value); if (e.target.value) setSelectedCategory('') }}
              placeholder="cth: warung makan, salon"
              className="w-full px-3 py-2.5 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>
          <div>
            <label className="text-xs text-slate-500 font-medium mb-1 block">Kota / Lokasi</label>
            <input
              value={location}
              onChange={(e) => setLocation(e.target.value)}
              placeholder="cth: Jakarta, Bandung"
              className="w-full px-3 py-2.5 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>
        </div>

        {error && (
          <div className="flex items-center gap-2 bg-red-50 border border-red-200 rounded-xl px-4 py-3">
            <span>❌</span><p className="text-sm text-red-700">{error}</p>
          </div>
        )}

        <button
          onClick={handleSearch}
          disabled={searching || saving}
          className="w-full py-3 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed text-white font-semibold rounded-xl text-sm transition-colors flex items-center justify-center gap-2"
        >
          {searching ? (
            <><span className="animate-spin">⏳</span> Mencari di Google...</>
          ) : saving ? (
            <><span className="animate-spin">💾</span> Menyimpan ke database...</>
          ) : (
            <><span>🔍</span> Cari &amp; Simpan Prospek</>
          )}
        </button>
      </div>

      {searched && (
        <div>
          <div className="flex items-center justify-between mb-3">
            <p className="text-sm font-semibold text-slate-700">
              {results.length > 0 ? `${results.length} bisnis ditemukan` : 'Tidak ada hasil'}
            </p>
            <div className="flex items-center gap-2">
              {savedCount !== null && (
                <span className="text-xs bg-emerald-100 text-emerald-700 border border-emerald-200 px-3 py-1 rounded-full font-medium">
                  ✓ {savedCount} disimpan ke database
                </span>
              )}
              {results.length > 0 && (
                <button
                  onClick={() => setBlastModal(true)}
                  className="flex items-center gap-1.5 px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold rounded-xl transition-colors"
                >
                  🚀 Blast ke {results.length} Hasil
                </button>
              )}
            </div>
          </div>

          {results.length === 0 ? (
            <div className="bg-white rounded-2xl border border-slate-200 py-16 text-center">
              <p className="text-4xl mb-3">🔍</p>
              <p className="text-sm text-slate-500">Tidak ada bisnis ditemukan. Coba ubah kata kunci atau lokasi.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-4">
              {results.map((place) => (
                <PlaceCard
                  key={place.id}
                  place={place}
                  onSendWa={() => setWaModal(place)}
                  onSendEmail={() => setEmailModal(place)}
                />
              ))}
            </div>
          )}
        </div>
      )}

      {waModal && <WaPlaceModal place={waModal} onClose={() => setWaModal(null)} />}
      {emailModal && <EmailPlaceModal place={emailModal} onClose={() => setEmailModal(null)} />}
      {blastModal && (
        <BulkBlastModal
          defaultOnlyNew={true}
          onClose={() => setBlastModal(false)}
          onStarted={(jobId, total) => { setBlastModal(false); setBlastJob({ jobId, total }) }}
        />
      )}
      {blastJob && (
        <BulkProgressModal
          jobId={blastJob.jobId}
          total={blastJob.total}
          onClose={() => setBlastJob(null)}
        />
      )}
    </div>
  )
}

function PlaceCard({
  place,
  onSendWa,
  onSendEmail,
}: {
  place: PlaceResult
  onSendWa: () => void
  onSendEmail: () => void
}) {
  const hasPhone = !!(place.internationalPhoneNumber || place.nationalPhoneNumber)
  return (
    <div className="bg-white rounded-2xl border border-slate-200 p-4 flex flex-col gap-3 hover:border-indigo-300 transition-colors">
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <h4 className="text-sm font-semibold text-slate-800 truncate">{place.displayName.text}</h4>
          {place.primaryTypeDisplayName && (
            <span className="inline-block text-xs bg-indigo-50 text-indigo-600 px-2 py-0.5 rounded-full mt-1">
              {place.primaryTypeDisplayName.text}
            </span>
          )}
        </div>
        {place.rating && (
          <div className="shrink-0 text-xs text-amber-600 font-medium bg-amber-50 px-2 py-1 rounded-lg">
            ⭐ {place.rating.toFixed(1)}
          </div>
        )}
      </div>

      <div className="space-y-1">
        <p className="text-xs text-slate-500 flex items-start gap-1">
          <span>📍</span><span>{place.formattedAddress}</span>
        </p>
        {hasPhone ? (
          <p className="text-xs text-slate-700 font-medium flex items-center gap-1">
            <span>📞</span>{place.internationalPhoneNumber || place.nationalPhoneNumber}
          </p>
        ) : (
          <p className="text-xs text-slate-400 italic flex items-center gap-1"><span>📞</span> Nomor tidak tersedia</p>
        )}
      </div>

      {/* Dua tombol: WA (buka modal template) + Email (input manual) */}
      <div className="flex gap-2">
        <button
          onClick={onSendWa}
          disabled={!hasPhone}
          title="Pilih template lalu kirim via WhatsApp Browser atau Server"
          className="flex-1 py-2 bg-emerald-500 hover:bg-emerald-600 disabled:opacity-40 disabled:cursor-not-allowed text-white text-xs font-semibold rounded-xl transition-colors flex items-center justify-center gap-1.5"
        >
          <span>💬</span> WhatsApp
        </button>
        <button
          onClick={onSendEmail}
          title="Masukkan email lalu kirim pesan via server"
          className="flex-1 py-2 bg-indigo-500 hover:bg-indigo-600 text-white text-xs font-semibold rounded-xl transition-colors flex items-center justify-center gap-1.5"
        >
          <span>📧</span> Email
        </button>
      </div>
    </div>
  )
}

function LeadsTab({ onChanged }: { onChanged: () => void }) {
  const [leads, setLeads] = useState<ProspectLead[]>([])
  const [total, setTotal] = useState(0)
  const [page, setPage] = useState(1)
  const [statusFilter, setStatusFilter] = useState('')
  const [search, setSearch] = useState('')
  const [searchInput, setSearchInput] = useState('')
  const [loading, setLoading] = useState(true)
  const [waModal, setWaModal] = useState<ProspectLead | null>(null)
  const [notesModal, setNotesModal] = useState<ProspectLead | null>(null)
  const [blastModal, setBlastModal] = useState(false)
  const [blastJob, setBlastJob] = useState<{ jobId: string; total: number } | null>(null)
  const LIMIT = 20

  const load = useCallback(() => {
    setLoading(true)
    getProspects({ page, limit: LIMIT, status: statusFilter, search })
      .then((r) => { setLeads(r.data ?? []); setTotal(r.pagination.total) })
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [page, statusFilter, search])

  // eslint-disable-next-line react-hooks/set-state-in-effect
  useEffect(() => { load() }, [load])

  const handleStatusChange = async (lead: ProspectLead, status: string) => {
    const patch: Record<string, string> = { status }
    if (status === 'contacted' && !lead.contacted_at) patch.contacted_at = new Date().toISOString()
    await updateProspect(lead.id, patch)
    load(); onChanged()
  }

  const handleDelete = async (id: number) => {
    await deleteProspect(id)
    load(); onChanged()
  }

  const handleSaveNotes = async (id: number, notes: string) => {
    await updateProspect(id, { notes })
    setNotesModal(null)
    load()
  }

  const totalPages = Math.ceil(total / LIMIT)

  return (
    <div className="space-y-4">
      {/* Filter bar */}
      <div className="flex flex-wrap gap-2 items-center">
        <div className="flex gap-1.5 flex-wrap">
          {[
            { value: '', label: `Semua (${total})` },
            ...Object.entries(STATUS_CONFIG).map(([v, c]) => ({ value: v, label: c.label })),
          ].map((opt) => (
            <button
              key={opt.value}
              onClick={() => { setStatusFilter(opt.value); setPage(1) }}
              className={`px-3 py-1.5 rounded-xl text-xs font-medium border transition-all ${
                statusFilter === opt.value
                  ? 'bg-indigo-600 text-white border-indigo-600'
                  : 'border-slate-200 text-slate-600 hover:bg-slate-50'
              }`}
            >
              {opt.label}
            </button>
          ))}
        </div>
        <div className="flex gap-2 ml-auto">
          {total > 0 && (
            <button
              onClick={() => setBlastModal(true)}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold rounded-xl transition-colors"
            >
              🚀 Kirim Massal
            </button>
          )}
          <form
            onSubmit={(e) => { e.preventDefault(); setSearch(searchInput); setPage(1) }}
            className="flex gap-2"
          >
            <input
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              placeholder="Cari nama / telepon..."
              className="px-3 py-1.5 border border-slate-200 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-indigo-500 w-48"
            />
            <button type="submit" className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-600 text-xs font-medium rounded-xl">
              Cari
            </button>
          </form>
        </div>
      </div>

      {loading ? (
        <div className="bg-white rounded-2xl border border-slate-200 py-16 text-center text-slate-400 text-sm">
          Memuat data...
        </div>
      ) : leads.length === 0 ? (
        <div className="bg-white rounded-2xl border border-slate-200 py-20 text-center">
          <p className="text-4xl mb-3">📋</p>
          <p className="text-sm font-semibold text-slate-600">Belum ada prospek</p>
          <p className="text-xs text-slate-400 mt-1">Cari prospek di tab "Cari Prospek" dan hasil pencarian akan otomatis tersimpan</p>
        </div>
      ) : (
        <>
          <div className="space-y-3">
            {leads.map((lead) => (
              <LeadRow
                key={lead.id}
                lead={lead}
                onSendWa={() => setWaModal(lead)}
                onStatusChange={(s) => handleStatusChange(lead, s)}
                onDelete={() => handleDelete(lead.id)}
                onEditNotes={() => setNotesModal(lead)}
              />
            ))}
          </div>

          {totalPages > 1 && (
            <div className="flex items-center justify-between pt-2">
              <p className="text-xs text-slate-500">
                {(page - 1) * LIMIT + 1}–{Math.min(page * LIMIT, total)} dari {total} prospek
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

      {waModal && <WaLeadModal lead={waModal} onClose={() => { setWaModal(null); load() }} />}
      {notesModal && (
        <NotesModal
          notes={notesModal.notes}
          onSave={(n) => handleSaveNotes(notesModal.id, n)}
          onClose={() => setNotesModal(null)}
        />
      )}
      {blastModal && (
        <BulkBlastModal
          defaultOnlyNew={true}
          onClose={() => setBlastModal(false)}
          onStarted={(jobId, total) => { setBlastModal(false); setBlastJob({ jobId, total }) }}
        />
      )}
      {blastJob && (
        <BulkProgressModal
          jobId={blastJob.jobId}
          total={blastJob.total}
          onClose={() => { setBlastJob(null); load(); onChanged() }}
        />
      )}
    </div>
  )
}

function LeadRow({
  lead, onSendWa, onStatusChange, onDelete, onEditNotes,
}: {
  lead: ProspectLead
  onSendWa: () => void
  onStatusChange: (s: string) => void
  onDelete: () => void
  onEditNotes: () => void
}) {
  const cfg = STATUS_CONFIG[lead.status] ?? STATUS_CONFIG.new
  return (
    <div className="bg-white rounded-2xl border border-slate-200 p-4">
      <div className="flex items-start gap-4">
        <div className="flex-1 min-w-0 space-y-1">
          <div className="flex items-center gap-2 flex-wrap">
            <h4 className="text-sm font-semibold text-slate-800">{lead.name}</h4>
            {lead.category && <span className="text-xs bg-slate-100 text-slate-500 px-2 py-0.5 rounded-full">{lead.category}</span>}
            {lead.rating && <span className="text-xs text-amber-600">⭐ {lead.rating.toFixed(1)}</span>}
          </div>
          {lead.address && <p className="text-xs text-slate-500 flex items-start gap-1"><span>📍</span>{lead.address}</p>}
          {lead.phone && <p className="text-xs text-slate-700 font-medium flex items-center gap-1"><span>📞</span>{lead.phone}</p>}
          {lead.notes && (
            <p className="text-xs text-slate-500 italic bg-amber-50 border border-amber-100 rounded-lg px-2 py-1">
              📝 {lead.notes}
            </p>
          )}
          <div className="flex items-center gap-2 pt-0.5 text-xs text-slate-400 flex-wrap">
            <span>Disimpan {format(new Date(lead.created_at), 'dd MMM yyyy', { locale: localeId })}</span>
            {lead.contacted_at && (
              <span className="text-blue-400">· Dihubungi {format(new Date(lead.contacted_at), 'dd MMM yyyy', { locale: localeId })}</span>
            )}
          </div>
        </div>

        <div className="shrink-0 flex flex-col items-end gap-2">
          <select
            value={lead.status}
            onChange={(e) => onStatusChange(e.target.value)}
            className={`text-xs font-medium px-2.5 py-1.5 rounded-xl border cursor-pointer focus:outline-none focus:ring-2 focus:ring-indigo-500 ${cfg.bg} ${cfg.color} ${cfg.border}`}
          >
            {Object.entries(STATUS_CONFIG).map(([v, c]) => (
              <option key={v} value={v}>{c.label}</option>
            ))}
          </select>
          <div className="flex gap-1.5">
            <button onClick={onSendWa} disabled={!lead.phone} title="Kirim WhatsApp"
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

function WaPlaceModal({ place, onClose }: { place: PlaceResult; onClose: () => void }) {
  const [sendMode, setSendMode] = useState<'browser' | 'server'>('browser')
  const [templateId, setTemplateId] = useState('intro')
  const [customMessage, setCustomMessage] = useState('')
  const [sending, setSending] = useState(false)
  const [result, setResult] = useState<{ ok: boolean; msg: string } | null>(null)

  const phone = place.internationalPhoneNumber || place.nationalPhoneNumber || ''
  const phoneClean = phone ? cleanPhoneNumber(phone) : ''
  const selectedTemplate = WA_TEMPLATES.find((t) => t.id === templateId)!
  const preview = templateId === 'custom' ? customMessage : selectedTemplate.message(place.displayName.text)

  const handleBrowserSend = () => {
    if (!preview.trim() || !phone) return
    window.open(buildWhatsAppUrl(phone, preview), '_blank')
    onClose()
  }

  const handleServerSend = async () => {
    if (!preview.trim() || !phoneClean) return
    setSending(true)
    setResult(null)
    try {
      await directSend({ channel: 'whatsapp', target: phoneClean, message: preview })
      setResult({ ok: true, msg: 'Pesan berhasil dikirim via server!' })
    } catch (err: unknown) {
      setResult({ ok: false, msg: apiErrMsg(err, 'Gagal mengirim') })
    } finally {
      setSending(false)
    }
  }

  return (
    <WaModalShell title="Kirim WhatsApp" subtitle={`${place.displayName.text} · ${phone || 'Nomor tidak tersedia'}`} onClose={onClose}>
      {/* Mode toggle */}
      <div className="bg-slate-100 rounded-xl p-1 flex gap-1">
        <button
          onClick={() => setSendMode('browser')}
          className={`flex-1 py-2 rounded-lg text-xs font-medium transition-all ${sendMode === 'browser' ? 'bg-white shadow-sm text-slate-800' : 'text-slate-500'}`}
        >
          💬 Buka WA Browser
        </button>
        <button
          onClick={() => setSendMode('server')}
          className={`flex-1 py-2 rounded-lg text-xs font-medium transition-all ${sendMode === 'server' ? 'bg-white shadow-sm text-slate-800' : 'text-slate-500'}`}
        >
          🖥️ Kirim via Server
        </button>
      </div>

      <WaTemplateSelector templateId={templateId} setTemplateId={setTemplateId} />
      {templateId === 'custom' && (
        <textarea rows={5} placeholder="Tulis pesan kustom..." value={customMessage}
          onChange={(e) => setCustomMessage(e.target.value)}
          className="w-full px-3 py-2.5 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 resize-none" />
      )}
      <WaPreview preview={preview} />

      {result && (
        <div className={`text-xs px-3 py-2 rounded-xl ${result.ok ? 'bg-emerald-50 text-emerald-700' : 'bg-red-50 text-red-600'}`}>
          {result.ok ? '✓ ' : '✗ '}{result.msg}
        </div>
      )}

      {sendMode === 'browser' ? (
        <button onClick={handleBrowserSend} disabled={!preview.trim() || !phone}
          className="w-full py-3 bg-emerald-500 hover:bg-emerald-600 disabled:opacity-50 disabled:cursor-not-allowed text-white font-semibold rounded-xl text-sm flex items-center justify-center gap-2">
          <span>💬</span> Buka WhatsApp &amp; Kirim
        </button>
      ) : (
        <>
          <button onClick={handleServerSend} disabled={sending || !preview.trim() || !phoneClean}
            className="w-full py-3 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed text-white font-semibold rounded-xl text-sm flex items-center justify-center gap-2">
            {sending ? 'Mengirim...' : <><span>🖥️</span> Kirim via Server (Pool Nomor)</>}
          </button>
          <p className="text-xs text-slate-400 text-center">Dikirim otomatis dari pool nomor WA — tanpa buka browser</p>
        </>
      )}
    </WaModalShell>
  )
}

const EMAIL_TEMPLATES = [
  {
    id: 'intro',
    label: 'Perkenalan',
    message: (name: string) =>
      `Halo ${name},\n\nPerkenalkan, kami dari tim Loka Kasir — aplikasi POS (Point of Sale) untuk memudahkan pengelolaan bisnis Anda.\n\nDengan Loka Kasir, Anda bisa:\n• Kelola transaksi lebih cepat & mudah\n• Pantau stok produk secara real-time\n• Laporan penjualan otomatis\n• Kelola karyawan & shift\n\nTertarik untuk coba GRATIS? Balas email ini dan kami siap membantu.\n\nhttps://play.google.com/store/apps/details?id=com.loka.kasir\n\nSalam,\nTim Loka Kasir`,
  },
  {
    id: 'promo',
    label: 'Promo Trial',
    message: (name: string) =>
      `Halo ${name},\n\nAda penawaran spesial dari Loka Kasir untuk bisnis Anda!\n\nDapatkan akses TRIAL GRATIS untuk semua fitur premium:\n• Manajemen produk & stok\n• Laporan keuangan detail\n• Multi-kasir\n• Backup data otomatis ke cloud\n\nTidak perlu kartu kredit. Tidak ada biaya tersembunyi!\n\nHubungi kami sekarang untuk aktivasi.\n\nhttps://play.google.com/store/apps/details?id=com.loka.kasir\n\nSalam,\nTim Loka Kasir`,
  },
  {
    id: 'custom',
    label: 'Pesan Kustom',
    message: () => '',
  },
]

function EmailPlaceModal({ place, onClose }: { place: PlaceResult; onClose: () => void }) {
  const [email, setEmail] = useState('')
  const [templateId, setTemplateId] = useState('intro')
  const [customMessage, setCustomMessage] = useState('')
  const [sending, setSending] = useState(false)
  const [result, setResult] = useState<{ ok: boolean; msg: string } | null>(null)

  const selectedTemplate = EMAIL_TEMPLATES.find((t) => t.id === templateId)!
  const preview = templateId === 'custom' ? customMessage : selectedTemplate.message(place.displayName.text)

  const handleSend = async () => {
    if (!email.trim() || !preview.trim()) return
    setSending(true)
    setResult(null)
    try {
      await directSend({ channel: 'email', target: email.trim(), message: preview })
      setResult({ ok: true, msg: `Email berhasil dikirim ke ${email.trim()}` })
    } catch (err: unknown) {
      setResult({ ok: false, msg: apiErrMsg(err, 'Gagal mengirim email') })
    } finally {
      setSending(false)
    }
  }

  return (
    <WaModalShell title="Kirim Email" subtitle={place.displayName.text} onClose={onClose}>
      <div>
        <label className="block text-xs font-medium text-slate-600 mb-1">Alamat Email Bisnis</label>
        <input
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="contoh@bisnis.com"
          className="w-full px-3 py-2 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
          autoFocus
        />
        <p className="text-xs text-slate-400 mt-1">Google Maps tidak menyediakan email — masukkan manual jika Anda memilikinya</p>
      </div>

      {/* Template selector */}
      <div className="grid grid-cols-3 gap-2">
        {EMAIL_TEMPLATES.map((t) => (
          <button
            key={t.id}
            onClick={() => setTemplateId(t.id)}
            className={`py-2 rounded-xl border text-xs font-medium transition-all ${
              templateId === t.id
                ? 'bg-indigo-600 text-white border-indigo-600'
                : 'border-slate-200 text-slate-600 hover:bg-slate-50'
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {templateId === 'custom' && (
        <textarea
          rows={5}
          placeholder="Tulis pesan email kustom..."
          value={customMessage}
          onChange={(e) => setCustomMessage(e.target.value)}
          className="w-full px-3 py-2.5 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 resize-none"
        />
      )}

      {/* Preview */}
      <div className="bg-slate-50 border border-slate-200 rounded-xl p-3 max-h-40 overflow-y-auto">
        <p className="text-xs text-slate-400 mb-1.5 font-medium">Preview email:</p>
        <p className="text-xs text-slate-700 whitespace-pre-wrap leading-relaxed">
          {preview || <span className="italic text-slate-400">Pilih template...</span>}
        </p>
      </div>

      {result && (
        <div className={`text-xs px-3 py-2 rounded-xl ${result.ok ? 'bg-emerald-50 text-emerald-700' : 'bg-red-50 text-red-600'}`}>
          {result.ok ? '✓ ' : '✗ '}{result.msg}
        </div>
      )}

      <button
        onClick={handleSend}
        disabled={sending || !email.trim() || !preview.trim()}
        className="w-full py-3 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed text-white font-semibold rounded-xl text-sm flex items-center justify-center gap-2"
      >
        {sending ? 'Mengirim...' : <><span>📧</span> Kirim Email</>}
      </button>
    </WaModalShell>
  )
}

function WaLeadModal({ lead, onClose }: { lead: ProspectLead; onClose: () => void }) {
  const [sendMode, setSendMode] = useState<'browser' | 'server'>('browser')
  const [channel, setChannel] = useState<'whatsapp' | 'email'>('whatsapp')
  const [templateId, setTemplateId] = useState('intro')
  const [customMessage, setCustomMessage] = useState('')
  const [sending, setSending] = useState(false)
  const [result, setResult] = useState<{ ok: boolean; msg: string } | null>(null)

  const selectedTemplate = WA_TEMPLATES.find((t) => t.id === templateId)!
  const preview = templateId === 'custom' ? customMessage : selectedTemplate.message(lead.name)

  const handleBrowserSend = async () => {
    if (!preview.trim() || !lead.phone) return
    window.open(buildWhatsAppUrl(lead.phone, preview), '_blank')
    await updateProspect(lead.id, { status: 'contacted', contacted_at: new Date().toISOString() })
    onClose()
  }

  const handleServerSend = async () => {
    if (!preview.trim()) return
    if (channel === 'whatsapp' && !lead.phone_clean) { setResult({ ok: false, msg: 'Nomor HP tidak tersedia' }); return }
    if (channel === 'email' && !lead.email) { setResult({ ok: false, msg: 'Email tidak tersedia untuk prospek ini' }); return }
    setSending(true)
    setResult(null)
    try {
      await sendProspectMessage(lead.id, { channel, message: preview })
      setResult({ ok: true, msg: 'Pesan berhasil dikirim via server!' })
    } catch (err: unknown) {
      setResult({ ok: false, msg: apiErrMsg(err, 'Gagal mengirim') })
    } finally {
      setSending(false)
    }
  }

  return (
    <WaModalShell title="Kirim Pesan ke Prospek" subtitle={`${lead.name} · ${lead.phone || '—'}`} onClose={onClose}>
      {/* Mode toggle */}
      <div className="bg-slate-100 rounded-xl p-1 flex gap-1">
        <button
          onClick={() => setSendMode('browser')}
          className={`flex-1 py-2 rounded-lg text-xs font-medium transition-all ${sendMode === 'browser' ? 'bg-white shadow-sm text-slate-800' : 'text-slate-500'}`}
        >
          💬 Buka WA Browser
        </button>
        <button
          onClick={() => setSendMode('server')}
          className={`flex-1 py-2 rounded-lg text-xs font-medium transition-all ${sendMode === 'server' ? 'bg-white shadow-sm text-slate-800' : 'text-slate-500'}`}
        >
          🖥️ Kirim via Server
        </button>
      </div>

      {sendMode === 'server' && (
        <div className="flex gap-2">
          <button
            onClick={() => setChannel('whatsapp')}
            className={`flex-1 py-2 rounded-xl border text-xs font-medium transition-all ${channel === 'whatsapp' ? 'bg-emerald-600 text-white border-emerald-600' : 'border-slate-200 text-slate-600 hover:bg-slate-50'}`}
          >
            📱 WhatsApp
          </button>
          <button
            onClick={() => setChannel('email')}
            disabled={!lead.email}
            className={`flex-1 py-2 rounded-xl border text-xs font-medium transition-all disabled:opacity-40 disabled:cursor-not-allowed ${channel === 'email' ? 'bg-indigo-600 text-white border-indigo-600' : 'border-slate-200 text-slate-600 hover:bg-slate-50'}`}
          >
            📧 Email {!lead.email && '(tidak ada)'}
          </button>
        </div>
      )}

      <WaTemplateSelector templateId={templateId} setTemplateId={setTemplateId} />
      {templateId === 'custom' && (
        <textarea rows={5} placeholder="Tulis pesan kustom..." value={customMessage}
          onChange={(e) => setCustomMessage(e.target.value)}
          className="w-full px-3 py-2.5 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 resize-none" />
      )}
      <WaPreview preview={preview} />

      {result && (
        <div className={`text-xs px-3 py-2 rounded-xl ${result.ok ? 'bg-emerald-50 text-emerald-700' : 'bg-red-50 text-red-600'}`}>
          {result.ok ? '✓ ' : '✗ '}{result.msg}
        </div>
      )}

      {sendMode === 'browser' ? (
        <>
          <button onClick={handleBrowserSend} disabled={!preview.trim() || !lead.phone}
            className="w-full py-3 bg-emerald-500 hover:bg-emerald-600 disabled:opacity-50 disabled:cursor-not-allowed text-white font-semibold rounded-xl text-sm flex items-center justify-center gap-2">
            <span>💬</span> Buka WhatsApp &amp; Kirim
          </button>
          <p className="text-xs text-slate-400 text-center">Status prospek otomatis diperbarui menjadi "Sudah Dihubungi"</p>
        </>
      ) : (
        <>
          <button onClick={handleServerSend} disabled={sending || !preview.trim()}
            className="w-full py-3 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed text-white font-semibold rounded-xl text-sm flex items-center justify-center gap-2">
            {sending ? 'Mengirim...' : <><span>🖥️</span> Kirim via Server (Pool Nomor)</>}
          </button>
          <p className="text-xs text-slate-400 text-center">Dikirim otomatis dari pool nomor WA terdaftar — tanpa buka browser</p>
        </>
      )}
    </WaModalShell>
  )
}

function WaModalShell({ title, subtitle, onClose, children }: {
  title: string; subtitle: string; onClose: () => void; children: React.ReactNode
}) {
  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div className="bg-white rounded-2xl w-full max-w-lg shadow-xl overflow-hidden" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100">
          <div>
            <h3 className="text-sm font-bold text-slate-800">{title}</h3>
            <p className="text-xs text-slate-500 mt-0.5">{subtitle}</p>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600 text-lg">✕</button>
        </div>
        <div className="p-5 space-y-4">{children}</div>
      </div>
    </div>
  )
}

function WaTemplateSelector({ templateId, setTemplateId }: { templateId: string; setTemplateId: (id: string) => void }) {
  return (
    <div className="grid grid-cols-2 gap-2">
      {WA_TEMPLATES.map((t) => (
        <button key={t.id} onClick={() => setTemplateId(t.id)}
          className={`flex items-center gap-2 px-3 py-2.5 rounded-xl border text-xs font-medium transition-all ${
            templateId === t.id ? t.activeColor + ' shadow-sm' : 'border-slate-200 text-slate-600 hover:bg-slate-50'
          }`}>
          <span className="text-base">{t.icon}</span>{t.label}
        </button>
      ))}
    </div>
  )
}

function WaPreview({ preview }: { preview: string }) {
  return (
    <div className="bg-slate-50 border border-slate-200 rounded-xl p-3 max-h-52 overflow-y-auto">
      <p className="text-xs text-slate-400 mb-1.5 font-medium">Preview:</p>
      <p className="text-xs text-slate-700 whitespace-pre-wrap leading-relaxed">
        {preview || <span className="italic text-slate-400">Pilih template...</span>}
      </p>
    </div>
  )
}

const DELAY_PRESETS = [
  { label: '3 detik', ms: 3000 },
  { label: '5 detik', ms: 5000 },
  { label: '10 detik', ms: 10000 },
  { label: '30 detik', ms: 30000 },
]

const BLAST_TEMPLATES = {
  whatsapp: WA_TEMPLATES,
  email: EMAIL_TEMPLATES,
}

function BulkBlastModal({
  defaultOnlyNew,
  onClose,
  onStarted,
}: {
  defaultOnlyNew: boolean
  onClose: () => void
  onStarted: (jobId: string, total: number) => void
}) {
  const [channel, setChannel] = useState<'whatsapp' | 'email'>('whatsapp')
  const [templateId, setTemplateId] = useState('intro')
  const [customMessage, setCustomMessage] = useState('')
  const [delayMs, setDelayMs] = useState(5000)
  const [onlyNew, setOnlyNew] = useState(defaultOnlyNew)
  const [starting, setStarting] = useState(false)
  const [error, setError] = useState('')

  const templates = BLAST_TEMPLATES[channel]
  const selectedTemplate = templates.find((t) => t.id === templateId) ?? templates[0]
  const preview = templateId === 'custom' ? customMessage : selectedTemplate.message('{name}')

  const handleChannelChange = (ch: 'whatsapp' | 'email') => {
    setChannel(ch)
    setTemplateId('intro')
    setCustomMessage('')
  }

  const handleStart = async () => {
    const message = templateId === 'custom' ? customMessage : preview
    if (!message.trim()) { setError('Pesan tidak boleh kosong'); return }
    setError('')
    setStarting(true)
    try {
      const res = await startBulkSend({ channel, message, delay_ms: delayMs, only_new: onlyNew })
      onStarted(res.job_id, res.total)
    } catch (err: unknown) {
      setError(apiErrMsg(err, 'Gagal memulai blast'))
      setStarting(false)
    }
  }

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div className="bg-white rounded-2xl w-full max-w-lg shadow-xl overflow-hidden" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100">
          <div>
            <h3 className="text-sm font-bold text-slate-800">🚀 Kirim Massal (Blast)</h3>
            <p className="text-xs text-slate-500 mt-0.5">Kirim pesan ke banyak prospek sekaligus dari database</p>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600 text-lg">✕</button>
        </div>

        <div className="p-5 space-y-4 max-h-[80vh] overflow-y-auto">
          {/* Channel */}
          <div>
            <label className="block text-xs font-semibold text-slate-600 mb-2">Channel Pengiriman</label>
            <div className="flex gap-2">
              <button
                onClick={() => handleChannelChange('whatsapp')}
                className={`flex-1 py-2.5 rounded-xl border text-xs font-semibold transition-all flex items-center justify-center gap-1.5 ${
                  channel === 'whatsapp' ? 'bg-emerald-600 text-white border-emerald-600' : 'border-slate-200 text-slate-600 hover:bg-slate-50'
                }`}
              >
                💬 WhatsApp
              </button>
              <button
                onClick={() => handleChannelChange('email')}
                className={`flex-1 py-2.5 rounded-xl border text-xs font-semibold transition-all flex items-center justify-center gap-1.5 ${
                  channel === 'email' ? 'bg-indigo-600 text-white border-indigo-600' : 'border-slate-200 text-slate-600 hover:bg-slate-50'
                }`}
              >
                📧 Email
              </button>
            </div>
          </div>

          {/* Template */}
          <div>
            <label className="block text-xs font-semibold text-slate-600 mb-2">Template Pesan</label>
            <div className="grid grid-cols-2 gap-2">
              {templates.map((t) => (
                <button
                  key={t.id}
                  onClick={() => setTemplateId(t.id)}
                  className={`py-2 px-3 rounded-xl border text-xs font-medium transition-all ${
                    templateId === t.id
                      ? channel === 'whatsapp'
                        ? 'bg-emerald-600 text-white border-emerald-600'
                        : 'bg-indigo-600 text-white border-indigo-600'
                      : 'border-slate-200 text-slate-600 hover:bg-slate-50'
                  }`}
                >
                  {'icon' in t ? `${t.icon} ` : ''}{t.label}
                </button>
              ))}
            </div>
          </div>

          {templateId === 'custom' && (
            <textarea
              rows={5}
              placeholder={`Tulis pesan kustom... gunakan {name} untuk nama bisnis`}
              value={customMessage}
              onChange={(e) => setCustomMessage(e.target.value)}
              className="w-full px-3 py-2.5 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 resize-none"
            />
          )}

          {/* Preview */}
          <div className="bg-slate-50 border border-slate-200 rounded-xl p-3 max-h-36 overflow-y-auto">
            <p className="text-xs text-slate-400 mb-1.5 font-medium">Preview (nama diisi per prospek):</p>
            <p className="text-xs text-slate-700 whitespace-pre-wrap leading-relaxed">
              {preview || <span className="italic text-slate-400">Pilih template...</span>}
            </p>
          </div>

          {/* Options */}
          <div className="flex flex-col gap-3 p-4 bg-slate-50 border border-slate-200 rounded-xl">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-semibold text-slate-700">Jeda antar kirim</p>
                <p className="text-xs text-slate-400">Hindari spam filter dengan jeda antar pesan</p>
              </div>
              <select
                value={delayMs}
                onChange={(e) => setDelayMs(Number(e.target.value))}
                className="text-xs border border-slate-200 rounded-xl px-2 py-1.5 focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white"
              >
                {DELAY_PRESETS.map((d) => (
                  <option key={d.ms} value={d.ms}>{d.label}</option>
                ))}
              </select>
            </div>

            <div className="h-px bg-slate-200" />

            <label className="flex items-center justify-between cursor-pointer">
              <div>
                <p className="text-xs font-semibold text-slate-700">Hanya yang belum pernah dihubungi</p>
                <p className="text-xs text-slate-400">Skip prospek yang sudah ada contacted_at</p>
              </div>
              <div
                onClick={() => setOnlyNew(!onlyNew)}
                className={`relative w-10 h-5 rounded-full transition-colors ${onlyNew ? 'bg-indigo-600' : 'bg-slate-300'}`}
              >
                <span className={`absolute top-0.5 w-4 h-4 bg-white rounded-full shadow transition-transform ${onlyNew ? 'left-5' : 'left-0.5'}`} />
              </div>
            </label>
          </div>

          {error && (
            <div className="text-xs px-3 py-2 rounded-xl bg-red-50 text-red-600">✗ {error}</div>
          )}

          <div className="flex gap-2 pt-1">
            <button
              onClick={onClose}
              className="flex-1 py-2.5 border border-slate-200 text-slate-600 hover:bg-slate-50 text-sm font-medium rounded-xl"
            >
              Batal
            </button>
            <button
              onClick={handleStart}
              disabled={starting || !preview.trim()}
              className="flex-1 py-2.5 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed text-white text-sm font-semibold rounded-xl flex items-center justify-center gap-2"
            >
              {starting ? <><span className="animate-spin">⏳</span> Memulai...</> : '🚀 Mulai Blast'}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

function BulkProgressModal({ jobId, total, onClose }: { jobId: string; total: number; onClose: () => void }) {
  const [job, setJob] = useState<BulkSendJob>({ total, sent: 0, failed: 0, current: '', done: false })

  useEffect(() => {
    if (job.done) return
    const interval = setInterval(async () => {
      try {
        const data = await getBulkSendProgress(jobId)
        setJob(data)
        if (data.done) clearInterval(interval)
      } catch {
        // polling — silent
      }
    }, 3000)
    return () => clearInterval(interval)
  }, [jobId, job.done])

  const processed = job.sent + job.failed
  const pct = job.total > 0 ? Math.round((processed / job.total) * 100) : 0

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl w-full max-w-md shadow-xl p-6 space-y-5">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-sm font-bold text-slate-800">
              {job.done ? '✅ Blast Selesai' : '🚀 Sedang Mengirim...'}
            </h3>
            <p className="text-xs text-slate-500 mt-0.5">
              {job.done ? `Selesai — ${job.sent} berhasil, ${job.failed} gagal` : 'Berjalan di background server'}
            </p>
          </div>
          {job.done && (
            <button onClick={onClose} className="text-slate-400 hover:text-slate-600 text-lg">✕</button>
          )}
        </div>

        {/* Progress bar */}
        <div>
          <div className="flex justify-between text-xs text-slate-500 mb-1.5">
            <span>{processed} / {job.total} prospek</span>
            <span>{pct}%</span>
          </div>
          <div className="h-2.5 bg-slate-100 rounded-full overflow-hidden">
            <div
              className={`h-full rounded-full transition-all duration-700 ${job.done ? 'bg-emerald-500' : 'bg-indigo-500'}`}
              style={{ width: `${pct}%` }}
            />
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-3 gap-3 text-center">
          <div className="bg-slate-50 rounded-xl py-3 px-2">
            <p className="text-lg font-bold text-slate-700">{job.total}</p>
            <p className="text-xs text-slate-400">Total</p>
          </div>
          <div className="bg-emerald-50 rounded-xl py-3 px-2">
            <p className="text-lg font-bold text-emerald-600">{job.sent}</p>
            <p className="text-xs text-emerald-500">Terkirim</p>
          </div>
          <div className="bg-red-50 rounded-xl py-3 px-2">
            <p className="text-lg font-bold text-red-500">{job.failed}</p>
            <p className="text-xs text-red-400">Gagal</p>
          </div>
        </div>

        {/* Current target */}
        {!job.done && job.current && (
          <div className="flex items-center gap-2 bg-indigo-50 border border-indigo-100 rounded-xl px-4 py-2.5">
            <span className="animate-pulse text-indigo-500">●</span>
            <p className="text-xs text-indigo-700 font-medium">Sedang kirim ke: <span className="font-bold">{job.current}</span></p>
          </div>
        )}

        {!job.done && (
          <p className="text-xs text-slate-400 text-center">
            Anda bisa menutup halaman ini — pengiriman tetap berjalan di server
          </p>
        )}

        {job.done && (
          <button
            onClick={onClose}
            className="w-full py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-semibold rounded-xl"
          >
            Tutup
          </button>
        )}
      </div>
    </div>
  )
}

function NotesModal({ notes, onSave, onClose }: { notes: string; onSave: (n: string) => void; onClose: () => void }) {
  const [value, setValue] = useState(notes)
  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div className="bg-white rounded-2xl w-full max-w-sm shadow-xl p-5" onClick={(e) => e.stopPropagation()}>
        <h3 className="text-sm font-bold text-slate-800 mb-3">Catatan Prospek</h3>
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
