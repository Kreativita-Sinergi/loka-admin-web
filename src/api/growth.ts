import axios from '../lib/axios'
import type { SingleResponse } from '../types'
export interface GrowthStats {
  registered: number
  with_product: number
  practiced: number
  first_sale: number
  trial_businesses: number
  paid_from_trial: number
  paid: number
  activation_24h_eligible: number
  activation_24h_success: number
  activation_pending: number
  d7_eligible: number
  d7_active: number
  d7_pending: number
  d30_eligible: number
  d30_active: number
  d30_pending: number
  historical_first_sale_times: number
  invalid_first_sale_times: number
  median_minutes_to_first_sale: number | null
}
export interface GrowthGroup extends GrowthStats {
  key: string
  name: string
}
export interface GrowthReport {
  from: string
  to: string
  as_of: string
  timezone: string
  summary: GrowthStats
  daily: GrowthGroup[]
  business_types: GrowthGroup[]
  sales: GrowthGroup[]
  definitions: Record<string, string>
}
export const getGrowth = (params: { from: string; to: string; business_type_id?: string; sales_id?: string }) =>
  axios.get<SingleResponse<GrowthReport>>('/admin/growth', { params }).then((r) => r.data)
