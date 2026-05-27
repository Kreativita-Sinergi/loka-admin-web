import { useState, useEffect, useCallback } from 'react'
import { getSecurityLogs, type SecurityEventLog, type SecurityLogsParams } from '../api/admin'

const ACTION_LABELS: Record<string, string> = {
  request_forgot_password: 'Minta OTP (Web)',
  mobile_request_forgot_password: 'Minta OTP (Mobile)',
  reset_password: 'Reset Password',
}

const ACTION_OPTIONS = [
  { value: '', label: 'Semua Aksi' },
  { value: 'request_forgot_password', label: 'Minta OTP (Web)' },
  { value: 'mobile_request_forgot_password', label: 'Minta OTP (Mobile)' },
  { value: 'reset_password', label: 'Reset Password' },
]

const STATUS_OPTIONS = [
  { value: '', label: 'Semua Status' },
  { value: 'success', label: 'Berhasil' },
  { value: 'failed', label: 'Gagal' },
]

function LocationBadge({ log }: { log: SecurityEventLog }) {
  if (log.country) {
    return (
      <div className="text-sm">
        <div className="font-medium text-slate-700">
          {[log.city, log.region, log.country].filter(Boolean).join(', ')}
        </div>
        {log.isp && <div className="text-xs text-slate-400 truncate max-w-[200px]">{log.isp}</div>}
      </div>
    )
  }
  return <span className="text-slate-400 text-sm">Memproses…</span>
}

function parseUserAgent(ua: string): string {
  if (!ua) return '-'
  if (/iPhone|iPad|iPod/.test(ua)) return 'iOS'
  if (/Android/.test(ua)) return 'Android'
  if (/Windows/.test(ua)) return 'Windows'
  if (/Mac OS X/.test(ua)) return 'macOS'
  if (/Linux/.test(ua)) return 'Linux'
  return ua.slice(0, 40)
}

export default function SecurityLogsPage() {
  const [logs, setLogs] = useState<SecurityEventLog[]>([])
  const [total, setTotal] = useState(0)
  const [loading, setLoading] = useState(false)
  const [params, setParams] = useState<SecurityLogsParams>({ page: 1, limit: 20, action: '', status: '' })

  const fetchLogs = useCallback(async () => {
    setLoading(true)
    try {
      const cleaned: SecurityLogsParams = { ...params }
      if (!cleaned.action) delete cleaned.action
      if (!cleaned.status) delete cleaned.status
      const res = await getSecurityLogs(cleaned)
      setLogs(res.data.data ?? [])
      setTotal(res.data.total ?? 0)
    } catch {
      // keep previous data
    } finally {
      setLoading(false)
    }
  }, [params])

  useEffect(() => { fetchLogs() }, [fetchLogs])

  const totalPages = Math.ceil(total / (params.limit ?? 20))

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Security Log</h1>
        <p className="text-sm text-slate-500 mt-1">
          Rekaman setiap request reset password — IP, lokasi, dan status.
        </p>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-xl border border-slate-200 p-4 flex flex-wrap gap-3">
        <select
          value={params.action ?? ''}
          onChange={(e) => setParams((p) => ({ ...p, action: e.target.value, page: 1 }))}
          className="border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
        >
          {ACTION_OPTIONS.map((o) => (
            <option key={o.value} value={o.value}>{o.label}</option>
          ))}
        </select>
        <select
          value={params.status ?? ''}
          onChange={(e) => setParams((p) => ({ ...p, status: e.target.value, page: 1 }))}
          className="border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
        >
          {STATUS_OPTIONS.map((o) => (
            <option key={o.value} value={o.value}>{o.label}</option>
          ))}
        </select>
        <button
          onClick={fetchLogs}
          className="ml-auto px-4 py-2 bg-indigo-600 text-white text-sm font-medium rounded-lg hover:bg-indigo-700 transition-colors"
        >
          Refresh
        </button>
      </div>

      {/* Summary */}
      <div className="text-sm text-slate-500">
        {total > 0 ? `${total} event ditemukan` : 'Tidak ada event'}
      </div>

      {/* Table */}
      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200">
                <th className="text-left px-4 py-3 font-medium text-slate-600">Waktu</th>
                <th className="text-left px-4 py-3 font-medium text-slate-600">Aksi</th>
                <th className="text-left px-4 py-3 font-medium text-slate-600">Identifier</th>
                <th className="text-left px-4 py-3 font-medium text-slate-600">IP</th>
                <th className="text-left px-4 py-3 font-medium text-slate-600">Lokasi</th>
                <th className="text-left px-4 py-3 font-medium text-slate-600">Device</th>
                <th className="text-left px-4 py-3 font-medium text-slate-600">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? (
                <tr>
                  <td colSpan={7} className="text-center py-10 text-slate-400">
                    Memuat…
                  </td>
                </tr>
              ) : logs.length === 0 ? (
                <tr>
                  <td colSpan={7} className="text-center py-10 text-slate-400">
                    Tidak ada log
                  </td>
                </tr>
              ) : (
                logs.map((log) => (
                  <tr key={log.id} className="hover:bg-slate-50 transition-colors">
                    <td className="px-4 py-3 text-slate-500 whitespace-nowrap">
                      {new Date(log.created_at).toLocaleString('id-ID', {
                        dateStyle: 'short',
                        timeStyle: 'medium',
                      })}
                    </td>
                    <td className="px-4 py-3">
                      <span className="font-medium text-slate-700">
                        {ACTION_LABELS[log.action] ?? log.action}
                      </span>
                    </td>
                    <td className="px-4 py-3 font-mono text-xs text-slate-600">{log.identifier}</td>
                    <td className="px-4 py-3 font-mono text-xs text-slate-600">{log.ip_address}</td>
                    <td className="px-4 py-3">
                      <LocationBadge log={log} />
                    </td>
                    <td className="px-4 py-3 text-slate-500 text-xs">
                      {parseUserAgent(log.user_agent)}
                    </td>
                    <td className="px-4 py-3">
                      {log.status === 'success' ? (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-700">
                          Berhasil
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-700">
                          Gagal
                        </span>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between px-4 py-3 border-t border-slate-200">
            <span className="text-sm text-slate-500">
              Halaman {params.page} dari {totalPages}
            </span>
            <div className="flex gap-2">
              <button
                disabled={(params.page ?? 1) <= 1}
                onClick={() => setParams((p) => ({ ...p, page: (p.page ?? 1) - 1 }))}
                className="px-3 py-1.5 text-sm border border-slate-200 rounded-lg disabled:opacity-40 hover:bg-slate-50 transition-colors"
              >
                Sebelumnya
              </button>
              <button
                disabled={(params.page ?? 1) >= totalPages}
                onClick={() => setParams((p) => ({ ...p, page: (p.page ?? 1) + 1 }))}
                className="px-3 py-1.5 text-sm border border-slate-200 rounded-lg disabled:opacity-40 hover:bg-slate-50 transition-colors"
              >
                Berikutnya
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
