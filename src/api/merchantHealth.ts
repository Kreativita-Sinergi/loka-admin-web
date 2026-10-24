import axios from '../lib/axios'
import type { SingleResponse } from '../types'

export type HealthRisk = 'high' | 'medium' | 'low'
export type HealthStage = 'trial' | 'paid' | 'free' | 'expired'

export interface MerchantHealthRow {
  business_id: string
  business_name: string
  owner_name: string
  owner_phone: string
  owner_email: string
  created_at: string
  stage: HealthStage
  plan_type: string
  plan_ends_at: string | null
  score: number
  risk: HealthRisk
  reasons: string[]
  tx_7d: number
  tx_prev_7d: number
  active_days_14: number
  revenue_30d: number
  products: number
  employees: number
  modules: string[]
  first_tx_at: string | null
  last_tx_at: string | null
  last_seen_at: string | null
}

export interface MerchantHealthResponse {
  summary: {
    total: number
    by_risk: Partial<Record<HealthRisk, number>>
    by_stage: Partial<Record<HealthStage, number>>
    trials_at_risk: number
    ready_convert: number
  }
  rows: MerchantHealthRow[]
}

/** Skor kesehatan setiap toko — lihat merchant_health_service.go. */
export const getMerchantHealth = (params: { risk?: string; stage?: string; search?: string }) =>
  axios
    .get<SingleResponse<MerchantHealthResponse>>('/admin/merchant-health', { params })
    .then((r) => r.data)
