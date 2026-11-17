import { useCallback, useState } from 'react'
import { getGrowth, type GrowthGroup } from '../api/growth'
import { useAnalytics } from '../hooks/useAnalytics'
import { AnalyticsHeader, AnalyticsState, MetricCard } from '../components/analytics/AnalyticsUI'
import { formatNumber } from '../lib/analytics'
const date = (offset = 0) => {
  const d = new Date(Date.now() + offset * 86400000)
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Jakarta',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(d)
}
const rate = (n: number, d: number) => (d ? `${((100 * n) / d).toFixed(1)}%` : '—')
function CohortTable({ title, rows }: { title: string; rows: GrowthGroup[] }) {
  return (
    <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white">
      <h3 className="px-5 py-4 font-semibold">{title}</h3>
      <div className="overflow-x-auto">
        <table className="w-full text-left text-sm">
          <thead className="bg-slate-50 text-xs text-slate-500">
            <tr>
              {[
                'Cohort',
                'Daftar',
                'Produk',
                'Transaksi pertama',
                'Aktivasi 24 jam',
                'Retensi D7',
                'Retensi D30',
                'Trial → berbayar',
              ].map((h) => (
                <th key={h} className="whitespace-nowrap px-4 py-3">
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.key} className="border-t border-slate-100">
                <td className="px-4 py-3 font-medium">{r.name || 'Tanpa nama'}</td>
                <td className="px-4 py-3">{formatNumber(r.registered)}</td>
                <td className="px-4 py-3">{formatNumber(r.with_product)}</td>
                <td className="px-4 py-3">{formatNumber(r.first_sale)}</td>
                <td className="px-4 py-3">
                  {rate(r.activation_24h_success, r.activation_24h_eligible)}{' '}
                  <small>
                    ({r.activation_24h_success}/{r.activation_24h_eligible})
                  </small>
                </td>
                <td className="px-4 py-3">
                  {rate(r.d7_active, r.d7_eligible)}{' '}
                  <small>
                    ({r.d7_active}/{r.d7_eligible})
                  </small>
                </td>
                <td className="px-4 py-3">
                  {rate(r.d30_active, r.d30_eligible)}{' '}
                  <small>
                    ({r.d30_active}/{r.d30_eligible})
                  </small>
                </td>
                <td className="px-4 py-3">
                  {rate(r.paid_from_trial, r.trial_businesses)}{' '}
                  <small>
                    ({r.paid_from_trial}/{r.trial_businesses})
                  </small>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {rows.length === 0 && <p className="p-5 text-sm text-slate-500">Belum ada bisnis pada periode ini.</p>}
      </div>
    </section>
  )
}
export default function GrowthPage() {
  const [draft, setDraft] = useState({ from: date(-59), to: date(), business_type_id: '', sales_id: '' })
  const [filter, setFilter] = useState(draft)
  const fetcher = useCallback(() => getGrowth(filter), [filter])
  const q = useAnalytics(fetcher)
  const d = q.data
  const s = d?.summary
  // Keep full choices across filtered reports; options should not vanish on selection.
  const [choices, setChoices] = useState<{ types: GrowthGroup[]; sales: GrowthGroup[] }>({ types: [], sales: [] })
  const types = choices.types.length ? choices.types : (d?.business_types ?? [])
  const sales = choices.sales.length ? choices.sales : (d?.sales ?? [])
  return (
    <div className="space-y-6">
      <AnalyticsHeader
        title="Pertumbuhan & aktivasi"
        description="Dari bisnis mendaftar sampai rutin berjualan. Semua tanggal cohort memakai WIB."
        loading={q.loading}
        updatedAt={q.updatedAt}
        refresh={q.refresh}
      />
      <form
        className="flex flex-wrap items-end gap-3 rounded-2xl border border-slate-200 bg-white p-4"
        onSubmit={(e) => {
          e.preventDefault()
          if (d && !filter.business_type_id && !filter.sales_id)
            setChoices({ types: d.business_types, sales: d.sales })
          setFilter({ ...draft })
          q.refresh()
        }}
      >
        <label className="text-xs font-medium">
          Daftar mulai
          <input
            className="mt-1 block rounded-lg border border-slate-200 px-3 py-2 text-sm"
            type="date"
            max={date()}
            required
            value={draft.from}
            onChange={(e) => setDraft({ ...draft, from: e.target.value })}
          />
        </label>
        <label className="text-xs font-medium">
          Sampai
          <input
            className="mt-1 block rounded-lg border border-slate-200 px-3 py-2 text-sm"
            type="date"
            min={draft.from}
            max={date()}
            required
            value={draft.to}
            onChange={(e) => setDraft({ ...draft, to: e.target.value })}
          />
        </label>
        <label className="text-xs font-medium">
          Jenis usaha
          <select
            aria-label="Jenis usaha"
            className="mt-1 block rounded-lg border border-slate-200 px-3 py-2 text-sm"
            value={draft.business_type_id}
            onChange={(e) => setDraft({ ...draft, business_type_id: e.target.value })}
          >
            <option value="">Semua jenis</option>
            {types.map((t) => (
              <option key={t.key} value={t.key}>
                {t.name}
              </option>
            ))}
          </select>
        </label>
        <label className="text-xs font-medium">
          Referral sales
          <select
            aria-label="Referral sales"
            className="mt-1 block rounded-lg border border-slate-200 px-3 py-2 text-sm"
            value={draft.sales_id}
            onChange={(e) => setDraft({ ...draft, sales_id: e.target.value })}
          >
            <option value="">Semua sumber</option>
            {sales.map((t) => (
              <option key={t.key} value={t.key}>
                {t.name}
              </option>
            ))}
          </select>
        </label>
        <button className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white" disabled={q.loading}>
          Terapkan
        </button>
        <span className="text-xs text-slate-500">Maksimal 180 hari</span>
      </form>
      <AnalyticsState loading={q.loading} error={q.error} hasData={!!d} />
      {d && s && (
        <>
          <p className="text-sm text-slate-500">
            Pendaftaran {d.from}–{d.to} WIB · metrik aktivitas diperbarui sampai{' '}
            {new Date(d.as_of).toLocaleString('id-ID', { timeZone: 'Asia/Jakarta' })} WIB
          </p>
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <MetricCard
              label="Bisnis terdaftar"
              value={formatNumber(s.registered)}
              detail="Toko demo dikecualikan; bisnis nonaktif tetap dihitung."
            />
            <MetricCard
              label="Sudah menambah produk"
              value={formatNumber(s.with_product)}
              detail={`${formatNumber(s.practiced)} bisnis pernah menyelesaikan latihan kasir.`}
            />
            <MetricCard
              label="Transaksi pertama"
              value={formatNumber(s.first_sale)}
              detail={`Median ${s.median_minutes_to_first_sale == null ? '—' : formatNumber(Math.round(s.median_minutes_to_first_sale)) + ' menit'} sejak daftar.`}
            />
            <MetricCard
              label="Aktivasi ≤24 jam"
              value={rate(s.activation_24h_success, s.activation_24h_eligible)}
              detail={`${s.activation_24h_success}/${s.activation_24h_eligible} bisnis matang; ${s.activation_pending} masih menunggu 24 jam.`}
              accent
            />
            <MetricCard
              label="Retensi D7"
              value={rate(s.d7_active, s.d7_eligible)}
              detail={`${s.d7_active}/${s.d7_eligible} berjualan pada hari 7–13. ${s.d7_pending} belum matang.`}
            />
            <MetricCard
              label="Retensi D30"
              value={rate(s.d30_active, s.d30_eligible)}
              detail={`${s.d30_active}/${s.d30_eligible} berjualan pada hari 30–36. ${s.d30_pending} belum matang.`}
            />
            <MetricCard
              label="Trial → berbayar"
              value={rate(s.paid_from_trial, s.trial_businesses)}
              detail={`${s.paid_from_trial}/${s.trial_businesses} bisnis yang pernah trial membayar paket Pro.`}
            />
            <MetricCard
              label="Pelanggan berbayar"
              value={formatNumber(s.paid)}
              detail="Berdasarkan pembayaran paket yang berhasil, termasuk pelanggan tanpa trial."
            />
          </div>
          <CohortTable title="Menurut jenis usaha" rows={d.business_types} />
          <CohortTable title="Menurut referral sales" rows={d.sales} />
          <CohortTable title="Menurut tanggal pendaftaran (WIB)" rows={d.daily} />
          <details className="rounded-2xl border border-slate-200 bg-white p-5 text-sm">
            <summary className="cursor-pointer font-semibold">Definisi & kualitas data</summary>
            <div className="mt-4 space-y-2">
              {Object.entries(d.definitions).map(([k, v]) => (
                <p key={k}>{v}</p>
              ))}
              <p>
                {s.historical_first_sale_times} waktu transaksi pertama berasal dari riwayat lama;{' '}
                {s.invalid_first_sale_times} timestamp tidak wajar dikecualikan dari aktivasi dan median. Retensi
                mengukur penjualan, bukan sekadar membuka aplikasi. Persentase tanpa denominator ditampilkan “—”.
              </p>
            </div>
          </details>
        </>
      )}
    </div>
  )
}
