import { useState } from 'react'
import { getStats, getActiveUsers } from '../api/admin'
import { getSales } from '../api/adminData'
import { getMerchantHealth } from '../api/merchantHealth'
import type { RegionCount } from '../types'
import {
  AreaChart, Area, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
} from 'recharts'
import { AnalyticsHeader, AnalyticsState } from '../components/analytics/AnalyticsUI'
import { Card, DeltaBadge, SectionLabel, StatCard } from '../components/ui/Card'
import { useAnalytics } from '../hooks/useAnalytics'
import { dailySeries, formatHours, formatNumber, percentage } from '../lib/analytics'
import { delta, formatMoneyShort, monthToDateRanges, monthlySeries, rate } from '../lib/dashboard'
import { formatMoney } from '../lib/sales'
import { planBucketLabel } from '../lib/membership'
import Modal from '../components/ui/Modal'

// `free` dari server = usaha tanpa langganan berlaku (trial/Pro berakhir).
const MEMBERSHIP_COLORS: Record<string, string> = {
  free: '#94a3b8',
  expired: '#94a3b8',
  trial: '#f59e0b',
  pro: '#10b981',
}

const REGION_PREVIEW = 8

// Pengambil data di tingkat modul agar referensinya stabil untuk useAnalytics.
// Tiap sumber dimuat sendiri: bila satu gagal, bagian lain tetap tampil.
const fetchHealth = () => getMerchantHealth({})
const fetchSalesThisMonth = () => getSales({ ...monthToDateRanges().current, limit: 1 })
const fetchSalesLastMonth = () => getSales({ ...monthToDateRanges().previous, limit: 1 })

/** Teks pengganti saat service belum mengirim angka baru. */
const NEEDS_SERVICE = 'Menunggu pembaruan service'

function RegionList({ title, rows, total }: { title: string; rows: RegionCount[]; total: number }) {
  const [expanded, setExpanded] = useState(false)
  const max = Math.max(1, ...rows.map((r) => r.count))
  const shown = expanded ? rows : rows.slice(0, REGION_PREVIEW)
  return (
    <Card
      title={title}
      action={rows.length > REGION_PREVIEW && (
        <button type="button" onClick={() => setExpanded((v) => !v)} className="shrink-0 text-xs font-medium text-indigo-600 hover:underline">
          {expanded ? 'Ringkas' : `Lihat semua (${rows.length})`}
        </button>
      )}
    >
      {rows.length > 0 ? (
        <ul className="space-y-2.5">
          {shown.map((r) => (
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
    </Card>
  )
}

export default function DashboardPage() {
  const statsQuery = useAnalytics(getStats)
  const usageQuery = useAnalytics(getActiveUsers)
  const healthQuery = useAnalytics(fetchHealth)
  const salesNow = useAnalytics(fetchSalesThisMonth)
  const salesPrev = useAnalytics(fetchSalesLastMonth)
  const [regionSource, setRegionSource] = useState<'ip' | 'profile'>('profile')
  const [showNotRenewed, setShowNotRenewed] = useState(false)

  const stats = statsQuery.data
  const usage = usageQuery.data
  const health = healthQuery.data?.summary
  const growth = stats?.growth

  const anyLoading = [statsQuery, usageQuery, healthQuery, salesNow, salesPrev].some((q) => q.loading)
  const refreshAll = () => [statsQuery, usageQuery, healthQuery, salesNow, salesPrev].forEach((q) => q.refresh())
  const header = (
    <AnalyticsHeader
      title="Dashboard"
      description="Yang perlu ditindak, pemakaian hari ini, dan pertumbuhan Loka Kasir."
      loading={anyLoading}
      updatedAt={statsQuery.updatedAt}
      refresh={refreshAll}
    />
  )
  if (!stats) return <div className="space-y-6">{header}<AnalyticsState loading={statsQuery.loading} error={statsQuery.error} hasData={false} /></div>

  const trendData = dailySeries(stats.registrations_trend, 30, (point) => point.count)
  const registrationTotal = trendData.reduce((sum, point) => sum + point.value, 0)

  const plans = (stats.membership_breakdown ?? []).map((m) => ({
    type: m.type,
    name: m.type === 'pro' ? 'Pro aktif' : m.type === 'trial' ? 'Trial aktif' : planBucketLabel(m.type),
    color: MEMBERSHIP_COLORS[m.type] || '#94a3b8',
    value: m.count,
  }))
  const planTotal = plans.reduce((sum, p) => sum + p.value, 0)

  // Pemakaian: sama dengan definisi di halaman Aktivitas & Pemakaian.
  const usageRows = usage?.businesses ?? []
  const trxAvailable = usageRows.some((r) => r.trx_this_week != null)
  const sellingBusinesses = usageRows.filter((r) => (r.trx_this_week ?? 0) > 0).length

  const gmvNow = salesNow.data?.summary.total_sales
  const gmvPrev = salesPrev.data?.summary.total_sales
  const monthly = monthlySeries(growth?.subscription_monthly, 6)

  return (
    <div className="space-y-8">
      {header}
      <AnalyticsState loading={false} error={statsQuery.error} hasData />

      {/* 1. Perlu tindakan */}
      <div className="space-y-3">
        <SectionLabel hint="Dari skor Kesehatan Merchant">Perlu tindakan</SectionLabel>
        <div className="grid grid-cols-1 min-[420px]:grid-cols-3 gap-3">
          <StatCard
            to="/merchant-health"
            label="Trial berisiko berhenti"
            value={formatNumber(health?.trials_at_risk)}
            tone={(health?.trials_at_risk ?? 0) > 0 ? 'danger' : 'default'}
            detail="Trial dengan skor risiko tinggi"
          />
          <StatCard
            to="/merchant-health"
            label="Siap ditawari Pro"
            value={formatNumber(health?.ready_convert)}
            tone={(health?.ready_convert ?? 0) > 0 ? 'success' : 'default'}
            detail="Trial sehat yang habis ≤ 5 hari"
          />
          <StatCard
            to="/merchant-health"
            label="Merchant risiko tinggi"
            value={formatNumber(health?.by_risk.high)}
            tone={(health?.by_risk.high ?? 0) > 0 ? 'warning' : 'default'}
            detail={health ? `${percentage(health.by_risk.high ?? 0, health.total)}% dari ${formatNumber(health.total)} merchant` : healthQuery.error ?? 'Memuat…'}
          />
        </div>
      </div>

      {/* 2. Hari ini */}
      <div className="space-y-3">
        <SectionLabel hint="Pengguna & jam: tanggal UTC · transaksi: bulan berjalan WIB">Pemakaian</SectionLabel>
        <div className="grid grid-cols-1 min-[420px]:grid-cols-2 xl:grid-cols-4 gap-3">
          <StatCard
            to="/usage"
            label="Pengguna aktif hari ini"
            value={formatNumber(usage?.active_today)}
            detail={usage ? `${percentage(usage.active_today, usage.total_users)}% dari ${formatNumber(usage.total_users)} akun · ${formatNumber(usage.active_this_week)} aktif 7 hari` : usageQuery.error ?? 'Memuat…'}
          />
          <StatCard
            to="/usage"
            label="Bisnis berjualan · 7 hari"
            value={usage ? (trxAvailable ? formatNumber(sellingBusinesses) : '—') : '—'}
            detail={usage ? `${percentage(sellingBusinesses, usageRows.length)}% dari ${formatNumber(usageRows.length)} bisnis punya nota penjualan` : usageQuery.error ?? 'Memuat…'}
          />
          <StatCard
            to="/usage"
            label="Durasi sesi hari ini"
            value={formatHours(usage?.hours_today)}
            detail={usage ? `${formatHours(usage.hours_this_week)} dalam 7 hari` : usageQuery.error ?? 'Memuat…'}
          />
          <StatCard
            to="/sales"
            label="Nilai transaksi merchant"
            value={formatMoneyShort(gmvNow)}
            detail={salesNow.data ? `${formatNumber(salesNow.data.summary.transaction_count)} nota bulan ini` : salesNow.error ?? 'Memuat…'}
            footer={<DeltaBadge value={delta(gmvNow, gmvPrev)} suffix="vs tanggal yang sama bulan lalu" />}
          />
        </div>
      </div>

      {/* 3. Pertumbuhan */}
      <div className="space-y-3">
        <SectionLabel hint="30 hari terakhir">Pertumbuhan</SectionLabel>
        <div className="grid grid-cols-1 min-[420px]:grid-cols-2 xl:grid-cols-4 gap-3">
          <StatCard
            label="MRR"
            value={growth?.mrr != null ? formatMoneyShort(growth.mrr) : '—'}
            detail={growth?.mrr != null
              ? `${formatNumber(growth.active_pro_paid)} Pro berbayar${(growth.active_pro ?? 0) > (growth.active_pro_paid ?? 0) ? ` · ${formatNumber((growth.active_pro ?? 0) - (growth.active_pro_paid ?? 0))} Pro tanpa pembayaran` : ''}`
              : NEEDS_SERVICE}
          />
          <StatCard
            label="Pendapatan langganan"
            value={growth ? formatMoneyShort(growth.subscription_revenue_30d) : '—'}
            detail={growth
              ? `${formatNumber(growth.subscription_orders_30d)} pembayaran dari ${formatNumber(growth.paying_businesses_30d)} bisnis`
              : NEEDS_SERVICE}
            footer={growth && <DeltaBadge value={delta(growth.subscription_revenue_30d, growth.subscription_revenue_prev_30d)} />}
          />
          <StatCard
            label="Konversi trial → Pro"
            value={growth && rate(growth.trials_converted_30d, growth.trials_ended_30d) != null ? `${rate(growth.trials_converted_30d, growth.trials_ended_30d)}%` : '—'}
            detail={growth
              ? `${formatNumber(growth.trials_converted_30d)} dari ${formatNumber(growth.trials_ended_30d)} trial yang berakhir`
              : NEEDS_SERVICE}
          />
          <StatCard
            label="Pro tidak diperpanjang"
            value={growth ? formatNumber(growth.pro_not_renewed_30d) : '—'}
            tone={(growth?.pro_not_renewed_30d ?? 0) > 0 ? 'warning' : 'default'}
            detail={growth
              ? `dari ${formatNumber(growth.pro_ended_30d)} paket Pro yang berakhir${growth.pro_ended_30d > 0 ? ` (${rate(growth.pro_not_renewed_30d, growth.pro_ended_30d)}%)` : ''}`
              : NEEDS_SERVICE}
            onClick={growth ? () => setShowNotRenewed(true) : undefined}
          />
        </div>
      </div>

      <Modal title="Pro tidak diperpanjang · 30 hari terakhir" open={showNotRenewed} onClose={() => setShowNotRenewed(false)}>
        {growth?.pro_not_renewed_businesses?.length ? (
          <ul className="divide-y divide-slate-100">
            {growth.pro_not_renewed_businesses.map((business) => (
              <li key={business.business_id} className="py-3 first:pt-0 last:pb-0">
                <p className="font-medium text-sm text-slate-800">{business.business_name}</p>
                <p className="mt-0.5 text-xs text-slate-500">Pemilik: {business.owner_name}</p>
                {business.email && <p className="text-xs text-slate-500">{business.email}</p>}
                {business.phone && <p className="text-xs text-slate-500">{business.phone}</p>}
                <p className="mt-1 text-xs text-slate-400">Berakhir {new Date(business.ended_at).toLocaleDateString('id-ID')}</p>
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-sm text-slate-500">Belum ada rincian bisnis untuk periode ini.</p>
        )}
      </Modal>

      {/* 4. Grafik */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <Card
          className="lg:col-span-2"
          title="Registrasi bisnis · 30 tanggal terakhir"
          description={`${formatNumber(registrationTotal)} bisnis baru dari ${formatNumber(stats.total_businesses)} terdaftar · UTC · hari tanpa registrasi ditampilkan nol`}
          action={growth && <DeltaBadge value={delta(registrationTotal, growth.registrations_prev_30d)} suffix="vs 30 hari sebelumnya" />}
        >
          {trendData.length > 0 ? (
            <ResponsiveContainer width="100%" height={240}>
              <AreaChart data={trendData} margin={{ top: 8, right: 8, left: -12, bottom: 0 }}>
                <defs>
                  <linearGradient id="colorReg" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#0d5df3" stopOpacity={0.22} />
                    <stop offset="100%" stopColor="#0d5df3" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} />
                <XAxis dataKey="label" tick={{ fontSize: 11 }} tickLine={false} axisLine={false} minTickGap={16} tickMargin={8} />
                <YAxis tick={{ fontSize: 11 }} tickLine={false} axisLine={false} allowDecimals={false} />
                <Tooltip formatter={(value) => [formatNumber(Number(value)), 'Bisnis']} />
                <Area type="linear" dataKey="value" stroke="#0d5df3" fill="url(#colorReg)" strokeWidth={2} dot={false} activeDot={{ r: 4, strokeWidth: 2 }} />
              </AreaChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-48 flex items-center justify-center text-slate-400 text-sm">Belum ada data registrasi</div>
          )}
        </Card>

        <Card title="Paket bisnis" description={`${formatNumber(planTotal)} bisnis · satu paket per bisnis · hanya langganan yang masih berlaku`}>
          {planTotal !== stats.total_businesses && <p className="mb-3 text-xs text-amber-700">Distribusi paket dari server belum mencakup seluruh bisnis.</p>}
          {planTotal > 0 ? (
            <>
              <div className="flex h-3 w-full overflow-hidden rounded-full bg-slate-100" role="img" aria-label="Proporsi paket bisnis">
                {plans.filter((p) => p.value > 0).map((p) => (
                  <div key={p.type} title={`${p.name}: ${formatNumber(p.value)}`} style={{ width: `${(p.value / planTotal) * 100}%`, background: p.color }} />
                ))}
              </div>
              <ul className="mt-5 space-y-3">
                {plans.map((p) => (
                  <li key={p.type} className="flex items-center justify-between gap-3 text-sm">
                    <span className="flex items-center gap-2 text-slate-700">
                      <span className="w-2.5 h-2.5 rounded-full" style={{ background: p.color }} aria-hidden />
                      {p.name}
                    </span>
                    <span className="tabular-nums text-slate-900 font-medium">
                      {formatNumber(p.value)}
                      <span className="ml-1.5 text-xs font-normal text-slate-400">{percentage(p.value, planTotal)}%</span>
                    </span>
                  </li>
                ))}
              </ul>
              <dl className="mt-5 grid grid-cols-2 gap-3 border-t border-slate-100 pt-4 text-xs">
                <div>
                  <dt className="text-slate-500">Bisnis diaktifkan</dt>
                  <dd className="mt-0.5 text-sm font-semibold tabular-nums text-slate-900">{formatNumber(stats.active_businesses)}</dd>
                </div>
                <div>
                  <dt className="text-slate-500">Akun terverifikasi</dt>
                  <dd className="mt-0.5 text-sm font-semibold tabular-nums text-slate-900">
                    {percentage(stats.verified_users, stats.total_users)}%
                    <span className="ml-1 font-normal text-slate-400">dari {formatNumber(stats.total_users)}</span>
                  </dd>
                </div>
              </dl>
            </>
          ) : (
            <div className="h-48 flex items-center justify-center text-slate-400 text-sm">Belum ada data paket bisnis</div>
          )}
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <Card
          className="lg:col-span-2"
          title="Pendapatan langganan · 6 bulan"
          description={growth ? 'Pembayaran paket & add-on outlet yang lunas, per bulan kalender WIB' : NEEDS_SERVICE}
        >
          {growth ? (
            <ResponsiveContainer width="100%" height={240}>
              <BarChart data={monthly} margin={{ top: 8, right: 8, left: 0, bottom: 0 }} barCategoryGap="32%">
                <CartesianGrid strokeDasharray="3 3" vertical={false} />
                <XAxis dataKey="label" tick={{ fontSize: 11 }} tickLine={false} axisLine={false} tickMargin={8} />
                <YAxis tick={{ fontSize: 11 }} tickLine={false} axisLine={false} width={76} tickFormatter={(v) => formatMoneyShort(Number(v))} />
                <Tooltip
                  formatter={(value, _name, item) => [`${formatMoney(Number(value))} · ${formatNumber(item.payload.orders)} pembayaran`, 'Pendapatan']}
                />
                <Bar dataKey="amount" fill="#0d5df3" radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-32 flex items-center justify-center text-center text-slate-400 text-sm">
              Grafik ini tampil setelah loka-kasir-service versi terbaru berjalan.
            </div>
          )}
        </Card>

        <Card title="Rincian per bulan" description="Nominal lunas dan jumlah pembayaran">
          {growth ? (
            <ul className="divide-y divide-slate-100">
              {[...monthly].reverse().map((m) => (
                <li key={m.month} className="flex items-baseline justify-between gap-3 py-2.5 first:pt-0 last:pb-0 text-sm">
                  <span className="text-slate-600">
                    {new Intl.DateTimeFormat('id-ID', { timeZone: 'UTC', month: 'long', year: 'numeric' }).format(new Date(`${m.month}-01T00:00:00Z`))}
                  </span>
                  <span className="text-right tabular-nums">
                    <span className="font-medium text-slate-900">{formatMoney(m.amount)}</span>
                    <span className="ml-2 text-xs text-slate-400">{formatNumber(m.orders)}×</span>
                  </span>
                </li>
              ))}
            </ul>
          ) : (
            <div className="h-32 flex items-center justify-center text-slate-400 text-sm">{NEEDS_SERVICE}</div>
          )}
        </Card>
      </div>

      {/* 5. Sebaran wilayah */}
      {(stats.province_distribution != null || stats.geo_provinces != null) && (
        <div className="space-y-3">
          <div className="flex items-center justify-between gap-3 flex-wrap">
            <SectionLabel>Sebaran bisnis</SectionLabel>
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
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                <RegionList title="Per provinsi" rows={stats.geo_provinces ?? []} total={stats.total_businesses} />
                <RegionList title="10 kota teratas" rows={stats.geo_cities ?? []} total={stats.total_businesses} />
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
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                <RegionList title="Per provinsi" rows={stats.province_distribution ?? []} total={stats.total_businesses} />
                <RegionList title="10 kota/kabupaten teratas" rows={stats.top_cities ?? []} total={stats.total_businesses} />
              </div>
              <p className="text-xs text-slate-400">
                Warna tua = bisnis berstatus diaktifkan. Persentase dari seluruh bisnis. {formatNumber(stats.unknown_region)} dari {stats.total_businesses} bisnis belum mengisi wilayah.
              </p>
            </>
          )}
        </div>
      )}

      <p className="text-xs text-slate-400">
        Status "diaktifkan" menunjukkan izin akses akun, bukan pemakaian. Pemakaian dan transaksi ada di Aktivitas &amp; Pemakaian.
      </p>
    </div>
  )
}
