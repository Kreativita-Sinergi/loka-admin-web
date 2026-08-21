import { useEffect, useState } from 'react'
import { getStats } from '../api/admin'
import type { AdminStats } from '../types'
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, Legend,
} from 'recharts'
import { format } from 'date-fns'

const MEMBERSHIP_COLORS: Record<string, string> = {
  trial: '#f59e0b',
  pro: '#10b981',
}

function StatCard({ label, value, sub }: { label: string; value: number | string; sub?: string }) {
  return (
    <div className="bg-white rounded-xl border border-slate-200 p-5">
      <p className="text-sm text-slate-500">{label}</p>
      <p className="text-2xl font-bold text-slate-800 mt-1">{value}</p>
      {sub && <p className="text-xs text-slate-400 mt-1">{sub}</p>}
    </div>
  )
}

export default function DashboardPage() {
  const [stats, setStats] = useState<AdminStats | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    getStats()
      .then((r) => setStats(r.data))
      .catch(console.error)
      .finally(() => setLoading(false))
  }, [])

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <p className="text-slate-400">Memuat statistik...</p>
      </div>
    )
  }

  if (!stats) return null

  const trendData = stats.registrations_trend.map((d) => ({
    date: format(new Date(d.date), 'd MMM'),
    Registrasi: d.count,
  }))

  const pieData = stats.membership_breakdown.map((m) => ({
    name: m.type.charAt(0).toUpperCase() + m.type.slice(1),
    value: m.count,
  }))

  const activeRate = stats.total_businesses > 0
    ? Math.round((stats.active_businesses / stats.total_businesses) * 100)
    : 0
  const verifiedRate = stats.total_users > 0
    ? Math.round((stats.verified_users / stats.total_users) * 100)
    : 0

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-bold text-slate-800">Dashboard</h2>
        <p className="text-sm text-slate-500 mt-0.5">Ringkasan pengguna dan bisnis Loka Kasir</p>
      </div>

      {/* Stat cards */}
      <div className="grid grid-cols-1 min-[380px]:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        <StatCard label="Total Bisnis" value={stats.total_businesses} sub={`${activeRate}% aktif`} />
        <StatCard label="Bisnis Aktif" value={stats.active_businesses} />
        <StatCard label="Total Pengguna" value={stats.total_users} sub={`${verifiedRate}% terverifikasi`} />
        <StatCard label="Pengguna Terverifikasi" value={stats.verified_users} />
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Trend chart */}
        <div className="lg:col-span-2 min-w-0 bg-white rounded-xl border border-slate-200 p-4 sm:p-5">
          <h3 className="text-sm font-semibold text-slate-700 mb-4">Registrasi 30 Hari Terakhir</h3>
          {trendData.length > 0 ? (
            <ResponsiveContainer width="100%" height={200}>
              <AreaChart data={trendData}>
                <defs>
                  <linearGradient id="colorReg" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#6366f1" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="#6366f1" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                <XAxis dataKey="date" tick={{ fontSize: 11 }} tickLine={false} />
                <YAxis tick={{ fontSize: 11 }} tickLine={false} axisLine={false} allowDecimals={false} />
                <Tooltip />
                <Area type="monotone" dataKey="Registrasi" stroke="#6366f1" fill="url(#colorReg)" strokeWidth={2} />
              </AreaChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-48 flex items-center justify-center text-slate-400 text-sm">
              Belum ada data registrasi
            </div>
          )}
        </div>

        {/* Membership pie */}
        <div className="min-w-0 bg-white rounded-xl border border-slate-200 p-4 sm:p-5">
          <h3 className="text-sm font-semibold text-slate-700 mb-4">Distribusi Membership Aktif</h3>
          {pieData.some((d) => d.value > 0) ? (
            <ResponsiveContainer width="100%" height={200}>
              <PieChart>
                <Pie data={pieData} cx="50%" cy="50%" innerRadius={50} outerRadius={80} dataKey="value" paddingAngle={3}>
                  {pieData.map((entry) => (
                    <Cell key={entry.name} fill={MEMBERSHIP_COLORS[entry.name.toLowerCase()] || '#94a3b8'} />
                  ))}
                </Pie>
                <Legend iconSize={10} />
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-48 flex items-center justify-center text-slate-400 text-sm">
              Belum ada membership aktif
            </div>
          )}
        </div>
      </div>

      {/* Membership breakdown table */}
      <div className="bg-white rounded-xl border border-slate-200 p-4 sm:p-5">
        <h3 className="text-sm font-semibold text-slate-700 mb-3">Rincian Membership</h3>
        <div className="flex gap-4 flex-wrap">
          {stats.membership_breakdown.map((m) => (
            <div key={m.type} className="flex items-center gap-2 px-4 py-2 rounded-lg bg-slate-50 border border-slate-200">
              <span className="w-2 h-2 rounded-full" style={{ background: MEMBERSHIP_COLORS[m.type] || '#94a3b8' }} />
              <span className="text-sm font-medium text-slate-700 capitalize">{m.type}</span>
              <span className="text-sm text-slate-500">{m.count} bisnis</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
