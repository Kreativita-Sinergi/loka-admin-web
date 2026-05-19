import { useEffect, useState, useCallback } from 'react'
import { getMemberships, updateMembership, deactivateMembership, processDowngrades } from '../api/admin'
import type { AdminMembership } from '../types'
import Badge from '../components/ui/Badge'
import Pagination from '../components/ui/Pagination'
import Modal from '../components/ui/Modal'
import { format } from 'date-fns'
import { id as localeId } from 'date-fns/locale'

const STATUS_OPTIONS = [
  { value: '', label: 'Semua' },
  { value: 'active', label: 'Aktif' },
  { value: 'expired', label: 'Expired' },
  { value: 'trial', label: 'Trial' },
  { value: 'free', label: 'Gratis' },
  { value: 'lite', label: 'Lite' },
  { value: 'pro', label: 'Pro' },
]

function membershipVariant(m: AdminMembership): 'success' | 'info' | 'warning' | 'danger' {
  const expired = new Date(m.end_date) < new Date()
  if (expired || !m.is_active) return 'danger'
  if (m.type === 'pro') return 'success'
  if (m.type === 'lite') return 'info'
  if (m.type === 'free') return 'warning'
  return 'warning'
}

function membershipLabel(type: string): string {
  if (type === 'free') return 'GRATIS'
  return type.toUpperCase()
}

export default function MembershipsPage() {
  const [memberships, setMemberships] = useState<AdminMembership[]>([])
  const [total, setTotal] = useState(0)
  const [page, setPage] = useState(1)
  const [searchInput, setSearchInput] = useState('')
  const [search, setSearch] = useState('')
  const [status, setStatus] = useState('')
  const [loading, setLoading] = useState(true)
  const [editModal, setEditModal] = useState<AdminMembership | null>(null)
  const [editForm, setEditForm] = useState({ type: '', extend_days: 0, end_date: '' })
  const [submitting, setSubmitting] = useState(false)
  const [processingDowngrade, setProcessingDowngrade] = useState(false)

  const limit = 15

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const res = await getMemberships({ page, limit, search, status })
      setMemberships(res.data ?? [])
      setTotal(res.pagination?.total ?? 0)
    } catch (err) {
      console.error(err)
    } finally {
      setLoading(false)
    }
  }, [page, search, status])

  useEffect(() => { load() }, [load])

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault()
    setSearch(searchInput)
    setPage(1)
  }

  const openEdit = (m: AdminMembership) => {
    setEditForm({
      type: m.type,
      extend_days: 0,
      end_date: format(new Date(m.end_date), 'yyyy-MM-dd'),
    })
    setEditModal(m)
  }

  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!editModal) return
    setSubmitting(true)
    try {
      await updateMembership(editModal.id, {
        type: editForm.type || undefined,
        extend_days: editForm.extend_days > 0 ? editForm.extend_days : undefined,
        end_date: editForm.end_date || undefined,
      })
      setEditModal(null)
      await load()
    } catch (err) {
      console.error(err)
    } finally {
      setSubmitting(false)
    }
  }

  const handleProcessDowngrades = async () => {
    if (!confirm('Jalankan downgrade massal semua trial/pro/lite yang expired ke paket Gratis?')) return
    setProcessingDowngrade(true)
    try {
      await processDowngrades()
      await load()
    } catch (err) {
      console.error(err)
    } finally {
      setProcessingDowngrade(false)
    }
  }

  const handleDeactivate = async (m: AdminMembership) => {
    if (!confirm(`Nonaktifkan membership ini?`)) return
    try {
      await deactivateMembership(m.id)
      await load()
    } catch (err) {
      console.error(err)
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-slate-800">Membership</h2>
          <p className="text-sm text-slate-500 mt-0.5">{total} total membership</p>
        </div>
        <button
          onClick={handleProcessDowngrades}
          disabled={processingDowngrade}
          className="px-4 py-2 bg-amber-500 hover:bg-amber-600 disabled:opacity-50 text-white text-sm font-medium rounded-lg transition"
        >
          {processingDowngrade ? 'Memproses...' : 'Proses Downgrade ke Gratis'}
        </button>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-xl border border-slate-200 p-4 flex flex-wrap gap-3">
        <form onSubmit={handleSearch} className="flex gap-2 flex-1 min-w-60">
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
          className="px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
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
                <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">Paket</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">Mulai</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">Berakhir</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">Sisa</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">Status</th>
                <th className="text-right px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? (
                <tr>
                  <td colSpan={7} className="text-center py-12 text-slate-400">Memuat data...</td>
                </tr>
              ) : memberships.length === 0 ? (
                <tr>
                  <td colSpan={7} className="text-center py-12 text-slate-400">Tidak ada data</td>
                </tr>
              ) : (
                memberships.map((m) => {
                  const expired = new Date(m.end_date) < new Date()
                  return (
                    <tr key={m.id} className="hover:bg-slate-50 transition-colors">
                      <td className="px-4 py-3">
                        {m.business ? (
                          <div>
                            <p className="font-medium text-slate-800">{m.business.business_name}</p>
                            <p className="text-xs text-slate-400">{m.business.owner_name}</p>
                          </div>
                        ) : (
                          <span className="text-slate-400 text-xs">{m.id.slice(0, 8)}...</span>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        <Badge variant={membershipVariant(m)}>{membershipLabel(m.type)}</Badge>
                      </td>
                      <td className="px-4 py-3 text-slate-600 text-xs">
                        {format(new Date(m.start_date), 'd MMM yyyy', { locale: localeId })}
                      </td>
                      <td className={`px-4 py-3 text-xs font-medium ${expired ? 'text-red-600' : 'text-slate-600'}`}>
                        {format(new Date(m.end_date), 'd MMM yyyy', { locale: localeId })}
                      </td>
                      <td className="px-4 py-3 text-xs text-slate-600">
                        {expired ? (
                          <span className="text-red-500">Berakhir</span>
                        ) : (
                          `${m.days_remaining} hari`
                        )}
                      </td>
                      <td className="px-4 py-3">
                        <Badge variant={m.is_active && !expired ? 'success' : 'danger'}>
                          {m.is_active && !expired ? 'Aktif' : 'Nonaktif'}
                        </Badge>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex justify-end gap-2">
                          <button
                            onClick={() => openEdit(m)}
                            className="px-3 py-1 text-xs bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg"
                          >
                            Edit
                          </button>
                          {m.is_active && (
                            <button
                              onClick={() => handleDeactivate(m)}
                              className="px-3 py-1 text-xs bg-red-100 hover:bg-red-200 text-red-700 rounded-lg"
                            >
                              Nonaktifkan
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  )
                })
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

      {/* Edit Modal */}
      <Modal title="Edit Membership" open={!!editModal} onClose={() => setEditModal(null)}>
        <form onSubmit={handleUpdate} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Paket</label>
            <select
              value={editForm.type}
              onChange={(e) => setEditForm((f) => ({ ...f, type: e.target.value }))}
              className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
            >
              <option value="free">Gratis</option>
              <option value="trial">Trial</option>
              <option value="lite">Lite</option>
              <option value="pro">Pro</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">
              Tanggal Berakhir
            </label>
            <input
              type="date"
              value={editForm.end_date}
              onChange={(e) => setEditForm((f) => ({ ...f, end_date: e.target.value, extend_days: 0 }))}
              className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">
              Atau Perpanjang (hari)
            </label>
            <input
              type="number"
              min={0}
              value={editForm.extend_days}
              onChange={(e) => setEditForm((f) => ({ ...f, extend_days: parseInt(e.target.value) || 0, end_date: '' }))}
              placeholder="0 = tidak perpanjang"
              className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>
          <div className="flex gap-3 pt-2">
            <button type="button" onClick={() => setEditModal(null)}
              className="flex-1 px-4 py-2 border border-slate-200 rounded-lg text-sm hover:bg-slate-50">
              Batal
            </button>
            <button type="submit" disabled={submitting}
              className="flex-1 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-sm disabled:opacity-50">
              {submitting ? 'Menyimpan...' : 'Simpan'}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  )
}
