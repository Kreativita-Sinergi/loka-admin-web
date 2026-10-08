import { useCallback, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { getSales, type Sale } from '../api/adminData'
import { useAdminData } from '../hooks/useAdminData'
import { formatDate, formatNumber } from '../lib/analytics'
import { formatMoney, saleStatus, wibDate } from '../lib/sales'
import { MetricCard } from '../components/analytics/AnalyticsUI'
import SaleDetail from '../components/analytics/SaleDetail'
import BusinessFilter from '../components/ui/BusinessFilter'
import Badge from '../components/ui/Badge'
import Pagination from '../components/ui/Pagination'
import Modal from '../components/ui/Modal'

export default function SalesPage() {
  const [params, setParams] = useSearchParams()
  const businessId = params.get('business_id') ?? ''
  const [paging, setPaging] = useState({ businessId, page: 1 })
  const page = paging.businessId === businessId ? paging.page : 1
  const [form, setForm] = useState(() => { const today = wibDate(); return { search: '', start_date: today.slice(0, 7) + '-01', end_date: today, status: '' } })
  const [filter, setFilter] = useState(form)
  const [target, setTarget] = useState<Sale | null>(null)
  const invalidDates = !!form.start_date && !!form.end_date && form.start_date > form.end_date
  const fetcher = useCallback(async () => {
    const r = await getSales({ ...filter, business_id: businessId, page, limit: 20 })
    if (!r.status) throw new Error(r.message)
    return r.data
  }, [filter, businessId, page])
  const { data, loading, error, refresh } = useAdminData(fetcher)
  const summary = data?.summary
  return <div className="space-y-4">
    <div className="flex flex-wrap justify-between items-start gap-3"><div><h2 className="text-2xl font-bold text-slate-900">Penjualan</h2><p className="mt-1 text-sm text-slate-500">Telusuri transaksi seluruh bisnis dan rincian item serta pembayarannya.</p></div><button disabled={loading} onClick={refresh} className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm disabled:opacity-50">↻ Perbarui</button></div>
    <div className="space-y-3 rounded-xl border border-slate-200 bg-white p-4"><BusinessFilter value={businessId} onChange={id => setParams(id ? { business_id: id } : {})} />
      <form onSubmit={e => { e.preventDefault(); if (!invalidDates) { setFilter({ ...form, search: form.search.trim() }); setPaging({ businessId, page: 1 }) } }} className="flex flex-wrap items-end gap-3">
        <label className="min-w-48 flex-1 text-xs text-slate-500">Pencarian<input value={form.search} onChange={e => setForm({ ...form, search: e.target.value })} placeholder="Nomor nota, bisnis, pelanggan…" className="mt-1 block w-full rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-800" /></label>
        <label className="text-xs text-slate-500">Dari (WIB)<input type="date" value={form.start_date} onChange={e => setForm({ ...form, start_date: e.target.value })} className="mt-1 block rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-800" /></label>
        <label className="text-xs text-slate-500">Sampai (WIB)<input type="date" value={form.end_date} onChange={e => setForm({ ...form, end_date: e.target.value })} className="mt-1 block rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-800" /></label>
        <label className="text-xs text-slate-500">Status<select value={form.status} onChange={e => setForm({ ...form, status: e.target.value })} className="mt-1 block rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-800">{[['', 'Semua status'], ['paid', 'Lunas'], ['partial_paid', 'Kasbon / sebagian'], ['unpaid', 'Belum dibayar'], ['canceled', 'Dibatalkan'], ['refunded', 'Refund']].map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></label>
        <button disabled={invalidDates} className="rounded-lg bg-indigo-600 px-4 py-2 text-sm text-white disabled:opacity-50">Terapkan</button><button type="button" onClick={() => { const cleared = { search: '', start_date: '', end_date: '', status: '' }; setForm(cleared); setFilter(cleared); setPaging({ businessId, page: 1 }) }} className="rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-600">Semua periode</button>
      </form>{invalidDates && <p role="alert" className="text-sm text-red-600">Tanggal akhir harus sama dengan atau setelah tanggal awal.</p>}
    </div>
    {error && <div role="alert" className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">{error} <button onClick={refresh} className="underline">Coba lagi</button></div>}
    <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4"><MetricCard label="Transaksi" value={loading ? '…' : formatNumber(summary?.transaction_count)} detail="Seluruh transaksi sesuai filter, termasuk batal dan refund jika dipilih." /><MetricCard label="Nilai penjualan" value={loading ? '…' : formatMoney(summary?.total_sales)} detail={`${formatNumber(summary?.sold_count)} nota lunas / kasbon; termasuk pajak.`} accent /><MetricCard label="Omzet tanpa pajak" value={loading ? '…' : formatMoney(summary?.total_revenue)} detail="Nilai penjualan dikurangi pajak." /><MetricCard label="Laba kotor" value={loading ? '…' : formatMoney(summary?.gross_profit)} detail="Omzet tanpa pajak dikurangi harga modal; belum dikurangi biaya operasional." /></div>
    <p className="text-xs leading-5 text-slate-500">Ringkasan menghitung semua hasil filter, bukan hanya halaman ini. Nilai penjualan mencakup total tagihan kasbon, bukan jumlah uang yang sudah diterima. Transaksi batal, refund, terhapus, dan bisnis demo tidak dihitung sebagai penjualan. Periode berdasarkan tanggal transaksi dibuat dalam WIB.</p>
    {!!summary?.missing_cost_count && <p className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">{formatNumber(summary.missing_cost_count)} nota terjual memiliki harga modal nol. Laba kotor dapat lebih tinggi dari kondisi sebenarnya.</p>}
    <div className="overflow-hidden rounded-xl border border-slate-200 bg-white"><div className="overflow-x-auto"><table className="w-full text-left text-sm"><thead className="bg-slate-50 text-xs text-slate-500"><tr>{['Nota / tanggal (WIB)', 'Bisnis / outlet', 'Pelanggan / kasir', 'Status', 'Total tagihan', 'Rincian'].map(h => <th key={h} className="whitespace-nowrap px-4 py-3">{h}</th>)}</tr></thead><tbody className="divide-y divide-slate-100">
      {loading || !data?.transactions.length ? <tr><td colSpan={6} className="px-4 py-12 text-center text-slate-400">{loading ? 'Memuat transaksi…' : error ? 'Data belum berhasil dimuat.' : 'Tidak ada transaksi sesuai filter.'}</td></tr> : data.transactions.map(t => { const badge = saleStatus(t); return <tr key={t.id} className="hover:bg-slate-50"><td className="px-4 py-3"><p className="font-medium">{t.bill_number || t.id.slice(0, 8)}</p><p className="whitespace-nowrap text-xs text-slate-500">{formatDate(t.created_at, true)}</p></td><td className="px-4 py-3"><Link className="text-indigo-600 hover:underline" to={`/businesses/${t.business_id}`}>{t.business_name}</Link><p className="text-xs text-slate-500">{t.outlet_name || 'Tanpa outlet'}</p></td><td className="px-4 py-3"><p>{t.customer_name || 'Umum'}</p><p className="text-xs text-slate-500">{t.cashier_name || 'Kasir tidak tercatat'}</p></td><td className="px-4 py-3"><Badge variant={badge.variant}>{badge.label}</Badge></td><td className="whitespace-nowrap px-4 py-3 font-medium tabular-nums">{formatMoney(t.final_price)}</td><td className="px-4 py-3"><button onClick={() => setTarget(t)} className="rounded-lg bg-indigo-50 px-3 py-1.5 text-xs text-indigo-700 hover:bg-indigo-100">Detail</button></td></tr> })}
    </tbody></table></div>{data && !loading && <div className="px-4 pb-4"><Pagination page={page} limit={20} total={data.pagination.total} onChange={page => setPaging({ businessId, page })} /></div>}</div>
    <Modal title="Rincian transaksi" open={!!target} onClose={() => setTarget(null)}>{target && <SaleDetail key={target.id} sale={target} />}</Modal>
  </div>
}
