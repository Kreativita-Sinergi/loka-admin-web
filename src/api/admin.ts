import axios from '../lib/axios'
import type { AdminBusiness, AdminMembership, AdminStats, PaginatedResponse, SingleResponse } from '../types'

export interface BusinessParams {
  page?: number
  limit?: number
  search?: string
  status?: string
}

export const getStats = (): Promise<SingleResponse<AdminStats>> =>
  axios.get('/admin/stats').then((r) => r.data)

// ── User aktif (usage monitoring) ─────────────────────────────────────────────

export interface BusinessActiveUsers {
  business_id: string
  business_name: string
  total_users: number
  active_today: number
  active_this_week: number
  hours_today: number
  hours_this_week: number
  api_calls_today: number
  api_calls_this_week: number
  record_count: number
  last_seen_at: string | null
}

export interface UsageDailyPoint {
  date: string
  hours: number
}

export interface ActiveUsersStats {
  active_today: number
  active_this_week: number
  total_users: number
  hours_today: number
  hours_this_week: number
  daily_trend: UsageDailyPoint[]
  api_calls_today: number
  api_calls_this_week: number
  businesses: BusinessActiveUsers[]
}

export const getActiveUsers = (): Promise<SingleResponse<ActiveUsersStats>> =>
  axios.get('/admin/active-users').then((r) => r.data)

export const getBusinesses = (params: BusinessParams = {}): Promise<PaginatedResponse<AdminBusiness>> =>
  axios.get('/admin/businesses', { params }).then((r) => r.data)

export const getBusinessById = (id: string): Promise<SingleResponse<AdminBusiness>> =>
  axios.get(`/admin/businesses/${id}`).then((r) => r.data)

export const toggleBusinessActive = (id: string): Promise<SingleResponse<AdminBusiness>> =>
  axios.patch(`/admin/businesses/${id}/toggle`).then((r) => r.data)

export const deleteBusiness = (id: string): Promise<SingleResponse<null>> =>
  axios.delete(`/admin/businesses/${id}`).then((r) => r.data)

export const getMemberships = (params: BusinessParams = {}): Promise<PaginatedResponse<AdminMembership>> =>
  axios.get('/admin/memberships', { params }).then((r) => r.data)

export const createMembership = (data: {
  business_id: string
  type: string
  days: number
}): Promise<SingleResponse<AdminMembership>> =>
  axios.post('/admin/memberships', data).then((r) => r.data)

export const updateMembership = (
  id: string,
  data: { type?: string; extend_days?: number; end_date?: string }
): Promise<SingleResponse<AdminMembership>> =>
  axios.patch(`/admin/memberships/${id}`, data).then((r) => r.data)

export const deactivateMembership = (id: string): Promise<SingleResponse<null>> =>
  axios.delete(`/admin/memberships/${id}`).then((r) => r.data)

export const processDowngrades = (): Promise<SingleResponse<null>> =>
  axios.post('/admin/memberships/process-downgrades').then((r) => r.data)

export const loginAdmin = (username: string, password: string): Promise<{ token: string }> =>
  axios.post('/admin/login', { username, password }).then((r) => r.data.data)

export interface NotifyPayload {
  email?: string
  business_name?: string
  template?: string
  message?: string
  bulk?: boolean
}

export interface NotifyResult {
  email: string
  name: string
  success: boolean
  error?: string
}

export interface NotifyResponse {
  total: number
  sent: number
  failed: number
  results: NotifyResult[]
}

export const sendEmail = (payload: NotifyPayload): Promise<SingleResponse<NotifyResponse>> =>
  axios.post('/admin/notify/email', payload).then((r) => r.data)

export interface NotificationLog {
  id: string
  template: string
  is_bulk: boolean
  email: string
  recipient_name: string
  business_name: string
  message_preview: string
  total: number
  sent: number
  failed: number
  created_at: string
}

export interface NotificationStats {
  total_sent: number
  total_failed: number
  success_rate: number
}

export const getNotificationLogs = (): Promise<SingleResponse<NotificationLog[]>> =>
  axios.get('/admin/notify/logs').then((r) => r.data)

export const getNotificationStats = (): Promise<SingleResponse<NotificationStats>> =>
  axios.get('/admin/notify/stats').then((r) => r.data)

// ── Security logs ─────────────────────────────────────────────────────────────

export interface SecurityEventLog {
  id: string
  action: string
  identifier: string
  ip_address: string
  country: string | null
  region: string | null
  city: string | null
  isp: string | null
  user_agent: string
  status: 'success' | 'failed'
  created_at: string
}

export interface SecurityLogsParams {
  page?: number
  limit?: number
  action?: string
  status?: string
}

export interface SecurityLogsData {
  data: SecurityEventLog[]
  total: number
  page: number
  limit: number
}

export const getSecurityLogs = (
  params: SecurityLogsParams = {}
): Promise<SingleResponse<SecurityLogsData>> =>
  axios.get('/admin/security-logs', { params }).then((r) => r.data)
