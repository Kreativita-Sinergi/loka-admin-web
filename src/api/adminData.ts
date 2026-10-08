import axios from '../lib/axios'
import type { PaginatedResponse, SingleResponse } from '../types'

export interface DataParams {
  page?: number
  limit?: number
  search?: string
  business_id?: string
  status?: string
  kind?: string
  start_date?: string
  end_date?: string
}
export interface DirectoryUser {
  id: string
  kind: 'account' | 'employee'
  name: string | null
  email: string | null
  phone_number: string | null
  username: string | null
  role: string
  business_id: string
  business_name: string
  is_active: boolean
  is_email_verified: boolean | null
  last_seen_at: string | null
  created_at: string | null
}
export interface Sale {
  id: string
  business_id: string
  business_name: string
  outlet_name: string
  bill_number: string
  customer_name: string
  cashier_name: string
  final_price: number
  payment_status: string
  is_canceled: boolean
  is_refunded: boolean
  created_at: string | null
}
export interface SalesData {
  transactions: Sale[]
  summary: {
    transaction_count: number
    sold_count: number
    total_sales: number
    total_revenue: number
    gross_profit: number
    missing_cost_count: number
  }
  pagination: { page: number; limit: number; total: number }
}
export interface TransactionDetail {
  transaction_id: string
  bill_number: string
  final_price: number
  sell_price: number
  discount: number
  loyalty_discount: number
  tier_discount: number
  tax: number
  service_fee: number
  rounding: number
  payment_status: string
  is_canceled: boolean
  is_refunded: boolean
  created_at: string
  paid_at: string | null
  notes: string | null
  canceled_reason: string | null
  refund_reason: string | null
  customer: { name?: string | null }
  cashier: { name?: string | null }
  items: { id: string; name: string; quantity: number; total: number; is_weight_based: boolean }[]
  payments: { id: string; payment_method_name: string; amount: number; paid_at: string }[]
}
export const getDirectoryUsers = (params: DataParams): Promise<PaginatedResponse<DirectoryUser>> =>
  axios.get('/admin/users', { params }).then(r => r.data)
export const getSales = (params: DataParams): Promise<SingleResponse<SalesData>> =>
  axios.get('/admin/transactions', { params }).then(r => r.data)
export const getSaleDetail = (businessId: string, id: string): Promise<SingleResponse<TransactionDetail>> =>
  axios.get(`/admin/businesses/${businessId}/transactions/${id}`).then(r => r.data)
