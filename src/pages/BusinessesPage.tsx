import { useEffect, useState, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { getBusinesses, toggleBusinessActive, deleteBusiness, processDowngrades } from '../api/admin'
import type { AdminBusiness } from '../types'
import Badge from '../components/ui/Badge'
import Pagination from '../components/ui/Pagination'
import DeleteConfirmModal from '../components/ui/DeleteConfirmModal'
import { format } from 'date-fns'
import { id as localeId } from 'date-fns/locale'

const STATUS_OPTIONS = [
  { value: '', label: 'Semua' },
  { value: 'free', label: 'Gratis' },
  { value: 'trial', label: 'Trial' },
  { value: 'pro', label: 'Pro' },
  { value: 'expired', label: 'Expired' },
]

function membershipBadge(membership: AdminBusiness['membership']) {
  if (!membership) return <Badge variant="neutral">Tidak ada</Badge>
  if (membership.type === 'free') return <Badge variant="neutral">GRATIS</Badge>
  const expired = new Date(membership.end_date) < new Date() || !membership.is_active
  if (expired) return <Badge variant="danger">Expired</Badge>
  const map: Record<string, 'warning' | 'info' | 'success'> = {
    trial: 'warning',
    pro: 'success',
  }
  return <Badge variant={map[membership.type] ?? 'neutral'}>{membership.type.toUpperCase()}</Badge>
}

export default function BusinessesPage() {
  const [businesses, setBusinesses] = useState<AdminBusiness[]>([])
  const [total, setTotal] = useState(0)
  const [page, setPage] = useState(1)
  const [search, setSearch] = useState('')
  const [searchInput, setSearchInput] = useState('')
  const [status, setStatus] = useState('')
  const [loading, setLoading] = useState(true)
  const [toggling, setToggling] = useState<string | null>(null)
  const [deleteTarget, setDeleteTarget] = useState<AdminBusiness | null>(null)
  const [processingDowngrade, setProcessingDowngrade] = useState(false)
  const [downgradeResult, setDowngradeResult] = useState<string | null>(null)
  const navigate = useNavigate()

  const limit = 15

  const load = useCallback(async () => {
    setLoading(true)
    try {
      // Terbaru di atas. Pagination server memakai `created_at asc` sebagai
      // bawaan, sehingga pendaftar baru — yang justru paling sering dicari di
      // halaman ini — terkubur di halaman terakhir.
      const res = await getBusinesses({
        page,
        limit,
        search,
        status,
        sort_by: 'created_at',
        order_by: 'desc',
      })
      setBusinesses(res.data ?? [])
      setTotal(res.pagination?.total ?? 0)
    } catch (err) {
      console.error(err)
    } finally {
      setLoading(false)
    }
  }, [page, search, status])

  useEffect(() => {
    let active = true
    getBusinesses({ page, limit, search, status, sort_by: 'created_at', order_by: 'desc' })
      .then((res) => {
        if (!active) return
        setBusinesses(res.data ?? [])
        setTotal(res.pagination?.total ?? 0)
      })
      .catch(console.error)
      .finally(() => { if (active) setLoading(false) })
    return () => { active = false }
  }, [page, search, status])

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault()
    setSearch(searchInput)
    setPage(1)
  }

  const handleToggle = async (b: AdminBusiness) => {
    if (!confirm(`${b.is_active ? 'Nonaktifkan' : 'Aktifkan'} bisnis "${b.business_name}"?`)) return
    setToggling(b.id)
    try {
      await toggleBusinessActive(b.id)
      await load()
    } catch (err) {
      console.error(err)
    } finally {
      setToggling(null)
    }
  }

  const handleDelete = async () => {
    if (!deleteTarget) return
    await deleteBusiness(deleteTarget.id)
    setDeleteTarget(null)
    load()
  }

  const handleProcessDowngrades = async () => {
    if (!confirm('Jalankan downgrade massal semua trial/pro yang expired ke paket Gratis?')) return
    setProcessingDowngrade(true)
    setDowngradeResult(null)
    try {
      const res = await processDowngrades()
      await load()
      setDowngradeResult(res.message ?? 'Downgrade berhasil dijalankan')
      setTimeout(() => setDowngradeResult(null), 5000)
    } catch (err) {
      console.error(err)
      setDowngradeResult('Gagal menjalankan downgrade')
      setTimeout(() => setDowngradeResult(null), 5000)
    } finally {
      setProcessingDowngrade(false)
    }
  }

  return (
    <div className="space-y-4">
      <DeleteConfirmModal
        open={!!deleteTarget}
        businessName={deleteTarget?.business_name ?? ''}
        onClose={() => setDeleteTarget(null)}
        onConfirm={handleDelete}
      />

      {downgradeResult && (
        <div className="px-4 py-3 bg-emerald-50 border border-emerald-200 rounded-xl text-sm text-emerald-700">
          {downgradeResult}
        </div>
      )}

      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h2 className="text-xl font-bold text-slate-800">Bisnis</h2>
          <p className="text-sm text-slate-500 mt-0.5">{total} total bisnis terdaftar</p>
        </div>
        <button
          onClick={handleProcessDowngrades}
          disabled={processingDowngrade}
          className="w-full sm:w-auto px-4 py-2.5 sm:py-2 bg-amber-500 hover:bg-amber-600 disabled:opacity-50 text-white text-sm font-medium rounded-lg transition"
        >
          {processingDowngrade ? 'Memproses...' : 'Proses Downgrade ke Gratis'}
        </button>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-xl border border-slate-200 p-3 sm:p-4 flex flex-col sm:flex-row sm:flex-wrap gap-3">
        <form onSubmit={handleSearch} className="flex gap-2 flex-1 min-w-0 sm:min-w-60">
          <input
            type="text"
            placeholder="Cari nama bisnis atau pemilik..."
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            className="flex-1 px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
          />
          <button type="submit" className="px-4 py-2 bg-indigo-600 text-white rounded-lg text-sm hover:bg-indigo-700">
            Cari
          </button>
        </form>

        <select
          value={status}
          onChange={(e) => { setStatus(e.target.value); setPage(1) }}
          className="w-full sm:w-auto px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
        >
          {STATUS_OPTIONS.map((o) => (
            <option key={o.value} value={o.value}>{o.label}</option>
          ))}
        </select>
      </div>

      {/* Table */}
      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 border-b border-slate-200">
              <tr>
                <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">Bisnis</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">Pemilik</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">Tipe</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">Membership</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">Status</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">Daftar</th>
                <th className="text-right px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? (
                <tr>
                  <td colSpan={7} className="text-center py-12 text-slate-400">Memuat data...</td>
                </tr>
              ) : businesses.length === 0 ? (
                <tr>
                  <td colSpan={7} className="text-center py-12 text-slate-400">Tidak ada data</td>
                </tr>
              ) : (
                businesses.map((b) => (
                  <tr key={b.id} className="hover:bg-slate-50 transition-colors">
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-3">
                        {b.image ? (
                          <img src={b.image} alt="" className="w-8 h-8 rounded-lg object-cover" />
                        ) : (
                          <div className="w-8 h-8 rounded-lg bg-indigo-100 flex items-center justify-center text-indigo-600 font-semibold text-xs">
                            {b.business_name.charAt(0).toUpperCase()}
                          </div>
                        )}
                        <div>
                          <p className="font-medium text-slate-800">{b.business_name}</p>
                          <p className="text-xs text-slate-400">{b.id.slice(0, 8)}...</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <p className="text-slate-700">{b.owner_name}</p>
                      {b.owner?.phone_number && (
                        <p className="text-xs text-slate-400">{b.owner.phone_number}</p>
                      )}
                    </td>
                    <td className="px-4 py-3 text-slate-600">
                      {b.business_type?.name ?? '-'}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex flex-col gap-1">
                        {membershipBadge(b.membership)}
                        {b.membership && (
                          <span className="text-xs text-slate-400">
                            {b.membership.days_remaining > 0
                              ? `${b.membership.days_remaining} hari lagi`
                              : 'Sudah berakhir'}
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <Badge variant={b.is_active ? 'success' : 'danger'}>
                        {b.is_active ? 'Aktif' : 'Nonaktif'}
                      </Badge>
                    </td>
                    <td className="px-4 py-3 text-slate-500 text-xs">
                      {format(new Date(b.created_at), 'd MMM yyyy', { locale: localeId })}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex justify-end gap-2">
                        <button
                          onClick={() => navigate(`/businesses/${b.id}`)}
                          className="px-3 py-1 text-xs bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg transition-colors"
                        >
                          Detail
                        </button>
                        <button
                          onClick={() => handleToggle(b)}
                          disabled={toggling === b.id}
                          className={`px-3 py-1 text-xs rounded-lg transition-colors ${
                            b.is_active
                              ? 'bg-red-100 hover:bg-red-200 text-red-700'
                              : 'bg-emerald-100 hover:bg-emerald-200 text-emerald-700'
                          } disabled:opacity-50`}
                        >
                          {toggling === b.id ? '...' : b.is_active ? 'Nonaktifkan' : 'Aktifkan'}
                        </button>
                        <button
                          onClick={() => setDeleteTarget(b)}
                          className="px-3 py-1 text-xs bg-red-50 hover:bg-red-100 text-red-600 rounded-lg transition-colors border border-red-200"
                        >
                          Hapus
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {!loading && (
          <div className="px-4 py-3 border-t border-slate-100">
            <Pagination page={page} total={total} limit={limit} onChange={setPage} />
          </div>
        )}
      </div>
    </div>
  )
}
