import { useEffect, useState, useCallback } from 'react'
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
  { value: 'registered', label: 'Sudah Daftar' },
  { value: 'rejected',   label: 'Ditolak' },
]

function statusBadge(status: RegistrationRequest['status']) {
  const map: Record<string, { variant: 'warning' | 'info' | 'success' | 'danger' | 'neutral'; label: string }> = {
    pending:    { variant: 'warning', label: 'Pending' },
    contacted:  { variant: 'info',    label: 'Dihubungi' },
    registered: { variant: 'success', label: 'Sudah Daftar' },
    rejected:   { variant: 'danger',  label: 'Ditolak' },
  }
  const s = map[status] ?? { variant: 'neutral', label: status }
  return <Badge variant={s.variant}>{s.label}</Badge>
}

const WHATSAPP_BASE = 'https://wa.me/'

export default function RegistrationRequestsPage() {
  const [requests, setRequests]   = useState<RegistrationRequest[]>([])
  const [total, setTotal]         = useState(0)
  const [page, setPage]           = useState(1)
  const [statusFilter, setStatus] = useState('')
  const [loading, setLoading]     = useState(false)
  const [updating, setUpdating]   = useState<number | null>(null)

  const limit = 20

  const fetchData = useCallback(async () => {
    setLoading(true)
    try {
      const res = await getRegistrationRequests({ page, limit, status: statusFilter || undefined })
      setRequests(res.data ?? [])
      setTotal(res.pagination?.total ?? 0)
    } catch {
      // silent
    } finally {
      setLoading(false)
    }
  }, [page, statusFilter])

  useEffect(() => { fetchData() }, [fetchData])

  const handleStatusChange = async (id: number, newStatus: string) => {
    setUpdating(id)
    try {
      await updateRegistrationRequestStatus(id, newStatus)
      await fetchData()
    } catch {
      // silent
    } finally {
      setUpdating(null)
    }
  }

  const waLink = (phone: string, name: string, business: string) => {
    const clean = phone.replace(/\D/g, '').replace(/^0/, '62')
    const msg = encodeURIComponent(
      `Halo ${name}, kami dari tim Loka Kasir. Kami menerima permintaan akses untuk bisnis "${business}". Apakah Anda masih tertarik untuk bergabung? 😊`
    )
    return `${WHATSAPP_BASE}${clean}?text=${msg}`
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
                    <td className="px-4 py-3">
                      <a
                        href={waLink(req.phone, req.name, req.business_name)}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-green-600 hover:underline font-medium flex items-center gap-1"
                      >
                        {req.phone}
                        <span className="text-xs bg-green-100 text-green-700 px-1 py-0.5 rounded">WA</span>
                      </a>
                    </td>
                    <td className="px-4 py-3 text-gray-700">{req.business_name}</td>
                    <td className="px-4 py-3 text-gray-500">{req.city || '—'}</td>
                    <td className="px-4 py-3 text-gray-500">{req.email || '—'}</td>
                    <td className="px-4 py-3">{statusBadge(req.status)}</td>
                    <td className="px-4 py-3 text-gray-500 whitespace-nowrap">
                      {format(new Date(req.created_at), 'd MMM yyyy HH:mm', { locale: localeId })}
                    </td>
                    <td className="px-4 py-3">
                      <select
                        value={req.status}
                        disabled={updating === req.id}
                        onChange={(e) => handleStatusChange(req.id, e.target.value)}
                        className="text-xs border border-gray-200 rounded-lg px-2 py-1.5 bg-white focus:outline-none focus:ring-1 focus:ring-blue-500 disabled:opacity-50"
                      >
                        <option value="pending">Pending</option>
                        <option value="contacted">Dihubungi</option>
                        <option value="registered">Sudah Daftar</option>
                        <option value="rejected">Ditolak</option>
                      </select>
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
          currentPage={page}
          totalItems={total}
          itemsPerPage={limit}
          onPageChange={setPage}
        />
      )}
    </div>
  )
}
