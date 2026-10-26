import axios from '../lib/axios'
import type { SingleResponse } from '../types'

// Program referral sales — lihat docs/sales-referral.md di loka-kasir-service.
// Bentuk data mengikuti struct di repository/sales_repository.go.

export type SalesAgentStatus = 'pending' | 'active' | 'suspended' | 'terminated'
export type CommissionKind = 'commission' | 'reversal' | 'adjustment'
export type CommissionStatus = 'held' | 'available' | 'processing' | 'paid' | 'cancelled'
export type SalesCustomerStatus = 'unpaid' | 'active' | 'due_soon' | 'overdue' | 'stopped'
export type PayoutStatus = 'draft' | 'paid' | 'cancelled'

export interface SalesAgentInput {
  code: string
  name: string
  email: string
  phone: string
  status: SalesAgentStatus
  nik: string
  npwp: string
  bank_name: string
  bank_account_no: string
  bank_account_name: string
}

/** Tampilan admin: NIK dan nomor rekening sudah didekripsi server. */
export interface SalesAgent extends SalesAgentInput {
  id: string
  terms_version: string
  terms_accepted_at: string | null
  created_at: string
  customers: number
  active_customers: number
  /** Saldo siap cair: baris yang sudah lewat masa tahan dan belum masuk pencairan. */
  available: number
  total_paid: number
}

export interface SalesCustomer {
  business_id: string
  name: string
  city: string
  owner_phone_masked: string
  plan: string
  status: SalesCustomerStatus
  end_date: string | null
  joined_at: string
  commission_start_at: string | null
  rate_change_at: string | null
  current_rate_percent: number
  total_commission: number
}

export interface SalesCommission {
  id: string
  order_id: string
  business_name: string
  plan: string
  kind: CommissionKind
  paid_amount: number
  gateway_fee: number
  /** Biaya gateway hasil rekonsiliasi (tarif tertinggi), belum dari kanal sebenarnya. */
  fee_estimated: boolean
  payment_code: string
  net_amount: number
  rate_percent: number
  amount: number
  status: CommissionStatus
  available_at: string
  reason: string
  created_at: string
}

export interface SalesPayout {
  id: string
  sales_id: string
  sales_name: string
  sales_code: string
  amount: number
  status: PayoutStatus
  bank_name: string
  bank_account_no: string
  bank_account_name: string
  transfer_ref: string
  proof_url: string
  paid_at: string | null
  created_at: string
}

export interface SalesPayoutSkip {
  sales_id: string
  sales_name: string
  amount: number
  reason: string
}

export interface GatewayFeeRate {
  payment_code: string
  label: string
  flat_fee: number
  /** Basis poin: 70 = 0,7%. */
  percent_bp: number
  /** YYYY-MM-DD */
  valid_from: string
}

// ── Sales ────────────────────────────────────────────────────────────────────

export const getSalesAgents = () =>
  axios.get<SingleResponse<SalesAgent[]>>('/admin/sales').then((r) => r.data)

export const getSalesAgent = (id: string) =>
  axios.get<SingleResponse<SalesAgent>>(`/admin/sales/${id}`).then((r) => r.data)

export const createSalesAgent = (data: SalesAgentInput & { password: string }) =>
  axios.post<SingleResponse<SalesAgent>>('/admin/sales', data).then((r) => r.data)

/** Mengganti seluruh data: kolom KYC/rekening yang dikirim kosong ikut terhapus. */
export const updateSalesAgent = (id: string, data: SalesAgentInput) =>
  axios.patch<SingleResponse<SalesAgent>>(`/admin/sales/${id}`, data).then((r) => r.data)

export const resetSalesPassword = (id: string, password: string) =>
  axios.post<SingleResponse<null>>(`/admin/sales/${id}/password`, { password }).then((r) => r.data)

export const getSalesCustomers = (id: string) =>
  axios.get<SingleResponse<SalesCustomer[]>>(`/admin/sales/${id}/customers`).then((r) => r.data)

/** Ledger terbaru dulu. Halaman berikutnya: `before` + `before_id` = created_at
 *  dan id baris terakhir (keyset), supaya baris bertimestamp sama tidak terlewat. */
export const getSalesCommissions = (id: string, params: { before?: string; before_id?: string; limit?: number } = {}) =>
  axios.get<SingleResponse<SalesCommission[]>>(`/admin/sales/${id}/commissions`, { params }).then((r) => r.data)

export const revokeSalesCommission = (orderId: string, reason: string) =>
  axios.post<SingleResponse<null>>(`/admin/sales-commissions/${orderId}/revoke`, { reason }).then((r) => r.data)

export const correctSalesCommissionFee = (orderId: string, gatewayFee: number, reason: string) =>
  axios
    .post<SingleResponse<null>>(`/admin/sales-commissions/${orderId}/fee`, { gateway_fee: gatewayFee, reason })
    .then((r) => r.data)

// ── Tarif payment gateway ────────────────────────────────────────────────────

export const getPaymentFees = () =>
  axios.get<SingleResponse<GatewayFeeRate[]>>('/admin/payment-fees').then((r) => r.data)

/** Tarif dengan kode dan tanggal berlaku yang sama akan ditimpa. */
export const savePaymentFee = (data: GatewayFeeRate) =>
  axios.put<SingleResponse<null>>('/admin/payment-fees', data).then((r) => r.data)

// ── Pencairan ────────────────────────────────────────────────────────────────

export const getSalesPayouts = (status: PayoutStatus | '' = '') =>
  axios
    .get<SingleResponse<SalesPayout[]>>('/admin/sales-payouts', { params: status ? { status } : {} })
    .then((r) => r.data)

export const createSalesPayoutBatch = () =>
  axios
    .post<SingleResponse<{ created: SalesPayout[]; skipped: SalesPayoutSkip[] }>>('/admin/sales-payouts', {})
    .then((r) => r.data)

export const markSalesPayoutPaid = (id: string, transferRef: string, proofUrl: string) =>
  axios
    .post<SingleResponse<null>>(`/admin/sales-payouts/${id}/paid`, { transfer_ref: transferRef, proof_url: proofUrl })
    .then((r) => r.data)

export const cancelSalesPayout = (id: string) =>
  axios.post<SingleResponse<null>>(`/admin/sales-payouts/${id}/cancel`, {}).then((r) => r.data)

/** CSV pencairan yang dibayar pada bulan itu (WIB). Lewat axios supaya header
 *  sesi admin ikut terkirim. Galat dari server juga datang sebagai Blob, jadi
 *  dibaca ulang sebagai JSON agar pesannya bisa ditampilkan. */
export async function downloadSalesPayoutExport(period: string): Promise<{ blob: Blob; filename: string }> {
  try {
    const r = await axios.get<Blob>('/admin/sales-payouts/export', { params: { period }, responseType: 'blob' })
    const disposition = String(r.headers['content-disposition'] ?? '')
    const filename = /filename="?([^";]+)"?/.exec(disposition)?.[1] ?? `pencairan-sales-${period}.csv`
    return { blob: r.data, filename }
  } catch (err) {
    const response = (err as { response?: { data?: unknown } }).response
    if (response?.data instanceof Blob) {
      try { response.data = JSON.parse(await response.data.text()) } catch { /* biarkan apa adanya */ }
    }
    throw err
  }
}
