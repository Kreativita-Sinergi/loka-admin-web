import { useEffect, useState } from 'react'
import { format } from 'date-fns'
import { id as localeId } from 'date-fns/locale'
import { getRegistrationRequests, updateRegistrationRequestStatus } from '../api/admin'
import type { RegistrationRequest } from '../api/admin'
import Badge from '../components/ui/Badge'
import Pagination from '../components/ui/Pagination'

const STATUS_OPTIONS = [
  { value: '',           label: 'Semua' },
  { value: 'pending',    label: 'Pending' },
  { value: 'contacted',  label: 'Dihubungi' },
  { value: 'approved',   label: 'Disetujui' },
  { value: 'registered', label: 'Sudah Daftar' },
  { value: 'rejected',   label: 'Ditolak' },
]

function statusBadge(status: RegistrationRequest['status']) {
  const map: Record<string, { variant: 'warning' | 'info' | 'success' | 'danger' | 'neutral'; label: string }> = {
    pending:    { variant: 'warning', label: 'Pending' },
    contacted:  { variant: 'info',    label: 'Dihubungi' },
    approved:   { variant: 'success', label: 'Disetujui' },
    registered: { variant: 'success', label: 'Sudah Daftar' },
    rejected:   { variant: 'danger',  label: 'Ditolak' },
  }
  const s = map[status] ?? { variant: 'neutral', label: status }
  return <Badge variant={s.variant}>{s.label}</Badge>
}

export default function RegistrationRequestsPage() {
  const [requests, setRequests]   = useState<RegistrationRequest[]>([])
  const [total, setTotal]         = useState(0)
  const [page, setPage]           = useState(1)
  const [statusFilter, setStatus] = useState('')
  const [loading, setLoading]     = useState(true)
  const [updating, setUpdating]   = useState<number | null>(null)
  const [refreshKey, setRefreshKey] = useState(0)

  const limit = 20

  useEffect(() => {
    let cancelled = false
    getRegistrationRequests({ page, limit, status: statusFilter || undefined })
      .then((res) => {
        if (!cancelled) {
          setRequests(res.data ?? [])
          setTotal(res.pagination?.total ?? 0)
          setLoading(false)
        }
      })
      .catch(() => { if (!cancelled) setLoading(false) })
    return () => { cancelled = true }
  }, [page, limit, statusFilter, refreshKey])

  const handleStatusChange = async (id: number, newStatus: string) => {
    setUpdating(id)
    try {
      await updateRegistrationRequestStatus(id, newStatus)
      setLoading(true)
      setRefreshKey((k) => k + 1)
    } catch {
      // silent
    } finally {
      setUpdating(null)
    }
  }

  const handleApprove = async (id: number) => {
    if (!confirm('Setujui permintaan ini? Email & WhatsApp berisi link download akan dikirim otomatis ke pengguna.')) return
    await handleStatusChange(id, 'approved')
  }

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Permintaan Akses</h1>
          <p className="text-gray-500 text-sm mt-0.5">
            Calon pengguna yang mengisi form permintaan akses aplikasi
          </p>
        </div>
        <span className="bg-blue-100 text-blue-700 text-sm font-semibold px-3 py-1 rounded-full">
          {total} permintaan
        </span>
      </div>

      {/* Filter */}
      <div className="flex gap-2 flex-wrap">
        {STATUS_OPTIONS.map((opt) => (
          <button
            key={opt.value}
            onClick={() => { setStatus(opt.value); setPage(1) }}
            className={`px-3 py-1.5 rounded-lg text-sm font-medium transition border ${
              statusFilter === opt.value
                ? 'bg-blue-600 text-white border-blue-600'
                : 'bg-white text-gray-600 border-gray-200 hover:border-blue-300'
            }`}
          >
            {opt.label}
          </button>
        ))}
      </div>

      {/* Table */}
      <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center h-40">
            <div className="w-7 h-7 border-2 border-blue-200 border-t-blue-600 rounded-full animate-spin" />
          </div>
        ) : requests.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-40 text-gray-400 gap-2">
            <p className="text-sm">Belum ada permintaan akses</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 border-b border-gray-100">
                <tr>
                  {['Nama', 'HP', 'Bisnis', 'Kota', 'Email', 'Status', 'Tgl Masuk', 'Aksi'].map((h) => (
                    <th key={h} className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {requests.map((req) => (
                  <tr key={req.id} className="hover:bg-gray-50 transition">
                    <td className="px-4 py-3 font-medium text-gray-900">{req.name}</td>
                    <td className="px-4 py-3 text-gray-700">{req.phone}</td>
                    <td className="px-4 py-3 text-gray-700">{req.business_name}</td>
                    <td className="px-4 py-3 text-gray-500">{req.city || '—'}</td>
                    <td className="px-4 py-3 text-gray-500">{req.email || '—'}</td>
                    <td className="px-4 py-3">{statusBadge(req.status)}</td>
                    <td className="px-4 py-3 text-gray-500 whitespace-nowrap">
                      {format(new Date(req.created_at), 'd MMM yyyy HH:mm', { locale: localeId })}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        {req.status !== 'approved' && req.status !== 'registered' && req.status !== 'rejected' && (
                          <button
                            disabled={updating === req.id}
                            onClick={() => handleApprove(req.id)}
                            className="text-xs bg-green-600 hover:bg-green-700 text-white font-semibold px-2.5 py-1.5 rounded-lg transition disabled:opacity-50 whitespace-nowrap"
                          >
                            ✓ Setujui & Kirim Link
                          </button>
                        )}
                        <select
                          value={req.status}
                          disabled={updating === req.id}
                          onChange={(e) => handleStatusChange(req.id, e.target.value)}
                          className="text-xs border border-gray-200 rounded-lg px-2 py-1.5 bg-white focus:outline-none focus:ring-1 focus:ring-blue-500 disabled:opacity-50"
                        >
                          <option value="pending">Pending</option>
                          <option value="contacted">Dihubungi</option>
                          <option value="approved">Disetujui</option>
                          <option value="registered">Sudah Daftar</option>
                          <option value="rejected">Ditolak</option>
                        </select>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {total > limit && (
        <Pagination
          page={page}
          total={total}
          limit={limit}
          onChange={setPage}
        />
      )}
    </div>
  )
}
