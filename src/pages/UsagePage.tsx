import { useEffect, useState } from 'react'
import { getActiveUsers } from '../api/admin'
import type { ActiveUsersStats } from '../api/admin'
import { formatDistanceToNow, format } from 'date-fns'
import { id as idLocale } from 'date-fns/locale'
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
} from 'recharts'

function StatCard({ label, value, sub }: { label: string; value: number | string; sub?: string }) {
  return (
    <div className="bg-white rounded-xl border border-slate-200 p-5">
      <p className="text-sm text-slate-500">{label}</p>
      <p className="text-2xl font-bold text-slate-800 mt-1">{value}</p>
      {sub && <p className="text-xs text-slate-400 mt-1">{sub}</p>}
    </div>
  )
}

function lastSeenLabel(iso: string | null): string {
  if (!iso) return 'Belum pernah'
  return formatDistanceToNow(new Date(iso), { addSuffix: true, locale: idLocale })
}

// Format jam desimal → "Xj Ym" yang enak dibaca.
function fmtHours(h: number): string {
  const totalMin = Math.round(h * 60)
  const hh = Math.floor(totalMin / 60)
  const mm = totalMin % 60
  if (hh === 0) return `${mm}m`
  if (mm === 0) return `${hh}j`
  return `${hh}j ${mm}m`
}

export default function UsagePage() {
  const [stats, setStats] = useState<ActiveUsersStats | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    getActiveUsers()
      .then((r) => setStats(r.data))
      .catch(console.error)
      .finally(() => setLoading(false))
  }, [])

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <p className="text-slate-400">Memuat data pemakaian...</p>
      </div>
    )
  }

  if (!stats) return null

  // Backend bisa mengirim null untuk array kosong (slice nil di Go) — beri default aman.
  const rows = stats.businesses ?? []
  const activeRate = stats.total_users > 0
    ? Math.round((stats.active_this_week / stats.total_users) * 100)
    : 0
  const avgHours = stats.active_this_week > 0
    ? stats.hours_this_week / stats.active_this_week
    : 0

  const trendData = (stats.daily_trend ?? []).map((d) => ({
    date: format(new Date(d.date), 'd MMM'),
    Jam: Math.round(d.hours * 10) / 10,
  }))

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-bold text-slate-800">User Aktif & Pemakaian</h2>
        <p className="text-sm text-slate-500 mt-0.5">
          Aktivitas dan jam pemakaian aplikasi & web kasir lintas seluruh bisnis
        </p>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
        <StatCard label="Aktif 24 Jam" value={stats.active_today} sub={`${fmtHours(stats.hours_today)} pemakaian`} />
        <StatCard label="Aktif 7 Hari" value={stats.active_this_week} sub={`${activeRate}% dari total user`} />
        <StatCard label="Jam Pakai 7 Hari" value={fmtHours(stats.hours_this_week)} sub={`±${fmtHours(avgHours)}/user aktif`} />
        <StatCard label="API Calls 7 Hari" value={(stats.api_calls_this_week ?? 0).toLocaleString('id-ID')} sub={`${(stats.api_calls_today ?? 0).toLocaleString('id-ID')} hari ini`} />
        <StatCard label="Total User" value={stats.total_users} />
      </div>

      {/* Daily usage trend */}
      <div className="bg-white rounded-xl border border-slate-200 p-5">
        <h3 className="text-sm font-semibold text-slate-700 mb-4">Jam Pemakaian 14 Hari Terakhir</h3>
        {trendData.some((d) => d.Jam > 0) ? (
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={trendData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
              <XAxis dataKey="date" tick={{ fontSize: 11 }} tickLine={false} />
              <YAxis tick={{ fontSize: 11 }} tickLine={false} axisLine={false} unit="j" />
              <Tooltip formatter={(v) => [`${v} jam`, 'Pemakaian']} />
              <Bar dataKey="Jam" fill="#6366f1" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        ) : (
          <div className="h-48 flex items-center justify-center text-slate-400 text-sm">
            Belum ada data pemakaian
          </div>
        )}
      </div>

      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
        <div className="px-5 py-4 border-b border-slate-200">
          <h3 className="text-sm font-semibold text-slate-700">Aktivitas per Bisnis</h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-slate-500 border-b border-slate-200">
                <th className="px-5 py-3 font-medium">Bisnis</th>
                <th className="px-5 py-3 font-medium text-right">Total User</th>
                <th className="px-5 py-3 font-medium text-right">Aktif 24 Jam</th>
                <th className="px-5 py-3 font-medium text-right">Aktif 7 Hari</th>
                <th className="px-5 py-3 font-medium text-right">Jam (7 Hari)</th>
                <th className="px-5 py-3 font-medium text-right">API (7 Hari)</th>
                <th className="px-5 py-3 font-medium text-right">Data</th>
                <th className="px-5 py-3 font-medium">Terakhir Aktif</th>
              </tr>
            </thead>
            <tbody>
              {rows.length === 0 ? (
                <tr>
                  <td colSpan={8} className="px-5 py-8 text-center text-slate-400">
                    Belum ada data aktivitas
                  </td>
                </tr>
              ) : (
                rows.map((b) => (
                  <tr key={b.business_id} className="border-b border-slate-100 last:border-0 hover:bg-slate-50">
                    <td className="px-5 py-3 font-medium text-slate-800">{b.business_name}</td>
                    <td className="px-5 py-3 text-right text-slate-600">{b.total_users}</td>
                    <td className="px-5 py-3 text-right">
                      <span className={b.active_today > 0 ? 'text-emerald-600 font-semibold' : 'text-slate-400'}>
                        {b.active_today}
                      </span>
                    </td>
                    <td className="px-5 py-3 text-right">
                      <span className={b.active_this_week > 0 ? 'text-indigo-600 font-semibold' : 'text-slate-400'}>
                        {b.active_this_week}
                      </span>
                    </td>
                    <td className="px-5 py-3 text-right text-slate-600">
                      {b.hours_this_week > 0 ? fmtHours(b.hours_this_week) : '—'}
                    </td>
                    <td className="px-5 py-3 text-right text-slate-600">
                      {(b.api_calls_this_week ?? 0) > 0 ? (b.api_calls_this_week ?? 0).toLocaleString('id-ID') : '—'}
                    </td>
                    <td className="px-5 py-3 text-right text-slate-500">
                      {(b.record_count ?? 0).toLocaleString('id-ID')}
                    </td>
                    <td className="px-5 py-3 text-slate-500">{lastSeenLabel(b.last_seen_at)}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
