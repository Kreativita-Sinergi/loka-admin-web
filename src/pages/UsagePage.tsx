import { useState } from 'react'
import { Link } from 'react-router-dom'
import { getActiveUsers } from '../api/admin'
import type { BusinessActiveUsers } from '../api/admin'
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts'
import { AnalyticsHeader, AnalyticsState, MetricCard } from '../components/analytics/AnalyticsUI'
import Pagination from '../components/ui/Pagination'
import { useAnalytics } from '../hooks/useAnalytics'
import { dailySeries, formatDate, formatHours, formatNumber, percentage } from '../lib/analytics'

function PlanBadge({ plan }: { plan?: string }) {
  const key = plan?.toLowerCase()
  const label = key === 'free' ? 'Gratis' : key === 'pro-yearly' ? 'Pro tahunan' : key === 'pro-3year' ? 'Pro 3 tahun' : plan || '—'
  return <span className={`inline-flex rounded-md px-2 py-1 text-xs font-medium capitalize ${key?.startsWith('pro') ? 'bg-indigo-50 text-indigo-700' : key === 'trial' ? 'bg-amber-50 text-amber-700' : 'bg-slate-100 text-slate-500'}`}>{label}</span>
}

type Filter = 'all' | 'selling' | 'active' | 'quiet'
type Sort = 'transactions' | 'recent' | 'users' | 'hours'
function hasActivity(row: BusinessActiveUsers, period: 'day' | 'week') {
  return (period === 'day' ? row.active_today : row.active_this_week) > 0
}

export default function UsagePage() {
  const { data: stats, loading, error, updatedAt, refresh } = useAnalytics(getActiveUsers)
  const [period, setPeriod] = useState<'day' | 'week'>('week')
  const [search, setSearch] = useState('')
  const [filter, setFilter] = useState<Filter>('all')
  const [sort, setSort] = useState<Sort>('recent')
  const [page, setPage] = useState(1)
  const rows = stats?.businesses ?? []
  const activeKey = period === 'day' ? 'active_today' : 'active_this_week'
  const hoursKey = period === 'day' ? 'hours_today' : 'hours_this_week'
  const apiKey = period === 'day' ? 'api_calls_today' : 'api_calls_this_week'
  const activeBusinesses = rows.filter(row => hasActivity(row, period)).length
  const sellingBusinesses = rows.filter(row => (row.trx_this_week ?? 0) > 0).length
  const transactionsAvailable = rows.every(row => row.trx_this_week != null)
  const transactions = rows.reduce((sum, row) => sum + (row.trx_this_week ?? 0), 0)
  const filtered = rows.filter(row => {
    if (!`${row.business_name} ${row.business_id}`.toLowerCase().includes(search.trim().toLowerCase())) return false
    return filter === 'all' || (filter === 'selling' && (row.trx_this_week ?? 0) > 0) || (filter === 'active' && hasActivity(row, period)) || (filter === 'quiet' && !hasActivity(row, period))
  }).sort((a, b) => {
    const score = (row: BusinessActiveUsers) => sort === 'transactions' ? row.trx_this_week ?? -1 : sort === 'users' ? row[activeKey] : sort === 'hours' ? row[hoursKey] : Date.parse(row.last_seen_at ?? '') || 0
    return score(b) - score(a) || a.business_name.localeCompare(b.business_name, 'id')
  })
  const currentPage = Math.min(page, Math.max(1, Math.ceil(filtered.length / 15)))
  const trend = dailySeries(stats?.daily_trend, 14, point => point.hours)
  const inconsistent = stats && (stats.active_today > stats.active_this_week || stats.active_this_week > stats.total_users || rows.some(row => row.active_today > row.active_this_week || row.active_this_week > row.total_users))

  return <div className="space-y-6">
    <AnalyticsHeader title="Aktivitas & Pemakaian" description="Pantau pengguna aplikasi, bisnis yang bertransaksi, dan jejak pemakaian." loading={loading} updatedAt={updatedAt} refresh={refresh} />
    <AnalyticsState loading={loading} error={error} hasData={!!stats} />
    {stats && <>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm text-slate-500">Akun demo dikecualikan dari statistik.</p>
        <div className="inline-flex rounded-xl border border-slate-200 bg-white p-1">{(['day', 'week'] as const).map(key => <button key={key} type="button" aria-pressed={period === key} onClick={() => { setPeriod(key); setPage(1) }} className={`rounded-lg px-4 py-2 text-sm font-medium ${period === key ? 'bg-indigo-600 text-white' : 'text-slate-500 hover:bg-slate-50'}`}>{key === 'day' ? '24 jam terakhir' : '7 hari terakhir'}</button>)}</div>
      </div>
      {inconsistent && <div role="alert" className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800">Hitungan pengguna dari server belum konsisten: pengguna aktif melebihi total, atau aktif 24 jam melebihi 7 hari. Angka asli tetap ditampilkan agar masalah data bisa ditelusuri.</div>}
      <div className="grid grid-cols-1 gap-4 min-[380px]:grid-cols-2 xl:grid-cols-4">
        <MetricCard label="Pengguna aktif" value={formatNumber(stats[activeKey])} detail={`${percentage(stats[activeKey], stats.total_users)}% dari ${formatNumber(stats.total_users)} akun pemilik, admin, dan karyawan`} accent />
        <MetricCard label="Bisnis dengan pengguna aktif" value={formatNumber(activeBusinesses)} detail={`${percentage(activeBusinesses, rows.length)}% dari ${formatNumber(rows.length)} bisnis terdaftar`} />
        <MetricCard label="Durasi sesi tercatat" value={formatHours(stats[hoursKey])} detail="Akumulasi sesi seluruh pengguna; bukan waktu layar atau jam buka toko." />
        <MetricCard label={period === 'day' ? 'API hari ini · UTC' : 'API · 7 hari kalender UTC'} value={formatNumber(stats[apiKey])} detail="Request aplikasi, termasuk sinkronisasi. Periode API mengikuti tanggal UTC." />
      </div>
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <div className="rounded-2xl border border-slate-200 bg-white p-5 lg:col-span-2">
          <h3 className="font-semibold text-slate-800">Tren durasi sesi</h3><p className="mt-1 mb-5 text-xs text-slate-500">14 tanggal terakhir · UTC · tanggal tanpa sesi ditampilkan nol</p>
          <ResponsiveContainer width="100%" height={240}><BarChart data={trend} margin={{ left: 0, right: 8 }}><CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" vertical={false} /><XAxis dataKey="label" tick={{ fontSize: 11 }} tickLine={false} axisLine={false} minTickGap={24} /><YAxis tick={{ fontSize: 11 }} tickLine={false} axisLine={false} unit=" j" /><Tooltip labelFormatter={(_, payload) => `${payload[0]?.payload.date ?? ''} · UTC`} formatter={v => [formatHours(Number(v)), 'Durasi sesi']} /><Bar dataKey="value" fill="#6366f1" radius={[5, 5, 0, 0]} maxBarSize={32} /></BarChart></ResponsiveContainer>
          {!trend.some(point => point.value > 0) && <p className="text-center text-xs text-slate-400">Belum ada durasi sesi tercatat pada periode ini.</p>}
        </div>
        <div className="rounded-2xl border border-emerald-200 bg-emerald-50/50 p-5">
          <p className="text-xs font-semibold uppercase tracking-wide text-emerald-700">Aktivitas penjualan · 7 hari</p><p className="mt-4 text-4xl font-semibold tracking-tight text-slate-900">{transactionsAvailable ? formatNumber(sellingBusinesses) : '—'} <span className="text-lg font-normal text-slate-500">bisnis</span></p>
          <p className="mt-2 text-sm text-slate-600">{transactionsAvailable ? `${formatNumber(transactions)} transaksi penjualan tercatat` : 'Data transaksi belum tersedia lengkap.'}</p>
          <p className="mt-5 text-xs leading-5 text-slate-500">Transaksi berstatus penjualan, tanpa pembatalan atau refund. Pengguna yang membuka aplikasi belum tentu melakukan penjualan.</p>
          <button type="button" onClick={() => { setFilter('selling'); setSort('transactions'); setPage(1) }} className="mt-5 text-sm font-semibold text-emerald-700 hover:underline">Lihat bisnis bertransaksi →</button>
        </div>
      </div>
      <div className="rounded-2xl border border-slate-200 bg-white overflow-hidden">
        <div className="space-y-4 border-b border-slate-200 p-5">
          <div className="flex flex-wrap items-center justify-between gap-2"><h3 className="font-semibold text-slate-800">Aktivitas per bisnis</h3><span className="text-xs text-slate-500">{formatNumber(filtered.length)} dari {formatNumber(rows.length)} bisnis</span></div>
          <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap">
            <input type="search" aria-label="Cari bisnis" placeholder="Cari nama atau ID bisnis…" value={search} onChange={e => { setSearch(e.target.value); setPage(1) }} className="min-w-0 flex-1 rounded-lg border border-slate-200 px-3 py-2 text-sm sm:min-w-48" />
            <select aria-label="Filter aktivitas" value={filter} onChange={e => { setFilter(e.target.value as Filter); setPage(1) }} className="rounded-lg border border-slate-200 px-3 py-2 text-sm"><option value="all">Semua aktivitas</option><option value="selling">Bertransaksi · 7 hari</option><option value="active">Ada pengguna aktif</option><option value="quiet">Tanpa pengguna aktif</option></select>
            <select aria-label="Urutkan bisnis" value={sort} onChange={e => { setSort(e.target.value as Sort); setPage(1) }} className="rounded-lg border border-slate-200 px-3 py-2 text-sm"><option value="recent">Terakhir aktif</option><option value="transactions">Transaksi terbanyak</option><option value="users">Pengguna aktif terbanyak</option><option value="hours">Durasi sesi terbanyak</option></select>
          </div>
        </div>
        <div className="overflow-x-auto"><table className="w-full text-sm">
          <thead className="bg-slate-50 text-xs text-slate-500"><tr>{['Bisnis / pengguna', 'Paket', 'Transaksi · 7 hari', `Pengguna · ${period === 'day' ? '24 jam' : '7 hari'}`, 'Durasi sesi', `API · ${period === 'day' ? 'hari ini UTC' : '7 hari kalender UTC'}`, 'Transaksi + produk', 'Terakhir aktif · WIB'].map((label, i) => <th key={label} className={`px-4 py-3 font-medium ${i >= 2 && i <= 6 ? 'text-right' : 'text-left'}`}>{label}</th>)}</tr></thead>
          <tbody className="divide-y divide-slate-100">
            {filtered.slice((currentPage - 1) * 15, currentPage * 15).map(row => <tr key={row.business_id} className="hover:bg-slate-50">
              <td className="px-4 py-3"><Link to={`/businesses/${row.business_id}`} state={{ from: '/usage' }} className="font-semibold text-slate-800 hover:text-indigo-600 hover:underline">{row.business_name}</Link><p className="mt-1 text-xs text-slate-400">{formatNumber(row.total_users)} pengguna · Daftar {formatDate(row.created_at)}</p></td>
              <td className="px-4 py-3"><PlanBadge plan={row.plan} /></td>
              <td className={`px-4 py-3 text-right tabular-nums ${(row.trx_this_week ?? 0) > 0 ? 'font-semibold text-emerald-600' : 'text-slate-400'}`}>{formatNumber(row.trx_this_week)}</td>
              <td className="px-4 py-3 text-right tabular-nums"><span className={row[activeKey] > 0 ? 'font-semibold text-indigo-600' : 'text-slate-400'}>{formatNumber(row[activeKey])}</span><span className="text-slate-400"> / {formatNumber(row.total_users)}</span></td>
              <td className="px-4 py-3 text-right text-slate-600 tabular-nums">{formatHours(row[hoursKey])}</td>
              <td className="px-4 py-3 text-right text-slate-600 tabular-nums">{formatNumber(row[apiKey])}</td>
              <td className="px-4 py-3 text-right text-slate-500 tabular-nums">{formatNumber(row.record_count)}</td>
              <td className="px-4 py-3 text-xs text-slate-500">{row.last_seen_at ? formatDate(row.last_seen_at, true) : 'Belum tercatat'}</td>
            </tr>)}
            {!filtered.length && <tr><td colSpan={8} className="px-5 py-12 text-center text-slate-400">{rows.length ? 'Tidak ada bisnis yang cocok dengan filter.' : 'Belum ada bisnis tercatat.'}</td></tr>}
          </tbody>
        </table></div>
        <div className="border-t border-slate-100 px-5 py-3"><Pagination page={currentPage} total={filtered.length} limit={15} onChange={setPage} /></div>
      </div>
      <details className="rounded-xl border border-slate-200 bg-white p-4 text-sm text-slate-600"><summary className="cursor-pointer font-medium">Cara membaca data</summary><div className="mt-3 space-y-2 text-xs leading-5"><p>Pengguna aktif adalah akun yang memiliki jejak request terautentikasi dalam 24 jam atau 7 hari terakhir, termasuk akun karyawan. Angka ini bukan jumlah pengguna yang sedang online.</p><p>Durasi sesi diperkirakan dari request pertama hingga terakhir. Jeda lebih dari 15 menit memulai sesi baru. Request tunggal tetap dihitung sebagai aktivitas meskipun durasinya nol; sinkronisasi latar belakang juga bisa tercatat.</p><p>API menggunakan hari kalender UTC (berganti pukul 07.00 WIB), sehingga berbeda dari jendela aktivitas 24 jam / 7 hari. Jam ditampilkan sebagai total sesi, bukan rata-rata waktu layar.</p><p>Tanda — berarti data belum tersedia. Kolom transaksi + produk adalah jumlah record, bukan ukuran penyimpanan.</p></div></details>
    </>}
  </div>
}
