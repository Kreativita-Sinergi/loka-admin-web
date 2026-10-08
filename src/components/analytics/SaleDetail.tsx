import { useCallback } from 'react'
import { getSaleDetail, type Sale } from '../../api/adminData'
import { useAdminData } from '../../hooks/useAdminData'
import { formatDate } from '../../lib/analytics'
import { formatMoney, saleStatus } from '../../lib/sales'
import Badge from '../ui/Badge'

export default function SaleDetail({ sale }: { sale: Sale }) {
  const fetcher = useCallback(async () => {
    const r = await getSaleDetail(sale.business_id, sale.id)
    if (!r.status) throw new Error(r.message)
    return r.data
  }, [sale.business_id, sale.id])
  const { data, loading, error, refresh } = useAdminData(fetcher)
  if (loading) return <p role="status" className="py-8 text-center text-sm text-slate-500">Memuat rincian transaksi…</p>
  if (error || !data) return <div role="alert" className="text-sm text-red-600">{error || 'Rincian tidak tersedia.'} <button onClick={refresh} className="underline">Coba lagi</button></div>
  const status = saleStatus(data)
  return <div className="space-y-4 text-sm">
    <div><p className="font-semibold text-slate-800">{sale.business_name}</p><p className="text-slate-500">{sale.outlet_name || 'Tanpa outlet'} · {data.bill_number || sale.id}</p><div className="mt-2"><Badge variant={status.variant}>{status.label}</Badge></div></div>
    <dl className="grid grid-cols-2 gap-3">{[['Dibuat (WIB)', formatDate(data.created_at, true)], ['Dibayar (WIB)', formatDate(data.paid_at, true)], ['Pelanggan', data.customer?.name || 'Umum'], ['Kasir', data.cashier?.name || sale.cashier_name || '—']].map(([label, value]) => <div key={label}><dt className="text-xs text-slate-500">{label}</dt><dd className="mt-1">{value}</dd></div>)}</dl>
    <div className="overflow-x-auto rounded-lg border border-slate-200"><table className="w-full text-left text-sm"><thead className="bg-slate-50 text-xs text-slate-500"><tr><th className="px-3 py-2">Item</th><th className="px-3 py-2 text-right">Jumlah</th><th className="px-3 py-2 text-right">Total</th></tr></thead><tbody className="divide-y divide-slate-100">{(data.items ?? []).map(i => <tr key={i.id}><td className="px-3 py-2">{i.name}</td><td className="whitespace-nowrap px-3 py-2 text-right">{i.is_weight_based ? `${(i.quantity / 1000).toLocaleString('id-ID')} kg` : i.quantity.toLocaleString('id-ID')}</td><td className="whitespace-nowrap px-3 py-2 text-right">{formatMoney(i.total)}</td></tr>)}{!data.items?.length && <tr><td colSpan={3} className="p-3 text-slate-500">Tidak ada item.</td></tr>}</tbody></table></div>
    <dl className="space-y-2">{[['Harga jual', data.sell_price], ['Diskon', data.discount], ['Diskon loyalti', data.loyalty_discount], ['Diskon tingkat pelanggan', data.tier_discount], ['Pajak', data.tax], ['Biaya layanan', data.service_fee], ['Pembulatan', data.rounding], ['Total tagihan', data.final_price]].map(([label, value]) => <div key={label} className={`flex justify-between gap-3 ${label === 'Total tagihan' ? 'border-t border-slate-200 pt-2 font-semibold' : 'text-slate-600'}`}><dt>{label}</dt><dd>{formatMoney(value as number)}</dd></div>)}</dl>
    <div><p className="mb-2 font-medium">Pembayaran</p>{data.payments?.length ? data.payments.map(p => <div key={p.id} className="flex justify-between gap-3 border-t border-slate-100 py-2"><div>{p.payment_method_name || 'Metode tidak tercatat'}<p className="text-xs text-slate-500">{formatDate(p.paid_at, true)} WIB</p></div><p>{formatMoney(p.amount)}</p></div>) : <p className="text-slate-500">Belum ada pembayaran tercatat.</p>}</div>
    {data.notes && <p className="rounded-lg bg-slate-50 p-3">Catatan: {data.notes}</p>}{data.is_canceled && data.canceled_reason && <p className="text-red-600">Alasan batal: {data.canceled_reason}</p>}{data.is_refunded && data.refund_reason && <p className="text-amber-700">Alasan refund: {data.refund_reason}</p>}
  </div>
}
