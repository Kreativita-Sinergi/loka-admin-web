import type {
  CommissionKind,
  CommissionStatus,
  GatewayFeeRate,
  PayoutStatus,
  SalesAgent,
  SalesAgentStatus,
  SalesCustomerStatus,
} from '../api/salesReferral.ts'

type Variant = 'success' | 'danger' | 'warning' | 'info' | 'neutral'
type Label = { label: string; variant: Variant }

/** Galat dari endpoint sales: `message` selalu "Permintaan gagal", alasan
 *  sebenarnya ada di `error.details`. */
export function apiErrorText(err: unknown, fallback = 'Gagal menghubungi server. Coba lagi.'): string {
  const data = (err as { response?: { data?: { message?: string; error?: { details?: string } } } }).response?.data
  return data?.error?.details || data?.message || fallback
}

export const SALES_STATUS: Record<SalesAgentStatus, Label & { hint: string }> = {
  pending: { label: 'Menunggu tinjauan', variant: 'warning', hint: 'Kode belum bisa dipakai pelanggan.' },
  active: { label: 'Aktif', variant: 'success', hint: 'Kode bisa dipakai; komisi tercatat dan ikut pencairan.' },
  suspended: { label: 'Ditangguhkan', variant: 'danger', hint: 'Kode tidak bisa dipakai pelanggan baru; komisi tetap tercatat tetapi tidak ikut pencairan.' },
  terminated: { label: 'Diberhentikan', variant: 'neutral', hint: 'Tidak ada komisi baru dan tidak bisa masuk portal. Pelanggan tetap terkunci ke sales ini.' },
}

export const COMMISSION_STATUS: Record<CommissionStatus, Label> = {
  held: { label: 'Ditahan', variant: 'warning' },
  available: { label: 'Siap cair', variant: 'info' },
  processing: { label: 'Diproses', variant: 'info' },
  paid: { label: 'Dibayar', variant: 'success' },
  cancelled: { label: 'Dibatalkan', variant: 'danger' },
}

export const COMMISSION_KIND: Record<CommissionKind, string> = {
  commission: 'Komisi',
  reversal: 'Pembatalan',
  adjustment: 'Koreksi biaya',
}

export const CUSTOMER_STATUS: Record<SalesCustomerStatus, Label> = {
  unpaid: { label: 'Belum bayar', variant: 'neutral' },
  active: { label: 'Aktif', variant: 'success' },
  due_soon: { label: 'Jatuh tempo ≤ 7 hari', variant: 'warning' },
  overdue: { label: 'Lewat jatuh tempo', variant: 'danger' },
  stopped: { label: 'Berhenti', variant: 'neutral' },
}

export const PAYOUT_STATUS: Record<PayoutStatus, Label> = {
  draft: { label: 'Draf', variant: 'warning' },
  paid: { label: 'Dibayar', variant: 'success' },
  cancelled: { label: 'Dibatalkan', variant: 'neutral' },
}

export const labelOf = <K extends string>(map: Record<K, Label>, key: string): Label =>
  map[key as K] ?? { label: key || '—', variant: 'neutral' }

/** Sama dengan validasi server (SalesAgentInput.normalize). */
export function validateSalesInput(
  input: { code: string; name: string; email: string; phone: string },
  password?: string,
): string | null {
  const code = input.code.trim().toUpperCase()
  if (!/^[A-Z0-9]{4,12}$/.test(code) || code.startsWith('LK')) return 'Kode sales 4–12 huruf/angka dan tidak boleh diawali LK.'
  if (!input.name.trim()) return 'Nama sales wajib diisi.'
  if (!input.email.includes('@')) return 'Email sales tidak valid.'
  if (input.phone.replace(/\D/g, '').length < 9) return 'Nomor HP sales tidak valid.'
  if (password !== undefined && password.length < 8) return 'Kata sandi minimal 8 karakter.'
  return null
}

export const kycComplete = (a: Pick<SalesAgent, 'nik' | 'bank_name' | 'bank_account_no' | 'bank_account_name'>) =>
  !!(a.nik && a.bank_name && a.bank_account_no && a.bank_account_name)

/** Kata sandi awal yang mudah didikte: tanpa huruf/angka yang mirip (0/O, 1/l). */
export function generatePassword(length = 10): string {
  const alphabet = 'abcdefghjkmnpqrstuvwxyzABCDEFGHJKMNPQRSTUVWXYZ23456789'
  const bytes = new Uint32Array(length)
  crypto.getRandomValues(bytes)
  return Array.from(bytes, (b) => alphabet[b % alphabet.length]).join('')
}

/** 70 → "0,7%" */
export const formatBp = (bp: number) =>
  `${(bp / 100).toLocaleString('id-ID', { maximumFractionDigits: 2 })}%`

/** "0,7" / "0.7" → 70; null bila bukan angka 0–100 dengan ≤ 2 desimal. */
export function parsePercentToBp(raw: string): number | null {
  const s = raw.trim().replace(',', '.')
  if (!/^\d{1,3}(\.\d{1,2})?$/.test(s)) return null
  const bp = Math.round(Number(s) * 100)
  return bp <= 10000 ? bp : null
}

/** Rumus server (GatewayFee): biaya tetap + persen, dibulatkan ke rupiah terdekat. */
export const gatewayFee = (amount: number, rate: Pick<GatewayFeeRate, 'flat_fee' | 'percent_bp'>) =>
  rate.flat_fee + Math.floor((amount * rate.percent_bp + 5000) / 10000)

/** Rumus server (SalesCommissionAmount): dibulatkan ke bawah. */
export function commissionAmount(paid: number, fee: number, ratePercent: number) {
  const net = paid - fee
  return net <= 0 ? 0 : Math.floor((net * ratePercent) / 100)
}

export type FeeRateState = 'current' | 'scheduled' | 'past'

/** Mengelompokkan tarif per kanal (terbaru dulu) dan menandai yang berlaku
 *  pada `today` (YYYY-MM-DD, WIB). Bila belum ada yang berlaku, server memakai
 *  tarif paling awal — tarif itu ditandai berlaku juga. */
export function groupFeeRates(rates: GatewayFeeRate[], today: string) {
  const groups = new Map<string, GatewayFeeRate[]>()
  for (const r of rates) {
    const list = groups.get(r.payment_code) ?? []
    list.push(r)
    groups.set(r.payment_code, list)
  }
  return [...groups.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([code, list]) => {
      const sorted = [...list].sort((a, b) => b.valid_from.localeCompare(a.valid_from))
      const current = sorted.find((r) => r.valid_from <= today) ?? sorted[sorted.length - 1]
      return {
        code,
        current,
        rows: sorted.map((rate) => ({
          rate,
          state: (rate === current ? 'current' : rate.valid_from > today ? 'scheduled' : 'past') as FeeRateState,
        })),
      }
    })
}

/** Hanya tautan http(s) yang ditampilkan sebagai link bukti transfer. */
export const safeUrl = (raw: string) => (/^https?:\/\//i.test(raw.trim()) ? raw.trim() : null)
