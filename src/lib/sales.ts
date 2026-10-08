export function formatMoney(value: number | null | undefined) {
  if (value == null || !Number.isFinite(value)) return '—'
  return new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 }).format(value)
}
export function saleStatus(sale: { is_canceled: boolean; is_refunded: boolean; payment_status: string }) {
  if (sale.is_canceled) return { label: 'Dibatalkan', variant: 'danger' as const }
  if (sale.is_refunded) return { label: 'Refund', variant: 'warning' as const }
  if (sale.payment_status === 'paid') return { label: 'Lunas', variant: 'success' as const }
  if (sale.payment_status === 'partial_paid') return { label: 'Kasbon / sebagian', variant: 'warning' as const }
  if (sale.payment_status === 'unpaid') return { label: 'Belum dibayar', variant: 'neutral' as const }
  return { label: sale.payment_status || 'Belum diatur', variant: 'neutral' as const }
}
export function wibDate(now = new Date()) {
  return new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Jakarta', year: 'numeric', month: '2-digit', day: '2-digit' }).format(now)
}
