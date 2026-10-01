import { useState } from 'react'
import { Link } from 'react-router-dom'
import { getStats } from '../api/admin'
import type { RegionCount } from '../types'
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, Legend,
} from 'recharts'
import { AnalyticsHeader, AnalyticsState, MetricCard } from '../components/analytics/AnalyticsUI'
import { useAnalytics } from '../hooks/useAnalytics'
import { dailySeries, formatNumber, percentage } from '../lib/analytics'

const MEMBERSHIP_COLORS: Record<string, string> = {
  free: '#94a3b8',
  trial: '#f59e0b',
  pro: '#10b981',
}

function RegionList({ title, rows, total }: { title: string; rows: RegionCount[]; total: number }) {
  const max = Math.max(1, ...rows.map((r) => r.count))
  return (
    <div className="min-w-0 bg-white rounded-xl border border-slate-200 p-4 sm:p-5">
      <h3 className="text-sm font-semibold text-slate-700 mb-3">{title}</h3>
      {rows.length > 0 ? (
        <ul className="space-y-2.5 max-h-80 overflow-y-auto pr-1">
          {rows.map((r) => (
            <li key={`${r.parent ?? ''}|${r.name}`}>
              <div className="flex items-baseline justify-between gap-3 text-sm">
                <span className="text-slate-700 truncate">
                  {r.name}
                  {r.parent && <span className="text-xs text-slate-400"> · {r.parent}</span>}
                </span>
                <span className="text-slate-500 tabular-nums shrink-0">
                  {formatNumber(r.count)}
                  <span className="text-xs text-slate-400"> ({total > 0 ? Math.round((r.count / total) * 100) : 0}%)</span>
                </span>
              </div>
              <div className="mt-1 h-1.5 rounded-full bg-slate-100 overflow-hidden" title={`${formatNumber(r.active)} diaktifkan dari ${formatNumber(r.count)} bisnis`}>
                <div className="h-full bg-indigo-200" style={{ width: `${(r.count / max) * 100}%` }}>
                  <div className="h-full bg-indigo-500" style={{ width: `${r.count > 0 ? Math.min(100, (r.active / r.count) * 100) : 0}%` }} />
                </div>
              </div>
            </li>
          ))}
        </ul>
      ) : (
        <div className="h-32 flex items-center justify-center text-slate-400 text-sm">Belum ada data wilayah</div>
      )}
    </div>
  )
}

export default function DashboardPage() {
  const { data: stats, loading, error, updatedAt, refresh } = useAnalytics(getStats)
  const [regionSource, setRegionSource] = useState<'ip' | 'profile'>('profile')
  const trendData = dailySeries(stats?.registrations_trend, 30, point => point.count)
  const header = <AnalyticsHeader title="Dashboard" description="Ringkasan bisnis, akun pemilik/admin, dan membership Loka Kasir." loading={loading} updatedAt={updatedAt} refresh={refresh} />
  if (!stats) return <div className="space-y-6">{header}<AnalyticsState loading={loading} error={error} hasData={false} /></div>

  const pieData = (stats.membership_breakdown ?? []).map((m) => ({
    name: m.type === 'free' ? 'Gratis' : m.type.charAt(0).toUpperCase() + m.type.slice(1),
    color: MEMBERSHIP_COLORS[m.type] || '#94a3b8',
    value: m.count,
  }))

  const activeRate = percentage(stats.active_businesses, stats.total_businesses)
  const verifiedRate = percentage(stats.verified_users, stats.total_users)
  const registrationTotal = trendData.reduce((sum, point) => sum + point.value, 0)
  const membershipTotal = pieData.reduce((sum, point) => sum + point.value, 0)

  return (
    <div className="space-y-6">
      {header}
      <AnalyticsState loading={loading} error={error} hasData />
      <div className="rounded-xl border border-indigo-100 bg-indigo-50/50 px-4 py-3 text-sm leading-6 text-indigo-800">
        Status bisnis di halaman ini menunjukkan izin akses akun. Aktivitas pemakaian dan transaksi bisa dilihat di <Link to="/usage" className="font-semibold underline underline-offset-2">Aktivitas & Pemakaian →</Link>
      </div>
      <div className="grid grid-cols-1 min-[380px]:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        <MetricCard label="Bisnis terdaftar" value={formatNumber(stats.total_businesses)} detail="Seluruh bisnis, tanpa akun demo" />
        <MetricCard label="Bisnis diaktifkan" value={formatNumber(stats.active_businesses)} detail={`${activeRate}% berstatus aktif; bukan aktivitas penggunaan`} />
        <MetricCard label="Akun pemilik & admin" value={formatNumber(stats.total_users)} detail="Akun karyawan dihitung di halaman pemakaian" />
        <MetricCard label="Akun terverifikasi" value={formatNumber(stats.verified_users)} detail={`${verifiedRate}% dari akun pemilik & admin`} />
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Trend chart */}
        <div className="lg:col-span-2 min-w-0 bg-white rounded-xl border border-slate-200 p-4 sm:p-5">
          <h3 className="text-sm font-semibold text-slate-700 mb-4">Registrasi bisnis · 30 tanggal terakhir</h3>
          <p className="mb-4 text-xs text-slate-500">{formatNumber(registrationTotal)} bisnis baru · UTC · hari tanpa registrasi ditampilkan nol</p>
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
                <XAxis dataKey="label" tick={{ fontSize: 11 }} tickLine={false} />
                <YAxis tick={{ fontSize: 11 }} tickLine={false} axisLine={false} allowDecimals={false} />
                <Tooltip formatter={value => [formatNumber(Number(value)), 'Bisnis']} />
                <Area type="linear" dataKey="value" stroke="#6366f1" fill="url(#colorReg)" strokeWidth={2} />
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
          <h3 className="text-sm font-semibold text-slate-700 mb-4">Paket bisnis</h3>
          <p className="mb-4 text-xs text-slate-500">{formatNumber(membershipTotal)} bisnis · satu paket per bisnis</p>
          {membershipTotal !== stats.total_businesses && <p className="mb-3 text-xs text-amber-700">Distribusi paket dari server belum mencakup seluruh bisnis.</p>}
          {pieData.some((d) => d.value > 0) ? (
            <ResponsiveContainer width="100%" height={200}>
              <PieChart>
                <Pie data={pieData} cx="50%" cy="50%" innerRadius={50} outerRadius={80} dataKey="value" paddingAngle={3}>
                  {pieData.map((entry) => (
                    <Cell key={entry.name} fill={entry.color} />
                  ))}
                </Pie>
                <Legend iconSize={10} />
                <Tooltip formatter={value => [formatNumber(Number(value)), 'Bisnis']} />
              </PieChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-48 flex items-center justify-center text-slate-400 text-sm">
              Belum ada data paket bisnis
            </div>
          )}
        </div>
      </div>

      {/* Sebaran wilayah */}
      {(stats.province_distribution != null || stats.geo_provinces != null) && (
        <div className="space-y-2">
          <div className="flex items-center justify-between gap-3 flex-wrap">
            <h3 className="text-sm font-semibold text-slate-700">Sebaran Bisnis</h3>
            <div className="inline-flex rounded-lg border border-slate-200 bg-white p-0.5 text-xs">
              {([['ip', 'Lokasi pemakaian (IP)'], ['profile', 'Profil bisnis']] as const).map(([key, label]) => (
                <button
                  aria-pressed={regionSource === key}
                  key={key}
                  type="button"
                  onClick={() => setRegionSource(key)}
                  className={`px-3 py-1.5 rounded-md ${regionSource === key ? 'bg-indigo-600 text-white' : 'text-slate-600 hover:bg-slate-50'}`}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>
          {regionSource === 'ip' ? (
            <>
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <RegionList title="Per Provinsi" rows={stats.geo_provinces ?? []} total={stats.total_businesses} />
                <RegionList title="10 Kota Teratas" rows={stats.geo_cities ?? []} total={stats.total_businesses} />
              </div>
              <p className="text-xs text-slate-400">
                Warna tua = bisnis berstatus diaktifkan. Persentase dari seluruh bisnis. {formatNumber(stats.geo_located)} dari {stats.total_businesses} bisnis sudah terdeteksi
                lokasinya{stats.geo_abroad ? ` (${stats.geo_abroad} di luar Indonesia)` : ''}; terisi otomatis saat aplikasi dipakai.
                IP seluler sering terbaca di kota gateway operator, jadi kota kurang tepat dibanding provinsi.
                Data lokasi IP: DB-IP.com.
              </p>
            </>
          ) : (
            <>
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <RegionList title="Per Provinsi" rows={stats.province_distribution ?? []} total={stats.total_businesses} />
                <RegionList title="10 Kota/Kabupaten Teratas" rows={stats.top_cities ?? []} total={stats.total_businesses} />
              </div>
              <p className="text-xs text-slate-400">
                Warna tua = bisnis berstatus diaktifkan. Persentase dari seluruh bisnis. {formatNumber(stats.unknown_region)} dari {stats.total_businesses} bisnis belum mengisi wilayah.
              </p>
            </>
          )}
        </div>
      )}

      {/* Membership breakdown table */}
      <div className="bg-white rounded-xl border border-slate-200 p-4 sm:p-5">
        <h3 className="text-sm font-semibold text-slate-700 mb-3">Rincian paket bisnis</h3>
        <div className="flex gap-4 flex-wrap">
          {(stats.membership_breakdown ?? []).map((m) => (
            <div key={m.type} className="flex items-center gap-2 px-4 py-2 rounded-lg bg-slate-50 border border-slate-200">
              <span className="w-2 h-2 rounded-full" style={{ background: MEMBERSHIP_COLORS[m.type] || '#94a3b8' }} />
              <span className="text-sm font-medium text-slate-700 capitalize">{m.type === 'free' ? 'Gratis' : m.type}</span>
              <span className="text-sm text-slate-500">{formatNumber(m.count)} bisnis</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
