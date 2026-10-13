import { useEffect, useState } from 'react'
import { format } from 'date-fns'
import { id as localeId } from 'date-fns/locale'
import { getBusinessPaymentOrders, reconcilePaymentOrder } from '../api/admin'
import type { AdminPaymentOrder } from '../api/admin'
import Badge from './ui/Badge'

const money = (amount: number) => `Rp${amount.toLocaleString('id-ID')}`
const planLabel: Record<string, string> = { pro: 'Pro bulanan', 'pro-yearly': 'Pro tahunan', 'pro-3year': 'Pro 3 tahun', monthly: 'Outlet bulanan', yearly: 'Outlet tahunan' }
const statusBadge: Record<AdminPaymentOrder['status'], { variant: 'success' | 'warning' | 'neutral' | 'danger'; label: string }> = {
  paid: { variant: 'success', label: 'Lunas' },
  pending: { variant: 'warning', label: 'Menunggu' },
  expired: { variant: 'neutral', label: 'Kedaluwarsa' },
  cancelled: { variant: 'danger', label: 'Dibatalkan' },
}
// Kode statusCode dari API transactionStatus Duitku.
const duitkuStatus: Record<string, string> = {
  '00': 'Duitku: sudah dibayar — langganan diaktifkan.',
  '01': 'Duitku: belum dibayar (masih menunggu).',
  '02': 'Duitku: gagal atau dibatalkan — tidak ada yang diproses.',
}

function errorText(error: unknown): string {
  const e = error as { response?: { data?: { message?: string; error?: { details?: string } } } }
  const data = e.response?.data
  return data?.error?.details || data?.message || 'Gagal menghubungi server. Coba lagi.'
}

/**
 * Tagihan langganan Duitku milik bisnis. Untuk callback yang gagal/hilang
 * (pelanggan sudah bayar tapi Pro belum aktif), "Cek ke Duitku" menanyakan
 * statusnya langsung dan memprosesnya lewat jalur callback yang sama.
 */
export default function BusinessPaymentOrders({ businessId, onSettled }: { businessId: string; onSettled: () => void }) {
  const [orders, setOrders] = useState<AdminPaymentOrder[] | null>(null)
  const [error, setError] = useState('')
  const [checking, setChecking] = useState<string | null>(null)
  const [results, setResults] = useState<Record<string, { ok: boolean; text: string }>>({})
  const [tick, setTick] = useState(0)

  useEffect(() => {
    let active = true
    getBusinessPaymentOrders(businessId)
      .then(({ data }) => { if (active) { setOrders(data); setError('') } })
      .catch(() => { if (active) setError('Tagihan gagal dimuat.') })
    return () => { active = false }
  }, [businessId, tick])

  async function check(order: AdminPaymentOrder) {
    if (!confirm(`Cek status tagihan ${money(order.amount)} ke Duitku? Bila sudah dibayar, langganan langsung diaktifkan.`)) return
    setChecking(order.id)
    try {
      const { data } = await reconcilePaymentOrder(order.id)
      setResults((r) => ({ ...r, [order.id]: { ok: true, text: duitkuStatus[data.duitku_status] ?? `Status Duitku: ${data.duitku_status}` } }))
      if (data.order.status === 'paid' && order.status !== 'paid') onSettled()
      setTick((n) => n + 1)
    } catch (e) {
      setResults((r) => ({ ...r, [order.id]: { ok: false, text: errorText(e) } }))
    } finally {
      setChecking(null)
    }
  }

  return (
    <section className="bg-white rounded-xl border border-slate-200 p-4 sm:p-6">
      <h3 className="font-semibold text-slate-700">Pembayaran Langganan</h3>
      <p className="text-sm text-slate-500 mt-1">Tagihan Duitku terbaru. Bila pelanggan sudah membayar tapi status masih menunggu, gunakan "Cek ke Duitku".</p>
      {error ? <p role="alert" className="text-sm text-red-600 mt-4">{error}</p>
        : !orders ? <p className="text-sm text-slate-400 mt-4">Memuat tagihan…</p>
        : orders.length === 0 ? <p className="text-sm text-slate-400 mt-4">Belum ada tagihan langganan.</p>
        : (
          <ul className="mt-4 divide-y divide-slate-100">
            {orders.map((o) => {
              const badge = statusBadge[o.status] ?? { variant: 'neutral' as const, label: o.status }
              const result = results[o.id]
              return (
                <li key={o.id} className="py-3 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="text-sm font-medium text-slate-800">{(o.plan && planLabel[o.plan]) || o.plan || o.type}</span>
                      <span className="text-sm text-slate-600">{money(o.amount)}</span>
                      <Badge variant={badge.variant}>{badge.label}</Badge>
                      {o.is_prorata && <Badge variant="info">Prorata</Badge>}
                    </div>
                    <p className="text-xs text-slate-400 mt-0.5 break-all">
                      Dibuat {format(new Date(o.created_at), 'dd MMM yyyy HH:mm', { locale: localeId })}
                      {o.paid_at && ` · Dibayar ${format(new Date(o.paid_at), 'dd MMM yyyy HH:mm', { locale: localeId })}`}
                      {' · '}<code>{o.id}</code>
                    </p>
                    {result && <p role={result.ok ? undefined : 'alert'} className={`text-xs mt-1 ${result.ok ? 'text-slate-600' : 'text-red-600'}`}>{result.text}</p>}
                  </div>
                  {o.status !== 'paid' && (
                    <button
                      onClick={() => check(o)}
                      disabled={checking !== null}
                      className="shrink-0 px-3 py-1.5 text-sm border border-slate-200 rounded-lg hover:bg-slate-50 disabled:opacity-50"
                    >
                      {checking === o.id ? 'Mengecek…' : 'Cek ke Duitku'}
                    </button>
                  )}
                </li>
              )
            })}
          </ul>
        )}
    </section>
  )
}
