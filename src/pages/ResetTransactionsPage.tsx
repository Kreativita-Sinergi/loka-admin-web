import { useEffect, useState } from 'react'
import { format } from 'date-fns'
import { id as localeId } from 'date-fns/locale'
import { getBusinesses, getTransactionResetPreview, resetTransactions } from '../api/admin'
import Pagination from '../components/ui/Pagination'
import type { AdminBusiness, AdminTransactionResetPreview } from '../types'

function errorMessage(err: unknown): string {
  const data = (err as { response?: { data?: { message?: string; error?: { details?: string } } } }).response?.data
  if (!data?.message) return 'Permintaan gagal. Coba lagi.'
  return data.error?.details ? `${data.message} — ${data.error.details}` : data.message
}

function dateLabel(value: string | null): string {
  if (!value) return '—'
  return format(new Date(value), 'd MMM yyyy, HH:mm', { locale: localeId })
}

function rupiah(value: number): string {
  return new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 }).format(value)
}

export default function ResetTransactionsPage() {
  const [businesses, setBusinesses] = useState<AdminBusiness[]>([])
  const [total, setTotal] = useState(0)
  const [page, setPage] = useState(1)
  const [searchInput, setSearchInput] = useState('')
  const [search, setSearch] = useState('')
  const [loading, setLoading] = useState(true)
  const [target, setTarget] = useState<AdminBusiness | null>(null)
  const [preview, setPreview] = useState<AdminTransactionResetPreview | null>(null)
  const [previewLoading, setPreviewLoading] = useState(false)
  const [confirmation, setConfirmation] = useState('')
  const [deleting, setDeleting] = useState(false)
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')
  const limit = 15

  useEffect(() => {
    let active = true
    getBusinesses({ page, limit, search, sort_by: 'created_at', order_by: 'desc' })
      .then((res) => {
        if (!active) return
        setBusinesses(res.data ?? [])
        setTotal(res.pagination?.total ?? 0)
      })
      .catch((err) => { if (active) setNotice(errorMessage(err)) })
      .finally(() => { if (active) setLoading(false) })
    return () => { active = false }
  }, [page, search])

  const openReset = async (business: AdminBusiness) => {
    setTarget(business)
    setPreview(null)
    setConfirmation('')
    setError('')
    setPreviewLoading(true)
    try {
      const res = await getTransactionResetPreview(business.id)
      setPreview(res.data)
    } catch (err) {
      setError(errorMessage(err))
    } finally {
      setPreviewLoading(false)
    }
  }

  const closeReset = () => {
    if (deleting) return
    setTarget(null)
    setPreview(null)
    setConfirmation('')
    setError('')
  }

  const handleReset = async () => {
    if (!target || confirmation !== target.business_name || !preview?.total_transactions) return
    setDeleting(true)
    setError('')
    try {
      const res = await resetTransactions(target.id, confirmation)
      const deleted = res.data?.deleted_transactions ?? 0
      setTarget(null)
      setPreview(null)
      setConfirmation('')
      setNotice(`${deleted.toLocaleString('id-ID')} transaksi milik ${target.business_name} berhasil dihapus permanen.`)
    } catch (err) {
      setError(errorMessage(err))
    } finally {
      setDeleting(false)
    }
  }

  const submitSearch = (event: React.FormEvent) => {
    event.preventDefault()
    setLoading(true)
    setSearch(searchInput.trim())
    setPage(1)
  }

  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-xl font-bold text-slate-800">Reset Transaksi</h2>
        <p className="text-sm text-slate-500 mt-0.5">Hapus permanen seluruh riwayat transaksi untuk satu bisnis.</p>
      </div>

      <div className="bg-red-50 border border-red-200 rounded-xl p-4 text-sm text-red-800">
        <p className="font-semibold">⚠️ Gunakan hanya untuk membersihkan data uji atau atas permintaan pemilik.</p>
        <p className="text-xs mt-1 text-red-700">Penghapusan tidak mengembalikan stok, tidak mengubah riwayat shift atau poin loyalti, dan tidak membalik jurnal accounting yang sudah terkirim.</p>
      </div>

      {notice && (
        <div className="bg-emerald-50 border border-emerald-200 rounded-xl px-4 py-3 text-sm text-emerald-800 flex justify-between gap-3">
          <span>{notice}</span>
          <button onClick={() => setNotice('')} aria-label="Tutup pemberitahuan">×</button>
        </div>
      )}

      <form onSubmit={submitSearch} className="bg-white rounded-xl border border-slate-200 p-3 sm:p-4 flex gap-2">
        <input
          value={searchInput}
          onChange={(event) => setSearchInput(event.target.value)}
          placeholder="Cari nama bisnis atau pemilik..."
          className="flex-1 min-w-0 px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
        />
        <button className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-sm rounded-lg">Cari</button>
      </form>

      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 border-b border-slate-200">
              <tr>
                <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase">Bisnis</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase">Pemilik</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase">Status</th>
                <th className="text-right px-4 py-3 text-xs font-semibold text-slate-500 uppercase">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? (
                <tr><td colSpan={4} className="text-center py-12 text-slate-400">Memuat data...</td></tr>
              ) : businesses.length === 0 ? (
                <tr><td colSpan={4} className="text-center py-12 text-slate-400">Bisnis tidak ditemukan</td></tr>
              ) : businesses.map((business) => (
                <tr key={business.id} className="hover:bg-slate-50">
                  <td className="px-4 py-3">
                    <p className="font-medium text-slate-800">{business.business_name}</p>
                    <p className="text-xs text-slate-400">{business.id}</p>
                  </td>
                  <td className="px-4 py-3 text-slate-600">{business.owner_name}</td>
                  <td className="px-4 py-3">
                    <span className={`inline-flex px-2 py-1 rounded-full text-xs font-medium ${business.is_active ? 'bg-emerald-50 text-emerald-700' : 'bg-slate-100 text-slate-600'}`}>
                      {business.is_active ? 'Aktif' : 'Nonaktif'}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-right">
                    <button onClick={() => void openReset(business)} className="px-3 py-1.5 text-xs font-medium text-red-700 bg-red-50 hover:bg-red-100 rounded-lg">
                      Hapus transaksi
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <Pagination page={page} total={total} limit={limit} onChange={(nextPage) => { setLoading(true); setPage(nextPage) }} />

      {target && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center">
          <button className="absolute inset-0 bg-black/50" onClick={closeReset} aria-label="Tutup dialog" />
          <div className="relative bg-white w-full sm:max-w-lg sm:mx-4 rounded-t-2xl sm:rounded-2xl shadow-2xl p-5 sm:p-6 max-h-[92dvh] overflow-y-auto">
            <h3 className="text-lg font-bold text-slate-900">Hapus seluruh transaksi</h3>
            <p className="text-sm text-slate-500 mt-1">Bisnis: <strong className="text-slate-800">{target.business_name}</strong></p>

            {previewLoading ? (
              <div className="py-10 text-center text-sm text-slate-400">Menghitung transaksi...</div>
            ) : preview ? (
              <div className="grid grid-cols-2 gap-3 my-5">
                <div className="bg-slate-50 rounded-xl p-3"><p className="text-xs text-slate-500">Semua transaksi</p><p className="text-xl font-bold text-slate-800">{preview.total_transactions.toLocaleString('id-ID')}</p></div>
                <div className="bg-slate-50 rounded-xl p-3"><p className="text-xs text-slate-500">Sudah dibayar/kasbon</p><p className="text-xl font-bold text-slate-800">{preview.paid_transactions.toLocaleString('id-ID')}</p></div>
                <div className="bg-slate-50 rounded-xl p-3 col-span-2"><p className="text-xs text-slate-500">Nilai penjualan yang akan hilang dari laporan</p><p className="text-lg font-bold text-slate-800">{rupiah(preview.total_sales)}</p></div>
                <div className="text-xs text-slate-500"><span className="block">Transaksi pertama</span><strong>{dateLabel(preview.first_transaction_at)}</strong></div>
                <div className="text-xs text-slate-500"><span className="block">Transaksi terakhir</span><strong>{dateLabel(preview.last_transaction_at)}</strong></div>
              </div>
            ) : null}

            <div className="bg-red-50 border border-red-200 rounded-xl p-4 text-xs text-red-700 space-y-1">
              <p className="font-semibold text-sm">Risiko penghapusan permanen</p>
              <p>• Transaksi, item, pembayaran, diskon, dan histori status tidak dapat dipulihkan.</p>
              <p>• Stok yang pernah terpotong tidak dikembalikan.</p>
              <p>• Shift, poin loyalti, serta jurnal accounting yang sudah terkirim tidak dibalik.</p>
            </div>

            <label className="block text-sm text-slate-600 mt-5 mb-2">
              Ketik <strong className="text-slate-900">{target.business_name}</strong> untuk konfirmasi:
            </label>
            <input
              value={confirmation}
              onChange={(event) => { setConfirmation(event.target.value); setError('') }}
              autoFocus
              className="w-full px-3 py-2.5 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-red-400"
            />
            {error && <p className="text-xs text-red-600 mt-2">{error}</p>}

            <div className="flex gap-3 mt-5">
              <button onClick={closeReset} disabled={deleting} className="flex-1 py-2.5 border border-slate-200 rounded-xl text-sm text-slate-600 disabled:opacity-50">Batal</button>
              <button
                onClick={() => void handleReset()}
                disabled={deleting || previewLoading || !preview?.total_transactions || confirmation !== target.business_name}
                className="flex-1 py-2.5 bg-red-600 hover:bg-red-700 disabled:opacity-40 disabled:cursor-not-allowed text-white rounded-xl text-sm font-semibold"
              >
                {deleting ? 'Menghapus...' : `Hapus ${preview?.total_transactions ?? 0} transaksi`}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
